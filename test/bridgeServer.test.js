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
  constructor(options = {}) {
    this.options = options;
    this.clients = new Set();
    this.handlers = {};
    this.closeCalls = 0;
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }

  close(callback) {
    this.closeCalls += 1;
    callback?.();
  }
}

function createTestServer(overrides = {}) {
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
    }),
    ...overrides
  });

  return { fakeWss, server };
}

function connectAuthenticatedClient(fakeWss, auth = {}) {
  const socket = new FakeSocket();
  fakeWss.clients.add(socket);
  fakeWss.handlers.connection(socket, { headers: { origin: 'http://localhost:5173' } });
  socket.emit('message', Buffer.from(JSON.stringify({ type: 'auth', token: 'valid-token', ...auth })));
  return socket;
}

function parsedMessages(socket) {
  return socket.sent.map((payload) => JSON.parse(payload));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const flushMusic = () => new Promise((resolve) => setImmediate(resolve));
const sendChat = (socket, text) => socket.emit('message', Buffer.from(JSON.stringify({ type: 'user_message', text })));
const choices = (prefix) => [1, 2].map((id) => ({ id: `${prefix}${id}`, originalId: `${prefix}${id}`, name: `Playlist ${prefix}-${id}` }));

function musicHarness() {
  const searches = [];
  const plays = [];
  const commands = [];
  const chats = [];
  let callbacks;
  const harness = createTestServer({
    musicControllerFactory(options) {
      callbacks = options;
      return {
        getState: () => ({ provider: 'netease-local', status: 'idle' }),
        searchPlaylists() { const pending = deferred(); searches.push(pending); return pending.promise; },
        playPlaylistById(record) { plays.push(record); return Promise.resolve(true); },
        command(action) { commands.push(action); return Promise.resolve(true); }
      };
    },
    sessionFactory: () => ({ sendUserMessage(text, source) { chats.push({ text, source }); return true; }, close() {} })
  });
  return { ...harness, searches, plays, commands, chats, callbacks };
}

test('music choices are private across simultaneous browser searches and replay', async (t) => {
  const h = musicHarness();
  t.after(() => h.server.close());
  const a = connectAuthenticatedClient(h.fakeWss);
  const b = connectAuthenticatedClient(h.fakeWss);
  sendChat(a, '播放 lofi');
  sendChat(b, '播放 lofi');
  h.searches[1].resolve(choices('2'));
  h.searches[0].resolve(choices('1'));
  await flushMusic();
  assert.deepEqual(parsedMessages(a).filter((e) => e.type === 'music_search_results').map((e) => e.choices), [choices('1')]);
  assert.deepEqual(parsedMessages(b).filter((e) => e.type === 'music_search_results').map((e) => e.choices), [choices('2')]);
  sendChat(a, '播放第二个');
  sendChat(b, '播放第一个');
  await flushMusic();
  assert.deepEqual(h.plays, [choices('1')[1], choices('2')[0]]);
  const c = connectAuthenticatedClient(h.fakeWss);
  assert.equal(parsedMessages(c).some((e) => ['music_search_results', 'music_intent'].includes(e.type)), false);
});

test('new searches, cancellation and disconnection invalidate pending search results', async (t) => {
  const h = musicHarness();
  t.after(() => h.server.close());
  const a = connectAuthenticatedClient(h.fakeWss);
  sendChat(a, '播放 lofi');
  sendChat(a, '播放 lofi');
  h.searches[1].resolve(choices('2'));
  await flushMusic();
  const currentCount = a.sent.length;
  h.searches[0].resolve([choices('1')[0]]);
  await flushMusic();
  assert.equal(a.sent.length, currentCount, 'stale result must not emit completion');
  assert.deepEqual(h.plays, []);
  sendChat(a, '播放第二个');
  await flushMusic();
  assert.deepEqual(h.plays, [choices('2')[1]]);
  sendChat(a, '播放 lofi');
  sendChat(a, '取消');
  const cancelledCount = a.sent.length;
  h.searches[2].resolve([choices('3')[0]]);
  await flushMusic();
  assert.equal(a.sent.length, cancelledCount, 'cancelled result must stay silent');
  sendChat(a, '播放 lofi');
  a.close();
  h.searches[3].resolve([choices('4')[0]]);
  await flushMusic();
  assert.deepEqual(h.plays, [choices('2')[1]]);
  assert.equal(h.chats.some((c) => c.text === '取消'), false);
});

test('reconnect, invalid selection and terminal text cannot reuse browser candidates', async (t) => {
  const h = musicHarness();
  t.after(() => h.server.close());
  const a = connectAuthenticatedClient(h.fakeWss);
  sendChat(a, '播放 lofi');
  h.searches[0].resolve(choices('1'));
  await flushMusic();
  h.server.sendUserMessage('播放第二个', 'terminal');
  h.server.sendUserMessage('暂停音乐', 'terminal');
  a.close();
  const b = connectAuthenticatedClient(h.fakeWss);
  sendChat(b, '播放第二个');
  await flushMusic();
  assert.deepEqual(h.plays, []);
  assert.deepEqual(h.commands, []);
  assert.equal(parsedMessages(b).at(-1).status, 'failed');
  assert.equal(h.chats.filter((c) => c.source === 'terminal').length, 2);
});

test('music failures do not emit Claude errors or interrupt shared chat', async (t) => {
  const h = musicHarness();
  t.after(() => h.server.close());
  const a = connectAuthenticatedClient(h.fakeWss);
  sendChat(a, '播放 lofi');
  h.searches[0].reject(new Error('simulated music failure'));
  h.callbacks.onError('网易云暂时不可用');
  await flushMusic();
  assert.ok(parsedMessages(a).some((e) => e.type === 'music_intent' && e.status === 'failed'));
  assert.ok(parsedMessages(a).some((e) => e.type === 'music_error'));
  assert.equal(parsedMessages(a).some((e) => e.type === 'error'), false);
  assert.equal(h.chats.some((c) => c.text === '播放 lofi'), false);
});

test('saved playlists use the validated music adapter without invoking Claude', async (t) => {
  const h = musicHarness();
  t.after(() => h.server.close());
  const socket = connectAuthenticatedClient(h.fakeWss);
  const playlist = choices('1')[0];
  socket.emit('message', Buffer.from(JSON.stringify({ type: 'music_command', command: 'play_playlist', playlist })));
  await flushMusic();
  assert.deepEqual(h.plays, [playlist]);
  assert.deepEqual(h.chats, []);
  assert.ok(parsedMessages(socket).some((e) => e.type === 'music_intent' && e.status === 'completed'));
});

test('bridge server exposes websocket broadcast for authenticated user messages', () => {
  const { fakeWss, server } = createTestServer();
  const socket = connectAuthenticatedClient(fakeWss);

  socket.sent = [];
  server.broadcast({ type: 'user_message', text: 'hello', source: 'terminal' });

  const delivered = parsedMessages(socket);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].type, 'user_message');
  assert.equal(delivered[0].text, 'hello');
  assert.equal(delivered[0].source, 'terminal');
  assert.ok(delivered[0].eventId > 0);
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

  assert.deepEqual(parsedMessages(authenticated).map((message) => message.text), ['secret']);
  assert.deepEqual(unauthenticated.sent, []);
  unauthenticated.close();
});

