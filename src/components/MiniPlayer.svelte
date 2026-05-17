<script>
  import { player, rain, timer, uiChromeOpacity } from '../stores/appState.js';
  import ExpandedPlayer from './ExpandedPlayer.svelte';

  export let onTogglePlay = () => {};
  export let onPreviousTrack = () => {};
  export let onNextTrack = () => {};
  export let onSetRainType = () => {};
  export let onSetRainVolume = () => {};
  export let onSelectTimer = () => {};
  export let onMarkActivity = () => {};

  const trackTitle = player.currentTrackTitle;
  const playerIsPlaying = player.isPlaying;
  const rainType = rain.type;
  const rainVolume = rain.volume;
  const timerMinutes = timer.minutes;
  const timerActive = timer.active;
</script>

<div class="player-shell" style={`opacity: ${$uiChromeOpacity};`}>
  <ExpandedPlayer
    title={$trackTitle}
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
</div>

<style>
  .player-shell {
    position: absolute;
    left: 50%;
    bottom: 20px;
    transform: translateX(-50%);
    width: min(820px, calc(100% - 32px));
    z-index: 4;
    transition: opacity 180ms ease;
  }
</style>
