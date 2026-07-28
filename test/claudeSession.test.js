import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import { createClaudeSession } from '../bridge/claude.js';

function createFakeChild() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.writes = [];
  child.stdin = new EventEmitter();
  child.stdin.writable = true;
  child.stdin.write = (payload) => {
    child.writes.push(payload);
    return true;
  };
  child.killCalls = [];
  child.kill = (signal) => child.killCalls.push(signal);
  return child;
}

test('Claude session uses an explicit session id and resume mode', () => {
  const launches = [];
  const firstChild = createFakeChild();
  createClaudeSession({
    sessionId: '11111111-1111-4111-8111-111111111111',
    resume: false,
    spawnImpl(command, args, options) {
      launches.push({ command, args, options });
      return firstChild;
    }
  });

  const resumedChild = createFakeChild();
  createClaudeSession({
    sessionId: '11111111-1111-4111-8111-111111111111',
    resume: true,
    spawnImpl(command, args, options) {
      launches.push({ command, args, options });
      return resumedChild;
    }
  });

  assert.deepEqual(launches[0].args.slice(-2), ['--session-id', '11111111-1111-4111-8111-111111111111']);
  assert.deepEqual(launches[1].args.slice(-2), ['--resume', '11111111-1111-4111-8111-111111111111']);
});

test('Claude session confirms initialization only after the CLI init event', () => {
  const child = createFakeChild();
  let initialized = 0;
  createClaudeSession({
    onInitialized: () => {
      initialized += 1;
    },
    spawnImpl: () => child
  });

  assert.equal(initialized, 0);
  child.stdout.write(`${JSON.stringify({ type: 'system', subtype: 'init' })}\n`);
  child.stdout.write(`${JSON.stringify({ type: 'system', subtype: 'init' })}\n`);
  assert.equal(initialized, 1);
});

test('Claude session preserves UTF-8 text split across stdout chunks', () => {
  const child = createFakeChild();
  const deltas = [];
  createClaudeSession({
    onDelta: (text) => deltas.push(text),
    spawnImpl: () => child
  });
  const line = Buffer.from(`${JSON.stringify({
    type: 'stream_event',
    event: { delta: { type: 'text_delta', text: '中文🙂' } }
  })}\n`);
  const splitAt = line.indexOf(Buffer.from('中')) + 1;

  child.stdout.write(line.subarray(0, splitAt));
  child.stdout.write(line.subarray(splitAt));

  assert.deepEqual(deltas, ['中文🙂']);
});

test('Claude session serializes concurrent browser and terminal turns', () => {
  const child = createFakeChild();
  const users = [];
  const session = createClaudeSession({
    onUser: (text, source) => users.push([text, source]),
    spawnImpl: () => child
  });

  assert.equal(session.sendUserMessage('first', 'browser'), true);
  assert.equal(session.sendUserMessage('second', 'terminal'), true);
  assert.equal(child.writes.length, 1);
  assert.deepEqual(users, [['first', 'browser']]);

  child.stdout.write(`${JSON.stringify({ type: 'result', result: 'done' })}\n`);

  assert.equal(child.writes.length, 2);
  assert.deepEqual(users, [
    ['first', 'browser'],
    ['second', 'terminal']
  ]);
});

test('Claude session terminates on an unterminated oversized output line', () => {
  const child = createFakeChild();
  const errors = [];
  createClaudeSession({
    onError: (message) => errors.push(message),
    maxOutputLineChars: 16,
    spawnImpl: () => child
  });

  child.stdout.write('x'.repeat(17));

  assert.deepEqual(child.killCalls, ['SIGTERM']);
  assert.equal(errors.at(-1), 'Claude output exceeded the safety limit');
});

test('Claude session does not duplicate a complete assistant message in the result event', () => {
  const child = createFakeChild();
  const deltas = [];
  const session = createClaudeSession({
    onDelta: (text) => deltas.push(text),
    spawnImpl: () => child
  });

  session.sendUserMessage('hello');
  child.stdout.write(`${JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'text', text: 'one answer' }] }
  })}\n`);
  child.stdout.write(`${JSON.stringify({ type: 'result', result: 'one answer' })}\n`);

  assert.deepEqual(deltas, ['one answer']);
});

test('Claude session does not expose unexpected raw stdout as assistant text', () => {
  const child = createFakeChild();
  const deltas = [];
  const errors = [];
  createClaudeSession({
    onDelta: (text) => deltas.push(text),
    onError: (message) => errors.push(message),
    spawnImpl: () => child
  });

  child.stdout.write('/Users/example/private/path\n');

  assert.deepEqual(deltas, []);
  assert.equal(errors.at(-1), 'Claude returned invalid output');
  assert.deepEqual(child.killCalls, ['SIGTERM']);
});

test('Claude session converts stdin write failures into a bounded session error', () => {
  const child = createFakeChild();
  child.stdin.write = () => {
    throw new Error('private write failure');
  };
  const errors = [];
  const users = [];
  const session = createClaudeSession({
    onError: (message) => errors.push(message),
    onUser: (text) => users.push(text),
    spawnImpl: () => child
  });

  assert.equal(session.sendUserMessage('hello'), false);
  assert.deepEqual(users, []);
  assert.equal(errors.at(-1), 'Claude input is unavailable');
  assert.deepEqual(child.killCalls, ['SIGTERM']);
});

test('Claude session rejects a message when stdin is not writable', () => {
  const child = createFakeChild();
  child.stdin.writable = false;
  const errors = [];
  const session = createClaudeSession({
    onError: (message) => errors.push(message),
    spawnImpl: () => child
  });

  assert.equal(session.sendUserMessage('hello'), false);
  assert.equal(errors.at(-1), 'Claude input is unavailable');
  assert.deepEqual(child.killCalls, ['SIGTERM']);
});

test('Claude session retires after an asynchronous stdin error', () => {
  const child = createFakeChild();
  const statuses = [];
  const errors = [];
  const session = createClaudeSession({
    onStatus: (status) => statuses.push(status),
    onError: (message) => errors.push(message),
    spawnImpl: () => child
  });

  assert.equal(session.sendUserMessage('hello'), true);
  child.stdin.emit('error', Object.assign(new Error('broken pipe'), { code: 'EPIPE' }));

  assert.equal(session.sendUserMessage('after failure'), false);
  assert.equal(statuses.at(-1), 'blocked');
  assert.equal(errors.at(-1), 'Claude input is unavailable');
  assert.deepEqual(child.killCalls, ['SIGTERM']);
});
