const fs = require('node:fs');
const { createBridgeServer } = require('./server');
const { createClaudeSession } = require('./claude');
const { createTokenManager } = require('./token');
const { createSocketServer } = require('./socketServer');
const { createSessionState } = require('./sessionState');
const { STATUS } = require('./protocol');
const config = require('./config');

fs.mkdirSync(config.runtimeDir, { recursive: true, mode: 0o700 });
const runtimeStats = fs.lstatSync(config.runtimeDir);
if (!runtimeStats.isDirectory() || (typeof process.getuid === 'function' && runtimeStats.uid !== process.getuid())) {
  throw new Error('Bridge runtime directory must be private and owned by the current user');
}
fs.chmodSync(config.runtimeDir, 0o700);

const sessionState = createSessionState({ statePath: config.sessionStatePath, reset: config.resetSession });
const tokenManager = createTokenManager(sessionState.bridgeToken);
let socketClosed = false;
let bridgeServer;

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

try {
  bridgeServer = createBridgeServer({
    config,
    tokenManager,
    sessionFactory: ({ onStatus, onDelta, onTool, onUser, onError, model, workspace }) => {
      const launchOptions = sessionState.getLaunchOptions();
      const session = createClaudeSession({
        ...launchOptions,
        model,
        workspace,
        maxUserMessageChars: config.maxUserMessageChars,
        onInitialized: () => sessionState.markInitialized(),
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
  closeSocketServerOnce();
  process.exitCode = 1;
}

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  if (!bridgeServer) {
    closeSocketServerOnce(() => {
      console.log(`Bridge closed (${signal})`);
      process.exit(0);
    });
    return;
  }

  bridgeServer.close(() => {
    closeSocketServerOnce(() => {
      console.log(`Bridge closed (${signal})`);
      process.exit(0);
    });
  });
}

bridgeServer?.on('listening', () => {
  if (!socketServer.isListening()) {
    return;
  }

  console.log(`LoFiClaude Bridge running on ws://localhost:${config.port}`);
  console.log(`Token: ${tokenManager.token}`);
  console.log(`Terminal socket: ${config.socketPath}`);
  console.log(`Claude session: ${config.sessionStatePath}`);
});

bridgeServer?.on('error', (error) => {
  console.error(`Bridge failed to start: ${error.message}`);
  process.exitCode = 1;
  bridgeServer.close(() => closeSocketServerOnce());
});

if (bridgeServer) {
  socketServer.start((socketError) => {
    if (socketError) {
      console.error(`Socket server failed to start: ${socketError.message}`);
      process.exitCode = 1;
      bridgeServer.close(() => closeSocketServerOnce());
      return;
    }

    if (bridgeServer.listening) {
      console.log(`LoFiClaude Bridge running on ws://localhost:${config.port}`);
      console.log(`Token: ${tokenManager.token}`);
      console.log(`Terminal socket: ${config.socketPath}`);
      console.log(`Claude session: ${config.sessionStatePath}`);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
