<script>
  import ScenePopover from './ScenePopover.svelte';
  import TimerPopover from './TimerPopover.svelte';
  import ConnectionStatus from './ConnectionStatus.svelte';
  import { focus, scene, timer, timerLabel, ui, uiChromeOpacity } from '../stores/appState.js';
  import { getSceneDefinition } from '../canvas/asciiScenes.js';
  const currentScene = scene.current;
  const sceneLocked = scene.locked;
  const focusTodayMinutes = focus.todayMinutes;
  const focusStreakDays = focus.streakDays;
  const focusLastSummary = focus.lastSummary;
  const scenePopoverOpen = ui.scenePopoverOpen;
  const timerPopoverOpen = ui.timerPopoverOpen;
  const bridgeSettingsOpen = ui.bridgeSettingsOpen;

  $: sceneIcon = getSceneDefinition($currentScene).icon;

  function toggleScenePopover() {
    ui.scenePopoverOpen.update((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        ui.timerPopoverOpen.set(false);
        ui.bridgeSettingsOpen.set(false);
      }
      return nextOpen;
    });
  }

  function toggleTimerPopover() {
    ui.timerPopoverOpen.update((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        ui.scenePopoverOpen.set(false);
        ui.bridgeSettingsOpen.set(false);
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

<header
  class="ambient-header"
  class:overlay-open={$bridgeSettingsOpen}
  style={`opacity: ${$bridgeSettingsOpen ? 1 : $uiChromeOpacity};`}
>
  <h1>LoFiClaude</h1>

  <div class="header-status" aria-label="Current scene and timer">
    <ConnectionStatus />

    <div class="header-controls">
      {#if $focusTodayMinutes > 0 || $focusStreakDays > 0}
        <div class="focus-chip" aria-label="Today focus minutes" title={$focusLastSummary}>
          {$focusTodayMinutes}m{#if $focusStreakDays > 0}<span>{$focusStreakDays}d</span>{/if}
        </div>
      {/if}

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
  </div>
</header>

<style>
  .ambient-header {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    justify-content: space-between;
    padding: 24px;
    box-sizing: border-box;
    z-index: 4;
    transition: opacity 180ms ease;
    pointer-events: none;
  }

  .ambient-header.overlay-open {
    z-index: 8;
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
    align-items: flex-start;
    justify-content: flex-end;
    gap: 10px;
    pointer-events: auto;
    min-width: 0;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    height: 44px;
    align-self: flex-start;
    flex-shrink: 0;
  }

  .scene-picker,
  .timer-control {
    position: relative;
  }

  .focus-chip {
    height: 44px;
    box-sizing: border-box;
    min-width: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid rgba(116, 143, 212, 0.28);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.86);
    color: rgba(232, 224, 216, 0.82);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }

  .focus-chip span {
    color: rgba(232, 224, 216, 0.56);
    font-size: 10px;
  }

  .icon-button,
  .timer-button {
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.86);
    color: #e8e0d8;
    font-family: 'IBM Plex Mono', monospace;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(232, 224, 216, 0.04);
    transition: border-color 140ms ease, background 140ms ease;
    box-sizing: border-box;
  }

  .icon-button:hover,
  .timer-button:hover {
    border-color: rgba(212, 165, 116, 0.46);
    background: rgba(12, 15, 18, 0.72);
  }

  .icon-button:focus:not(:focus-visible),
  .timer-button:focus:not(:focus-visible) {
    outline: none;
  }

  .icon-button:focus-visible,
  .timer-button:focus-visible {
    outline: 1px solid rgba(212, 165, 116, 0.82);
    outline-offset: 3px;
  }

  .icon-button {
    width: 44px;
    height: 44px;
    padding: 0;
    font-size: 16px;
  }

  .timer-button {
    min-width: 78px;
    height: 44px;
    padding: 0 10px;
    font-size: 14px;
  }

  @media (max-width: 560px) {
    .ambient-header {
      padding: 14px 12px;
    }

    h1 {
      font-size: 11px;
      line-height: 1.5;
      white-space: nowrap;
    }

    .header-status {
      display: grid;
      grid-template-columns: 1fr;
      gap: 4px;
      max-width: calc(100vw - 104px);
    }

    .header-status :global(.connection-status) {
      grid-column: 1 / -1;
      width: 100%;
    }

    .header-controls {
      justify-content: flex-end;
      gap: 4px;
    }

    .focus-chip,
    .icon-button {
      height: 44px;
    }

    .icon-button {
      width: 44px;
      height: 44px;
    }

    .timer-button {
      min-width: 62px;
      height: 44px;
      font-size: 12px;
    }
  }
</style>
