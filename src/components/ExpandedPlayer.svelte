<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';

  export let title = '';
  export let isPlaying = false;
  export let rainType = 'medium';
  export let rainVolume = 60;
  export let timerMinutes = 45;
  export let timerActive = false;

  const dispatch = createEventDispatcher();
  const TIMER_OPTIONS = [25, 45, 60];
  const RAIN_TYPES = ['light', 'medium', 'heavy'];

  let expanded = false;
  let inactivityTimeout;
  let touchStartY = null;

  function emitActivity() {
    dispatch('activity');
  }

  function clearInactivityTimer() {
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = null;
    }
  }

  function resetInactivityTimer() {
    clearInactivityTimer();
    if (!expanded) {
      return;
    }

    inactivityTimeout = setTimeout(() => {
      expanded = false;
    }, 5000);
  }

  function openExpanded() {
    expanded = true;
    emitActivity();
    resetInactivityTimer();
  }

  function closeExpanded() {
    expanded = false;
    clearInactivityTimer();
    emitActivity();
  }

  function handleEsc(event) {
    if (event.key === 'Escape' && expanded) {
      closeExpanded();
    }
  }

  function handleTouchStart(event) {
    touchStartY = event.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(event) {
    if (touchStartY === null || expanded) {
      touchStartY = null;
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? touchStartY;
    const deltaY = touchStartY - endY;
    if (deltaY > 24) {
      openExpanded();
    }
    touchStartY = null;
  }

  function selectTimer(minutes) {
    dispatch('settimer', { minutes });
    resetInactivityTimer();
  }

  function handleRainType(type) {
    dispatch('setraintype', { type });
    resetInactivityTimer();
  }

  function handleRainVolume(event) {
    dispatch('setrainvolume', { value: Number(event.currentTarget.value) });
    resetInactivityTimer();
  }

  function forward(eventName) {
    dispatch(eventName);
    emitActivity();
    resetInactivityTimer();
  }

  onMount(() => {
    window.addEventListener('keydown', handleEsc);
  });

  onDestroy(() => {
    clearInactivityTimer();
    window.removeEventListener('keydown', handleEsc);
  });
</script>

{#if expanded}
  <button type="button" class="overlay" aria-label="Close drawer" on:click={closeExpanded}></button>
{/if}

<div
  class="drawer"
  class:expanded={expanded}
  role="dialog"
  tabindex="-1"
  aria-label="Player drawer"
  on:pointerdown={emitActivity}
  on:pointermove={resetInactivityTimer}
>
  <button
    type="button"
    class="collapsed"
    aria-label="Open expanded player"
    on:click={openExpanded}
    on:touchstart={handleTouchStart}
    on:touchend={handleTouchEnd}
  >
    <span class="brand">Claude FM</span>
    <span class="actions">
      <span class="pause">{isPlaying ? '❚❚' : '▶'}</span>
      <span>🌧{rainVolume}</span>
    </span>
  </button>

  {#if expanded}
    <div class="expanded-body">
      <div class="label">NOW PLAYING</div>
      <div class="title" title={title}>{title}</div>

      <div class="controls">
        <button type="button" aria-label="Previous track" on:click={() => forward('previous')}>◀</button>
        <button type="button" aria-label={isPlaying ? 'Pause track' : 'Play track'} on:click={() => forward('toggleplay')}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button type="button" aria-label="Next track" on:click={() => forward('next')}>▶</button>
      </div>

      <div class="section-row">
        <span class="section-title">RAIN</span>
        <div class="chip-row">
          {#each RAIN_TYPES as type}
            <button type="button" class:active={rainType === type} on:click={() => handleRainType(type)}>{type}</button>
          {/each}
        </div>
      </div>

      <div class="slider-row">
        <input type="range" min="0" max="100" value={rainVolume} on:input={handleRainVolume} aria-label="Rain volume" />
        <span>{rainVolume}%</span>
      </div>

      <div class="section-row">
        <span class="section-title">TIMER</span>
        <div class="chip-row">
          {#each TIMER_OPTIONS as minutes}
            <button
              type="button"
              class:active={timerActive && timerMinutes === minutes}
              on:click={() => selectTimer(minutes)}
            >
              {minutes}
            </button>
          {/each}
          <button type="button" class:active={!timerActive} on:click={() => selectTimer(null)}>off</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: transparent;
    border: 0;
    z-index: 3;
  }

  .drawer {
    position: relative;
    width: 100%;
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 12px;
    background: rgba(8, 10, 12, 0.72);
    backdrop-filter: blur(12px);
    color: #e8e0d8;
    overflow: hidden;
    z-index: 4;
  }

  .collapsed {
    width: 100%;
    height: 52px;
    border: 0;
    background: transparent;
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    font-family: 'IBM Plex Mono', monospace;
    cursor: pointer;
  }

  .brand {
    font-size: 13px;
    font-weight: 500;
  }

  .actions {
    display: inline-flex;
    gap: 10px;
    align-items: center;
    font-size: 13px;
  }

  .pause {
    min-width: 16px;
    text-align: center;
  }

  .expanded-body {
    min-height: 180px;
    max-height: 220px;
    padding: 10px 14px 14px;
    display: grid;
    gap: 10px;
    border-top: 1px solid rgba(212, 165, 116, 0.18);
    font-family: 'IBM Plex Mono', monospace;
  }

  .label {
    font-size: 11px;
    letter-spacing: 0.08em;
    color: rgba(232, 224, 216, 0.75);
  }

  .title {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .controls {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }

  .controls button,
  .chip-row button {
    border: 1px solid rgba(212, 165, 116, 0.25);
    border-radius: 8px;
    background: rgba(12, 15, 18, 0.62);
    color: inherit;
    min-height: 32px;
    font-family: inherit;
    cursor: pointer;
    text-transform: lowercase;
  }

  .controls button:nth-child(2) {
    font-size: 16px;
  }

  .section-row {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
  }

  .section-title {
    font-size: 12px;
    color: rgba(232, 224, 216, 0.75);
  }

  .chip-row {
    display: flex;
    gap: 6px;
  }

  .chip-row button.active {
    border-color: rgba(212, 165, 116, 0.52);
    background: rgba(212, 165, 116, 0.16);
  }

  .slider-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }

  input[type='range'] {
    width: 100%;
    accent-color: #d4a574;
  }

  @media (max-width: 720px) {
    .expanded-body {
      max-height: none;
      min-height: 200px;
    }

    .chip-row {
      flex-wrap: wrap;
    }
  }
</style>
