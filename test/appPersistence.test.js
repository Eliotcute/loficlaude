import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTrackIndex, normalizeTrackTitle, parsePersistedSnapshot } from '../src/utils/appPersistence.js';

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
