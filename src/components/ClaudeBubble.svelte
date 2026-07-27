<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { connectionStatus } from '../stores/bridgeState.js';

  export let title = 'LoFiClaude';
  export let message = '今天想做点什么呢？';
  export let messages = [];
  export let activeAssistantId = null;
  export let passive = false;
  export let loading = false;
  export let anchor = { x: 0, y: 0 };

  const dispatch = createEventDispatcher();

  let root;
  let inputValue = '';
  let autoCloseTimeout;

  $: bridgeConnected = $connectionStatus === 'connected';
  $: fallbackWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  $: fallbackHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  $: anchorX = Number.isFinite(anchor?.x) && anchor.x > 0 ? anchor.x : Math.round(fallbackWidth / 2);
  $: anchorY = Number.isFinite(anchor?.y) && anchor.y > 0 ? anchor.y : Math.round(fallbackHeight * 0.58);
  $: latestAssistant = [...messages].reverse().find((item) => item.role === 'assistant');
  $: latestUser = [...messages].reverse().find((item) => item.role === 'user');
  $: activeAssistant = activeAssistantId
    ? messages.find((item) => item.id === activeAssistantId && item.role === 'assistant')
    : null;
  $: bubbleText = activeAssistant?.text || message || latestAssistant?.text || '今天想做点什么呢？';
  $: userPreview = latestUser?.text ?? '';

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

<div
  bind:this={root}
  class:passive
  class="claude-bubble"
  role="dialog"
  aria-label="Claude bubble"
  style="left: clamp(14px, {anchorX - 132}px, calc(100vw - 304px)); top: clamp(14px, {anchorY - 164}px, calc(100vh - 360px));"
>
  <div class="bubble-header">
    <span>{title}</span>
    <div class="bubble-actions">
      {#if messages.length > 0}
        <button type="button" class="icon-btn" aria-label="Open Claude history" on:click={handleOpenHistory}>≡</button>
      {/if}
      <button type="button" class="close-btn" aria-label="Close Claude bubble" on:click={close}>×</button>
    </div>
  </div>

  <div class="message-list" aria-live="polite">
    {#if userPreview && loading}
      <div class="line user">
        <span class="role">You</span>
        <p>{userPreview}</p>
      </div>
    {/if}
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
    border-radius: 12px;
    background: rgba(232, 224, 216, 0.9);
    color: #111;
    border: 1px solid rgba(17, 17, 17, 0.12);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.3);
    padding: 10px 12px 12px;
    z-index: 19;
    animation: bubble-in 140ms ease;
    backdrop-filter: blur(10px);
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

  .bubble-actions {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .icon-btn,
  .close-btn {
    border: 0;
    background: transparent;
    font-size: 16px;
    line-height: 1;
    color: #111;
    cursor: pointer;
    padding: 0;
  }

  .icon-btn {
    font-size: 14px;
    width: 20px;
    height: 20px;
  }

  .message-list {
    display: grid;
    gap: 6px;
    margin-bottom: 8px;
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
  }

  .line {
    border: 1px solid rgba(17, 17, 17, 0.14);
    border-radius: 8px;
    background: rgba(17, 17, 17, 0.05);
    padding: 6px 7px;
  }

  .line.user {
    background: rgba(17, 17, 17, 0.09);
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
    color: rgba(17, 17, 17, 0.62);
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

  input:focus-visible,
  .send-btn:focus-visible,
  .close-btn:focus-visible,
  .icon-btn:focus-visible {
    outline: 1px solid rgba(17, 17, 17, 0.38);
    outline-offset: 2px;
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
