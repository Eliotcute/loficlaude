<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';

  export let title = 'LoFiClaude';
  export let message = '今天想做点什么呢？';
  export let passive = false;
  export let loading = false;
  export let anchor = { x: 0, y: 0 };

  const dispatch = createEventDispatcher();

  let root;
  let inputValue = '';
  let autoCloseTimeout;

  function close() {
    dispatch('close');
  }

  function resetPassiveTimeout() {
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
      autoCloseTimeout = null;
    }

    if (!passive) {
      return;
    }

    autoCloseTimeout = setTimeout(() => {
      close();
    }, 8000);
  }

  function handleDocumentPointerDown(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (root?.contains(target)) {
      resetPassiveTimeout();
      return;
    }

    close();
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const text = inputValue.trim();
    if (!text || loading) {
      return;
    }

    dispatch('send', { text });
    inputValue = '';
  }

  onMount(() => {
    resetPassiveTimeout();
    window.addEventListener('pointerdown', handleDocumentPointerDown);
    window.addEventListener('keydown', handleDocumentKeydown);
  });

  onDestroy(() => {
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
    }
    window.removeEventListener('pointerdown', handleDocumentPointerDown);
    window.removeEventListener('keydown', handleDocumentKeydown);
  });

  $: if (passive) {
    resetPassiveTimeout();
  }
</script>

<div
  bind:this={root}
  class:passive
  class="claude-bubble"
  role="dialog"
  aria-label="Claude bubble"
  style="left: clamp(10px, {anchor.x - 130}px, calc(100vw - 290px)); top: clamp(10px, {anchor.y - 150}px, calc(100vh - 190px));"
>
  <div class="bubble-header">
    <span>{title}</span>
    <button type="button" class="close-btn" aria-label="Close Claude bubble" on:click={close}>×</button>
  </div>

  <div class="message">{message}</div>

  <form class="input-row" on:submit={handleSubmit}>
    <input
      type="text"
      placeholder="ask something..."
      value={inputValue}
      on:input={(event) => {
        inputValue = event.currentTarget.value;
        resetPassiveTimeout();
      }}
      aria-label="Ask Claude"
      disabled={loading}
    />
    <button type="submit" class="send-btn" aria-label="Send message" disabled={loading || !inputValue.trim()}>→</button>
  </form>

  <div class="tail" aria-hidden="true"></div>
</div>

<style>
  .claude-bubble {
    position: absolute;
    width: min(280px, calc(100vw - 32px));
    border-radius: 14px;
    background: rgba(232, 224, 216, 0.92);
    color: #111;
    border: 1px solid rgba(17, 17, 17, 0.12);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
    padding: 10px 12px 12px;
    z-index: 7;
    animation: bubble-in 140ms ease;
  }

  .claude-bubble.passive {
    animation: bubble-in 140ms ease, bubble-fade 320ms ease 7.68s forwards;
  }

  .bubble-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
  }

  .close-btn {
    border: 0;
    background: transparent;
    font-size: 16px;
    line-height: 1;
    color: #111;
    cursor: pointer;
    padding: 0;
  }

  .message {
    font-size: 13px;
    line-height: 1.35;
    min-height: 18px;
    margin-bottom: 8px;
  }

  .input-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
  }

  input {
    width: 100%;
    border: 1px solid rgba(17, 17, 17, 0.18);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.7);
    color: #111;
    padding: 7px 9px;
    font-size: 12px;
    outline: none;
  }

  input:focus {
    border-color: rgba(17, 17, 17, 0.45);
  }

  .send-btn {
    border: 1px solid rgba(17, 17, 17, 0.18);
    border-radius: 8px;
    background: rgba(17, 17, 17, 0.06);
    color: #111;
    width: 32px;
    cursor: pointer;
  }

  .send-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .tail {
    position: absolute;
    left: 50%;
    bottom: -8px;
    width: 14px;
    height: 14px;
    background: rgba(232, 224, 216, 0.92);
    border-right: 1px solid rgba(17, 17, 17, 0.12);
    border-bottom: 1px solid rgba(17, 17, 17, 0.12);
    transform: rotate(45deg);
  }

  @keyframes bubble-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes bubble-fade {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

</style>
