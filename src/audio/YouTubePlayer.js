import { player } from '../stores/appState.js';

const CUSTOM_TRACKS_STORAGE_KEY = 'loficlaude-custom-tracks';

const BASE_PLAYLIST = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl Radio', genre: 'lofi' },
  { id: '5yx6BWlEVcY', name: 'Chillhop Lofi Radio', genre: 'lofi' },
  { id: '7NOSDKb0HlU', name: 'Homework Lofi Radio', genre: 'lofi' },
  { id: '21qNxnCS8WU', name: 'Lofi Geek Radio', genre: 'lofi' },
  { id: 'DWcJFNfaw9c', name: 'Chillhop Beats', genre: 'lofi' }
];

export const PLAYLIST = [...BASE_PLAYLIST];

const API_TIMEOUT_MS = 15000;
const PLAYER_READY_TIMEOUT_MS = 9000;
let youtubeApiPromise;

export function isolateYouTubeFrame(frame) {
  if (!frame?.setAttribute) {
    return;
  }

  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('role', 'presentation');
  frame.setAttribute('tabindex', '-1');
}

function readCustomTracks() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CUSTOM_TRACKS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item.id === 'string' && item.id.trim().length > 0)
      .map((item, index) => ({
        id: item.id.trim(),
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Custom ${index + 1}`,
        genre: 'custom'
      }));
  } catch {
    return [];
  }
}

function persistCustomTracks() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const customTracks = PLAYLIST.filter((track) => track.genre === 'custom');
    window.localStorage.setItem(CUSTOM_TRACKS_STORAGE_KEY, JSON.stringify(customTracks));
  } catch {
    // Ignore storage errors.
  }
}

function hydrateCustomTracks() {
  for (const track of readCustomTracks()) {
    if (!PLAYLIST.some((item) => item.id === track.id)) {
      PLAYLIST.push(track);
    }
  }
}

function loadYouTubeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API requires a browser environment.'));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const scriptId = 'youtube-iframe-api';
    let timeoutId;

    const handleReady = () => {
      clearTimeout(timeoutId);
      if (typeof previousReady === 'function') {
        previousReady();
      }
      resolve(window.YT);
    };

    window.onYouTubeIframeAPIReady = handleReady;

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        clearTimeout(timeoutId);
        youtubeApiPromise = null;
        script.remove?.();
        reject(new Error('Failed to load YouTube iframe API script.'));
      };
      document.head.append(script);
    }

    timeoutId = window.setTimeout(() => {
      youtubeApiPromise = null;
      document.getElementById(scriptId)?.remove?.();
      reject(new Error('Timed out while loading YouTube iframe API.'));
    }, API_TIMEOUT_MS);
  });

  return youtubeApiPromise;
}

function wrapIndex(index) {
  const size = PLAYLIST.length;
  if (!size) {
    return 0;
  }

  const raw = Number.isFinite(index) ? index : 0;
  return ((raw % size) + size) % size;
}

export function extractYouTubeId(urlOrId) {
  const raw = `${urlOrId ?? ''}`.trim();
  if (!raw) {
    return '';
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return raw;
  }

  const match = raw.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? '';
}

export function addCustomTrackFromUrl(url) {
  const id = extractYouTubeId(url);
  if (!id) {
    return -1;
  }

  const existingIndex = PLAYLIST.findIndex((track) => track.id === id);
  if (existingIndex >= 0) {
    return existingIndex;
  }

  const customCount = PLAYLIST.filter((track) => track.genre === 'custom').length + 1;
  PLAYLIST.push({
    id,
    name: `Custom ${customCount}`,
    genre: 'custom'
  });

  persistCustomTracks();
  return PLAYLIST.length - 1;
}

hydrateCustomTracks();

export class YouTubePlayer {
  constructor(options = {}) {
    this.mountId = options.mountId ?? 'youtube-player-host';
    this.instance = null;
    this.ready = false;
    this.currentIndex = 0;
    this.readyPromise = null;
    this.skipCount = 0;
    this.failedAll = false;
    this.volume = 60;
    this.fadeTimer = null;
    this.frameObserver = null;
  }

  isolateMountNode(mountNode, isolationNode = mountNode?.parentElement ?? mountNode) {
    if (!mountNode) {
      return;
    }

    if (!isolationNode) {
      return;
    }

    isolationNode.setAttribute?.('aria-hidden', 'true');
    isolationNode.querySelectorAll?.('iframe').forEach(isolateYouTubeFrame);
  }

  async init(initialIndex = 0) {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.currentIndex = wrapIndex(initialIndex);
    const initialTrack = PLAYLIST[this.currentIndex];
    player.currentTrackIndex.set(this.currentIndex);
    player.currentTrackTitle.set(initialTrack.name);

    this.readyPromise = loadYouTubeApi()
      .then(
        () =>
          new Promise((resolve, reject) => {
          const mountNode = document.getElementById(this.mountId);
          if (!mountNode) {
            reject(new Error(`Missing YouTube player mount node: #${this.mountId}`));
            return;
          }

          const isolationNode = mountNode.parentElement ?? mountNode;
          this.isolateMountNode(mountNode, isolationNode);
          const MutationObserverImpl = window.MutationObserver;
          if (MutationObserverImpl) {
            this.frameObserver = new MutationObserverImpl(() => this.isolateMountNode(mountNode, isolationNode));
            this.frameObserver.observe(isolationNode, { childList: true, subtree: true });
          }

          let readyTimeoutId = window.setTimeout(() => {
            reject(new Error('Timed out while preparing YouTube player.'));
          }, PLAYER_READY_TIMEOUT_MS);

          this.instance = new window.YT.Player(this.mountId, {
            width: '1',
            height: '1',
            videoId: initialTrack.id,
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1
            },
            events: {
              onReady: () => {
                window.clearTimeout(readyTimeoutId);
                readyTimeoutId = null;
                this.isolateMountNode(mountNode, isolationNode);
                this.ready = true;
                this.failedAll = false;
                this.setVolume(this.volume);
                player.error.set(null);
                player.isLoading.set(false);
                resolve();
              },
              onStateChange: (event) => this.handleStateChange(event),
              onError: (event) => this.handleError(event)
            }
          });
        })
      )
      .catch((error) => {
        this.readyPromise = null;
        this.ready = false;
        player.isLoading.set(false);
        player.error.set(`YouTube initialization failed: ${error?.message ?? 'unknown'}`);
        throw error;
      });

    return this.readyPromise;
  }

  loadTrack(index, options = {}) {
    if (!options.fromFailover) {
      this.skipCount = 0;
      this.failedAll = false;
    }

    const nextIndex = wrapIndex(index);
    const nextTrack = PLAYLIST[nextIndex];

    this.currentIndex = nextIndex;
    player.currentTrackIndex.set(nextIndex);
    player.currentTrackTitle.set(nextTrack.name);
    player.isLoading.set(true);
    player.error.set(null);

    if (!this.ready || !this.instance) {
      return;
    }

    this.instance.loadVideoById(nextTrack.id);
  }

  nextTrack() {
    this.loadTrack(this.currentIndex + 1);
  }

  previousTrack() {
    this.loadTrack(this.currentIndex - 1);
  }

  play() {
    if (!this.ready || !this.instance) {
      return;
    }
    if (this.failedAll) {
      this.loadTrack(this.currentIndex);
    }
    this.clearFadeTimer();
    this.setVolume(this.volume);
    this.instance.playVideo();
  }

  pause() {
    if (!this.ready || !this.instance) {
      return;
    }
    this.clearFadeTimer();
    this.instance.pauseVideo();
  }

  setVolume(volume) {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.volume = clamped;

    if (!this.ready || !this.instance) {
      return;
    }

    this.instance.setVolume(clamped);
  }

  fadeOut(ms = 4000) {
    this.clearFadeTimer();

    if (!this.ready || !this.instance) {
      return;
    }

    const startVolume = this.volume;
    const startedAt = Date.now();

    this.fadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / ms);
      this.instance.setVolume(Math.round(startVolume * (1 - progress)));

      if (progress >= 1) {
        this.clearFadeTimer();
        this.instance.pauseVideo?.();
        this.instance.setVolume?.(startVolume);
      }
    }, 100);
  }

  clearFadeTimer() {
    if (this.fadeTimer) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  destroy() {
    this.clearFadeTimer();
    this.frameObserver?.disconnect?.();
    this.frameObserver = null;
    if (this.instance) {
      this.instance.destroy();
    }

    this.instance = null;
    this.ready = false;
    this.readyPromise = null;
    this.skipCount = 0;
    this.failedAll = false;
  }

  handleError(event) {
    if (this.failedAll) {
      return;
    }

    player.isLoading.set(false);
    player.isPlaying.set(false);
    this.skipCount += 1;

    if (this.skipCount < PLAYLIST.length) {
      player.error.set(`YouTube playback error (${event?.data ?? 'unknown'}), skipping...`);
      window.setTimeout(() => {
        this.loadTrack(this.currentIndex + 1, { fromFailover: true });
        if (!this.ready) {
          this.init(this.currentIndex);
        }
      }, 250);
      return;
    }

    this.skipCount = 0;
    this.failedAll = true;
    player.error.set('All streams unavailable');
  }

  handleStateChange(event) {
    if (!window.YT?.PlayerState) {
      return;
    }

    const { PlayerState } = window.YT;

    if (event.data === PlayerState.BUFFERING) {
      player.isLoading.set(true);
      return;
    }

    if (event.data === PlayerState.PLAYING) {
      this.skipCount = 0;
      player.isPlaying.set(true);
      player.isLoading.set(false);
      player.error.set(null);
      return;
    }

    if (event.data === PlayerState.PAUSED) {
      player.isPlaying.set(false);
      player.isLoading.set(false);
      return;
    }

    if (event.data === PlayerState.ENDED) {
      player.isPlaying.set(false);
      this.nextTrack();
      return;
    }

    if (event.data === PlayerState.CUED) {
      player.isLoading.set(false);
    }
  }
}
