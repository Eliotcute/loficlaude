<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { connectionStatus, toolRunning } from '../stores/bridgeState.js';

  export let sceneName = 'Lofi Night';
  export let messages = [];
  export let loading = false;
  export let canReconnect = false;
  export let activeAssistantId = null;

  const dispatch = createEventDispatcher();

  let root;
  let inputValue = '';

  $: recentMessages = messages;
  $: bridgeConnected = $connectionStatus === 'connected';

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

  function handleReconnect() {
    dispatch('reconnect');
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
      <div class="scene">{sceneName} · bridge {$connectionStatus}</div>
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
        <p>
          {#if loading && item.role === 'assistant' && item.id === activeAssistantId}
            <span class="streaming-text">{item.text}</span>
          {:else if item.text}
            {item.text}
          {:else if loading && item.role === 'assistant'}
            <span class="cursor-pulse">▊</span>
          {/if}
        </p>
      </div>
    {/each}

    {#if $toolRunning}
      <div class="line">
        <span class="role">Tool</span>
        <p>Running: {$toolRunning}</p>
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
      disabled={loading || !bridgeConnected}
    />
    <button type="submit" disabled={loading || !bridgeConnected || !inputValue.trim()}>{loading ? '...' : 'Send'}</button>
  </form>

  {#if !bridgeConnected}
    <div class="hint-row">
      <p class="hint">Bridge not connected. Start the local bridge, then reconnect.</p>
      {#if canReconnect}
        <button type="button" class="reconnect-btn" on:click={handleReconnect}>Reconnect</button>
      {/if}
    </div>
  {/if}
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

  .hint {
    margin: 0;
    font-size: 11px;
    line-height: 1.4;
    color: #cda89c;
  }

  .hint-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .reconnect-btn {
    height: 28px;
    font-size: 11px;
    white-space: nowrap;
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

  @keyframes pulse-cursor {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.25;
    }
  }

  .cursor-pulse {
    animation: pulse-cursor 1s ease-in-out infinite;
  }

  .streaming-text::after {
    content: '';
    display: inline-block;
    width: 2px;
    height: 1em;
    background: #d4a574;
    vertical-align: text-bottom;
    margin-left: 1px;
    animation: pixel-blink 500ms steps(1) infinite;
  }

  @keyframes pixel-blink {
    0%,
    65% {
      opacity: 1;
    }
    66%,
    100% {
      opacity: 0;
    }
  }
</style>
