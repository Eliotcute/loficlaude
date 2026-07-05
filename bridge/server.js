const { WebSocketServer } = require('ws');
const { createClaudeSession } = require('./claude');
const { CLIENT_TYPES, SERVER_TYPES, STATUS, safeParse, serialize } = require('./protocol');

function createBridgeServer({ config, tokenManager, sessionFactory = createClaudeSession, WebSocketServerImpl = WebSocketServer }) {
  const authenticatedClients = new Set();
  const wss = new WebSocketServerImpl({
    host: config.host,
    port: config.port
  });

  wss.on('connection', (socket) => {
    let authenticated = false;
    let claudeSession = null;

    const authTimer = setTimeout(() => {
      if (!authenticated) {
        send({ type: SERVER_TYPES.ERROR, message: 'Auth timeout' });
        socket.close(4001, 'Auth timeout');
      }
    }, config.authTimeout);

    send({ type: SERVER_TYPES.STATUS, value: STATUS.CONNECTING });

    function ensureClaudeSession() {
      if (claudeSession) {
        return claudeSession;
      }

      claudeSession = sessionFactory({
        onStatus: (value) => send({ type: SERVER_TYPES.STATUS, value }),
        onDelta: (text) => send({ type: SERVER_TYPES.ASSISTANT_DELTA, text }),
        onTool: (name) => send({ type: SERVER_TYPES.TOOL_RUNNING, name }),
        onUser: (text, source) => send({ type: SERVER_TYPES.USER_MESSAGE, text, source }),
        onError: (message) => send({ type: SERVER_TYPES.ERROR, message }),
        model: config.defaultModel,
        workspace: config.workspace
      });

      return claudeSession;
    }

    function send(payload) {
      if (socket.readyState !== socket.OPEN) {
        return;
      }
      socket.send(serialize(payload));
    }

    socket.on('message', (raw) => {
      const data = safeParse(raw.toString('utf8'));
      if (!data || typeof data !== 'object') {
        send({ type: SERVER_TYPES.ERROR, message: 'Invalid payload' });
        return;
      }

      if (!authenticated) {
        if (data.type !== CLIENT_TYPES.AUTH || !tokenManager.verify(data.token)) {
          send({ type: SERVER_TYPES.ERROR, message: 'Unauthorized' });
          socket.close(4003, 'Unauthorized');
          return;
        }

        authenticated = true;
        authenticatedClients.add(socket);
        clearTimeout(authTimer);
        ensureClaudeSession();
        send({ type: SERVER_TYPES.STATUS, value: STATUS.CONNECTED });
        return;
      }

      if (data.type === CLIENT_TYPES.USER_MESSAGE) {
        ensureClaudeSession().sendUserMessage(data.text, 'browser');
      }
    });

    socket.on('close', () => {
      clearTimeout(authTimer);
      authenticatedClients.delete(socket);
      claudeSession?.close();
    });

    socket.on('error', () => {
      clearTimeout(authTimer);
      authenticatedClients.delete(socket);
      claudeSession?.close();
    });
  });

  function broadcast(payload) {
    const serialized = serialize(payload);
    for (const client of authenticatedClients) {
      if (client.readyState === client.OPEN) {
        client.send(serialized);
      }
    }
  }

  return Object.assign(wss, { broadcast });
}

module.exports = {
  createBridgeServer
};
