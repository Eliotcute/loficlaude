import test from 'node:test';
import assert from 'node:assert/strict';

import { createSessionController } from '../src/utils/session.js';

test('activity callbacks fire only on idle/active edges', () => {
  const originalWindow = globalThis.window;
  const originalNow = Date.now;
  let tick = null;
  let now = 1000;
  Date.now = () => now;
  globalThis.window = { setInterval(callback) { tick = callback; return 1; } };
  const events = [];
  try {
    const session = createSessionController({
      getHasStarted: () => true,
      onIdleStart: () => events.push('idle'),
      onIdleEnd: () => events.push('active')
    });
    session.start();
    for (let i = 0; i < 20; i += 1) session.markActivity();
    assert.deepEqual(events, []);

    now += 6000;
    tick();
    tick();
    assert.deepEqual(events, ['idle']);

    session.markActivity();
    session.markActivity();
    assert.deepEqual(events, ['idle', 'active']);
  } finally {
    Date.now = originalNow;
    globalThis.window = originalWindow;
  }
});
