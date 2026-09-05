import { RainPlayer } from '../audio/RainPlayer.js';
import { YouTubePlayer } from '../audio/YouTubePlayer.js';

const DEFAULT_YOUTUBE_INITIALIZATION_TIMEOUT_MS = 12000;

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export function createAudioInitializer(options = {}) {
  const {
    mountId = 'youtube-player-host',
    getCurrentTrackIndex = () => 0,
    getRainType = () => 'medium',
    getRainMuted = () => false,
    getRainVolume = () => 60,
    onLoading = () => {},
    onError = () => {},
    onMusicStatus = () => {},
    onRainStatus = () => {},
    createYouTubePlayer = (playerOptions) => new YouTubePlayer(playerOptions),
    createRainPlayer = (playerOptions) => new RainPlayer(playerOptions),
    enableYouTube = true,
    youtubeInitializationTimeoutMs = DEFAULT_YOUTUBE_INITIALIZATION_TIMEOUT_MS
  } = options;
  const youtubeTimeoutMs =
    Number.isFinite(youtubeInitializationTimeoutMs) && youtubeInitializationTimeoutMs > 0
      ? youtubeInitializationTimeoutMs
      : DEFAULT_YOUTUBE_INITIALIZATION_TIMEOUT_MS;

  let youtubePlayer;
  let rainPlayer;
  let initializationPromise = null;
  let initializationGeneration = 0;
  let autoplayRequested = false;
  let audioReady = false;
  let youtubeReady = !enableYouTube;
  let rainReady = false;
  let loadingActive = false;
  const setMusicStatus = (status) => onMusicStatus(status);
  const setLoading = (loading) => {
    if (loadingActive === loading) return;
    loadingActive = loading;
    onLoading(loading);
  };

  function initAudio(autoplay = false) {
    autoplayRequested ||= autoplay;

    if (audioReady && youtubeReady && rainReady) {
      if (autoplay && youtubePlayer) {
        youtubePlayer.play();
        rainPlayer?.play();
      }
      return Promise.resolve({ youtubePlayer, rainPlayer });
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    const generation = ++initializationGeneration;
    setLoading(true);
    setMusicStatus(enableYouTube ? 'loading' : 'disabled');

    initializationPromise = (async () => {
      if (enableYouTube && !youtubePlayer) {
        youtubePlayer = createYouTubePlayer({ mountId });
      }
      if (!rainPlayer) {
        rainPlayer = createRainPlayer({ onStatus: onRainStatus, preferLocal: false });
      }

      const initializeRain = (async () => {
        try {
          await rainPlayer.init(getRainType(), autoplayRequested);
          rainPlayer.setVolume(getRainMuted() ? 0 : getRainVolume());
          rainReady = true;
          // Rain is an independent usable source; do not hold the room in
          // a global loading state while an optional music station retries.
          setLoading(false);
        } catch (error) {
          rainReady = false;
          onError(`Rain unavailable: ${error?.message ?? 'retry from player'}`);
        }
      })();

      const initializeYouTube = enableYouTube
        ? (async () => {
            try {
              await withTimeout(
                youtubePlayer.init(getCurrentTrackIndex()),
                youtubeTimeoutMs,
                'YouTube initialization timed out.'
              );
              youtubePlayer.setVolume(60);
              youtubeReady = true;
              setMusicStatus('paused');
            } catch (error) {
              youtubeReady = false;
              setMusicStatus('error');
              onError(`Music unavailable: ${error?.message ?? 'Unknown error.'} Retry from player.`);
            }
          })()
        : Promise.resolve();

      try {
        await Promise.all([initializeRain, initializeYouTube]);
        if (generation !== initializationGeneration) {
          return { youtubePlayer, rainPlayer };
        }

        audioReady = youtubeReady || rainReady;
        if (youtubeReady && rainReady) {
          onError(null);
        }

        if (autoplayRequested) {
          if (youtubeReady && youtubePlayer) {
            youtubePlayer.play();
            setMusicStatus('playing');
          }
          if (rainReady) {
            rainPlayer.play();
          }
        }
      } catch {
        onError('Failed to initialize audio.');
      } finally {
        if (generation === initializationGeneration) {
          setLoading(false);
          autoplayRequested = false;
          initializationPromise = null;
        }
      }

      return { youtubePlayer, rainPlayer };
    })();

    return initializationPromise;
  }

  function getPlayers() {
    return { youtubePlayer, rainPlayer };
  }

  function destroy() {
    youtubePlayer?.destroy();
    rainPlayer?.destroy();
    youtubePlayer = null;
    rainPlayer = null;
    audioReady = false;
    youtubeReady = !enableYouTube;
    rainReady = false;
    autoplayRequested = false;
    initializationPromise = null;
    initializationGeneration += 1;
    setLoading(false);
    setMusicStatus(enableYouTube ? 'idle' : 'disabled');
  }

  return {
    initAudio,
    getPlayers,
    destroy
  };
}
