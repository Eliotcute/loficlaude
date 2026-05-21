import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';

import { createSocketServer } from '../bridge/socketServer.js';

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
