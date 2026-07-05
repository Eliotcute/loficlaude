import test from 'node:test';
import assert from 'node:assert/strict';

import { createBridgeServer } from '../bridge/server.js';

class FakeSocket {
  static OPEN = 1;
  static CLOSED = 3;

  constructor() {
    this.readyState = FakeSocket.OPEN;
    this.OPEN = FakeSocket.OPEN;
    this.sent = [];
    this.handlers = {};
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }

  emit(event, payload) {
    this.handlers[event]?.(payload);
  }

  send(payload) {
    this.sent.push(payload);
  }

  close(code, reason) {
    this.readyState = FakeSocket.CLOSED;
    this.closeCode = code;
    this.closeReason = reason;
    this.emit('close');
  }
}

class FakeWebSocketServer {
  constructor() {
    this.clients = new Set();
    this.handlers = {};
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }
}

function createTestServer() {
  const fakeWss = new FakeWebSocketServer();

  const server = createBridgeServer({
    config: {
      host: '127.0.0.1',
      port: 9120,
      authTimeout: 1000,
      defaultModel: 'test-model',
      workspace: '/tmp'
    },
    tokenManager: {
      verify: () => true
    },
    WebSocketServerImpl: function WebSocketServerImpl() {
      return fakeWss;
    },
    sessionFactory: () => ({
      sendUserMessage() {},
      close() {}
    })
  });

  return { fakeWss, server };
}

function connectAuthenticatedClient(fakeWss) {
  const socket = new FakeSocket();
  fakeWss.clients.add(socket);
  fakeWss.handlers.connection(socket);
  socket.emit('message', Buffer.from(JSON.stringify({ type: 'auth', token: 'valid-token' })));
  return socket;
}

test('bridge server exposes websocket broadcast for authenticated user messages', () => {
  const { fakeWss, server } = createTestServer();
  const socket = connectAuthenticatedClient(fakeWss);

  socket.sent = [];
  server.broadcast({ type: 'user_message', text: 'hello', source: 'terminal' });

  assert.deepEqual(socket.sent, [JSON.stringify({ type: 'user_message', text: 'hello', source: 'terminal' })]);
  assert.ok(server.broadcast);
  assert.equal(typeof server.broadcast, 'function');
});

test('bridge server broadcast skips unauthenticated websocket clients', () => {
  const { fakeWss, server } = createTestServer();
  const authenticated = connectAuthenticatedClient(fakeWss);
  const unauthenticated = new FakeSocket();
  fakeWss.clients.add(unauthenticated);
  fakeWss.handlers.connection(unauthenticated);

  authenticated.sent = [];
  unauthenticated.sent = [];
  server.broadcast({ type: 'user_message', text: 'secret', source: 'terminal' });

  assert.deepEqual(authenticated.sent, [JSON.stringify({ type: 'user_message', text: 'secret', source: 'terminal' })]);
  assert.deepEqual(unauthenticated.sent, []);
  unauthenticated.close();
});
