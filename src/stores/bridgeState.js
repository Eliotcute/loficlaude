import { writable } from 'svelte/store';

const TOKEN_STORAGE_KEY = 'loficlaude-bridge-token';

function readStoredToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export const connectionStatus = writable('disconnected');
export const claudeStatus = writable('disconnected');
export const streamingText = writable('');
export const toolRunning = writable(null);
export const lastError = writable('');
export const bridgeToken = writable(readStoredToken());

export function normalizeBridgeStatus(status) {
  const value = `${status ?? ''}`.trim();

  switch (value) {
    case 'thinking':
    case 'talking':
      return 'working';
    case 'error':
      return 'blocked';
    case 'connecting':
    case 'connected':
    case 'working':
    case 'blocked':
    case 'done':
    case 'disconnected':
      return value;
    default:
      return 'disconnected';
  }
}

export function getSessionStatus(connection, claude) {
  const connectionState = normalizeBridgeStatus(connection);
  const claudeState = normalizeBridgeStatus(claude);

  if (connectionState !== 'connected') {
    return connectionState;
  }

  return claudeState === 'connected' || claudeState === 'done' ? 'connected' : claudeState;
}

bridgeToken.subscribe((value) => {
  if (typeof window === 'undefined') {
    return;
  }

  const clean = `${value ?? ''}`.trim();
  try {
    if (clean) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, clean);
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Keep the in-memory token available for the current page.
  }
});

export function resetBridgeState(options = {}) {
  connectionStatus.set('disconnected');
  claudeStatus.set('disconnected');
  streamingText.set('');
  toolRunning.set(null);
  if (!options.preserveLastError) {
    lastError.set('');
  }
}
