import { get } from 'svelte/store';
import { ClaudeChat } from '../ai/ClaudeChat.js';
import { bridgeClient as sharedBridgeClient } from '../bridge/bridgeClient.js';
import {
  claudeStatus,
  connectionStatus,
  lastError,
  resetBridgeState,
  streamingText,
  toolRunning
} from '../stores/bridgeState.js';

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

export function createClaudeOrchestrator(options = {}) {
  const {
    apiKey = '',
    getChatContext = () => ({}),
    onMood = () => {},
    onBubbleVisible = () => {},
    onPanelVisible = () => {}
  } = options;

  const claudeChat = new ClaudeChat(apiKey);

  let bridgeClient = sharedBridgeClient;
  let bridgeAttached = false;
  let state = {
    bubbleVisible: false,
    bubblePassive: false,
    bubbleMessage: '今天想做点什么呢？',
    panelOpen: false,
    loading: false,
    history: []
  };
  let hasOpenedClaude = false;
  let messageId = 0;
  let transientBubbleTimer = null;
  let activeAssistantId = null;

  function clearTransientBubbleTimer() {
    if (transientBubbleTimer) {
      window.clearTimeout(transientBubbleTimer);
      transientBubbleTimer = null;
    }
  }

  function sync(next) {
    state = { ...state, ...next };
    onBubbleVisible(state.bubbleVisible);
    onPanelVisible(state.panelOpen);
    return state;
  }

  function setMoodFromStatus(status) {
    onMood(STATUS_TO_MOOD[status] ?? 'idle');
  }

  function getDefaultPrompt() {
    return get(connectionStatus) === 'connected' ? '今天想做点什么呢？' : 'Start the local bridge to wake me up';
  }

  function closeBubble() {
    clearTransientBubbleTimer();
    return sync({ bubbleVisible: false, bubblePassive: false });
  }

  function closePanel() {
    return sync({ panelOpen: false });
  }

  function pushMessage(role, text) {
    messageId += 1;
    const entry = { id: messageId, role, text };
    state.history = [...state.history, entry];
    return entry.id;
  }

  function updateMessage(id, updater) {
    state.history = state.history.map((item) => (item.id === id ? { ...item, text: updater(item.text) } : item));
  }

  function getLastAssistantText() {
    return [...state.history].reverse().find((item) => item.role === 'assistant')?.text?.trim() ?? '';
  }

  function handleBridgeStatus(status) {
    claudeStatus.set(status);
    lastError.set('');

    if (status === 'connecting') {
      connectionStatus.set('connecting');
    } else if (status === 'disconnected') {
      connectionStatus.set('disconnected');
    } else {
      connectionStatus.set('connected');
    }

    if (status === 'done' || status === 'blocked' || status === 'connected') {
      activeAssistantId = null;
      toolRunning.set(null);
      sync({
        loading: false,
        bubbleMessage: getLastAssistantText() || getDefaultPrompt()
      });
    }

    setMoodFromStatus(status);
  }

  function handleBridgeDelta(text) {
    if (!text) {
      return;
    }

    connectionStatus.set('connected');
    streamingText.update((value) => value + text);

    if (!activeAssistantId) {
      activeAssistantId = pushMessage('assistant', '');
    }

    updateMessage(activeAssistantId, (current) => `${current}${text}`);
    sync({
      history: state.history,
      loading: true,
      bubbleMessage: getLastAssistantText() || text,
      bubbleVisible: !state.panelOpen,
      bubblePassive: false
    });
  }

  function handleBridgeTool(name) {
    toolRunning.set(name || null);
  }

  function handleBridgeError(message) {
    lastError.set(message || 'Bridge error');
    toolRunning.set(null);
    streamingText.set('');
    activeAssistantId = null;
    sync({ loading: false });
    onMood('blocked');
  }

  function handleBridgeDisconnect() {
    const latestAssistant = [...state.history].reverse().find((item) => item.role === 'assistant');
    if (latestAssistant && !latestAssistant.text.includes('(interrupted)')) {
      updateMessage(latestAssistant.id, (current) => {
        const base = current?.trim() ? current.trim() : 'Reconnect to continue';
        return `${base} (interrupted)`;
      });
    }

    resetBridgeState();
    activeAssistantId = null;
    sync({
      history: state.history,
      loading: false,
      bubbleMessage: 'Reconnect to continue'
    });
    onMood('sleep');
  }

  function attachBridge(client = sharedBridgeClient) {
    bridgeClient = client;
    bridgeClient.onStatus = handleBridgeStatus;
    bridgeClient.onDelta = handleBridgeDelta;
    bridgeClient.onTool = handleBridgeTool;
    bridgeClient.onError = handleBridgeError;
    bridgeClient.onDisconnect = handleBridgeDisconnect;
    bridgeAttached = true;
  }

  async function showAmbientComment(eventType, passive = true) {
    clearTransientBubbleTimer();
    const text = await claudeChat.getAmbientComment(eventType);
    if (!text) {
      return state;
    }

    return sync({
      bubbleMessage: text,
      bubbleVisible: !state.panelOpen,
      bubblePassive: passive
    });
  }

  async function sendMessage(text) {
    const clean = `${text ?? ''}`.trim();
    if (!clean || state.loading) {
      return state;
    }

    pushMessage('user', clean);
    sync({ history: state.history, loading: true });
    onMood('talk');

    if (get(connectionStatus) === 'connected') {
      streamingText.set('');
      toolRunning.set(null);
      lastError.set('');
      activeAssistantId = pushMessage('assistant', '');
      sync({ history: state.history });

      if (!bridgeClient.sendMessage(clean)) {
        handleBridgeError('Bridge send failed');
      }
      return state;
    }

    const reply = await claudeChat.getResponse(clean, getChatContext());

    pushMessage('assistant', reply);
    sync({ history: state.history, bubbleMessage: reply, loading: false });
    onMood('nod');

    const rounds = state.history.filter((item) => item.role === 'user').length;
    if (rounds >= 2) {
      sync({ bubbleVisible: false, panelOpen: true, bubblePassive: false });
    }

    return state;
  }

  function showTransientBubble(text, duration = 2000) {
    const message = `${text ?? ''}`.trim();
    if (!message) {
      return state;
    }

    clearTransientBubbleTimer();
    sync({
      bubbleMessage: message,
      bubbleVisible: !state.panelOpen,
      bubblePassive: true
    });

    transientBubbleTimer = window.setTimeout(() => {
      transientBubbleTimer = null;
      if (state.panelOpen) {
        return;
      }
      sync({ bubbleVisible: false, bubblePassive: false });
    }, duration);

    return state;
  }

  async function handleClick() {
    closePanel();

    if (!hasOpenedClaude) {
      hasOpenedClaude = true;
      sync({ bubbleMessage: getDefaultPrompt(), bubbleVisible: true, bubblePassive: false });
      if (get(connectionStatus) === 'connected') {
        await showAmbientComment('firstOpen', false);
      }
      return state;
    }

    if (state.history.length > 0) {
      sync({ bubbleMessage: getLastAssistantText() || getDefaultPrompt(), bubbleVisible: true, bubblePassive: false });
      return state;
    }

    sync({ bubbleMessage: getDefaultPrompt(), bubbleVisible: true, bubblePassive: false });
    return state;
  }

  function getState() {
    return state;
  }

  if (!bridgeAttached) {
    attachBridge(sharedBridgeClient);
  }

  return {
    attachBridge,
    getState,
    closeBubble,
    closePanel,
    showAmbientComment,
    showTransientBubble,
    sendMessage,
    handleClick
  };
}
