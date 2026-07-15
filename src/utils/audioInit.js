import { RainPlayer } from '../audio/RainPlayer.js';
import { YouTubePlayer } from '../audio/YouTubePlayer.js';

export function createAudioInitializer(options = {}) {
  const {
    mountId = 'youtube-player-host',
    getCurrentTrackIndex = () => 0,
    getRainType = () => 'medium',
    getRainMuted = () => false,
    getRainVolume = () => 60,
    onLoading = () => {},
    onError = () => {},
    onRainStatus = () => {}
  } = options;

  let youtubePlayer;
  let rainPlayer;
  let audioInitializing = false;
  let audioReady = false;

  async function initAudio(autoplay = false) {
    if (audioReady) {
      if (autoplay && youtubePlayer) {
        youtubePlayer.play();
        rainPlayer?.play();
      }
      return { youtubePlayer, rainPlayer };
    }

    if (audioInitializing) {
      return { youtubePlayer, rainPlayer };
    }

    audioInitializing = true;
    onLoading(true);

    try {
      if (!youtubePlayer) {
        youtubePlayer = new YouTubePlayer({ mountId });
      }
      if (!rainPlayer) {
        rainPlayer = new RainPlayer({ onStatus: onRainStatus });
      }

      await youtubePlayer.init(getCurrentTrackIndex());
      youtubePlayer.setVolume(60);

      await rainPlayer.init(getRainType(), autoplay);
      rainPlayer.setVolume(getRainMuted() ? 0 : getRainVolume());

      audioReady = true;
      onError(null);

      if (autoplay) {
        youtubePlayer.play();
        rainPlayer.play();
      }
    } catch {
      onError('Failed to initialize audio.');
    } finally {
      onLoading(false);
      audioInitializing = false;
    }

    return { youtubePlayer, rainPlayer };
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
    audioInitializing = false;
  }

  return {
    initAudio,
    getPlayers,
    destroy
  };
}
