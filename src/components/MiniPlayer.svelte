<script>
  import { player, rain, timer, uiChromeOpacity } from '../stores/appState.js';
  import { PLAYLIST } from '../audio/YouTubePlayer.js';
  import ExpandedPlayer from './ExpandedPlayer.svelte';

  export let onTogglePlay = () => {};
  export let onPreviousTrack = () => {};
  export let onNextTrack = () => {};
  export let onSetRainType = () => {};
  export let onSetRainVolume = () => {};
  export let onSelectTimer = () => {};
  export let onMarkActivity = () => {};
  export let musicStatus = 'disabled';
  export let musicProvider = 'youtube';

  const trackTitle = player.currentTrackTitle;
  const playerIsPlaying = player.isPlaying;
  const currentTrackIndex = player.currentTrackIndex;
  const playerIsLoading = player.isLoading;
  const playerError = player.error;
  const rainType = rain.type;
  const rainVolume = rain.volume;
  const rainSourceStatus = rain.sourceStatus;
  const timerMinutes = timer.minutes;
  const timerActive = timer.active;

  const GENRE_COLOR_MAP = {
    lofi: '#d4a574',
    jazz: '#748fd4',
    ambient: '#74d48a',
    synthwave: '#d474c8',
    chill: '#74d4d4',
    custom: '#d4b874'
  };

  $: currentGenre = PLAYLIST[$currentTrackIndex]?.genre ?? 'lofi';
  $: genreColor = GENRE_COLOR_MAP[currentGenre] ?? GENRE_COLOR_MAP.lofi;

</script>

<div class="player-shell" style={`opacity: ${$uiChromeOpacity};`}>
  <ExpandedPlayer
    title={$trackTitle}
    genreColor={genreColor}
    isPlaying={$playerIsPlaying}
    isLoading={$playerIsLoading}
    musicStatus={musicStatus}
    musicProvider={musicProvider}
    error={$playerError}
    rainSourceStatus={$rainSourceStatus}
    rainType={$rainType}
    rainVolume={$rainVolume}
    timerMinutes={$timerMinutes}
    timerActive={$timerActive}
    on:toggleplay={onTogglePlay}
    on:previous={onPreviousTrack}
    on:next={onNextTrack}
    on:useyoutube={() => onTogglePlay('youtube')}
    on:usենetease={() => onTogglePlay('netease-local')}
    on:setraintype={(event) => onSetRainType(event.detail.type)}
    on:setrainvolume={(event) => onSetRainVolume(event.detail.value)}
    on:settimer={(event) => onSelectTimer(event.detail.minutes)}
    on:activity={onMarkActivity}
  />

  {#if $playerError}
    <p class="player-status error" role="status">{$playerError}</p>
  {:else if $playerIsLoading && musicStatus !== 'disabled'}
    <p class="player-status" role="status">loading music...</p>
  {:else if $rainSourceStatus === 'local-recording'}
    <p class="player-status" role="status">Local rain recording</p>
  {:else if $rainSourceStatus === 'rainy-mood'}
    <p class="player-status" role="status">Rainy Mood rain source</p>
  {:else if $rainSourceStatus === 'fallback'}
    <p class="player-status" role="status">Synthesized rain fallback</p>
  {/if}
</div>

<style>
  .player-shell {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 20px;
    width: min(820px, calc(100% - 32px));
    margin-inline: auto;
    z-index: 5;
    transition: opacity 180ms ease;
    display: grid;
    gap: 6px;
  }

  .player-status {
    margin: 0;
    position: absolute;
    left: 0;
    bottom: calc(100% + 8px);
    max-width: min(420px, calc(100vw - 32px));
    color: rgba(232, 224, 216, 0.86);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
  }

  .player-status.error {
    color: #e19c91;
  }

  @media (max-width: 520px) {
    .player-shell {
      bottom: 14px;
      width: min(calc(100% - 24px), 420px);
    }

    .player-status {
      right: 0;
      bottom: calc(100% + 42px);
      text-align: center;
      margin-inline: auto;
    }

  }
</style>
