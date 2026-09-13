import test from 'node:test';
import assert from 'node:assert/strict';

import { createClaudeMotionState, getPatrolBounds, setChatPaused, updateClaudeMotion } from '../src/canvas/claudeMotion.js';

const viewport = { width: 1440, height: 900, playerExpanded: false };

test('Claude starts a patrol after an idle pause', () => {
  setChatPaused(false);
  const state = createClaudeMotionState(viewport.width, viewport.height);
  state.idleTime = 0;

  updateClaudeMotion(state, viewport, 0.05);
  assert.equal(state.mode, 'walk');

  const positionBeforeWalk = state.x;
  updateClaudeMotion(state, viewport, 0.05);
  assert.notEqual(state.x, positionBeforeWalk);
});

test('Claude falls back to the ground after a drag release', () => {
  setChatPaused(false);
  const state = createClaudeMotionState(viewport.width, viewport.height);
  const bounds = getPatrolBounds(viewport.width, viewport.height, false);
  state.y = bounds.y - 180;
  state.isFalling = true;
  state.velocityY = 0;

  updateClaudeMotion(state, viewport, 0.05);
  assert.ok(state.y > bounds.y - 180);
  assert.ok(state.y < bounds.y);

  for (let index = 0; index < 80 && state.isFalling; index += 1) {
    updateClaudeMotion(state, viewport, 0.05);
  }

  assert.equal(state.y, bounds.y);
  assert.equal(state.isFalling, false);
  assert.equal(state.mode, 'idle');
});

test('a high drop advances in small 60fps steps and does not overshoot the ground', () => {
  setChatPaused(false);
  const state = createClaudeMotionState(viewport.width, viewport.height);
  const bounds = getPatrolBounds(viewport.width, viewport.height, false);
  state.y = 72;
  state.isFalling = true;
  state.velocityY = 0;

  const dt = 1 / 60;
  let previousY = state.y;
  let frames = 0;
  while (state.isFalling && frames < 240) {
    updateClaudeMotion(state, viewport, dt);
    frames += 1;
    const step = state.y - previousY;
    assert.ok(step >= 0, 'fall must move downward or land');
    assert.ok(step <= 12, 'a 60fps fall step must stay visually continuous');
    assert.ok(state.y <= bounds.y);
    previousY = state.y;
  }

  assert.ok(frames > 20, 'a top-of-screen drop must last long enough to read as a fall');
  assert.equal(state.y, bounds.y);
  assert.equal(state.isFalling, false);
});