test('bridge server keeps one Claude session across browser reconnects', () => {
  const fakeWss = new FakeWebSocketServer();
  const sessions = [];
  const server = createBridgeServer({
    config: {
      host: '127.0.0.1',
      port: 9120,
      authTimeout: 1000,
      defaultModel: 'test-model',
      workspace: '/tmp'
    },
    tokenManager: { verify: () => true },
    WebSocketServerImpl: function WebSocketServerImpl() {
      return fakeWss;
    },
    sessionFactory: () => {
      const session = {
        messages: [],
        closeCalls: 0,
        sendUserMessage(text, source) {
          this.messages.push([text, source]);
        },
        close() {
          this.closeCalls += 1;
        }
      };
      sessions.push(session);
      return session;
    }
  });

  const firstSocket = connectAuthenticatedClient(fakeWss);
  firstSocket.close();
  const secondSocket = connectAuthenticatedClient(fakeWss);
  secondSocket.emit('message', Buffer.from(JSON.stringify({ type: 'user_message', text: 'continue here' })));

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].closeCalls, 0);
  assert.deepEqual(sessions[0].messages, [['continue here', 'browser']]);
  assert.ok(server);
});

test('bridge server replays events missed by a reconnecting browser', () => {
  const { fakeWss, server } = createTestServer();
  const firstSocket = connectAuthenticatedClient(fakeWss);
  const ready = parsedMessages(firstSocket).find((message) => message.type === 'ready');

  firstSocket.sent = [];
  server.broadcast({ type: 'assistant_delta', text: 'first' });
  const cursor = parsedMessages(firstSocket).at(-1).eventId;
  firstSocket.close();
  server.broadcast({ type: 'assistant_delta', text: ' missed' });

  const secondSocket = connectAuthenticatedClient(fakeWss, {
    instanceId: ready.instanceId,
    cursor
  });
  const replayed = parsedMessages(secondSocket).filter((message) => message.type === 'assistant_delta');

  assert.deepEqual(replayed.map((message) => message.text), [' missed']);
  assert.ok(replayed[0].eventId > cursor);
});

