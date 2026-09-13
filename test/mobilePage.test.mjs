import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('mobile uses same-origin socket, session exchange, cursor replay and revocation', () => {
  const html = readFileSync(new URL('../public/mobile.html', import.meta.url), 'utf8');
  const nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, { textContent: '', disabled: false, after() {}, scrollHeight: 10 });
    return nodes.get(key);
  };
  const timers = new Map();
  let timerId = 0;
  const sockets = [];
  class Socket {
    constructor(url) { this.url = url; this.readyState = 1; this.sent = []; sockets.push(this); }
    send(value) { this.sent.push(JSON.parse(value)); }
    close(code = 1006) { this.readyState = 3; this.onclose?.({ code }); }
    receive(value) { this.onmessage({ data: JSON.stringify(value) }); }
  }
  const storage = new Map();
  let cleaned = false;
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
    URLSearchParams, WebSocket: Socket,
    location: { hash: '', search: '?token=one-time', pathname: '/mobile.html', protocol: 'http:', host: '192.168.1.8:9121' },
    history: { replaceState() { cleaned = true; } },
    sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) },
    document: { querySelector: node, querySelectorAll: () => [node('button')], createElement: () => node('room') },
    setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    addEventListener() {}
  });
  assert.equal(cleaned, false);
  const first = sockets[0];
  assert.equal(first.url, 'ws://192.168.1.8:9121/ws');
  first.onopen();
  assert.equal(first.sent[0].token, 'one-time');
  first.receive({ type: 'mobile_session', token: 'session-secret' });
  first.receive({ type: 'ready', instanceId: 'instance' });
  assert.equal(cleaned, true);
  assert.match(node('#status').textContent, /手机已连接/);
  first.receive({ type: 'user_message', text: 'hello', instanceId: 'instance', eventId: 7 });
  const before = node('#messages').textContent;
  first.close();
  assert.equal(node('button').disabled, true);
  [...timers.values()][0]();
  const second = sockets[1];
  second.onopen();
  assert.equal(second.sent[0].token, 'session-secret');
  assert.equal(second.sent[0].cursor, 7);
  second.receive({ type: 'ready', instanceId: 'instance' });
  second.receive({ type: 'user_message', text: 'hello', instanceId: 'instance', eventId: 7 });
  assert.equal(node('#messages').textContent, before);
  second.close(4003);
  assert.match(node('#status').textContent, /重新|新码/);
  assert.equal(storage.get('lofi-mobile-session'), '');
});
