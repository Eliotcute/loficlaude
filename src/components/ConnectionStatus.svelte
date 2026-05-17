<script>
  import { onDestroy } from 'svelte';
  import { claude } from '../stores/appState.js';

  const WS_URL = 'ws://localhost:9120';

  const STATUS_TO_MOOD = {
    connecting: 'thinking',
    connected: 'idle',
    thinking: 'thinking',
    talking: 'talk',
    working: 'working',
    blocked: 'blocked',
    done: 'happy',
    disconnected: 'sleep'
  };
  const STATUS_TO_MODE = {
    connecting: 'thinking',
    connected: 'idle',
    thinking: 'thinking',
    talking: 'talk',
    working: 'working',
    blocked: 'blocked',
    done: 'happy',
    disconnected: 'sleep'
  };

  let socket = null;
  let token = '';
  let connected = false;
  let status = 'disconnected';
  let lastError = '';

  function setStatus(next) {
    status = next;
    claude.mode.set(STATUS_TO_MODE[next] ?? 'idle');
    claude.mood.set(STATUS_TO_MOOD[next] ?? 'idle');
    if (next === 'connected' || next === 'done') {
      lastError = '';
    }
  }

  function sendAuth() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: 'auth',
        token: token.trim()
      })
    );
  }

  function connect() {
    if (connected || (socket && socket.readyState === WebSocket.OPEN)) {
      return;
    }

    if (!token.trim()) {
      const fromPrompt = window.prompt('Bridge token');
      if (!fromPrompt) {
        return;
      }
      token = fromPrompt.trim();
    }

    lastError = '';
    setStatus('connecting');
    socket = new WebSocket(WS_URL);

    socket.addEventListener('open', () => {
      sendAuth();
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'status') {
          setStatus(payload.value);
          connected = payload.value !== 'disconnected';
        } else if (payload.type === 'error') {
          lastError = payload.message || 'Unknown bridge error';
        }
      } catch {
        lastError = 'Invalid bridge payload';
      }
    });

    socket.addEventListener('close', () => {
      connected = false;
      setStatus('disconnected');
      socket = null;
    });

    socket.addEventListener('error', () => {
      connected = false;
      setStatus('disconnected');
      lastError = 'Bridge connection failed';
    });
  }

  function disconnect() {
    if (!socket) {
      setStatus('disconnected');
      connected = false;
      return;
    }

    socket.close();
  }

  function toggleConnection() {
    if (connected) {
      disconnect();
    } else {
      connect();
    }
  }

  onDestroy(() => {
    if (socket) {
      socket.close();
      socket = null;
    }
  });
</script>

<div class="connection-status">
  <span class="status-dot" class:online={connected} aria-hidden="true"></span>
  <span class="status-label">{status}</span>
  <input type="password" placeholder="token" bind:value={token} aria-label="Bridge token" />
  <button type="button" on:click={toggleConnection}>{connected ? 'Disconnect' : 'Connect'}</button>
</div>
{#if lastError}
  <p class="error" role="status">{lastError}</p>
{/if}

<style>
  .connection-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
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
    min-width: 80px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    text-transform: lowercase;
    color: #e8e0d8;
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
    width: 130px;
    padding: 0 8px;
  }

  button {
    padding: 0 10px;
    cursor: pointer;
  }

  .error {
    margin: 4px 0 0;
    color: #e19c91;
    font-size: 11px;
    text-align: right;
  }

  @media (max-width: 900px) {
    .status-label {
      min-width: auto;
    }

    input {
      width: 100px;
    }
  }
</style>
