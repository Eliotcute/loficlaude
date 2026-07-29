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
  child.writeCallbacks = [];
  child.stdin = new EventEmitter();
  child.stdin.writable = true;
  child.stdin.write = (payload, callback) => {
    child.writes.push(payload);
    child.writeCallbacks.push(callback);
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

test('Claude session replays one active turn after a failed resume fallback', () => {
  const resumedChild = createFakeChild();
  const freshChild = createFakeChild();
  const children = [resumedChild, freshChild];
  const launches = [];
  const users = [];
  const statuses = [];
  let resumeFailures = 0;
  const session = createClaudeSession({
    sessionId: '11111111-1111-4111-8111-111111111111',
    resume: true,
    onUser: (text, source) => users.push([text, source]),
    onStatus: (status) => statuses.push(status),
    onResumeFailed(expectedSessionId) {
      resumeFailures += 1;
      assert.equal(expectedSessionId, '11111111-1111-4111-8111-111111111111');
      return { sessionId: '22222222-2222-4222-8222-222222222222', resume: false };
    },
    spawnImpl(command, args) {
      launches.push({ command, args });
      return children.shift();
    }
  });

  assert.equal(session.sendUserMessage('keep this turn', 'browser'), true);
  resumedChild.stdout.write(`${JSON.stringify({
    type: 'result',
    is_error: true,
    session_id: '11111111-1111-4111-8111-111111111111',
    errors: ['No conversation found with session ID: 11111111-1111-4111-8111-111111111111']
  })}\n`);
  resumedChild.emit('close');

  assert.equal(resumeFailures, 1);
  assert.deepEqual(launches[0].args.slice(-2), ['--resume', '11111111-1111-4111-8111-111111111111']);
  assert.deepEqual(launches[1].args.slice(-2), ['--session-id', '22222222-2222-4222-8222-222222222222']);
  assert.equal(freshChild.writes.length, 1);
  assert.equal(JSON.parse(freshChild.writes[0]).message.content[0].text, 'keep this turn');
  assert.deepEqual(users, [['keep this turn', 'browser']]);
  assert.equal(statuses.includes('disconnected'), false);

  resumedChild.writeCallbacks[0](new Error('late EPIPE'));
  assert.deepEqual(freshChild.killCalls, []);

  freshChild.emit('close');
  assert.equal(resumeFailures, 1);
  assert.equal(statuses.at(-1), 'disconnected');
});

test('Claude session does not replace a resume after an unconfirmed pre-init exit', () => {
  for (const exit of [
    { code: 1, signal: null },
    { code: null, signal: 'SIGTERM' }
  ]) {
    const child = createFakeChild();
    let resumeFailures = 0;
    const statuses = [];
    const session = createClaudeSession({
      sessionId: '11111111-1111-4111-8111-111111111111',
      resume: true,
      onResumeFailed: () => {
        resumeFailures += 1;
        return { sessionId: '22222222-2222-4222-8222-222222222222', resume: false };
      },
      onStatus: (status) => statuses.push(status),
      spawnImpl: () => child
    });

    assert.equal(session.sendUserMessage('keep this turn'), true);
    child.emit('close', exit.code, exit.signal);

    assert.equal(resumeFailures, 0);
    assert.equal(statuses.at(-1), 'disconnected');
  }
});

test('Claude session rejects near-match invalid-resume result signals', () => {
  const variants = [
    {
      session_id: '33333333-3333-4333-8333-333333333333',
      errors: ['No conversation found with session ID: 11111111-1111-4111-8111-111111111111']
    },
    {
      session_id: '11111111-1111-4111-8111-111111111111',
      errors: ['No conversation found with session ID: 33333333-3333-4333-8333-333333333333']
    },
    {
      session_id: '11111111-1111-4111-8111-111111111111',
      errors: ['Authentication failed']
    }
  ];

  for (const variant of variants) {
    const child = createFakeChild();
    let resumeFailures = 0;
    createClaudeSession({
      sessionId: '11111111-1111-4111-8111-111111111111',
      resume: true,
      onResumeFailed: () => {
        resumeFailures += 1;
        return { sessionId: '22222222-2222-4222-8222-222222222222', resume: false };
      },
      spawnImpl: () => child
    });

    child.stdout.write(`${JSON.stringify({ type: 'result', is_error: true, ...variant })}\n`);
    child.emit('close');
    assert.equal(resumeFailures, 0);
  }
});

test('Claude session does not replace a resume during explicit shutdown', () => {
  const child = createFakeChild();
  let resumeFailures = 0;
  const session = createClaudeSession({
    sessionId: '11111111-1111-4111-8111-111111111111',
    resume: true,
    onResumeFailed: () => {
      resumeFailures += 1;
      return { sessionId: '22222222-2222-4222-8222-222222222222', resume: false };
    },
    spawnImpl: () => child
  });

  session.close();
  child.emit('close');

  assert.equal(resumeFailures, 0);
});

test('Claude session ignores initialization output after explicit shutdown', () => {
  const child = createFakeChild();
  let initializations = 0;
  const session = createClaudeSession({
    onInitialized: () => {
      initializations += 1;
    },
    spawnImpl: () => child
  });

  session.close();
  child.stdout.write(`${JSON.stringify({ type: 'system', subtype: 'init' })}\n`);

  assert.equal(initializations, 0);
});

test('Claude session keeps an initialized resume after a later exit', () => {
  const child = createFakeChild();
  let resumeFailures = 0;
  createClaudeSession({
    sessionId: '11111111-1111-4111-8111-111111111111',
    resume: true,
    onResumeFailed: () => {
      resumeFailures += 1;
      return { sessionId: '22222222-2222-4222-8222-222222222222', resume: false };
    },
    spawnImpl: () => child
  });

  child.stdout.write(`${JSON.stringify({ type: 'system', subtype: 'init' })}\n`);
  child.emit('close');

  assert.equal(resumeFailures, 0);
});
