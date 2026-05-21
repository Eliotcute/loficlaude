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
  let errorHint = '';
  let shakeError = false;
  let shakeTimer;

  $: bridgeConnected = $connectionStatus === 'connected';

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

  function triggerDisconnectedError() {
    errorHint = 'Bridge not connected — run `node bridge/index.js`';
    shakeError = true;

    if (shakeTimer) {
      window.clearTimeout(shakeTimer);
    }

    shakeTimer = window.setTimeout(() => {
      shakeError = false;
      shakeTimer = null;
    }, 500);
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

    if (!bridgeConnected) {
      triggerDisconnectedError();
      return;
    }

    errorHint = '';
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
    if (shakeTimer) {
      clearTimeout(shakeTimer);
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
  class:shake-error={shakeError}
  class="claude-bubble"
  role="dialog"
  aria-label="Claude bubble"
  style="left: clamp(14px, {anchor.x - 132}px, calc(100vw - 304px)); top: clamp(14px, {anchor.y - 164}px, calc(100vh - 360px));"
>
  <div class="bubble-header">
    <span>{title}</span>
    <button type="button" class="close-btn" aria-label="Close Claude bubble" on:click={close}>×</button>
  </div>

  <div class="message-list" aria-live="polite">
    {#if messages.length === 0}
      <div class="message">{message}</div>
    {:else}
      {#each messages as item (item.id)}
        <div class="line" class:user={item.role === 'user'}>
          <span class="role">{item.role === 'user' ? 'You' : 'Claude'}</span>
          {#if loading && item.role === 'assistant' && item.id === activeAssistantId}
            <p class="streaming-text">{item.text}</p>
          {:else}
            <p>{item.text}</p>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  {#if errorHint}
    <div class="bridge-hint error" role="status">{errorHint}</div>
  {:else if !bridgeConnected}
    <div class="bridge-hint">Bridge not connected</div>
  {/if}

  <form class="input-row" on:submit={handleSubmit}>
    <input
      type="text"
      placeholder={bridgeConnected ? 'ask something...' : 'Start the local bridge to chat'}
      value={inputValue}
      on:input={(event) => {
        inputValue = event.currentTarget.value;
        if (errorHint) {
          errorHint = '';
        }
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
    z-index: 9;
    animation: bubble-in 140ms ease;
    backdrop-filter: blur(10px);
  }

  .claude-bubble.passive {
    animation: bubble-in 140ms ease, bubble-fade 320ms ease 7.68s forwards;
  }

  .claude-bubble.shake-error {
    animation: bubble-in 140ms ease, bubble-shake 500ms ease;
    border-color: rgba(185, 70, 70, 0.72);
    box-shadow: 0 0 0 2px rgba(185, 70, 70, 0.22), 0 14px 30px rgba(0, 0, 0, 0.3);
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

  .message-list {
    display: grid;
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 8px;
    padding-right: 2px;
  }

  .message {
    font-size: 13px;
    line-height: 1.35;
    min-height: 18px;
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

  .bridge-hint.error {
    color: #8f3b3b;
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
  .close-btn:focus-visible {
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
      display: none;
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

  @keyframes bubble-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-4px);
    }
    40% {
      transform: translateX(4px);
    }
    60% {
      transform: translateX(-3px);
    }
    80% {
      transform: translateX(3px);
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
