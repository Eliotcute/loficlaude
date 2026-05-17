<script>
  import ScenePopover from './ScenePopover.svelte';
  import TimerPopover from './TimerPopover.svelte';
  import { scene, timer, timerLabel, ui, uiChromeOpacity } from '../stores/appState.js';

  const SCENES = [
    { key: 'lofiNight', icon: '🌙' },
    { key: 'softRain', icon: '🌧' },
    { key: 'starDrift', icon: '⭐' }
  ];
  const currentScene = scene.current;
  const sceneLocked = scene.locked;
  const scenePopoverOpen = ui.scenePopoverOpen;
  const timerPopoverOpen = ui.timerPopoverOpen;

  $: sceneIcon = SCENES.find((item) => item.key === $currentScene)?.icon ?? '🌙';

  function toggleScenePopover() {
    ui.scenePopoverOpen.update((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        ui.timerPopoverOpen.set(false);
      }
      return nextOpen;
    });
  }

  function toggleTimerPopover() {
    ui.timerPopoverOpen.update((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        ui.scenePopoverOpen.set(false);
      }
      return nextOpen;
    });
  }

  function closeScenePopover() {
    ui.scenePopoverOpen.set(false);
  }

  function closeTimerPopover() {
    ui.timerPopoverOpen.set(false);
  }

  function selectScene(event) {
    const key = event.detail.key;
    if (!$sceneLocked) {
      scene.current.set(key);
    }
    closeScenePopover();
  }

  function toggleSceneLock() {
    scene.locked.update((locked) => !locked);
  }

  function selectTimer(event) {
    const minutes = event.detail.minutes;

    if (minutes === null) {
      timer.active.set(false);
      timer.remainingSeconds.set(0);
    } else {
      timer.active.set(true);
      timer.minutes.set(minutes);
      timer.remainingSeconds.set(minutes * 60);
    }

    closeTimerPopover();
  }
</script>

<header class="ambient-header" style={`opacity: ${$uiChromeOpacity};`}>
  <h1>LoFiClaude</h1>

  <div class="header-status" aria-label="Current scene and timer">
    <div class="scene-picker">
      <button type="button" class="icon-button" aria-label="Open scene picker" on:click={toggleScenePopover}>
        {sceneIcon}
      </button>

      {#if $scenePopoverOpen}
        <ScenePopover on:close={closeScenePopover} on:select={selectScene} on:togglelock={toggleSceneLock} />
      {/if}
    </div>

    <div class="timer-control">
      <button type="button" class="timer-button" aria-label="Open timer popover" on:click={toggleTimerPopover}>
        {$timerLabel}
      </button>

      {#if $timerPopoverOpen}
        <TimerPopover on:close={closeTimerPopover} on:select={selectTimer} />
      {/if}
    </div>
  </div>
</header>

<style>
  .ambient-header {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    box-sizing: border-box;
    z-index: 4;
    transition: opacity 180ms ease;
    pointer-events: none;
  }

  h1 {
    margin: 0;
    font-size: clamp(12px, 1.2vw, 14px);
    font-family: 'Press Start 2P', monospace;
    letter-spacing: 0.04em;
    color: #e8e0d8;
    font-weight: 400;
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
  }

  .scene-picker,
  .timer-control {
    position: relative;
  }

  .icon-button,
  .timer-button {
    border: 1px solid rgba(212, 165, 116, 0.3);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.45);
    color: #e8e0d8;
    backdrop-filter: blur(8px);
    font-family: 'IBM Plex Mono', monospace;
    cursor: pointer;
  }

  .icon-button {
    width: 36px;
    height: 36px;
    padding: 0;
    font-size: 16px;
  }

  .timer-button {
    min-width: 78px;
    height: 36px;
    padding: 0 10px;
    font-size: 14px;
  }
</style>
