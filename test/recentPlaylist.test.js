import test from 'node:test';
import assert from 'node:assert/strict';
import { RECENT_PLAYLIST_KEY, normalizeRecentPlaylist, readRecentPlaylist, saveRecentPlaylist } from '../src/utils/recentPlaylist.js';

const playlist = { id: '123', originalId: '123', name: 'Evening Lofi' };

test('recent playlist restores only validated metadata without credentials', () => {
  const entries = new Map();
  const storage = { getItem: (key) => entries.get(key), setItem: (key, value) => entries.set(key, value) };
  assert.equal(saveRecentPlaylist({ ...playlist, token: 'fixture', privateKey: 'fixture', cookie: 'fixture' }, storage), true);
  assert.deepEqual(readRecentPlaylist(storage), playlist);
  assert.deepEqual(JSON.parse(entries.get(RECENT_PLAYLIST_KEY)), playlist);
});

test('invalid recent data and denied storage fail closed', () => {
  for (const record of [null, [], { ...playlist, id: '--shell' }, { ...playlist, originalId: '../file' }, { ...playlist, name: '' }]) {
    assert.equal(normalizeRecentPlaylist(record), null);
  }
  assert.equal(readRecentPlaylist({ getItem: () => '{broken' }), null);
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(readRecentPlaylist(denied), null);
  assert.equal(saveRecentPlaylist(playlist, denied), false);
});
