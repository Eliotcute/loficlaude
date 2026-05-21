const fs = require('node:fs');
const net = require('node:net');

function createSocketServer({ socketPath, onClientData = () => {} }) {
  if (!socketPath || typeof socketPath !== 'string') {
    throw new Error('socketPath is required');
  }

  const clients = new Set();
  const buffers = new WeakMap();
  let server = null;
  let listening = false;

  function cleanupSocketFile() {
    try {
      if (fs.existsSync(socketPath)) {
        fs.unlinkSync(socketPath);
      }
    } catch {
      // Ignore stale socket cleanup errors.
    }
  }

  function handleLineData(client, chunk) {
    const previous = buffers.get(client) ?? '';
    const combined = `${previous}${chunk.toString('utf8')}`;
    const lines = combined.split('\n');

    buffers.set(client, lines.pop() ?? '');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }
      onClientData(line);
    }
  }

  function start(callback = () => {}) {
    if (listening) {
      callback(null);
      return;
    }

    cleanupSocketFile();

    server = net.createServer((client) => {
      clients.add(client);
      buffers.set(client, '');

      client.on('data', (chunk) => handleLineData(client, chunk));

      const cleanupClient = () => {
        clients.delete(client);
        buffers.delete(client);
      };

      client.on('error', cleanupClient);
      client.on('close', cleanupClient);
      client.on('end', cleanupClient);
    });

    server.on('error', (error) => {
      callback(error);
    });

    server.listen(socketPath, () => {
      listening = true;
      try {
        fs.chmodSync(socketPath, 0o600);
      } catch {
        // Permission hardening best-effort only.
      }
      callback(null);
    });
  }

  function broadcast(text) {
    if (!listening || !text) {
      return;
    }

    const payload = `${text}`;
    for (const client of clients) {
      if (client.destroyed) {
        clients.delete(client);
        continue;
      }
      client.write(payload);
    }
  }

  function close(callback = () => {}) {
    if (!server) {
      cleanupSocketFile();
      callback();
      return;
    }

    for (const client of clients) {
      client.destroy();
    }
    clients.clear();

    server.close(() => {
      listening = false;
      server = null;
      cleanupSocketFile();
      callback();
    });
  }

  return {
    socketPath,
    start,
    close,
    broadcast,
    isListening() {
      return listening;
    }
  };
}

module.exports = {
  createSocketServer
};
