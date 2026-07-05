const DEFAULT_TRACK_TITLE = 'lofi hip hop radio - beats';
const DEFAULT_SCENE = 'lofiNight';
const DEFAULT_SCENE_NAME = 'Lofi Night';
const DEFAULT_RAIN_VOLUME = 60;
const DEFAULT_RAIN_TYPE = 'medium';
const VALID_RAIN_TYPES = ['light', 'medium', 'heavy'];

export const PERSIST_KEY = 'lofi-claude-phase4-state';
export const SCENE_NAME_MAP = {
  lofiNight: 'Lofi Night',
  softRain: 'Soft Rain',
  starDrift: 'Star Drift'
};
export const SCENE_ORDER = ['lofiNight', 'softRain', 'starDrift'];

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
