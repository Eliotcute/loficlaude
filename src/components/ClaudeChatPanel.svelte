<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let sceneName = 'Lofi Night';
  export let messages = [];
  export let loading = false;

  const dispatch = createEventDispatcher();

  let root;
  let inputValue = '';

  $: recentMessages = messages.slice(-5);

  function close() {
    dispatch('close');
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function handleDocumentPointerDown(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (root?.contains(target)) {
      return;
    }

    close();
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
    window.addEventListener('keydown', handleDocumentKeydown);
    window.addEventListener('pointerdown', handleDocumentPointerDown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleDocumentKeydown);
    window.removeEventListener('pointerdown', handleDocumentPointerDown);
  });
</script>

<div
  bind:this={root}
  class="chat-panel"
  role="dialog"
  tabindex="-1"
  aria-label="Claude chat panel"
  on:pointerdown|stopPropagation
>
  <header class="panel-header">
    <div>
      <div class="title">LoFiClaude</div>
      <div class="scene">{sceneName}</div>
    </div>
    <button type="button" class="close-btn" aria-label="Close chat panel" on:click={close}>×</button>
  </header>

  <div class="messages" aria-live="polite">
    {#if recentMessages.length === 0}
      <div class="empty">今天想做点什么呢？</div>
    {/if}

    {#each recentMessages as item (item.id)}
      <div class="line" class:user={item.role === 'user'}>
        <span class="role">{item.role === 'user' ? 'You' : 'Claude'}</span>
        <p>{item.text}</p>
      </div>
    {/each}

    {#if loading}
      <div class="line">
        <span class="role">Claude</span>
        <p>...</p>
      </div>
    {/if}
  </div>

  <form class="input-row" on:submit={handleSubmit}>
    <input
      type="text"
      placeholder="ask something..."
      value={inputValue}
      on:input={(event) => (inputValue = event.currentTarget.value)}
      aria-label="Ask Claude"
      disabled={loading}
    />
    <button type="submit" disabled={loading || !inputValue.trim()}>{loading ? '...' : 'Send'}</button>
  </form>
</div>

<style>
  .chat-panel {
    position: absolute;
    top: 80px;
    right: 20px;
    width: min(340px, calc(100vw - 24px));
    max-height: 360px;
    border: 1px solid rgba(212, 165, 116, 0.3);
    border-radius: 10px;
    background: rgba(8, 10, 12, 0.72);
    backdrop-filter: blur(10px);
    color: #e8e0d8;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 10px;
    padding: 12px;
    z-index: 8;
    animation: panel-in 140ms ease;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    font-size: 13px;
    font-weight: 600;
  }

  .scene {
    font-size: 11px;
    opacity: 0.75;
    margin-top: 2px;
  }

  .close-btn {
    border: 0;
    background: transparent;
    color: #e8e0d8;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
  }

  .messages {
    overflow: auto;
    display: grid;
    align-content: start;
    gap: 8px;
    padding-right: 2px;
  }

  .empty {
    font-size: 12px;
    opacity: 0.8;
  }

  .line {
    background: rgba(232, 224, 216, 0.09);
    border: 1px solid rgba(212, 165, 116, 0.2);
    border-radius: 8px;
    padding: 7px 8px;
  }

  .line.user {
    background: rgba(212, 165, 116, 0.13);
    border-color: rgba(212, 165, 116, 0.34);
  }

  .role {
    font-size: 10px;
    letter-spacing: 0.05em;
    opacity: 0.72;
    display: block;
    margin-bottom: 3px;
  }

  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
  }

  .input-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  input,
  button {
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 7px;
    background: rgba(10, 12, 15, 0.82);
    color: #e8e0d8;
    height: 32px;
    font-size: 12px;
  }

  input {
    padding: 0 9px;
    outline: none;
  }

  button {
    padding: 0 10px;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @keyframes panel-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
