import { writable } from 'svelte/store';

const TOKEN_STORAGE_KEY = 'loficlaude-bridge-token';

function readStoredToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
}

export const connectionStatus = writable('disconnected');
export const claudeStatus = writable('disconnected');
export const streamingText = writable('');
export const toolRunning = writable(null);
export const lastError = writable('');
export const bridgeToken = writable(readStoredToken());

bridgeToken.subscribe((value) => {
  if (typeof window === 'undefined') {
    return;
  }

  const clean = `${value ?? ''}`.trim();
  if (clean) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, clean);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
});

export function resetBridgeState() {
  connectionStatus.set('disconnected');
  claudeStatus.set('disconnected');
  streamingText.set('');
  toolRunning.set(null);
  lastError.set('');
}
