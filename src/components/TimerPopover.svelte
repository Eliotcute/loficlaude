<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { timer } from '../stores/appState.js';

  const dispatch = createEventDispatcher();

  const OPTIONS = [25, 45, 60];
  const timerActive = timer.active;
  const timerMinutes = timer.minutes;

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

    if (target.closest('.timer-control')) {
      return;
    }

    close();
  }

  function handleEsc(event) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function selectMinutes(minutes) {
    dispatch('select', { minutes });
    close();
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
  class="timer-popover"
  role="dialog"
  tabindex="-1"
  aria-label="Timer"
  on:pointermove={resetCloseTimer}
  on:pointerdown={resetCloseTimer}
>
  <div class="title">TIMER</div>
  {#each OPTIONS as minutes}
    <button
      type="button"
      class:active={$timerActive && $timerMinutes === minutes}
      on:click={() => selectMinutes(minutes)}
    >
      {minutes} min
    </button>
  {/each}
  <button type="button" class:active={!$timerActive} on:click={() => selectMinutes(null)}>Off</button>
</div>

<style>
  .timer-popover {
    position: absolute;
    top: 44px;
    right: 0;
    width: 148px;
    border: 1px solid rgba(212, 165, 116, 0.3);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.92);
    padding: 8px;
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
    border: 1px solid rgba(212, 165, 116, 0.2);
    border-radius: 6px;
    background: rgba(12, 15, 18, 0.62);
    color: #e8e0d8;
    padding: 6px 8px;
    font-size: 13px;
    cursor: pointer;
  }

  button.active {
    border-color: rgba(212, 165, 116, 0.5);
    background: rgba(212, 165, 116, 0.14);
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
