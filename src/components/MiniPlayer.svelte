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

  const trackTitle = player.currentTrackTitle;
  const playerIsPlaying = player.isPlaying;
  const currentTrackIndex = player.currentTrackIndex;
  const rainType = rain.type;
  const rainVolume = rain.volume;
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
      aria-label="Add custom YouTube stream"
      on:click={() => {
        showCustomInput = !showCustomInput;
        customError = '';
        onMarkActivity();
      }}
    >
      +
    </button>

    {#if showCustomInput}
      <form
        class="custom-form"
        on:submit|preventDefault={submitCustomUrl}
      >
        <input
          type="text"
          placeholder="Paste YouTube URL"
          bind:value={customUrl}
          on:input={() => {
            if (customError) {
              customError = '';
            }
            onMarkActivity();
          }}
          aria-label="Custom YouTube URL"
        />
        <button type="submit">Add</button>
      </form>
    {/if}
  </div>

  {#if customError}
    <p class="custom-error" role="status">{customError}</p>
  {/if}
</div>

<style>
  .player-shell {
    position: absolute;
    left: 50%;
    bottom: 20px;
    transform: translateX(-50%);
    width: min(820px, calc(100% - 32px));
    z-index: 8;
    transition: opacity 180ms ease;
    display: grid;
    gap: 6px;
  }

  .custom-row {
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
    height: 28px;
  }

  .custom-toggle,
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
    text-align: right;
    color: #e19c91;
    font-size: 11px;
  }
</style>
