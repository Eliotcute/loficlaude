<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { scene } from '../stores/appState.js';

  const dispatch = createEventDispatcher();

  const SCENES = [
    { key: 'lofiNight', icon: '🌙', label: 'Night' },
    { key: 'softRain', icon: '🌧', label: 'Rain' },
    { key: 'starDrift', icon: '⭐', label: 'Stars' },
    { key: 'fmStudio', icon: '📻', label: 'FM Studio' },
    { key: 'recordRoom', icon: '💿', label: 'Records' },
    { key: 'focusConsole', icon: '⌘', label: 'Console' }
    ,{ key: 'coffeeShop', icon: '☕', label: 'Coffee' }
    ,{ key: 'library', icon: '📚', label: 'Library' }
    ,{ key: 'rainWindow', icon: '🪟', label: 'Rain Window' }
    ,{ key: 'nightStreet', icon: '🌃', label: 'Night Street' }
    ,{ key: 'sunsetRoom', icon: '🌇', label: 'Sunset' }
  ];
  const currentScene = scene.current;
  const sceneLocked = scene.locked;

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

    if (target.closest('.scene-picker')) {
      return;
    }

    close();
  }

  function handleEsc(event) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function selectScene(key) {
    if ($sceneLocked) {
      return;
    }

    dispatch('select', { key });
    close();
  }

  function toggleLock() {
    dispatch('togglelock');
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
  class="scene-popover"
  role="menu"
  tabindex="-1"
  aria-label="Scene"
  on:pointermove={resetCloseTimer}
  on:pointerdown={resetCloseTimer}
>
  <div class="title">SCENE</div>
  {#each SCENES as item}
    <button
      type="button"
      class:selected={item.key === $currentScene}
      disabled={$sceneLocked && item.key !== $currentScene}
      on:click={() => selectScene(item.key)}
    >
      <span>{item.icon}</span> {item.label}
    </button>
  {/each}
  <button type="button" class="lock-row" on:click={toggleLock}>
    <span>{$sceneLocked ? '🔒' : '🔓'}</span> {$sceneLocked ? 'Unlock' : 'Lock'}
  </button>
</div>

<style>
  .scene-popover {
    position: absolute;
    top: 44px;
    right: 0;
    width: 168px;
    padding: 8px;
    border: 1px solid rgba(212, 165, 116, 0.3);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.92);
    display: grid;
    gap: 6px;
    animation: fade-in 120ms ease;
    z-index: 6;
  }

  .title {
    font-size: 12px;
    color: rgba(232, 224, 216, 0.75);
    letter-spacing: 0.06em;
    padding: 2px 4px;
  }

  button {
    width: 100%;
    text-align: left;
    padding: 6px 8px;
    font-size: 13px;
    border: 1px solid rgba(212, 165, 116, 0.2);
    border-radius: 6px;
    background: rgba(12, 15, 18, 0.62);
    color: #e8e0d8;
    cursor: pointer;
  }

  button.selected {
    border-color: rgba(212, 165, 116, 0.5);
    background: rgba(212, 165, 116, 0.14);
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .lock-row {
    margin-top: 2px;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
