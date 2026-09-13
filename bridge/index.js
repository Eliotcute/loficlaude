const fs = require('node:fs');
const { createBridgeServer } = require('./server');
const { createClaudeSession } = require('./claude');
const { createTokenManager } = require('./token');
const { createSocketServer } = require('./socketServer');
const { createSessionState } = require('./sessionState');
const { createPairingServer } = require('./pairingServer');
const { createPairingManager } = require('./pairing');
const { STATUS } = require('./protocol');
const config = require('./config');

fs.mkdirSync(config.runtimeDir, { recursive: true, mode: 0o700 });
const runtimeStats = fs.lstatSync(config.runtimeDir);
if (!runtimeStats.isDirectory() || (typeof process.getuid === 'function' && runtimeStats.uid !== process.getuid())) {
  throw new Error('Bridge runtime directory must be private and owned by the current user');
}
fs.chmodSync(config.runtimeDir, 0o700);

const tokenManager = createTokenManager();
const pairingManager = createPairingManager({ onRevoke: () => bridgeServer?.revokePairedClients() });
let socketClosed = false;
let bridgeServer;
let sessionState;
const pairingServer = createPairingServer({
  host: config.host,
  port: config.pairingPort,
  tokenManager,
  pairingManager,
  onMobileConnection: (socket, request) => bridgeServer.emit('connection', socket, request)
});

const socketServer = createSocketServer({
  socketPath: config.socketPath,
  runtimeDir: config.runtimeDir,
  maxLineBytes: config.maxSocketLineBytes,
  maxPendingWriteBytes: config.maxSocketPendingWriteBytes,
  maxClients: config.maxSocketClients,
  onError: (error) => {
    console.error(`Socket server failed: ${error.message}`);
    shutdown('socket error');
  },
  onClientData: (line, client) => {
    if (!bridgeServer?.sendUserMessage(line, 'terminal')) {
      socketServer.sendToClient(client, '[Message not accepted]\n');
    }
  }
});

function closeSocketServerOnce(callback = () => {}) {
  if (socketClosed) {
    callback();
    return;
  }

  socketClosed = true;
  socketServer.close(() => callback());
}

function statusToText(status) {
  switch (status) {
    case STATUS.THINKING:
      return '[Thinking...]\n';
    case STATUS.TALKING:
    case STATUS.WORKING:
      return '[Working...]\n';
    case STATUS.BLOCKED:
      return '[Blocked]\n';
    case STATUS.DONE:
      return '[Done]\n';
    case STATUS.CONNECTED:
      return '[Connected]\n';
    case STATUS.DISCONNECTED:
      return '[Claude exited; the next message will resume this conversation]\n';
    default:
      return '';
  }
}

function startBridgeServer() {
  try {
    // The singleton socket is already owned, so no competing Bridge can mutate this state.
    sessionState = createSessionState({ statePath: config.sessionStatePath, reset: config.resetSession });
    bridgeServer = createBridgeServer({
      config,
      tokenManager,
      pairingManager,
      sessionFactory: ({ onStatus, onDelta, onTool, onUser, onError, model, workspace }) => {
        const launchOptions = sessionState.getLaunchOptions();
        const session = createClaudeSession({
          ...launchOptions,
          model,
          workspace,
          maxUserMessageChars: config.maxUserMessageChars,
          onInitialized: () => sessionState.markInitialized(),
          onResumeFailed: (expectedSessionId) => sessionState.replaceFailedResume(expectedSessionId),
          onStatus: (value) => {
            onStatus(value);
            const marker = statusToText(value);
            if (marker) {
              socketServer.broadcast(marker);
            }
          },
          onDelta: (text) => {
            onDelta(text);
            socketServer.broadcast(text);
          },
          onUser: (text, source) => {
            onUser(text, source);
            socketServer.broadcast(`${source === 'browser' ? '[Browser]' : '[You]'} ${text}\n`);
          },
          onTool: (name) => {
            onTool(name);
            socketServer.broadcast(`[Tool: ${name}]\n`);
          },
          onError: (message) => {
            onError(message);
            socketServer.broadcast(`[Error: ${message}]\n`);
          }
        });

        socketServer.broadcast(statusToText(STATUS.CONNECTED));
        return session;
      }
    });
  } catch (error) {
    console.error(`Bridge failed to start: ${error.message}`);
    pairingServer.close(() => closeSocketServerOnce());
    process.exitCode = 1;
    return;
  }

  bridgeServer.on('listening', () => {
    console.log(`LoFiClaude Bridge running on ws://localhost:${config.port}`);
    console.log(`Token: ${tokenManager.token}`);
    console.log(`Terminal socket: ${config.socketPath}`);
    console.log(`Claude session: ${config.sessionStatePath}`);
  });

  bridgeServer.on('error', (error) => {
    console.error(`Bridge failed to start: ${error.message}`);
    process.exitCode = 1;
    bridgeServer.close(() => pairingServer.close(() => closeSocketServerOnce()));
  });
}

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  if (!bridgeServer) {
    pairingServer.close(() => closeSocketServerOnce(() => {
      console.log(`Bridge closed (${signal})`);
      process.exit(0);
    }));
    return;
  }

  bridgeServer.close(() => {
    pairingServer.close(() => closeSocketServerOnce(() => {
      console.log(`Bridge closed (${signal})`);
      process.exit(0);
    }));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

socketServer.start((socketError) => {
  if (socketError) {
    console.error(`Socket server failed to start: ${socketError.message}`);
    process.exitCode = 1;
    closeSocketServerOnce();
    return;
  }

  pairingServer.start((pairingError) => {
    if (pairingError) {
      console.error(`Pairing server failed to start: ${pairingError.message}`);
      closeSocketServerOnce();
      process.exitCode = 1;
      return;
    }
    startBridgeServer();
  });
});
