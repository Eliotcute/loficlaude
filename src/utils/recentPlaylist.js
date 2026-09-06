import { readStorageValue, writeStorageValue } from './appPersistence.js';

export const RECENT_PLAYLIST_KEY = 'loficlaude-recent-playlist';

function browserStorage() {
  try { return globalThis.window?.localStorage; } catch { return null; }
}

export function normalizeRecentPlaylist(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { id, originalId, name } = value;
  if (typeof id !== 'string' || !/^(?:[a-f\d]{32}|[1-9]\d{0,19})$/i.test(id) ||
      typeof originalId !== 'string' || !/^[1-9]\d{0,19}$/.test(originalId) ||
      typeof name !== 'string' || !name.trim()) return null;
  return { id, originalId, name: name.slice(0, 160) };
}

export function readRecentPlaylist(storage = browserStorage()) {
  try {
    return normalizeRecentPlaylist(JSON.parse(readStorageValue(storage, RECENT_PLAYLIST_KEY)));
  } catch {
    return null;
  }
}

export function saveRecentPlaylist(value, storage = browserStorage()) {
  const record = normalizeRecentPlaylist(value);
  return record ? writeStorageValue(storage, RECENT_PLAYLIST_KEY, JSON.stringify(record)) : false;
}
