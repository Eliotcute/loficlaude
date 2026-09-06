const crypto = require('node:crypto');
const { WebSocketServer } = require('ws');
const { createClaudeSession } = require('./claude');
const { createMusicController } = require('./musicController');
const { parseMusicIntent } = require('./musicIntent');
const { CLIENT_TYPES, SERVER_TYPES, STATUS, safeParse, serialize } = require('./protocol');

const DEFAULT_MAX_PAYLOAD_BYTES = 64 * 1024;
const DEFAULT_MAX_USER_MESSAGE_CHARS = 32 * 1024;
const DEFAULT_MAX_USER_MESSAGE_BYTES = 32 * 1024;
const DEFAULT_EVENT_HISTORY_LIMIT = 2000;
const DEFAULT_EVENT_HISTORY_MAX_BYTES = 1024 * 1024;
const DEFAULT_MAX_CLIENT_BUFFER_BYTES = 1024 * 1024;
const DEFAULT_MAX_WEBSOCKET_CLIENTS = 16;

function isLoopbackOrigin(request) {
  const origin = request?.headers?.origin;
  if (!origin) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]')
    );
  } catch {
    return false;
  }
}

function createBridgeServer({ config, tokenManager, sessionFactory = createClaudeSession, WebSocketServerImpl = WebSocketServer, musicControllerFactory = createMusicController }) {
  const authenticatedClients = new Set();
  const eventHistory = [];
  const instanceId = crypto.randomUUID();
  const maxPayloadBytes = config.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
  const maxUserMessageChars = config.maxUserMessageChars ?? DEFAULT_MAX_USER_MESSAGE_CHARS;
  const maxUserMessageBytes = config.maxUserMessageBytes ?? DEFAULT_MAX_USER_MESSAGE_BYTES;
  const eventHistoryLimit = config.eventHistoryLimit ?? DEFAULT_EVENT_HISTORY_LIMIT;
  const eventHistoryMaxBytes = config.eventHistoryMaxBytes ?? DEFAULT_EVENT_HISTORY_MAX_BYTES;
  const maxClientBufferBytes = config.maxClientBufferBytes ?? DEFAULT_MAX_CLIENT_BUFFER_BYTES;
  const maxWebSocketClients = config.maxWebSocketClients ?? DEFAULT_MAX_WEBSOCKET_CLIENTS;
  let eventHistoryBytes = 0;
  let nextEventId = 1;
  let claudeSession = null;
  let sessionStatus = STATUS.DISCONNECTED;
  let closing = false;
  const music = musicControllerFactory({
    onState: (value) => broadcast({ type: SERVER_TYPES.MUSIC_STATE, value }),
    onError: (message) => broadcast({ type: 'music_error', message })
  });

  function isUserMessageWithinLimit(text) {
    return text.length <= maxUserMessageChars && Buffer.byteLength(text, 'utf8') <= maxUserMessageBytes;
  }

  const wss = new WebSocketServerImpl({
    host: config.host,
    port: config.port,
    maxPayload: maxPayloadBytes
  });

  function send(socket, payload) {
    if (socket.readyState !== socket.OPEN) {
      return false;
    }
    const serialized = serialize(payload);
    const serializedBytes = Buffer.byteLength(serialized);
    if ((socket.bufferedAmount ?? 0) + serializedBytes > maxClientBufferBytes) {
      socket.close(1009, 'Client too slow');
      authenticatedClients.delete(socket);
      return false;
    }

    try {
      socket.send(serialized);
      return true;
    } catch {
      authenticatedClients.delete(socket);
      return false;
    }
  }

  function trimEventHistory() {
    while (eventHistory.length > eventHistoryLimit || eventHistoryBytes > eventHistoryMaxBytes) {
      const removed = eventHistory.shift();
      eventHistoryBytes -= removed.bytes;
    }
  }

  function broadcast(payload) {
    const event = {
      ...payload,
      instanceId,
      eventId: nextEventId
    };
    nextEventId += 1;

    const serialized = serialize(event);
    const entry = { event, serialized, bytes: Buffer.byteLength(serialized) };
    eventHistory.push(entry);
    eventHistoryBytes += entry.bytes;
    trimEventHistory();

    for (const client of authenticatedClients) {
      if ((client.bufferedAmount ?? 0) + entry.bytes > maxClientBufferBytes) {
        client.close(1009, 'Client too slow');
        authenticatedClients.delete(client);
        continue;
      }
      try {
        if (client.readyState === client.OPEN) {
          client.send(serialized);
        }
      } catch {
        authenticatedClients.delete(client);
      }
    }

    return event;
  }

  function ensureClaudeSession() {
    if (claudeSession) {
      return claudeSession;
    }

    let session;
    session = sessionFactory({
      onStatus: (value) => {
        sessionStatus = value;
        broadcast({ type: SERVER_TYPES.STATUS, value });
        if (value === STATUS.DISCONNECTED && claudeSession === session) {
          claudeSession = null;
        }
      },
      onDelta: (text) => broadcast({ type: SERVER_TYPES.ASSISTANT_DELTA, text }),
      onTool: (name) => broadcast({ type: SERVER_TYPES.TOOL_RUNNING, name }),
      onUser: (text, source) => broadcast({ type: SERVER_TYPES.USER_MESSAGE, text, source }),
      onError: (message) => broadcast({ type: SERVER_TYPES.ERROR, message }),
      model: config.defaultModel,
      workspace: config.workspace
    });

    if (!session || typeof session.sendUserMessage !== 'function') {
      throw new Error('Claude session factory returned an invalid session');
    }

    claudeSession = session;
    sessionStatus = STATUS.CONNECTED;
    broadcast({ type: SERVER_TYPES.STATUS, value: STATUS.CONNECTED });
    return claudeSession;
  }

  function sendUserMessage(text, source = 'browser', context = null) {
    const clean = `${text ?? ''}`.trim();
    if (!clean || !isUserMessageWithinLimit(clean) || closing) {
      return false;
    }

    try {
      const intent = source === 'browser' ? parseMusicIntent(clean) : null;
      if (intent) {
        const searchVersion = context ? ++context.searchVersion : 0;
        const isCurrent = () => !closing && context?.active && context.searchVersion === searchVersion;
        const emit = (payload) => isCurrent() ? send(context.socket, payload) : false;
        emit({ type: 'music_intent', status: 'started', action: intent.action });
        if (intent.action === 'cancel_selection') {
          if (context) context.playlistChoices = [];
          emit({ type: 'music_intent', status: 'completed', action: intent.action });
        } else {
          if (intent.action === 'play_playlist' && context) context.playlistChoices = [];
          (async () => {
            if (!isCurrent()) return false;
            if (intent.action === 'play_playlist') {
              const choices = await music.searchPlaylists(intent.query);
              if (!isCurrent() || choices.length === 0) return false;
              if (choices.length === 1) return music.playPlaylistById(choices[0]);
              context.playlistChoices = choices;
              emit({ type: 'music_search_results', query: intent.query, choices });
              return true;
            }
            if (intent.action === 'select_playlist') {
              const selected = context.playlistChoices[intent.index];
              if (!selected) return false;
              context.playlistChoices = [];
              return music.playPlaylistById(selected);
            }
            return music.command(intent.action);
          })().then((ok) => {
            emit({ type: 'music_intent', status: ok ? 'completed' : 'failed', action: intent.action });
          }).catch(() => emit({ type: 'music_intent', status: 'failed', action: intent.action }));
        }
      }
      return ensureClaudeSession().sendUserMessage(clean, source) !== false;
    } catch (error) {
      console.error(`Claude session unavailable: ${error.message}`);
      broadcast({ type: SERVER_TYPES.ERROR, message: 'Claude session unavailable' });
      return false;
    }
  }

  function replayEvents(socket, requestedInstanceId, requestedCursor) {
    const latestEventId = nextEventId - 1;
    const cursor = requestedInstanceId === instanceId &&
      Number.isSafeInteger(requestedCursor) &&
      requestedCursor >= 0 &&
      requestedCursor <= latestEventId
      ? requestedCursor
      : 0;

    for (const entry of eventHistory) {
      if (entry.event.eventId > cursor) {
        send(socket, entry.event);
      }
    }
  }

  function replayWasTruncated(requestedInstanceId, requestedCursor) {
    if (requestedInstanceId !== instanceId || !Number.isSafeInteger(requestedCursor) || requestedCursor < 0) {
      return false;
    }

    const latestEventId = nextEventId - 1;
    if (requestedCursor > latestEventId) {
      return true;
    }

    const oldestEventId = eventHistory[0]?.event.eventId ?? nextEventId;
    return requestedCursor < oldestEventId - 1;
  }

  wss.on('connection', (socket, request) => {
    if ((wss.clients?.size ?? 0) >= maxWebSocketClients) {
      socket.close(1013, 'Too many clients');
      return;
    }

    if (!isLoopbackOrigin(request)) {
      socket.close(4003, 'Origin not allowed');
      return;
    }

    let authenticated = false;
    const musicContext = { playlistChoices: [], socket, active: true, searchVersion: 0 };
    const authTimer = setTimeout(() => {
      if (!authenticated) {
        send(socket, { type: SERVER_TYPES.ERROR, message: 'Auth timeout' });
        socket.close(4001, 'Auth timeout');
      }
    }, config.authTimeout);

    send(socket, { type: SERVER_TYPES.STATUS, value: STATUS.CONNECTING });

    socket.on('message', (raw) => {
      if (raw.length > maxPayloadBytes) {
        send(socket, { type: SERVER_TYPES.ERROR, message: 'Payload too large' });
        socket.close(1009, 'Payload too large');
        return;
      }

      const data = safeParse(raw.toString('utf8'));
      if (!data || typeof data !== 'object') {
        send(socket, { type: SERVER_TYPES.ERROR, message: 'Invalid payload' });
        return;
      }

      if (!authenticated) {
        if (data.type !== CLIENT_TYPES.AUTH || !tokenManager.verify(data.token)) {
          send(socket, { type: SERVER_TYPES.ERROR, message: 'Unauthorized' });
          socket.close(4003, 'Unauthorized');
          return;
        }

        authenticated = true;
        authenticatedClients.add(socket);
        clearTimeout(authTimer);
        send(socket, {
          type: SERVER_TYPES.READY,
          instanceId,
          replayTruncated: replayWasTruncated(data.instanceId, data.cursor)
        });
        replayEvents(socket, data.instanceId, data.cursor);

        try {
          ensureClaudeSession();
          send(socket, { type: SERVER_TYPES.STATUS, value: sessionStatus });
          send(socket, { type: SERVER_TYPES.MUSIC_STATE, value: music.getState() });
        } catch (error) {
          console.error(`Claude session unavailable: ${error.message}`);
          send(socket, { type: SERVER_TYPES.ERROR, message: 'Claude session unavailable' });
        }
        return;
      }

      if (data.type === CLIENT_TYPES.MUSIC_COMMAND) {
        const action = typeof data.command === 'string' ? data.command : '';
        const args = Array.isArray(data.args) ? data.args.filter((value) => typeof value === 'string').slice(0, 2) : [];
        send(socket, { type: 'music_intent', status: 'started', action });
        Promise.resolve().then(() => action === 'play_playlist'
          ? music.playPlaylistById(data.playlist)
          : music.command(action, args)).then((accepted) => {
          send(socket, { type: 'music_intent', status: accepted ? 'completed' : 'failed', action });
          if (!accepted) send(socket, { type: 'music_error', message: 'Music command was not accepted' });
        }).catch(() => {
          send(socket, { type: 'music_intent', status: 'failed', action });
          send(socket, { type: 'music_error', message: 'Music command was not accepted' });
        });
        return;
      }

      if (data.type === CLIENT_TYPES.USER_MESSAGE) {
        const clean = typeof data.text === 'string' ? data.text.trim() : '';
        if (!clean) {
          send(socket, { type: SERVER_TYPES.ERROR, message: 'Message required' });
        } else if (!isUserMessageWithinLimit(clean)) {
          send(socket, { type: SERVER_TYPES.ERROR, message: 'Message too long' });
        } else if (!sendUserMessage(clean, 'browser', musicContext)) {
          send(socket, { type: SERVER_TYPES.ERROR, message: 'Message was not accepted' });
        }
        return;
      }

      send(socket, { type: SERVER_TYPES.ERROR, message: 'Unsupported message type' });
    });

    const removeClient = () => {
      clearTimeout(authTimer);
      authenticatedClients.delete(socket);
      musicContext.active = false;
      musicContext.playlistChoices = [];
      musicContext.searchVersion += 1;
    };
    socket.on('close', removeClient);
    socket.on('error', removeClient);
  });

  const closeWebSocketServer = typeof wss.close === 'function' ? wss.close.bind(wss) : (callback) => callback?.();
  function close(callback) {
    if (closing) {
      callback?.();
      return;
    }

    closing = true;
    const session = claudeSession;
    claudeSession = null;
    session?.close();
    for (const client of wss.clients ?? []) {
      if (typeof client.terminate === 'function') {
        client.terminate();
      } else {
        client.close?.(1001, 'Bridge shutting down');
      }
    }
    authenticatedClients.clear();
    closeWebSocketServer(callback);
  }

  return Object.assign(wss, { broadcast, close, sendUserMessage });
}

module.exports = {
  createBridgeServer,
  isLoopbackOrigin
};
