import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFocusSnapshot,
  createStartedFocusSnapshot,
  incrementActiveFocusMinute,
  normalizeTrackIndex,
  normalizeTrackTitle,
  parseFocusSnapshot,
  parsePersistedSnapshot,
  readStorageValue,
  writeStorageValue
} from '../src/utils/appPersistence.js';

const playlist = [
  { name: 'First track' },
  { name: 'Second track' },
  { name: 'Third track' }
];

test('normalizes track indexes against a playlist length', () => {
  assert.equal(normalizeTrackIndex(4, playlist.length), 1);
  assert.equal(normalizeTrackIndex(-1, playlist.length), 2);
});

test('normalizes track titles using the provided playlist', () => {
  assert.equal(normalizeTrackTitle(4, playlist), 'Second track');
  assert.equal(normalizeTrackTitle(-1, playlist), 'Third track');
});

test('parses persisted snapshots with playlist-aware track data', () => {
  const restored = parsePersistedSnapshot(
    JSON.stringify({
      lastTrackIndex: 4,
      rainVolume: 120,
      rainType: 'storm',
      currentScene: 'missing',
      sceneLocked: true
    }),
    playlist
  );

  assert.equal(restored.trackIndex, 1);
  assert.equal(restored.trackTitle, 'Second track');
  assert.equal(restored.rainVolume, 100);
  assert.equal(restored.rainType, 'medium');
  assert.equal(restored.currentScene, 'lofiNight');
  assert.equal(restored.sceneLocked, true);
});

test('parses daily focus snapshots for the current day only', () => {
  const today = new Date('2026-07-15T08:00:00.000Z');
  const yesterday = new Date('2026-07-14T08:00:00.000Z');

  const current = parseFocusSnapshot(JSON.stringify(createFocusSnapshot({ todayMinutes: 42 }, today)), today);
  assert.equal(current.todayMinutes, 42);

  const stale = parseFocusSnapshot(JSON.stringify(createFocusSnapshot({ todayMinutes: 42 }, yesterday)), today);
  assert.equal(stale.todayMinutes, 0);
  assert.equal(stale.date, '2026-07-14');
});

test('normalizes invalid focus minutes to zero', () => {
  const today = new Date('2026-07-15T08:00:00.000Z');
  const parsed = parseFocusSnapshot(JSON.stringify({ date: '2026-07-15', todayMinutes: 'not-a-number' }), today);

  assert.equal(parsed.todayMinutes, 0);
});

test('advances focus streak and session count when a room starts', () => {
  const today = new Date('2026-07-15T08:00:00.000Z');
  const yesterday = new Date('2026-07-14T08:00:00.000Z');
  const previous = createFocusSnapshot({ todayMinutes: 12, streakDays: 2, sessionCount: 3 }, yesterday);

  const started = createStartedFocusSnapshot(previous, today);

  assert.equal(started.todayMinutes, 0);
  assert.equal(started.streakDays, 3);
  assert.equal(started.sessionCount, 1);

  const secondStart = createStartedFocusSnapshot(started, today);
  assert.equal(secondStart.streakDays, 3);
  assert.equal(secondStart.sessionCount, 2);
});

test('starts the first same-day focus session at a one-day streak', () => {
  const today = new Date('2026-07-15T08:00:00.000Z');
  const restored = createFocusSnapshot({ todayMinutes: 0, streakDays: 0, sessionCount: 0 }, today);
  const started = createStartedFocusSnapshot(restored, today);

  assert.equal(started.streakDays, 1);
  assert.equal(started.sessionCount, 1);
});

test('starts a new active focus day when a running room crosses midnight', () => {
  const yesterday = new Date('2026-07-15T08:00:00.000Z');
  const today = new Date('2026-07-16T08:00:00.000Z');
  const previous = createFocusSnapshot({ todayMinutes: 42, streakDays: 2, sessionCount: 3 }, yesterday);

  const incremented = incrementActiveFocusMinute(previous, today);

  assert.equal(incremented.date, '2026-07-16');
  assert.equal(incremented.todayMinutes, 1);
  assert.equal(incremented.streakDays, 3);
  assert.equal(incremented.sessionCount, 1);
});

test('storage helpers keep the current session usable when storage is blocked', () => {
  const blockedStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    }
  };

  assert.equal(readStorageValue(blockedStorage, 'room'), null);
  assert.equal(writeStorageValue(blockedStorage, 'room', '{}'), false);
});
