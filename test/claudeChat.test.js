import test from 'node:test';
import assert from 'node:assert/strict';

import { ClaudeChat, fallbackLines } from '../src/ai/ClaudeChat.js';

test('local companion never sends browser messages with an API key', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('browser API requests are forbidden');
  };

  try {
    const chat = new ClaudeChat('legacy-browser-secret');
    const reply = await chat.getResponse('private conversation', { sceneName: 'Lofi Night' });

    assert.equal(fetchCalls, 0);
    assert.ok(fallbackLines.includes(reply));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
