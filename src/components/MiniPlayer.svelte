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
  export let onAddCustomUrl = async () => false;
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

  let showCustomInput = false;
  let customUrl = '';
  let customError = '';

  $: currentGenre = PLAYLIST[$currentTrackIndex]?.genre ?? 'lofi';
  $: genreColor = GENRE_COLOR_MAP[currentGenre] ?? GENRE_COLOR_MAP.lofi;

  async function submitCustomUrl() {
    const clean = customUrl.trim();
    if (!clean) {
      return;
    }

    const ok = await onAddCustomUrl(clean);
    if (!ok) {
      customError = 'Invalid YouTube URL';
      return;
    }

    customError = '';
    customUrl = '';
    showCustomInput = false;
    onMarkActivity();
  }
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
    on:setraintype={(event) => onSetRainType(event.detail.type)}
    on:setrainvolume={(event) => onSetRainVolume(event.detail.value)}
    on:settimer={(event) => onSelectTimer(event.detail.minutes)}
    on:activity={onMarkActivity}
  />

  <div class="custom-row">
    <button
      type="button"
      class="custom-toggle"
      aria-label="Add YouTube station"
      title="Add YouTube station"
      on:click={() => {
        showCustomInput = !showCustomInput;
        customError = '';
        onMarkActivity();
      }}
    >
      <span aria-hidden="true">+</span>
    </button>

    {#if showCustomInput}
      <form
        class="custom-form"
        on:submit|preventDefault={submitCustomUrl}
      >
        <input
          type="text"
          placeholder="Add a YouTube station"
          bind:value={customUrl}
          on:input={() => {
            if (customError) {
              customError = '';
            }
            onMarkActivity();
          }}
          aria-label="YouTube station URL"
        />
        <button type="submit">Add station</button>
      </form>
    {/if}
  </div>

  {#if customError}
    <p class="custom-error" role="status">{customError}</p>
  {/if}

  {#if $playerError}
    <p class="player-status error" role="status">{$playerError}</p>
  {:else if $playerIsLoading && musicStatus !== 'disabled'}
    <p class="player-status" role="status">loading music...</p>
  {:else if $rainSourceStatus === 'rainy-mood'}
    <p class="player-status" role="status">Rainy Mood remote rain active</p>
  {:else if $rainSourceStatus === 'fallback'}
    <p class="player-status" role="status">Local fallback rain active; Rainy Mood unavailable</p>
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

  .custom-row {
    position: absolute;
    right: 0;
    bottom: calc(100% + 8px);
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  }

  .custom-toggle,
  .custom-form button,
  .custom-form input {
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 8px;
    background: rgba(10, 12, 15, 0.82);
    color: #e8e0d8;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    min-height: 44px;
  }

  .custom-toggle {
    width: 44px;
    padding: 0 10px;
    cursor: pointer;
  }

  .custom-form button {
    padding: 0 10px;
    cursor: pointer;
  }

  .custom-form {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .custom-form input {
    width: min(300px, calc(100vw - 140px));
    padding: 0 8px;
    outline: none;
  }

  .custom-error {
    margin: 0;
    position: absolute;
    right: 0;
    bottom: calc(100% + 42px);
    text-align: right;
    color: #e19c91;
    font-size: 11px;
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

    .custom-row {
      left: 0;
      justify-content: center;
    }

    .player-status {
      right: 0;
      bottom: calc(100% + 42px);
      text-align: center;
      margin-inline: auto;
    }

    .custom-form input {
      width: min(220px, calc(100vw - 118px));
    }
  }
</style>