test('bridge server rejects non-loopback browser origins', () => {
  const { fakeWss } = createTestServer();
  const socket = new FakeSocket();

  fakeWss.handlers.connection(socket, { headers: { origin: 'https://example.com' } });

  assert.equal(socket.closeCode, 4003);
  assert.equal(socket.closeReason, 'Origin not allowed');
});

test('bridge server rejects oversized user messages before starting Claude', () => {
  const fakeWss = new FakeWebSocketServer();
  let sessionCount = 0;
  createBridgeServer({
    config: {
      host: '127.0.0.1',
      port: 9120,
      authTimeout: 1000,
      defaultModel: 'test-model',
      workspace: '/tmp',
      maxUserMessageChars: 8
    },
    tokenManager: { verify: () => true },
    WebSocketServerImpl: function WebSocketServerImpl(options) {
      fakeWss.options = options;
      return fakeWss;
    },
    sessionFactory: () => {
      sessionCount += 1;
      return { sendUserMessage() {}, close() {} };
    }
  });

  const socket = connectAuthenticatedClient(fakeWss);
  socket.sent = [];
  socket.emit('message', Buffer.from(JSON.stringify({ type: 'user_message', text: '123456789' })));

  assert.equal(sessionCount, 1);
  assert.equal(parsedMessages(socket).at(-1).message, 'Message too long');
  assert.equal(fakeWss.options.maxPayload, 64 * 1024);
});

test('bridge server enforces the user message limit in UTF-8 bytes', () => {
  const fakeWss = new FakeWebSocketServer();
  const accepted = [];
  const server = createBridgeServer({
    config: {
      host: '127.0.0.1',
      port: 9120,
      authTimeout: 1000,
      defaultModel: 'test-model',
      workspace: '/tmp',
      maxUserMessageChars: 32,
      maxUserMessageBytes: 8
    },
    tokenManager: { verify: () => true },
    WebSocketServerImpl: function WebSocketServerImpl() {
      return fakeWss;
    },
    sessionFactory: () => ({
      sendUserMessage(text) {
        accepted.push(text);
        return true;
      },
      close() {}
    })
  });
  const socket = connectAuthenticatedClient(fakeWss);
  socket.sent = [];

  socket.emit('message', Buffer.from(JSON.stringify({ type: 'user_message', text: '中文中' })));

  assert.deepEqual(accepted, []);
  assert.equal(parsedMessages(socket).at(-1).message, 'Message too long');
  assert.equal(server.sendUserMessage('中文中', 'terminal'), false);
});

test('bridge server exposes one shared sender for browser and terminal and closes once', () => {
  const fakeWss = new FakeWebSocketServer();
  const messages = [];
  let closeCalls = 0;
  const server = createBridgeServer({
    config: {
      host: '127.0.0.1',
      port: 9120,
      authTimeout: 1000,
      defaultModel: 'test-model',
      workspace: '/tmp'
    },
    tokenManager: { verify: () => true },
    WebSocketServerImpl: function WebSocketServerImpl() {
      return fakeWss;
    },
    sessionFactory: () => ({
      sendUserMessage(text, source) {
        messages.push([text, source]);
        return true;
      },
      close() {
        closeCalls += 1;
      }
    })
  });

  assert.equal(server.sendUserMessage('from terminal', 'terminal'), true);
  const socket = connectAuthenticatedClient(fakeWss);
  socket.emit('message', Buffer.from(JSON.stringify({ type: 'user_message', text: 'from browser' })));
  server.close();
  server.close();

  assert.deepEqual(messages, [
    ['from terminal', 'terminal'],
    ['from browser', 'browser']
  ]);
  assert.equal(closeCalls, 1);
  assert.equal(fakeWss.closeCalls, 1);
});

