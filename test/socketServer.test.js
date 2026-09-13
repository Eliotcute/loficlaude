import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { createSocketServer, sanitizeTerminalText } from '../bridge/socketServer.js';

function createSocketPath(name) {
  const suffix = Math.random().toString(16).slice(2, 8);
  return `/tmp/lfc-${name}-${process.pid}-${suffix}.sock`;
}

function connectClient(socketPath) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath);
    const onError = (error) => {
      client.destroy();
      reject(error);
    };

    client.once('error', onError);
    client.once('connect', () => {
      client.removeListener('error', onError);
      resolve(client);
    });
  });
}

async function startServer(server, context) {
  return new Promise((resolve, reject) => {
    server.start((error) => {
      if (error) {
        if (context && (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'ENOTSUP')) {
          context.skip(`Unix sockets unavailable in this environment: ${error.code}`);
          resolve(false);
          return;
        }
        reject(error);
        return;
      }
      resolve(true);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

test('terminal output strips control sequences while preserving text and newlines', () => {
  const unsafe = `before\u001b]52;c;secret\u0007after\rhidden\nnext\u202E`;
  assert.equal(sanitizeTerminalText(unsafe), 'beforeafterhidden\nnext');
});

test('creates and starts Unix socket server', async (t) => {
  const socketPath = createSocketPath('socket-start');
  const socketServer = createSocketServer({ socketPath });

  const started = await startServer(socketServer, t);
  if (!started) {
    return;
  }

  assert.equal(socketServer.isListening(), true);
  assert.equal(fs.existsSync(socketPath), true);

  await closeServer(socketServer);
});

test('accepts client connection', async (t) => {
  const socketPath = createSocketPath('socket-connect');
  const socketServer = createSocketServer({ socketPath });

  const started = await startServer(socketServer, t);
  if (!started) {
    return;
  }
  const client = await connectClient(socketPath);

  assert.equal(client.readyState, 'open');

  client.end();
  await closeServer(socketServer);
});

test('broadcast sends data to connected client', async (t) => {
  const socketPath = createSocketPath('socket-broadcast');
  const socketServer = createSocketServer({ socketPath });

  const started = await startServer(socketServer, t);
  if (!started) {
    return;
  }
  const client = await connectClient(socketPath);

  const outputPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for broadcast payload')), 1500);
    client.once('data', (chunk) => {
      clearTimeout(timer);
      resolve(chunk.toString('utf8'));
    });
  });

  socketServer.broadcast('hello terminal\n');
  const output = await outputPromise;

  assert.equal(output, 'hello terminal\n');

  client.end();
  await closeServer(socketServer);
});

test('receives line-buffered client input via onClientData', async (t) => {
  const socketPath = createSocketPath('socket-input');
  const received = [];
  const socketServer = createSocketServer({
    socketPath,
    onClientData: (line) => {
      received.push(line);
    }
  });

  const started = await startServer(socketServer, t);
  if (!started) {
    return;
  }
  const client = await connectClient(socketPath);

  client.write('first line\nsecond');
  client.write(' line\n\nthird line\n');

  await new Promise((resolve) => setTimeout(resolve, 120));

  assert.deepEqual(received, ['first line', 'second line', 'third line']);

  client.end();
  await closeServer(socketServer);
});

test('preserves UTF-8 input split across socket chunks', async (t) => {
  const socketPath = createSocketPath('socket-utf8');
  const received = [];
  const socketServer = createSocketServer({ socketPath, onClientData: (line) => received.push(line) });
  const started = await startServer(socketServer, t);
  if (!started) {
    return;
  }
  const client = await connectClient(socketPath);
  const input = Buffer.from('中文🙂\n');

  client.write(input.subarray(0, 1));
  client.write(input.subarray(1));
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.deepEqual(received, ['中文🙂']);
  client.destroy();
  await closeServer(socketServer);
});

test('broadcast reaches multiple clients', async (t) => {
  const socketPath = createSocketPath('socket-multi');
  const socketServer = createSocketServer({ socketPath });

  const started = await startServer(socketServer, t);
  if (!started) {
    return;
  }
  const clientA = await connectClient(socketPath);
  const clientB = await connectClient(socketPath);

  const waitA = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('clientA timeout')), 1500);
    clientA.once('data', (chunk) => {
      clearTimeout(timer);
      resolve(chunk.toString('utf8'));
    });
  });

  const waitB = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('clientB timeout')), 1500);
    clientB.once('data', (chunk) => {
      clearTimeout(timer);
      resolve(chunk.toString('utf8'));
    });
  });

  socketServer.broadcast('multi\n');
  const [outA, outB] = await Promise.all([waitA, waitB]);

  assert.equal(outA, 'multi\n');
  assert.equal(outB, 'multi\n');

  clientA.end();
  clientB.end();
  await closeServer(socketServer);
});

