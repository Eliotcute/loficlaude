const { createBridgeServer } = require('./server');
const { createClaudeSession } = require('./claude');
const { createTokenManager } = require('./token');
const { createSocketServer } = require('./socketServer');
const { STATUS } = require('./protocol');
const fs = require('node:fs');
const config = require('./config');

const tokenManager = createTokenManager();
let activeSession = null;
let socketClosed = false;

function closeSocketServerOnce(callback = () => {}) {
  if (socketClosed) {
    callback();
    return;
  }

  socketClosed = true;
  socketServer.close(() => callback());
}

const socketServer = createSocketServer({
  socketPath: config.socketPath,
  onClientData: (line) => {
    if (!activeSession) {
      socketServer.broadcast('[Bridge not connected]\n');
      return;
    }

    activeSession.sendUserMessage(line);
  }
});

function statusToText(status) {
  switch (status) {
    case STATUS.THINKING:
      return '[Thinking...]\n';
    case STATUS.WORKING:
      return '[Working...]\n';
    case STATUS.BLOCKED:
      return '[Blocked]\n';
    case STATUS.DONE:
      return '[Done]\n';
    case STATUS.CONNECTED:
      return '[Connected]\n';
    case STATUS.DISCONNECTED:
      return '[Claude exited]\n';
    default:
      return '';
  }
}

const bridgeServer = createBridgeServer({
  config,
  tokenManager,
  sessionFactory: ({ onStatus, onDelta, onTool, onError, model, workspace }) => {
    const session = createClaudeSession({
      model,
      workspace,
      onStatus: (value) => {
        onStatus(value);
        const marker = statusToText(value);
        if (marker) {
          socketServer.broadcast(marker);
        }
        if (value === STATUS.DISCONNECTED) {
          closeSocketServerOnce();
          activeSession = null;
        }
      },
      onDelta: (text) => {
        onDelta(text);
        socketServer.broadcast(text);
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

    const originalClose = session.close.bind(session);
    session.close = () => {
      activeSession = null;
      originalClose();
    };

    activeSession = session;
    return session;
  }
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  bridgeServer.close(() => {
    closeSocketServerOnce(() => {
      console.log(`Bridge closed (${signal})`);
      process.exit(0);
    });
  });
}

socketServer.start((socketError) => {
  if (socketError) {
    console.error(`Socket server failed to start: ${socketError.message}`);
    process.exitCode = 1;
    return;
  }

  bridgeServer.on('listening', () => {
    console.log(`🔌 LoFiClaude Bridge running on ws://localhost:${config.port}`);
    console.log(`🔑 Token: ${tokenManager.token}`);
    console.log(`🧵 Terminal socket: ${config.socketPath}`);
  });

  bridgeServer.on('error', (error) => {
    console.error(`Bridge failed to start: ${error.message}`);
    process.exitCode = 1;
  });
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', () => {
  try {
    if (fs.existsSync(config.socketPath)) {
      fs.unlinkSync(config.socketPath);
    }
  } catch {
    // Ignore cleanup errors.
  }
});
