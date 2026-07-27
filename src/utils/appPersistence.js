const DEFAULT_TRACK_TITLE = 'lofi hip hop radio - beats';
const DEFAULT_SCENE = 'lofiNight';
const DEFAULT_SCENE_NAME = 'Lofi Night';
const DEFAULT_RAIN_VOLUME = 60;
const DEFAULT_RAIN_TYPE = 'medium';
const VALID_RAIN_TYPES = ['light', 'medium', 'heavy'];

export const PERSIST_KEY = 'lofi-claude-phase4-state';
export const FOCUS_KEY = 'lofi-claude-focus-state';
export const SCENE_NAME_MAP = {
  lofiNight: 'Lofi Night',
  softRain: 'Soft Rain',
  starDrift: 'Star Drift'
};
export const SCENE_ORDER = ['lofiNight', 'softRain', 'starDrift'];

export function readStorageValue(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorageValue(storage, key, value) {
  try {
    storage?.setItem(key, value);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function getSceneName(key) {
  return SCENE_NAME_MAP[key] ?? DEFAULT_SCENE_NAME;
}

export function normalizeTrackIndex(index, playlistLength) {
  return ((index % playlistLength) + playlistLength) % playlistLength;
}

export function normalizeTrackTitle(index, playlist) {
  const track = playlist[normalizeTrackIndex(index, playlist.length)];
  return track?.name ?? DEFAULT_TRACK_TITLE;
}

export function createPersistedSnapshot(values) {
  return {
    lastTrackIndex: values.lastTrackIndex,
    rainVolume: values.rainVolume,
    rainType: values.rainType,
    currentScene: values.currentScene,
    sceneLocked: values.sceneLocked
  };
}

export function getFocusDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDateKey(date = new Date()) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return getFocusDateKey(previous);
}

function normalizeNonNegativeInteger(value) {
  const raw = Number(value ?? 0);
  return Math.max(0, Math.round(Number.isFinite(raw) ? raw : 0));
}

export function createFocusSnapshot(values, date = new Date()) {
  return {
    date: getFocusDateKey(date),
    todayMinutes: normalizeNonNegativeInteger(values.todayMinutes),
    streakDays: normalizeNonNegativeInteger(values.streakDays),
    sessionCount: normalizeNonNegativeInteger(values.sessionCount),
    lastSummary: typeof values.lastSummary === 'string' ? values.lastSummary.slice(0, 120) : ''
  };
}

export function parseFocusSnapshot(raw, date = new Date()) {
  if (!raw) {
    return createFocusSnapshot({ todayMinutes: 0 }, date);
  }

  const parsed = JSON.parse(raw);
  const today = getFocusDateKey(date);

  if (parsed?.date !== today) {
    const snapshot = createFocusSnapshot(
      {
        todayMinutes: 0,
        streakDays: parsed?.date === getPreviousDateKey(date) ? parsed.streakDays : 0,
        sessionCount: 0,
        lastSummary: parsed?.lastSummary
      },
      date
    );
    return { ...snapshot, date: parsed?.date || today };
  }

  return createFocusSnapshot(parsed, date);
}

export function createStartedFocusSnapshot(snapshot, date = new Date()) {
  const today = getFocusDateKey(date);
  const yesterday = getPreviousDateKey(date);
  const sameDay = snapshot?.date === today;
  const continuedStreak = sameDay || snapshot?.date === yesterday;
  const streakDays = sameDay
    ? Math.max(1, normalizeNonNegativeInteger(snapshot?.streakDays))
    : continuedStreak
      ? normalizeNonNegativeInteger(snapshot?.streakDays) + 1
      : 1;

  return createFocusSnapshot(
    {
      todayMinutes: sameDay ? snapshot?.todayMinutes : 0,
      streakDays,
      sessionCount: sameDay ? normalizeNonNegativeInteger(snapshot?.sessionCount) + 1 : 1,
      lastSummary: snapshot?.lastSummary
    },
    date
  );
}

export function incrementActiveFocusMinute(snapshot, date = new Date()) {
  const today = getFocusDateKey(date);
  const current = snapshot?.date === today
    ? createFocusSnapshot(snapshot, date)
    : createStartedFocusSnapshot(snapshot, date);

  return createFocusSnapshot({ ...current, todayMinutes: current.todayMinutes + 1 }, date);
}

export function parsePersistedSnapshot(raw, playlist) {
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw);
  const trackIndex = normalizeTrackIndex(Number(parsed.lastTrackIndex ?? 0), playlist.length);
  const rainVolume = Math.max(0, Math.min(100, Number(parsed.rainVolume ?? DEFAULT_RAIN_VOLUME)));
  const rainType = VALID_RAIN_TYPES.includes(parsed.rainType) ? parsed.rainType : DEFAULT_RAIN_TYPE;
  const currentScene = SCENE_ORDER.includes(parsed.currentScene) ? parsed.currentScene : DEFAULT_SCENE;

  return {
    trackIndex,
    trackTitle: normalizeTrackTitle(trackIndex, playlist),
    rainVolume,
    rainMuted: rainVolume === 0,
    rainType,
    currentScene,
    sceneLocked: Boolean(parsed.sceneLocked),
    lastNonZeroRainVolume: rainVolume > 0 ? rainVolume : null
  };
}
