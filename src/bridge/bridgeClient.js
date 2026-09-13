const REPLAY_STORAGE_PREFIX = 'loficlaude-bridge-replay:';
const MAX_INSTANCE_ID_CHARS = 128;
const MAX_USER_MESSAGE_CHARS = 32 * 1024;
const MAX_USER_MESSAGE_BYTES = 32 * 1024;
const NON_RETRYABLE_CLOSE_CODES = new Set([1002, 1003, 1007, 1008, 1009, 4003]);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidInstanceId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_INSTANCE_ID_CHARS;
}

function utf8ByteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class BridgeClient {
  constructor(options = {}) {
    this.url = options.url ?? 'ws://localhost:9120';
    this.WebSocketImpl = options.WebSocketImpl ?? (typeof WebSocket !== 'undefined' ? WebSocket : null);
    this.storage = options.storage ?? getBrowserStorage();
    this.autoReconnect = options.autoReconnect ?? false;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 500;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.socket = null;
    this.token = '';
    this.instanceId = '';
    this.cursor = 0;
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.manualDisconnect = false;
    this.onStatus = () => {};
    this.onDelta = () => {};
    this.onTool = () => {};
    this.onUser = () => {};
    this.onError = () => {};
    this.onDisconnect = () => {};
    this.onSessionReset = () => {};
    this.onReplayGap = () => {};
    this.onMusicState = () => {};
    this.onMusicIntent = () => {};
    this.onMusicSearchResults = () => {};
    this.onMusicError = () => {};
    this.restoreReplayState();
  }

  get replayStorageKey() {
    return `${REPLAY_STORAGE_PREFIX}${this.url}`;
  }

  restoreReplayState() {
    try {
      const parsed = JSON.parse(this.storage?.getItem(this.replayStorageKey) ?? 'null');
      if (isValidInstanceId(parsed?.instanceId) && Number.isSafeInteger(parsed?.cursor) && parsed.cursor >= 0) {
        this.instanceId = parsed.instanceId;
        this.cursor = parsed.cursor;
      }
    } catch {
      this.instanceId = '';
      this.cursor = 0;
    }
  }

  persistReplayState() {
    try {
      this.storage?.setItem(this.replayStorageKey, JSON.stringify({ instanceId: this.instanceId, cursor: this.cursor }));
    } catch {
      // In-memory replay state still protects the current page.
    }
  }

  clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  scheduleReconnect() {
    if (!this.autoReconnect || !this.token || this.reconnectTimer !== null || this.manualDisconnect) {
      return;
    }

    const delay = Math.min(this.reconnectDelayMs * (2 ** this.reconnectAttempt), 5000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
    this.reconnectTimer?.unref?.();
  }

  handleReady(instanceId) {
    if (!isValidInstanceId(instanceId)) {
      this.onError('Invalid bridge instance id');
      return false;
    }

    const nextInstanceId = instanceId;
    if (nextInstanceId === this.instanceId) {
      return true;
    }

    const previousInstanceId = this.instanceId;
    this.instanceId = nextInstanceId;
    this.cursor = 0;
    this.persistReplayState();
    if (previousInstanceId) {
      this.onSessionReset(previousInstanceId, nextInstanceId);
    }
    return true;
  }

  shouldProcessEvent(payload) {
    if (!isValidInstanceId(payload?.instanceId) || !Number.isSafeInteger(payload?.eventId)) {
      return true;
    }

    if (!this.handleReady(payload.instanceId)) {
      return false;
    }
    return payload.eventId > this.cursor;
  }

  markEventProcessed(payload) {
    if (payload?.instanceId === this.instanceId && Number.isSafeInteger(payload?.eventId) && payload.eventId > this.cursor) {
      this.cursor = payload.eventId;
      this.persistReplayState();
    }
  }

  connect(token) {
    if (token !== undefined) {
      this.reconnectAttempt = 0;
    }
    const candidate = token ?? this.token;
    const clean = `${candidate ?? ''}`.trim();
    if (!clean) {
      this.onError('Bridge token required');
      return false;
    }

    if (!this.WebSocketImpl) {
      this.onError('WebSocket unavailable in this environment');
      return false;
    }

    if (this.socket && (this.socket.readyState === this.WebSocketImpl.OPEN || this.socket.readyState === this.WebSocketImpl.CONNECTING)) {
      if (clean === this.token) {
        return true;
      }
      const previousSocket = this.socket;
      this.socket = null;
      previousSocket.close();
    }

    this.clearReconnectTimer();
    this.manualDisconnect = false;
    this.token = clean;
    let socket;
    try {
      socket = new this.WebSocketImpl(this.url);
    } catch {
      this.onError('Bridge connection failed');
      return false;
    }
    this.socket = socket;
    const attemptToken = clean;

    socket.addEventListener('open', () => {
      if (this.socket !== socket) {
        return;
      }
      const auth = { type: 'auth', token: attemptToken };
      if (this.instanceId) {
        auth.instanceId = this.instanceId;
        auth.cursor = this.cursor;
      }
      try {
        socket.send(JSON.stringify(auth));
      } catch {
        this.onError('Bridge authentication failed');
        if (this.socket === socket) {
          this.socket = null;
        }
        socket.close();
      }
    });

    socket.addEventListener('message', (event) => {
      if (this.socket !== socket) {
        return;
      }

      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        this.onError('Invalid bridge payload');
        return;
      }
      if (!isRecord(payload)) {
        this.onError('Invalid bridge payload');
        return;
      }

      if (payload.type === 'ready') {
        if (!this.handleReady(payload.instanceId)) {
          return;
        }
        if (payload.replayTruncated) {
          this.cursor = 0;
          this.persistReplayState();
          this.onReplayGap();
        }
        return;
      }

      if (!this.shouldProcessEvent(payload)) {
        return;
      }

      if (payload.type === 'status') {
        if (payload.value === 'connected') {
          this.reconnectAttempt = 0;
          this.clearReconnectTimer();
        }
        this.onStatus(payload.value ?? 'disconnected');
      } else if (payload.type === 'assistant_delta') {
        this.onDelta(payload.text ?? '');
      } else if (payload.type === 'user_message') {
        this.onUser(payload.text ?? '', payload.source ?? 'unknown');
      } else if (payload.type === 'tool_running') {
        this.onTool(payload.name ?? null);
      } else if (payload.type === 'error') {
        this.onError(payload.message ?? 'Unknown bridge error');
      } else if (payload.type === 'music_state') {
        this.onMusicState(payload.value ?? {});
      } else if (payload.type === 'music_intent') {
        this.onMusicIntent(payload);
      } else if (payload.type === 'music_search_results') {
        this.onMusicSearchResults(payload);
      } else if (payload.type === 'music_error') {
        this.onMusicError(payload);
      }

      this.markEventProcessed(payload);
    });

    socket.addEventListener('close', (event = {}) => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      const willReconnect = this.autoReconnect &&
        Boolean(this.token) &&
        !this.manualDisconnect &&
        this.reconnectAttempt < this.maxReconnectAttempts &&
        !NON_RETRYABLE_CLOSE_CODES.has(event.code);
      this.onDisconnect({ willReconnect, code: event.code ?? 0, explicit: false });
      if (willReconnect) {
        this.scheduleReconnect();
      }
    });

    socket.addEventListener('error', () => {
      if (this.socket === socket && !this.autoReconnect) {
        this.onError('Bridge connection failed');
      }
    });

    return true;
  }

  disconnect(options = {}) {
    this.manualDisconnect = true;
    this.clearReconnectTimer();
    if (options.clearToken) {
      this.token = '';
    }

    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.onDisconnect({ willReconnect: false, explicit: true, code: 1000 });
  }

  sendMessage(text) {
    const clean = `${text ?? ''}`.trim();
    if (!clean || clean.length > MAX_USER_MESSAGE_CHARS || utf8ByteLength(clean) > MAX_USER_MESSAGE_BYTES) {
      if (clean) {
        this.onError('Message too long');
      }
      return false;
    }
    if (!this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN) {
      return false;
    }

    try {
      this.socket.send(
        JSON.stringify({
          type: 'user_message',
          text: clean
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  sendMusicCommand(command, args = [], playlist = undefined) {
    if (!this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN) return false;
    try {
      this.socket.send(JSON.stringify({ type: 'music_command', command, args, ...(command === 'play_playlist' ? { playlist } : {}) }));
      return true;
    } catch {
      return false;
    }
  }
}

export const bridgeClient = new BridgeClient({ autoReconnect: true });
