import { get } from 'svelte/store';
import { ClaudeChat } from '../ai/ClaudeChat.js';
import { bridgeClient as sharedBridgeClient } from '../bridge/bridgeClient.js';
import { FORMS } from '../canvas/claudepixForms.js';
import { claudeForm } from '../stores/appState.js';
import {
  claudeStatus,
  connectionStatus,
  lastError,
  resetBridgeState,
  streamingText,
  toolRunning
} from '../stores/bridgeState.js';

const FORM_INDEX_BY_ID = FORMS.reduce((map, form, index) => {
  map[form.id] = index;
  return map;
}, {});

const STATUS_VISUALS = {
  connecting: { mood: 'thinking', formId: 'work_think' },
  connected: { mood: 'idle', formId: 'idle_breathe' },
  thinking: { mood: 'thinking', formId: 'work_think' },
  talking: { mood: 'talk', formId: 'expression_surprise' },
  delta: { mood: 'talk', formId: 'expression_surprise' },
  working: { mood: 'working', formId: 'work_coding' },
  blocked: { mood: 'blocked', formId: 'expression_surprise' },
  done: { mood: 'happy', formId: 'expression_wink' },
  disconnected: { mood: 'sleep', formId: 'expression_sleep' },
  error: { mood: 'sleep', formId: 'expression_sleep' }
};

const DONE_TO_IDLE_DELAY_MS = 900;

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
    canReconnect: false,
    history: []
  };
  let hasOpenedClaude = false;
  let messageId = 0;
  let transientBubbleTimer = null;
  let doneVisualTimer = null;
  let activeAssistantId = null;

  function clearTransientBubbleTimer() {
    if (transientBubbleTimer) {
      window.clearTimeout(transientBubbleTimer);
      transientBubbleTimer = null;
    }
  }

  function clearDoneVisualTimer() {
    if (doneVisualTimer) {
      window.clearTimeout(doneVisualTimer);
      doneVisualTimer = null;
    }
  }

  function sync(next) {
    state = { ...state, ...next };
    onBubbleVisible(state.bubbleVisible);
    onPanelVisible(state.panelOpen);
    return state;
  }

  function setFormById(formId) {
    const nextFormIndex = FORM_INDEX_BY_ID[formId];
    if (Number.isInteger(nextFormIndex)) {
      claudeForm.set(nextFormIndex);
    }
  }

  function setVisualState(key) {
    const visual = STATUS_VISUALS[key] ?? STATUS_VISUALS.connected;

    if (key !== 'done') {
      clearDoneVisualTimer();
    }

    onMood(visual.mood);
    setFormById(visual.formId);

    if (key === 'done') {
      clearDoneVisualTimer();
      doneVisualTimer = window.setTimeout(() => {
        doneVisualTimer = null;
        if (get(connectionStatus) === 'connected') {
          setVisualState('connected');
        }
      }, DONE_TO_IDLE_DELAY_MS);
    }
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
        canReconnect: false,
        bubbleMessage: getLastAssistantText() || getDefaultPrompt()
      });
    }

    setVisualState(status);
  }

  function handleBridgeDelta(text) {
    if (!text) {
      return;
    }

    connectionStatus.set('connected');
    streamingText.update((value) => value + text);
    toolRunning.set(null);

    if (!activeAssistantId) {
      activeAssistantId = pushMessage('assistant', '');
    }

    updateMessage(activeAssistantId, (current) => `${current}${text}`);
    sync({
      history: state.history,
      loading: true,
      canReconnect: false,
      bubbleMessage: getLastAssistantText() || text,
      bubbleVisible: !state.panelOpen,
      bubblePassive: false
    });

    setVisualState('delta');
  }

  function handleBridgeTool(name) {
    const toolName = `${name ?? ''}`.trim();
    if (!toolName) {
      return;
    }

    toolRunning.set(toolName);
    sync({
      bubbleMessage: `Running ${toolName}`,
      bubbleVisible: !state.panelOpen,
      bubblePassive: true
    });
    setVisualState('working');
  }

  function handleBridgeError(message) {
    lastError.set(message || 'Bridge error');
    toolRunning.set(null);
    streamingText.set('');
    activeAssistantId = null;
    sync({ loading: false, canReconnect: true });
    setVisualState('error');
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
      canReconnect: true,
      bubbleMessage: 'Reconnect to continue'
    });
    setVisualState('disconnected');
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
    sync({ history: state.history, loading: true, canReconnect: false });
    setVisualState('talking');

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

  function reconnectBridge() {
    if (get(connectionStatus) === 'connected') {
      return true;
    }

    lastError.set('');
    connectionStatus.set('connecting');
    sync({ loading: false, canReconnect: false });
    setVisualState('connecting');
    return bridgeClient.connect();
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
    reconnectBridge,
    showAmbientComment,
    showTransientBubble,
    sendMessage,
    handleClick
  };
}
