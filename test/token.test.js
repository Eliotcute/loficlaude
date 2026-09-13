import test from 'node:test';
import assert from 'node:assert/strict';

import { createTokenManager } from '../bridge/token.js';

test('bridge token verification rejects empty, malformed, and near-match values', () => {
  const manager = createTokenManager();
  const nearMatch = `${manager.token.slice(0, -1)}${manager.token.endsWith('0') ? '1' : '0'}`;

  assert.equal(manager.verify(manager.token), true);
  assert.equal(manager.verify(''), false);
  assert.equal(manager.verify(manager.token.slice(1)), false);
  assert.equal(manager.verify(nearMatch), false);
  assert.equal(manager.verify('é'.repeat(manager.token.length)), false);
});

test('each Bridge process token manager starts with a fresh credential', () => {
  const first = createTokenManager();
  const second = createTokenManager();

  assert.notEqual(first.token, second.token);
  assert.equal(first.verify(second.token), false);
});
