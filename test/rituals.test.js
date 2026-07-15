import test from 'node:test';
import assert from 'node:assert/strict';

import { createSessionSummary, getCompanionStatusCopy, getStartRitualCopy } from '../src/utils/rituals.js';

test('creates a returning-user start ritual copy', () => {
  const copy = getStartRitualCopy({
    sceneName: 'Soft Rain',
    trackName: 'Lofi Girl',
    rainVolume: 55,
    streakDays: 3
  });

  assert.match(copy, /第 3 天/);
  assert.match(copy, /Soft Rain/);
  assert.match(copy, /55%/);
});

test('creates companion state copy for core states', () => {
  assert.equal(getCompanionStatusCopy('listening'), '我在听。');
  assert.equal(getCompanionStatusCopy('resting'), '我先安静陪着。');
  assert.equal(getCompanionStatusCopy('unknown'), '还在呢。');
});

test('creates a concise session summary', () => {
  assert.equal(createSessionSummary({ minutes: 25, sceneName: 'Lofi Night' }), '刚刚在 Lofi Night 陪你专注了 25 分钟。');
  assert.equal(createSessionSummary({ minutes: 0, sceneName: 'Lofi Night' }), '');
});
