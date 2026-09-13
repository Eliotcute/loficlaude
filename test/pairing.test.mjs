import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { createPairingManager } = createRequire(import.meta.url)('../bridge/pairing.js');

test('pairing tokens are one-time and expire', () => {
  let time = 0;
  const manager = createPairingManager({ ttlMs: 100, now: () => time });
  const issued = manager.issue();
  assert.equal(manager.consume(issued.token), true);
  assert.equal(manager.consume(issued.token), false);
  const next = manager.issue();
  time = 101;
  assert.equal(manager.consume(next.token), false);
});

test('pairing exchanges one-time token for a revocable session token', () => {
  const manager = createPairingManager();
  const issued = manager.issue();
  assert.equal(manager.consume(issued.token), true);
  const session = manager.createSession();
  assert.equal(manager.verifySession(session), true);
  manager.revoke();
  assert.equal(manager.verifySession(session), false);
});
