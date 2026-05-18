<script>
  import { get } from 'svelte/store';
  import { bridgeClient } from '../bridge/bridgeClient.js';
  import { bridgeToken, connectionStatus, lastError } from '../stores/bridgeState.js';

  const BRIDGE_CMD = 'cd bridge && npm start';

  let copied = false;
  let copiedTimer = null;

  function connect() {
    lastError.set('');
    connectionStatus.set('connecting');
    bridgeClient.connect(get(bridgeToken));
  }

  function disconnect() {
    bridgeClient.disconnect();
  }

  async function copyCommand() {
    if (!navigator?.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(BRIDGE_CMD);
    copied = true;
    if (copiedTimer) {
      window.clearTimeout(copiedTimer);
    }
    copiedTimer = window.setTimeout(() => {
      copied = false;
      copiedTimer = null;
    }, 1400);
  }

  $: isConnected = $connectionStatus === 'connected';
</script>

<div class="connection-status">
  <div class="status-row">
    <span class="status-dot" class:online={isConnected} aria-hidden="true"></span>
    <span class="status-label">bridge {$connectionStatus}</span>
    <input type="password" placeholder="bridge token" bind:value={$bridgeToken} aria-label="Bridge token" />
    <button type="button" on:click={isConnected ? disconnect : connect}>{isConnected ? 'Disconnect' : 'Connect'}</button>
  </div>

  {#if !isConnected}
    <div class="command-row">
      <input class="cmd" type="text" readonly value={BRIDGE_CMD} aria-label="Start bridge command" />
      <button type="button" class="copy-btn" on:click={copyCommand}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  {/if}

  {#if $lastError}
    <p class="error" role="status">{$lastError}</p>
  {/if}
</div>

<style>
  .connection-status {
    display: grid;
    gap: 6px;
    min-width: min(420px, calc(100vw - 48px));
  }

  .status-row,
  .command-row {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .command-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #a16b6b;
    box-shadow: 0 0 0 3px rgba(161, 107, 107, 0.2);
  }

  .status-dot.online {
    background: #67bf7a;
    box-shadow: 0 0 0 3px rgba(103, 191, 122, 0.2);
  }

  .status-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #e8e0d8;
    white-space: nowrap;
  }

  input,
  button {
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.58);
    color: #e8e0d8;
    height: 32px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
  }

  input {
    width: 100%;
    min-width: 0;
    padding: 0 8px;
  }

  .cmd {
    color: rgba(232, 224, 216, 0.78);
  }

  button {
    padding: 0 10px;
    cursor: pointer;
    white-space: nowrap;
  }

  .error {
    margin: 0;
    color: #e19c91;
    font-size: 11px;
    text-align: right;
  }

  @media (max-width: 900px) {
    .connection-status {
      min-width: 0;
      width: min(100%, 360px);
    }

    .status-row {
      grid-template-columns: auto auto 1fr auto;
    }
  }

  @media (max-width: 640px) {
    .status-row,
    .command-row {
      grid-template-columns: 1fr;
    }
  }
</style>
