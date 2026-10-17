const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const DEFAULT_MAX_LINE_BYTES = 32 * 1024;
const DEFAULT_MAX_PENDING_WRITE_BYTES = 256 * 1024;
const DEFAULT_MAX_CLIENTS = 8;
const DEFAULT_PROBE_TIMEOUT_MS = 500;

function sanitizeTerminalText(value) {
  return `${value ?? ''}`
    .replace(/\x1B\][^\x07]*(?:\x07|\x1B\\)/g, '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1B[ -/]*[@-~]/g, '')
    .replace(/[\x00-\x08\x0B-\x1F\x7F-\x9F\u202A-\u202E\u2066-\u2069]/g, '');
}

function createSocketServer({
  socketPath,
  runtimeDir,
  onClientData = () => {},
  onClientClose = () => {},
  onError = () => {},
  maxLineBytes = DEFAULT_MAX_LINE_BYTES,
  maxPendingWriteBytes = DEFAULT_MAX_PENDING_WRITE_BYTES,
  maxClients = DEFAULT_MAX_CLIENTS,
  probeTimeoutMs = DEFAULT_PROBE_TIMEOUT_MS
}) {
  if (!socketPath || typeof socketPath !== 'string') {
    throw new Error('socketPath is required');
  }

  const clients = new Set();
  const buffers = new WeakMap();
  let server = null;
  let listening = false;
  let starting = false;
  let ownedSocket = null;
  let stopRequested = false;

  function sameFile(left, right) {
    return Boolean(left) && Boolean(right) &&
      left.dev === right.dev &&
      left.ino === right.ino &&
      left.birthtimeMs === right.birthtimeMs &&
      left.ctimeMs === right.ctimeMs;
  }

  function preserveSuccessorPath() {
    if (!ownedSocket) {
      return null;
    }

    let current;
    try {
      current = fs.lstatSync(socketPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }

    if (sameFile(current, ownedSocket)) {
      return null;
    }

    const preservedPath = `${socketPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.preserved`;
    fs.renameSync(socketPath, preservedPath);
    return preservedPath;
  }

  function restoreSuccessorPath(preservedPath) {
    if (!preservedPath) {
      return;
    }

    try {
      fs.lstatSync(socketPath);
      onError(new Error(`Refusing to overwrite a replacement path while restoring: ${socketPath}`));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        onError(error);
        return;
      }
      try {
        fs.renameSync(preservedPath, socketPath);
      } catch (restoreError) {
        onError(restoreError);
      }
    }
  }

  function inspectSocketPath() {
    let stats;
    try {
      stats = fs.lstatSync(socketPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }

    if (!stats.isSocket()) {
      throw new Error(`Refusing to replace non-socket path: ${socketPath}`);
    }
    if (typeof process.getuid === 'function' && stats.uid !== process.getuid()) {
      throw new Error(`Refusing to replace a socket owned by another user: ${socketPath}`);
    }
    return stats;
  }

  function ensureRuntimeDirectory() {
    if (!runtimeDir) {
      return;
    }

    const resolvedRuntimeDir = path.resolve(runtimeDir);
    const resolvedSocketPath = path.resolve(socketPath);
    if (path.dirname(resolvedSocketPath) !== resolvedRuntimeDir) {
      throw new Error('socketPath must be inside runtimeDir');
    }

    fs.mkdirSync(resolvedRuntimeDir, { recursive: true, mode: 0o700 });
    const stats = fs.lstatSync(resolvedRuntimeDir);
    if (!stats.isDirectory()) {
      throw new Error(`Bridge runtime path must be a directory: ${resolvedRuntimeDir}`);
    }
    if (typeof process.getuid === 'function' && stats.uid !== process.getuid()) {
      throw new Error(`Bridge runtime directory must be owned by the current user: ${resolvedRuntimeDir}`);
    }
    fs.chmodSync(resolvedRuntimeDir, 0o700);
  }

  function cleanupOwnedSocket() {
    if (!ownedSocket) {
      return;
    }

    try {
      const current = inspectSocketPath();
      if (sameFile(current, ownedSocket)) {
        fs.unlinkSync(socketPath);
      }
    } catch {
      // A successor or unexpected path now owns this name; leave it untouched.
    }
    ownedSocket = null;
  }

  function handleLineData(client, chunk) {
    let current = Buffer.concat([buffers.get(client) ?? Buffer.alloc(0), Buffer.from(chunk)]);
    let newlineIndex = current.indexOf(0x0a);

    while (newlineIndex >= 0) {
      const lineBuffer = current.subarray(0, newlineIndex);
      current = current.subarray(newlineIndex + 1);
      if (lineBuffer.byteLength > maxLineBytes) {
        buffers.set(client, Buffer.alloc(0));
        client.end('[Input too long]\n');
        return;
      }

      const line = lineBuffer.toString('utf8').trim();
      if (line) {
        onClientData(line, client);
      }
      newlineIndex = current.indexOf(0x0a);
    }

    if (current.byteLength > maxLineBytes) {
      buffers.set(client, Buffer.alloc(0));
      client.end('[Input too long]\n');
      return;
    }

    buffers.set(client, current);
  }

  function removeStaleSocket(stats, callback) {
    let current;
    try {
      current = inspectSocketPath();
      if (sameFile(current, stats)) {
        fs.unlinkSync(socketPath);
      }
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  function prepareSocketPath(callback) {
    let stats;
    try {
      ensureRuntimeDirectory();
      stats = inspectSocketPath();
    } catch (error) {
      callback(error);
      return;
    }

    if (!stats) {
      callback(null);
      return;
    }

    const probe = net.createConnection(socketPath);
    let settled = false;
    const finish = (error, stale = false) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      probe.destroy();
      if (stale) {
        removeStaleSocket(stats, callback);
      } else {
        callback(error);
      }
    };
    const timer = setTimeout(() => {
      const error = new Error(`Timed out checking existing socket: ${socketPath}`);
      error.code = 'EADDRINUSE';
      finish(error);
    }, probeTimeoutMs);
    timer.unref?.();

    probe.once('connect', () => {
      const error = new Error(`Socket is already in use: ${socketPath}`);
      error.code = 'EADDRINUSE';
      finish(error);
    });
    probe.once('error', (error) => {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOENT') {
        finish(null, true);
        return;
      }
      finish(error);
    });
  }

  function start(callback = () => {}) {
    if (listening) {
      callback(null);
      return;
    }
    if (starting) {
      callback(new Error('Socket server is already starting'));
      return;
    }

    starting = true;
    let callbackCalled = false;
    const finishStart = (error) => {
      if (callbackCalled) {
        return;
      }
      callbackCalled = true;
      starting = false;
      callback(error ?? null);
    };

    prepareSocketPath((prepareError) => {
      if (prepareError) {
        finishStart(prepareError);
        return;
      }
      if (stopRequested) {
        const error = new Error('Socket server was closed during startup');
        error.code = 'ECANCELED';
        finishStart(error);
        return;
      }

      const createdServer = net.createServer((client) => {
        if (clients.size >= maxClients) {
          client.end('[Too many clients]\n');
          return;
        }

        clients.add(client);
        buffers.set(client, Buffer.alloc(0));
        client.on('data', (chunk) => handleLineData(client, chunk));

        const cleanupClient = () => {
          if (!clients.delete(client)) return;
          buffers.delete(client);
          onClientClose(client);
        };

        client.on('error', cleanupClient);
        client.on('close', cleanupClient);
        client.on('end', cleanupClient);
      });

      server = createdServer;
      createdServer.on('error', (error) => {
        if (!listening) {
          finishStart(error);
        } else {
          onError(error);
        }
      });

      createdServer.listen(socketPath, () => {
        try {
          fs.chmodSync(socketPath, 0o600);
          ownedSocket = inspectSocketPath();
        } catch (error) {
          createdServer.close(() => {
            cleanupOwnedSocket();
            if (server === createdServer) {
              server = null;
            }
            finishStart(error);
          });
          return;
        }
        if (stopRequested || server !== createdServer) {
          createdServer.close(() => cleanupOwnedSocket());
          const error = new Error('Socket server was closed during startup');
          error.code = 'ECANCELED';
          finishStart(error);
          return;
        }
        listening = true;
        finishStart(null);
      });
    });
  }

  function sendToClient(client, text) {
    if (!client || client.destroyed || !text) {
      return false;
    }

    const payload = sanitizeTerminalText(text);
    if (!payload) {
      return true;
    }
    const payloadBytes = Buffer.byteLength(payload);
    if ((client.writableLength ?? 0) + payloadBytes > maxPendingWriteBytes) {
      client.destroy();
      clients.delete(client);
      return false;
    }

    try {
      const accepted = client.write(payload);
      if (!accepted && (client.writableLength ?? 0) > maxPendingWriteBytes) {
        client.destroy();
        clients.delete(client);
        return false;
      }
      return true;
    } catch {
      client.destroy();
      clients.delete(client);
      return false;
    }
  }

  function broadcast(text) {
    if (!listening || !text) {
      return;
    }

    for (const client of [...clients]) {
      sendToClient(client, text);
    }
  }

  function close(callback = () => {}) {
    stopRequested = true;
    for (const client of clients) {
      client.destroy();
    }
    clients.clear();

    if (!server) {
      listening = false;
      cleanupOwnedSocket();
      callback();
      return;
    }

    const closingServer = server;
    server = null;
    let preservedPath = null;
    try {
      preservedPath = preserveSuccessorPath();
      if (preservedPath) {
        ownedSocket = null;
      }
      closingServer.close(() => {
        listening = false;
        restoreSuccessorPath(preservedPath);
        cleanupOwnedSocket();
        callback();
      });
    } catch {
      listening = false;
      restoreSuccessorPath(preservedPath);
      cleanupOwnedSocket();
      callback();
    }
  }

  return {
    socketPath,
    start,
    close,
    broadcast,
    sendToClient,
    isListening() {
      return listening;
    }
  };
}

module.exports = {
  createSocketServer,
  sanitizeTerminalText
};
