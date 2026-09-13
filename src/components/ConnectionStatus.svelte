<script>
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { bridgeClient } from '../bridge/bridgeClient.js';
  import { bridgeToken, connectionStatus, claudeStatus, getSessionStatus, lastError } from '../stores/bridgeState.js';
  import { ui } from '../stores/appState.js';

  // The bridge settings can be opened from any terminal directory.
  const BRIDGE_CMD = 'loficlaude bridge';

  let copied = false;
  let copiedTimer = null;
  let tokenMask = '';
  let autoDiscovery = 'idle';
  let discoveryTimer = null;
  let discoveryInFlight = false;
  let discoveryAttempts = 0;
  const MAX_DISCOVERY_ATTEMPTS = 20;
  const DISCOVERY_INTERVAL_MS = 1500;
  const bridgeSettingsOpen = ui.bridgeSettingsOpen;

  async function discoverBridgeToken() {
    if (discoveryInFlight || get(bridgeToken).trim() || typeof fetch !== 'function') {
      return false;
    }

    discoveryInFlight = true;
    autoDiscovery = 'checking';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 900);
    try {
      const response = await fetch('http://127.0.0.1:9121/token', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal
      });
      if (!response.ok) {
        autoDiscovery = 'unavailable';
        return false;
      }
      const payload = await response.json();
      const token = typeof payload?.token === 'string' ? payload.token.trim() : '';
      if (!token) {
        autoDiscovery = 'unavailable';
        return false;
      }
      bridgeToken.set(token);
      autoDiscovery = 'found';
      return true;
    } catch {
      autoDiscovery = 'unavailable';
      return false;
    } finally {
      window.clearTimeout(timeout);
      discoveryInFlight = false;
    }
  }

  function maskToken(token) {
    return '*'.repeat(token.length);
  }

  function syncTokenMask(input, caret) {
    tokenMask = maskToken(get(bridgeToken));
    queueMicrotask(() => {
      input.setSelectionRange(caret, caret);
    });
  }

  function replaceTokenSelection(input, text) {
    const currentToken = get(bridgeToken);
    const start = input.selectionStart ?? currentToken.length;
    const end = input.selectionEnd ?? start;
    const nextToken = `${currentToken.slice(0, start)}${text}${currentToken.slice(end)}`;

    bridgeToken.set(nextToken);
    syncTokenMask(input, start + text.length);
  }

  function deleteTokenSelection(input, direction) {
    const currentToken = get(bridgeToken);
    let start = input.selectionStart ?? currentToken.length;
    let end = input.selectionEnd ?? start;

    if (start === end) {
      if (direction === 'backward') {
        start = Math.max(0, start - 1);
      } else {
        end = Math.min(currentToken.length, end + 1);
      }
    }

    bridgeToken.set(`${currentToken.slice(0, start)}${currentToken.slice(end)}`);
    syncTokenMask(input, start);
  }

  function handleTokenBeforeInput(event) {
    const { inputType, data, currentTarget } = event;

    if (inputType.startsWith('insert')) {
      event.preventDefault();
      if (data) {
        replaceTokenSelection(currentTarget, data);
      }
      return;
    }

    if (inputType.startsWith('delete')) {
      event.preventDefault();
      deleteTokenSelection(currentTarget, inputType.includes('Backward') ? 'backward' : 'forward');
    }
  }

  function handleTokenPaste(event) {
    event.preventDefault();
    replaceTokenSelection(event.currentTarget, event.clipboardData.getData('text'));
  }

  function handleTokenCut(event) {
    event.preventDefault();
    deleteTokenSelection(event.currentTarget, 'forward');
  }

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
        if (!get(bridgeToken).trim() && autoDiscovery === 'unavailable') {
          startDiscovery();
        }
      }
      return nextOpen;
    });
  }

  function startDiscovery() {
    if (discoveryTimer || discoveryInFlight || get(bridgeToken).trim()) {
      return;
    }

    discoveryAttempts = 0;
    autoDiscovery = 'idle';
    const tryDiscover = () => {
      if (discoveryAttempts >= MAX_DISCOVERY_ATTEMPTS || get(bridgeToken).trim()) {
        if (discoveryTimer) {
          window.clearInterval(discoveryTimer);
          discoveryTimer = null;
        }
        return;
      }

      discoveryAttempts += 1;
      discoverBridgeToken().then((found) => {
        if (!found) {
          return;
        }
        if (discoveryTimer) {
          window.clearInterval(discoveryTimer);
          discoveryTimer = null;
        }
        connect();
      });
    };

    tryDiscover();
    discoveryTimer = window.setInterval(tryDiscover, DISCOVERY_INTERVAL_MS);
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
  $: statusDetail = isConnected ? 'connected locally' : 'offline';
  $: tokenMask = maskToken($bridgeToken);

  onMount(() => {
    if (get(bridgeToken).trim()) {
      connect();
      return () => {};
    }

    startDiscovery();

    return () => {
      if (discoveryTimer) {
        window.clearInterval(discoveryTimer);
        discoveryTimer = null;
      }
    };
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
  </div>

  {#if $bridgeSettingsOpen}
    <div id="bridge-settings-panel" class="settings-panel" role="dialog" aria-label="Bridge settings">
      <div class="settings-header">
        <span>Bridge settings</span>
        <button type="button" class="close-btn" aria-label="Close bridge settings" on:click={() => bridgeSettingsOpen.set(false)}>×</button>
      </div>

      <div class="token-row">
        <label class="token-field">
          <span>Bridge token</span>
          <input
            id="bridge-token"
            type="password"
            placeholder="bridge token"
            value={tokenMask}
            autocomplete="off"
            spellcheck="false"
            on:beforeinput={handleTokenBeforeInput}
            on:paste={handleTokenPaste}
            on:cut={handleTokenCut}
          />
        </label>
        <button type="button" on:click={clearToken} disabled={!$bridgeToken.trim()}>Clear</button>
      </div>

      <button type="button" on:click={isConnected ? disconnect : connect}>{isConnected ? 'Disconnect' : 'Connect'}</button>

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
    min-height: 44px;
    align-content: start;
  }

  .status-row,
  .token-row,
  .command-row {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .token-field {
    display: grid;
    gap: 5px;
    min-width: 0;
    color: rgba(232, 224, 216, 0.78);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
  }

  .token-row,
  .command-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .token-row {
    align-items: end;
  }

  .settings-panel {
    position: absolute;
    z-index: 30;
    top: calc(100% + 8px);
    right: 0;
    width: min(320px, calc(100vw - 24px));
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid rgba(212, 165, 116, 0.34);
    border-radius: 8px;
    background: #090b0e;
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
    color: rgba(232, 224, 216, 0.76);
    white-space: nowrap;
  }

  input,
  button {
    border: 1px solid rgba(212, 165, 116, 0.28);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.58);
    color: #e8e0d8;
    min-height: 44px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    box-sizing: border-box;
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
    width: 44px;
    padding: 0;
  }

  .close-btn {
    width: 44px;
    min-height: 44px;
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
      display: none;
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

    .token-field {
      gap: 4px;
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
