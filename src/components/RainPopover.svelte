<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { rain } from '../stores/appState.js';

  const dispatch = createEventDispatcher();
  const RAIN_TYPES = ['light', 'medium', 'heavy'];
  const rainType = rain.type;
  const rainVolume = rain.volume;

  let root;
  let closeTimeout;

  function close() {
    dispatch('close');
  }

  function resetCloseTimer() {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }

    closeTimeout = setTimeout(() => {
      close();
    }, 5000);
  }

  function handleDocumentPointerDown(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (root?.contains(target)) {
      resetCloseTimer();
      return;
    }

    if (target.closest('.rain-control')) {
      return;
    }

    close();
  }

  function handleEsc(event) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function handleTypeSelect(type) {
    dispatch('setType', { type });
    resetCloseTimer();
  }

  function handleVolumeInput(event) {
    const value = Number(event.currentTarget.value);
    dispatch('setVolume', { value });
    resetCloseTimer();
  }

  onMount(() => {
    resetCloseTimer();
    window.addEventListener('pointerdown', handleDocumentPointerDown);
    window.addEventListener('keydown', handleEsc);
  });

  onDestroy(() => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
    window.removeEventListener('pointerdown', handleDocumentPointerDown);
    window.removeEventListener('keydown', handleEsc);
  });
</script>

<div
  bind:this={root}
  class="rain-popover"
  role="dialog"
  tabindex="-1"
  aria-label="Rain"
  on:pointermove={resetCloseTimer}
  on:pointerdown={resetCloseTimer}
>
  <div class="title">RAIN</div>
  <div class="types">
    {#each RAIN_TYPES as type}
      <button type="button" class:active={$rainType === type} on:click={() => handleTypeSelect(type)}>{type}</button>
    {/each}
  </div>
  <div class="volume-row">
    <input type="range" min="0" max="100" value={$rainVolume} on:input={handleVolumeInput} aria-label="Rain volume" />
    <span>{$rainVolume}%</span>
  </div>
</div>

<style>
  .rain-popover {
    position: absolute;
    right: 0;
    bottom: 42px;
    width: min(280px, calc(100vw - 32px));
    border: 1px solid rgba(212, 165, 116, 0.3);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.92);
    padding: 10px;
    display: grid;
    gap: 10px;
    animation: fade-in 120ms ease;
    z-index: 6;
  }

  .title {
    font-size: 12px;
    letter-spacing: 0.06em;
    color: rgba(232, 224, 216, 0.75);
  }

  .types {
    display: flex;
    gap: 6px;
  }

  .types button {
    border: 1px solid rgba(212, 165, 116, 0.25);
    border-radius: 6px;
    background: rgba(12, 15, 18, 0.62);
    color: #e8e0d8;
    font-size: 12px;
    padding: 5px 8px;
    text-transform: lowercase;
    cursor: pointer;
  }

  .types button.active {
    border-color: rgba(212, 165, 116, 0.5);
    background: rgba(212, 165, 116, 0.14);
  }

  .volume-row {
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

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