test('close cleans up socket file', async (t) => {
  const socketPath = createSocketPath('socket-cleanup');
  const socketServer = createSocketServer({ socketPath });

  const started = await startServer(socketServer, t);
  if (!started) {
    return;
  }
  assert.equal(fs.existsSync(socketPath), true);

  await closeServer(socketServer);
  assert.equal(fs.existsSync(socketPath), false);
});

test('rejects an unterminated input line above the configured limit', async (t) => {
  const socketPath = createSocketPath('socket-limit');
  const received = [];
  const socketServer = createSocketServer({
    socketPath,
    maxLineBytes: 8,
    onClientData: (line) => received.push(line)
  });

  const started = await startServer(socketServer, t);
  if (!started) {
    return;
  }
  const client = await connectClient(socketPath);
  const response = new Promise((resolve) => client.once('data', (chunk) => resolve(chunk.toString('utf8'))));

  client.write('123456789');

  assert.equal(await response, '[Input too long]\n');
  assert.deepEqual(received, []);
  client.destroy();
  await closeServer(socketServer);
});

test('refuses to delete a non-socket file at the configured path', async (t) => {
  const directory = fs.mkdtempSync('/tmp/loficlaude-socket-safety-');
  const socketPath = `${directory}/occupied`;
  fs.writeFileSync(socketPath, 'keep me');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const socketServer = createSocketServer({ socketPath });
  const error = await new Promise((resolve) => socketServer.start((startError) => resolve(startError)));

  assert.match(error?.message ?? '', /Refusing to replace non-socket path/);
  assert.equal(fs.readFileSync(socketPath, 'utf8'), 'keep me');
});

test('refuses to replace an active socket owned by another bridge instance', async (t) => {
  const socketPath = createSocketPath('socket-active');
  const first = createSocketServer({ socketPath });
  const started = await startServer(first, t);
  if (!started) {
    return;
  }
  const second = createSocketServer({ socketPath });

  const error = await new Promise((resolve) => second.start((startError) => resolve(startError)));

  assert.equal(error?.code, 'EADDRINUSE');
  const client = await connectClient(socketPath);
  client.destroy();
  await closeServer(first);
});

test('closing an older instance does not remove a successor socket', async (t) => {
  const socketPath = createSocketPath('socket-successor');
  const first = createSocketServer({ socketPath });
  const firstStarted = await startServer(first, t);
  if (!firstStarted) {
    return;
  }

  fs.unlinkSync(socketPath);
  const second = createSocketServer({ socketPath });
  const secondStarted = await startServer(second, t);
  if (!secondStarted) {
    await closeServer(first);
    return;
  }

  await closeServer(first);
  assert.equal(fs.existsSync(socketPath), true);
  const client = await connectClient(socketPath);
  client.destroy();
  await closeServer(second);
});

test('creates a private runtime directory for the socket', async (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'loficlaude-runtime-test-'));
  const runtimeDir = path.join(parent, 'runtime');
  const socketPath = path.join(runtimeDir, 'claude.sock');
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const socketServer = createSocketServer({ socketPath, runtimeDir });

  const started = await startServer(socketServer, t);
  if (!started) {
    return;
  }

  assert.equal(fs.statSync(runtimeDir).mode & 0o777, 0o700);
  await closeServer(socketServer);
});
