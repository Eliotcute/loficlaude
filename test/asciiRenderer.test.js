import test from 'node:test';
import assert from 'node:assert/strict';

import { canvasBufferSize } from '../src/canvas/asciiRenderer.js';

test('canvas buffer keeps modest viewports 1:1', () => {
  assert.deepEqual(canvasBufferSize(1280, 720), { width: 1280, height: 720 });
});

test('canvas buffer caps ultrawide displays so scene rebuilds stay bounded', () => {
  const next = canvasBufferSize(4082, 1762);
  assert.equal(next.width, 1280);
  assert.ok(next.height < 1762);
  assert.ok(next.width * next.height < 4082 * 1762);
});
