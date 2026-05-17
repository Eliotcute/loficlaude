import { player } from '../stores/appState.js';

export const PLAYLIST = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl - beats to relax' },
  { id: 'YmQ7jRgf4f0', name: 'Claude FM' },
  { id: '5yx6BWlEVcY', name: 'Chillhop Radio' }
];

const API_TIMEOUT_MS = 15000;
let youtubeApiPromise;

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
        reject(new Error('Failed to load YouTube iframe API script.'));
      };
      document.head.append(script);
    }

    timeoutId = window.setTimeout(() => {
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

export class YouTubePlayer {
  constructor(options = {}) {
    this.mountId = options.mountId ?? 'youtube-player-host';
    this.instance = null;
    this.ready = false;
    this.currentIndex = 0;
    this.readyPromise = null;
  }

  async init(initialIndex = 0) {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.currentIndex = wrapIndex(initialIndex);
    const initialTrack = PLAYLIST[this.currentIndex];
    player.currentTrackIndex.set(this.currentIndex);
    player.currentTrackTitle.set(initialTrack.name);

    this.readyPromise = loadYouTubeApi().then(
      () =>
        new Promise((resolve, reject) => {
          const mountNode = document.getElementById(this.mountId);
          if (!mountNode) {
            reject(new Error(`Missing YouTube player mount node: #${this.mountId}`));
            return;
          }

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
                this.ready = true;
                player.error.set(null);
                player.isLoading.set(false);
                resolve();
              },
              onStateChange: (event) => this.handleStateChange(event),
              onError: (event) => this.handleError(event)
            }
          });
        })
    );

    return this.readyPromise;
  }

  loadTrack(index) {
    if (!this.ready || !this.instance) {
      return;
    }

    const nextIndex = wrapIndex(index);
    const nextTrack = PLAYLIST[nextIndex];

    this.currentIndex = nextIndex;
    player.currentTrackIndex.set(nextIndex);
    player.currentTrackTitle.set(nextTrack.name);
    player.isLoading.set(true);
    player.error.set(null);

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
    this.instance.playVideo();
  }

  pause() {
    if (!this.ready || !this.instance) {
      return;
    }
    this.instance.pauseVideo();
  }

  setVolume(volume) {
    if (!this.ready || !this.instance) {
      return;
    }

    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.instance.setVolume(clamped);
  }

  destroy() {
    if (this.instance) {
      this.instance.destroy();
    }

    this.instance = null;
    this.ready = false;
    this.readyPromise = null;
  }

  handleError(event) {
    player.error.set(`YouTube playback error (${event?.data ?? 'unknown'})`);
    player.isLoading.set(false);

    window.setTimeout(() => {
      this.nextTrack();
    }, 250);
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