test('bridge server reports when a reconnect cursor fell behind the replay window', () => {
  const fakeWss = new FakeWebSocketServer();
  const server = createBridgeServer({
    config: {
      host: '127.0.0.1',
      port: 9120,
      authTimeout: 1000,
      defaultModel: 'test-model',
      workspace: '/tmp',
      eventHistoryLimit: 1
    },
    tokenManager: { verify: () => true },
    WebSocketServerImpl: function WebSocketServerImpl() {
      return fakeWss;
    },
    sessionFactory: () => ({ sendUserMessage() {}, close() {} })
  });

  const firstSocket = connectAuthenticatedClient(fakeWss);
  const ready = parsedMessages(firstSocket).find((message) => message.type === 'ready');
  server.broadcast({ type: 'assistant_delta', text: 'one' });
  const cursor = parsedMessages(firstSocket).at(-1).eventId;
  firstSocket.close();
  server.broadcast({ type: 'assistant_delta', text: 'two' });
  server.broadcast({ type: 'assistant_delta', text: 'three' });

  const secondSocket = connectAuthenticatedClient(fakeWss, { instanceId: ready.instanceId, cursor });
  const secondReady = parsedMessages(secondSocket).find((message) => message.type === 'ready');

  assert.equal(secondReady.replayTruncated, true);
});

test('bridge server caps simultaneous websocket clients', () => {
  const fakeWss = new FakeWebSocketServer();
  createBridgeServer({
    config: {
      host: '127.0.0.1',
      port: 9120,
      authTimeout: 1000,
      defaultModel: 'test-model',
      workspace: '/tmp',
      maxWebSocketClients: 1
    },
    tokenManager: { verify: () => true },
    WebSocketServerImpl: function WebSocketServerImpl() {
      return fakeWss;
    },
    sessionFactory: () => ({ sendUserMessage() {}, close() {} })
  });

  connectAuthenticatedClient(fakeWss);
  const extra = new FakeSocket();
  fakeWss.clients.add(extra);
  fakeWss.handlers.connection(extra, { headers: { origin: 'http://localhost:5173' } });

  assert.equal(extra.closeCode, 1013);
  assert.equal(extra.closeReason, 'Too many clients');
});

test('bridge server closes a slow client before a new frame exceeds its buffer limit', () => {
  const fakeWss = new FakeWebSocketServer();
  const server = createBridgeServer({
    config: {
      host: '127.0.0.1',
      port: 9120,
      authTimeout: 1000,
      defaultModel: 'test-model',
      workspace: '/tmp',
      maxClientBufferBytes: 64
    },
    tokenManager: { verify: () => true },
    WebSocketServerImpl: function WebSocketServerImpl() {
      return fakeWss;
    },
    sessionFactory: () => ({ sendUserMessage() {}, close() {} })
  });
  const socket = connectAuthenticatedClient(fakeWss);
  socket.sent = [];
  socket.bufferedAmount = 32;

  server.broadcast({ type: 'assistant_delta', text: 'x'.repeat(64) });

  assert.equal(socket.closeCode, 1009);
  assert.equal(socket.sent.length, 0);
});

test('room updates reach live clients without entering the replay window', () => {
  const { fakeWss, server } = createTestServer();
  const room = connectAuthenticatedClient(fakeWss);
  const ready = parsedMessages(room).find((message) => message.type === 'ready');
  const watcher = connectAuthenticatedClient(fakeWss);
  watcher.sent = [];
  const update = { scene: 'lofiNight', rain: { type: 'medium', status: 'idle', volume: 60, muted: false }, timer: { active: true, remainingSeconds: 10 }, companion: { state: 'idle', form: 0 } };
  room.emit('message', Buffer.from(JSON.stringify({ type: 'room_update', value: update })));

  const live = parsedMessages(watcher).filter((message) => message.type === 'room_state');
  assert.equal(live.length, 1);
  assert.equal(live[0].eventId, undefined);

  server.broadcast({ type: 'assistant_delta', text: 'kept' });
  const reconnected = connectAuthenticatedClient(fakeWss, { instanceId: ready.instanceId, cursor: 0 });
  const replayedRoomStates = parsedMessages(reconnected).filter((message) => message.type === 'room_state' && message.eventId);
  assert.equal(replayedRoomStates.length, 0);
});
