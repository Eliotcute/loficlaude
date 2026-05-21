const { createBridgeServer } = require('./server');
const { createTokenManager } = require('./token');
const config = require('./config');

const tokenManager = createTokenManager();

const bridgeServer = createBridgeServer({ config, tokenManager });
let shuttingDown = false;

bridgeServer.on('listening', () => {
  console.log(`🔌 LoFiClaude Bridge running on ws://localhost:${config.port}`);
  console.log(`🔑 Token: ${tokenManager.token}`);
});

bridgeServer.on('error', (error) => {
  console.error(`Bridge failed to start: ${error.message}`);
  process.exitCode = 1;
});

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  bridgeServer.close(() => {
    console.log(`Bridge closed (${signal})`);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
