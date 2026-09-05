<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { ui } from '../stores/appState.js';

  export let title = '';
  export let genreColor = '#d4a574';
  export let isPlaying = false;
  export let isLoading = false;
  export let musicStatus = 'disabled';
  export let musicProvider = 'youtube';
  export let error = null;
  export let rainSourceStatus = 'idle';
  export let rainType = 'medium';
  export let rainVolume = 60;
  export let timerMinutes = 45;
  export let timerActive = false;

  const dispatch = createEventDispatcher();
  const TIMER_OPTIONS = [25, 45, 60];
  const RAIN_TYPES = ['light', 'medium', 'heavy', 'stop'];

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
      inactivityTimeout = null;
      expanded = false;
      ui.miniPlayerExpanded.set(false);
    }, 5000);
  }

  function openExpanded() {
    expanded = true;
    ui.miniPlayerExpanded.set(true);
    emitActivity();
    resetInactivityTimer();
  }

  function closeExpanded() {
    expanded = false;
    ui.miniPlayerExpanded.set(false);
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
    ui.miniPlayerExpanded.set(false);
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
      <span class="brand">{musicProvider === 'netease-local' ? '网易云 · 本机' : 'YouTube · Claude FM'}</span>
    <span class="actions">
      <span class="pause">{musicStatus === 'loading' ? '...' : isPlaying ? '❚❚' : '▶'}</span>
      <span>🌧{rainVolume}</span>
    </span>
  </button>

  {#if expanded}
    <div class="expanded-body" transition:slide={{ duration: 250, easing: (t) => 1 - Math.pow(1 - t, 3) }}>
      <div class="section-heading">音乐</div>
      <div class="label">{error ? '音频提示' : musicStatus === 'disabled' ? '音乐未启动' : isLoading ? '正在加载音乐' : musicStatus === 'playing' ? '正在播放' : '已暂停'}</div>
      <div class="title-row">
        <span class="genre-dot" style={`background: ${genreColor};`} aria-hidden="true"></span>
        <div class="title" title={error || title}>{error || (musicProvider === 'netease-local' ? '本机 mpv 播放器' : title)}</div>
      </div>

      <div class="controls">
        <button type="button" aria-label="Previous track" on:click={() => forward('previous')}>◀</button>
        <button type="button" aria-label={isPlaying ? 'Pause track' : 'Play track'} on:click={() => forward('toggleplay')}>
          {musicStatus === 'loading' ? '...' : isPlaying ? '❚❚' : '▶'}
        </button>
        <button type="button" aria-label="Next track" on:click={() => forward('next')}>▶</button>
      </div>

      <div class="section-row">
        <span class="section-title">雨声</span>
        <span class="source-badge" class:remote={rainSourceStatus === 'rainy-mood'} class:fallback={rainSourceStatus === 'fallback'}>
          {rainSourceStatus === 'rainy-mood' ? 'RAINY MOOD' : rainSourceStatus === 'fallback' ? '本机备用' : rainSourceStatus === 'stopped' ? '已停止' : '未启动'}
        </span>
        <div class="chip-row">
          {#each RAIN_TYPES as type}
            <button type="button" class:active={type !== 'stop' && rainType === type} on:click={() => handleRainType(type)}>{type}</button>
          {/each}
        </div>
      </div>

      <div class="slider-row">
        <input type="range" min="0" max="100" value={rainVolume} on:input={handleRainVolume} aria-label="Rain volume" />
        <span>{rainVolume}%</span>
      </div>

      <div class="section-row">
        <span class="section-title">专注</span>
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
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(10, 12, 13, 0.96), rgba(7, 9, 10, 0.94));
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(232, 224, 216, 0.04);
    color: #e8e0d8;
    overflow: hidden;
    z-index: 5;
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

  .collapsed:focus:not(:focus-visible),
  .controls button:focus:not(:focus-visible),
  .chip-row button:focus:not(:focus-visible) {
    outline: none;
  }

  .collapsed:focus-visible,
  .controls button:focus-visible,
  .chip-row button:focus-visible,
  input[type='range']:focus-visible {
    outline: 1px solid rgba(212, 165, 116, 0.82);
    outline-offset: 3px;
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
    min-height: 32px;
  }

  .pause {
    min-width: 16px;
    text-align: center;
  }

  .expanded-body {
    min-height: 180px;
    padding: 12px 14px 14px;
    display: grid;
    gap: 9px;
    border-top: 1px solid rgba(212, 165, 116, 0.18);
    font-family: 'IBM Plex Mono', monospace;
  }

  .label {
    font-size: 11px;
    letter-spacing: 0.08em;
    color: rgba(232, 224, 216, 0.75);
  }

  .section-heading {
    color: #d4a574;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .title {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 7px;
  }

  .genre-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(212, 165, 116, 0.15);
  }

  .controls {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }

  .controls button,
  .chip-row button {
    border: 1px solid rgba(212, 165, 116, 0.25);
    border-radius: 7px;
    background: rgba(12, 15, 18, 0.74);
    color: inherit;
    min-height: 40px;
    padding: 0 12px;
    font-family: inherit;
    cursor: pointer;
    text-transform: lowercase;
    transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
  }

  .controls button:hover,
  .chip-row button:hover {
    border-color: rgba(212, 165, 116, 0.48);
    background: rgba(212, 165, 116, 0.08);
  }

  .controls button:active,
  .chip-row button:active {
    transform: translateY(1px);
  }

  .controls button:nth-child(2) {
    font-size: 16px;
  }

  .section-row {
    display: grid;
    grid-template-columns: 52px auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
  }

  .section-title {
    font-size: 12px;
    color: rgba(232, 224, 216, 0.75);
  }

  .source-badge {
    border: 1px solid rgba(232, 224, 216, 0.2);
    border-radius: 7px;
    min-height: 40px;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    padding: 0 10px;
    color: rgba(232, 224, 216, 0.55);
    font-size: 9px;
    line-height: 1;
    white-space: nowrap;
  }

  .source-badge.remote {
    color: #a8d8b2;
    border-color: rgba(103, 191, 122, 0.42);
  }

  .source-badge.fallback {
    color: #e4c189;
    border-color: rgba(212, 165, 116, 0.5);
  }

  .chip-row {
    display: flex;
    gap: 6px;
  }

  .chip-row button.active {
    border-color: rgba(212, 165, 116, 0.62);
    background: rgba(212, 165, 116, 0.18);
    box-shadow: inset 0 0 0 1px rgba(212, 165, 116, 0.08);
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
      min-height: 200px;
    }

    .chip-row {
      flex-wrap: wrap;
    }

    .controls button,
    .chip-row button {
      min-height: 40px;
    }
  }
</style>
