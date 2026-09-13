import test from 'node:test';
import assert from 'node:assert/strict';

import { placeClaudeBubble } from '../src/utils/claudeBubbleLayout.js';

test('bubble placement is stable if measured width jitters by 1px', () => {
  const base = {
    anchorX: 640,
    anchorY: 400,
    viewportWidth: 1280,
    viewportHeight: 800,
    width: 360,
    height: 290
  };
  const a = placeClaudeBubble(base);
  const b = placeClaudeBubble({ ...base, width: 359, height: 291 });
  assert.equal(a.left, b.left);
  assert.equal(a.top, b.top);
});

test('bubble stays inside a desktop viewport', () => {
  const box = placeClaudeBubble({
    anchorX: 1200,
    anchorY: 40,
    viewportWidth: 1280,
    viewportHeight: 800
  });
  assert.ok(box.left >= 14);
  assert.ok(box.left + box.width <= 1280 - 14);
  assert.ok(box.top >= 84);
});
