import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'svelte/store';

import { BridgeClient } from '../src/bridge/bridgeClient.js';
import {
  claudeStatus,
  connectionStatus,
  lastError,
  resetBridgeState,
  streamingText,
  toolRunning
} from '../src/stores/bridgeState.js';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.listeners = new Map();
    this.sent = [];
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatch('open');
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch('close');
  }
}

function read(store) {
  let value;
  const unsubscribe = store.subscribe((next) => {
    value = next;
  });
  unsubscribe();
  return value;
}

test('bridge client authenticates, forwards messages, and emits callbacks', () => {
  const client = new BridgeClient({ WebSocketImpl: FakeWebSocket, autoReconnect: false });
  const events = [];

  client.onStatus = (value) => events.push(['status', value]);
  client.onDelta = (value) => events.push(['delta', value]);
  client.onTool = (value) => events.push(['tool', value]);
  client.onError = (value) => events.push(['error', value]);
  client.onDisconnect = () => events.push(['disconnect']);

  assert.equal(client.connect('abc123'), true);
  const socket = client.socket;
  assert.ok(socket);
  assert.equal(socket.url, 'ws://localhost:9120');

  socket.open();
  assert.deepEqual(JSON.parse(socket.sent[0]), { type: 'auth', token: 'abc123' });

  assert.equal(client.sendMessage('hello bridge'), true);
  assert.deepEqual(JSON.parse(socket.sent[1]), { type: 'user_message', text: 'hello bridge' });

  socket.dispatch('message', { data: JSON.stringify({ type: 'status', value: 'working' }) });
  socket.dispatch('message', { data: JSON.stringify({ type: 'assistant_delta', text: 'hi' }) });
  socket.dispatch('message', { data: JSON.stringify({ type: 'tool_running', name: 'npm test' }) });
  socket.dispatch('message', { data: JSON.stringify({ type: 'error', message: 'boom' }) });
  socket.close();

  assert.deepEqual(events, [
    ['status', 'working'],
    ['delta', 'hi'],
    ['tool', 'npm test'],
    ['error', 'boom'],
    ['disconnect']
  ]);
});

test('bridge client cannot reuse a token after an explicit credential clear', () => {
  const client = new BridgeClient({ WebSocketImpl: FakeWebSocket, autoReconnect: false });
  const errors = [];
  client.onError = (message) => errors.push(message);

  assert.equal(client.connect('session-secret'), true);
  client.disconnect({ clearToken: true });

  assert.equal(client.connect(), false);
  assert.equal(errors.at(-1), 'Bridge token required');
});

test('bridge token state remains usable when session storage is blocked', async () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    sessionStorage: {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
      removeItem() {
        throw new Error('blocked');
      }
    }
  };

  try {
    const isolated = await import('../src/stores/bridgeState.js?blocked-session-storage');
    isolated.bridgeToken.set('session-secret');
    isolated.bridgeToken.set('');
    assert.equal(get(isolated.bridgeToken), '');
  } finally {
    globalThis.window = originalWindow;
  }
});

test('resetBridgeState restores shared bridge stores', () => {
  connectionStatus.set('connected');
  claudeStatus.set('working');
  streamingText.set('partial');
  toolRunning.set('npm run build');
  lastError.set('bad token');

  resetBridgeState();

  assert.equal(read(connectionStatus), 'disconnected');
  assert.equal(read(claudeStatus), 'disconnected');
  assert.equal(read(streamingText), '');
  assert.equal(read(toolRunning), null);
  assert.equal(read(lastError), '');
});

test('bridge client persists its replay cursor and skips duplicate events', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  const first = new BridgeClient({ WebSocketImpl: FakeWebSocket, autoReconnect: false, storage });
  const firstDeltas = [];
  first.onDelta = (text) => firstDeltas.push(text);
  first.connect('secret');
  first.socket.open();
  first.socket.dispatch('message', { data: JSON.stringify({ type: 'ready', instanceId: 'server-a' }) });
  first.socket.dispatch('message', {
    data: JSON.stringify({ type: 'assistant_delta', text: 'one', instanceId: 'server-a', eventId: 1 })
  });

  const second = new BridgeClient({ WebSocketImpl: FakeWebSocket, autoReconnect: false, storage });
  const secondDeltas = [];
  second.onDelta = (text) => secondDeltas.push(text);
  second.connect('secret');
  second.socket.open();

  assert.deepEqual(JSON.parse(second.socket.sent[0]), {
    type: 'auth',
    token: 'secret',
    instanceId: 'server-a',
    cursor: 1
  });

  second.socket.dispatch('message', {
    data: JSON.stringify({ type: 'assistant_delta', text: 'duplicate', instanceId: 'server-a', eventId: 1 })
  });
  second.socket.dispatch('message', {
    data: JSON.stringify({ type: 'assistant_delta', text: 'two', instanceId: 'server-a', eventId: 2 })
  });

  assert.deepEqual(firstDeltas, ['one']);
  assert.deepEqual(secondDeltas, ['two']);
});

test('an old socket closing cannot clear a newer connection', () => {
  const client = new BridgeClient({ WebSocketImpl: FakeWebSocket, autoReconnect: false });
  client.connect('secret');
  const oldSocket = client.socket;
  oldSocket.open();
  oldSocket.readyState = FakeWebSocket.CLOSED;

  client.connect('secret');
  const currentSocket = client.socket;
  oldSocket.dispatch('close');

  assert.equal(client.socket, currentSocket);
});

test('bridge client surfaces a truncated replay window', () => {
  const client = new BridgeClient({ WebSocketImpl: FakeWebSocket, autoReconnect: false });
  let gaps = 0;
  client.onReplayGap = () => {
    gaps += 1;
  };
  client.connect('secret');
  client.socket.open();

  client.socket.dispatch('message', {
    data: JSON.stringify({ type: 'ready', instanceId: 'server-a', replayTruncated: true })
  });

  assert.equal(gaps, 1);
});
