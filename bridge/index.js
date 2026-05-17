const { createBridgeServer } = require('./server');
const { createTokenManager } = require('./token');
const config = require('./config');

const tokenManager = createTokenManager();

const bridgeServer = createBridgeServer({ config, tokenManager });

bridgeServer.on('listening', () => {
  console.log(`🔌 LoFiClaude Bridge running on ws://localhost:${config.port}`);
  console.log(`🔑 Token: ${tokenManager.token}`);
});

bridgeServer.on('error', (error) => {
  console.error(`Bridge failed to start: ${error.message}`);
  process.exitCode = 1;
});
