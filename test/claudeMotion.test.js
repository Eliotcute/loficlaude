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
