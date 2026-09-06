<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { connectionStatus } from '../stores/bridgeState.js';

  export let title = 'LoFiClaude';
  export let message = '今天想做点什么呢？';
  export let messages = [];
  export let activeAssistantId = null;
  export let companionState = 'resting';
  export let passive = false;
  export let loading = false;
  export let anchor = { x: 0, y: 0 };

  const dispatch = createEventDispatcher();

  let root;
  let inputValue = '';
  let autoCloseTimeout;
  let viewportWidth = 1024;
  let viewportHeight = 768;

  $: bridgeConnected = $connectionStatus === 'connected';
  $: fallbackWidth = viewportWidth;
  $: fallbackHeight = viewportHeight;
  $: anchorX = Number.isFinite(anchor?.x) && anchor.x > 0 ? anchor.x : Math.round(fallbackWidth / 2);
  $: anchorY = Number.isFinite(anchor?.y) && anchor.y > 0 ? anchor.y : Math.round(fallbackHeight * 0.58);
  $: bubbleWidth = Math.min(290, Math.max(0, fallbackWidth - 28));
  $: bubbleLeft = Math.max(
    14,
    Math.min(
      anchorX >= fallbackWidth / 2 ? anchorX - bubbleWidth - 24 : anchorX + 24,
      fallbackWidth - bubbleWidth - 14
    )
  );
  $: bubbleTop = Math.max(72, Math.min(anchorY - 186, fallbackHeight - 290));
  $: latestAssistant = [...messages].reverse().find((item) => item.role === 'assistant');
  $: activeAssistant = activeAssistantId
    ? messages.find((item) => item.id === activeAssistantId && item.role === 'assistant')
    : null;
  $: bubbleText = activeAssistant?.text || (loading ? message : latestAssistant?.text || message) || '今天想做点什么呢？';
  $: statusLabel = {
    listening: 'LISTENING', typing: 'TYPING', thinking: 'THINKING', speaking: 'REPLYING',
    resting: 'RESTING', idle: bridgeConnected ? 'CONNECTED' : 'LOCAL MODE', error: 'OFFLINE'
  }[companionState] ?? (bridgeConnected ? 'CONNECTED' : 'LOCAL MODE');

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

  function handleOpenHistory() {
    dispatch('history');
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

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} />

<div
  bind:this={root}
  class:passive
  class="claude-bubble"
  role="dialog"
  aria-label="Claude bubble"
  style={`left: ${bubbleLeft}px; top: ${bubbleTop}px;`}
>
  <div class="bubble-header">
    <div class="bubble-title">
      <span>{title}</span>
      <span class="status-chip" class:active={loading}>{statusLabel}</span>
    </div>
    <div class="bubble-actions">
      {#if messages.length > 0}
        <button type="button" class="icon-btn" aria-label="Open Claude history" title="Open history" on:click={handleOpenHistory}>≡</button>
      {/if}
      <button type="button" class="close-btn" aria-label="Close Claude bubble" title="Close" on:click={close}>×</button>
    </div>
  </div>

  <div class="message-list" aria-live="polite">
    <div class="message" class:streaming-text={loading && activeAssistantId}>{bubbleText}</div>
  </div>

  {#if !bridgeConnected}
    <div class="bridge-hint">Local companion mode</div>
  {/if}

  <form class="input-row" on:submit={handleSubmit}>
    <input
      type="text"
      placeholder={bridgeConnected ? 'ask something...' : 'ask locally...'}
      value={inputValue}
      on:input={(event) => {
        inputValue = event.currentTarget.value;
        if (inputValue.trim()) {
          dispatch('typing');
        }
        resetPassiveTimeout();
      }}
      on:focus={() => {
        dispatch('listening');
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
    width: min(290px, calc(100vw - 28px));
    border-radius: 8px;
    background: rgba(9, 11, 14, 0.94);
    color: #e8e0d8;
    border: 1px solid rgba(212, 165, 116, 0.34);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.34);
    padding: 10px 12px 12px;
    z-index: 19;
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
    font-weight: 500;
    color: #e8e0d8;
  }

  .bubble-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .status-chip {
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 8px;
    padding: 4px 7px;
    color: rgba(232, 224, 216, 0.64);
    font: 10px/1 'IBM Plex Mono', monospace;
    white-space: nowrap;
  }

  .status-chip.active {
    color: #d4a574;
    border-color: rgba(212, 165, 116, 0.52);
  }

  .bubble-actions {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .icon-btn,
  .close-btn {
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 8px;
    background: transparent;
    font-size: 16px;
    line-height: 1;
    color: #e8e0d8;
    cursor: pointer;
    width: 32px;
    min-height: 32px;
    height: 32px;
    position: relative;
    display: grid;
    place-items: center;
    padding: 0;
  }

  .icon-btn::before,
  .close-btn::before {
    content: '';
    position: absolute;
    inset: -6px;
  }

  .icon-btn {
    font-size: 14px;
  }

  .message-list {
    display: grid;
    gap: 6px;
    margin: 6px 0 10px;
    overflow: hidden;
  }

  .message {
    font-size: 13px;
    line-height: 1.35;
    min-height: 18px;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: pre-line;
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

  .bridge-hint {
    margin-bottom: 8px;
    font-size: 11px;
    color: rgba(232, 224, 216, 0.58);
  }

  .input-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
  }

  input {
    width: 100%;
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    color: #e8e0d8;
    padding: 7px 9px;
    font-size: 12px;
    outline: none;
  }

  input:focus {
    border-color: rgba(17, 17, 17, 0.45);
  }

  input:focus-visible,
  .send-btn:focus-visible,
  .close-btn:focus-visible,
  .icon-btn:focus-visible {
    outline: 1px solid rgba(212, 165, 116, 0.9);
    outline-offset: 2px;
  }

  .send-btn {
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 8px;
    background: rgba(212, 165, 116, 0.08);
    color: #e8e0d8;
    width: 40px;
    height: 40px;
    min-width: 40px;
    position: relative;
    cursor: pointer;
  }

  .send-btn::before {
    content: '';
    position: absolute;
    inset: -2px;
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
    background: rgba(9, 11, 14, 0.94);
    border-right: 1px solid rgba(212, 165, 116, 0.34);
    border-bottom: 1px solid rgba(212, 165, 116, 0.34);
    transform: rotate(45deg);
  }

  @media (max-height: 760px) {
    .claude-bubble {
      top: 14px !important;
      max-height: calc(100vh - 28px);
      overflow: hidden;
    }

    .message-list {
      max-height: min(160px, calc(100vh - 178px));
    }
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
