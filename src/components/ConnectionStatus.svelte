<script>
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { bridgeClient } from '../bridge/bridgeClient.js';
  import { bridgeToken, connectionStatus, claudeStatus, getSessionStatus, lastError } from '../stores/bridgeState.js';
  import { ui } from '../stores/appState.js';

  const BRIDGE_CMD = 'cd bridge && npm start';

  let copied = false;
  let copiedTimer = null;
  const bridgeSettingsOpen = ui.bridgeSettingsOpen;

  function connect() {
    const token = get(bridgeToken).trim();
    if (!token) {
      bridgeSettingsOpen.set(true);
      connectionStatus.set('disconnected');
      lastError.set('Bridge token required');
      return;
    }

    lastError.set('');
    connectionStatus.set('connecting');
    if (!bridgeClient.connect(token)) {
      connectionStatus.set('disconnected');
    }
  }

  function disconnect() {
    bridgeClient.disconnect({ clearToken: true });
    bridgeToken.set('');
  }

  function clearToken() {
    bridgeClient.disconnect({ clearToken: true });
    bridgeToken.set('');
    lastError.set('');
  }

  function handleWindowKeydown(event) {
    if (event.key === 'Escape' && $bridgeSettingsOpen) {
      bridgeSettingsOpen.set(false);
    }
  }

  function toggleSettings() {
    bridgeSettingsOpen.update((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        ui.scenePopoverOpen.set(false);
        ui.timerPopoverOpen.set(false);
        ui.rainPopoverOpen.set(false);
        ui.miniPlayerExpanded.set(false);
      }
      return nextOpen;
    });
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
  $: sessionStatus = getSessionStatus($connectionStatus, $claudeStatus);
  $: statusLabel =
    sessionStatus === 'connected'
      ? 'Claude awake'
      : sessionStatus === 'working'
        ? 'Claude working'
        : sessionStatus === 'connecting'
          ? 'Waking Claude'
          : sessionStatus === 'blocked'
            ? 'Needs attention'
            : 'Claude asleep';
  $: statusDetail = isConnected ? `bridge ready · ${$claudeStatus}` : 'bridge offline';

  onMount(() => {
    if (get(bridgeToken).trim()) {
      connect();
    }
  });
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<div class="connection-status">
  <div class="status-row">
    <span class="status-dot" class:online={isConnected} aria-hidden="true"></span>
    <span class="status-label">{statusLabel}</span>
    <span class="status-sub">{statusDetail}</span>
    <button
      type="button"
      class="settings-btn"
      aria-label="Bridge settings"
      aria-expanded={$bridgeSettingsOpen}
      aria-controls="bridge-settings-panel"
      on:click={toggleSettings}
    >⚙</button>
    <button type="button" on:click={isConnected ? disconnect : connect}>{isConnected ? 'Disconnect' : 'Connect'}</button>
  </div>

  {#if $bridgeSettingsOpen}
    <div id="bridge-settings-panel" class="settings-panel" role="dialog" aria-label="Bridge settings">
      <div class="settings-header">
        <span>Bridge settings</span>
        <button type="button" class="close-btn" aria-label="Close bridge settings" on:click={() => bridgeSettingsOpen.set(false)}>×</button>
      </div>

      <div class="token-row">
        <input type="password" placeholder="bridge token" bind:value={$bridgeToken} aria-label="Bridge token" />
        <button type="button" on:click={clearToken} disabled={!$bridgeToken.trim()}>Clear</button>
      </div>

      {#if !isConnected}
        <div class="command-row">
          <input class="cmd" type="text" readonly value={BRIDGE_CMD} aria-label="Start bridge command" />
          <button type="button" class="copy-btn" on:click={copyCommand}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if $lastError}
    <p class="error" role="status">{$lastError}</p>
  {/if}
</div>

<style>
  .connection-status {
    position: relative;
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .status-row,
  .token-row,
  .command-row {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto auto;
    gap: 8px;
    align-items: center;
  }

  .token-row,
  .command-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .settings-panel {
    position: absolute;
    z-index: 30;
    top: calc(100% + 8px);
    right: 0;
    width: min(360px, calc(100vw - 24px));
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid rgba(212, 165, 116, 0.34);
    border-radius: 8px;
    background: rgba(9, 11, 14, 0.97);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.38);
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: rgba(232, 224, 216, 0.78);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
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
    min-width: 0;
  }

  .status-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: rgba(232, 224, 216, 0.64);
    white-space: nowrap;
  }

  input,
  button {
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.58);
    color: #e8e0d8;
    height: 38px;
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
    padding: 0 12px;
    cursor: pointer;
    white-space: nowrap;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .settings-btn {
    width: 38px;
    padding: 0;
  }

  .close-btn {
    width: 30px;
    height: 30px;
    padding: 0;
    font-size: 16px;
  }

  input:focus-visible,
  button:focus-visible {
    outline: 2px solid rgba(212, 165, 116, 0.72);
    outline-offset: 2px;
  }

  .error {
    margin: 0;
    color: #e19c91;
    font-size: 11px;
    text-align: right;
  }

  @media (max-width: 900px) {
    .connection-status {
      width: min(100%, 360px);
    }

    .status-row {
      grid-template-columns: auto auto minmax(0, 1fr) auto;
    }

    .status-sub {
      grid-column: 2 / -1;
    }
  }

  @media (max-width: 640px) {
    .token-row,
    .command-row {
      grid-template-columns: 1fr;
    }

    .status-row {
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      gap: 6px;
    }

    .status-sub {
      display: none;
    }

    .settings-panel {
      position: fixed;
      top: 62px;
      right: 12px;
    }
  }
</style>
