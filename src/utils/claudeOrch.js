import { get } from 'svelte/store';
import { ClaudeChat } from '../ai/ClaudeChat.js';
import { bridgeClient as sharedBridgeClient } from '../bridge/bridgeClient.js';
import { FORMS } from '../canvas/claudepixForms.js';
import { setChatPaused } from '../canvas/claudeMotion.js';
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
  talking: { mood: 'talk', formId: 'journal' },
  delta: { mood: 'talk', formId: 'journal' },
  working: { mood: 'working', formId: 'work_coding' },
  blocked: { mood: 'blocked', formId: 'work_think' },
  done: { mood: 'happy', formId: 'dance_djmix' },
  disconnected: { mood: 'sleep', formId: 'expression_sleep' },
  error: { mood: 'sleep', formId: 'expression_sleep' }
};

const DONE_TO_IDLE_DELAY_MS = 900;
const CHAT_HISTORY_STORAGE_KEY = 'loficlaude-chat-history';
const CHAT_HISTORY_MAX = 50;

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
    activeAssistantId: null,
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
    state = { ...state, ...next, activeAssistantId };
    onBubbleVisible(state.bubbleVisible);
    onPanelVisible(state.panelOpen);
    return state;
  }

  function persistHistory() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const subset = state.history.slice(-CHAT_HISTORY_MAX);
      window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(subset));
    } catch {
      // Ignore storage failures.
    }
  }

  function restoreHistory() {
    state.loading = false;
    activeAssistantId = null;

    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      state.history = parsed
        .slice(-CHAT_HISTORY_MAX)
        .filter((item) => item && typeof item.id === 'number' && typeof item.role === 'string')
        .map((item) => ({ id: item.id, role: item.role, text: typeof item.text === 'string' ? item.text : '' }));
    } catch {
      // Ignore corrupt data.
    }

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
    state.history = [...state.history, entry].slice(-CHAT_HISTORY_MAX);
    persistHistory();
    return entry.id;
  }

  function updateMessage(id, updater) {
    state.history = state.history.map((item) => (item.id === id ? { ...item, text: updater(item.text) } : item));
    persistHistory();
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

    if (status === 'done') {
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          setChatPaused(false);
        }, 15000);
      }
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
    setChatPaused(false);
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
    setChatPaused(false);
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

    const userRounds = state.history.filter((item) => item.role === 'user').length;
    pushMessage('user', clean);

    if (userRounds === 0) {
      sync({
        history: state.history,
        loading: true,
        canReconnect: false,
        panelOpen: false,
        bubbleVisible: true,
        bubblePassive: false
      });
    } else {
      sync({
        history: state.history,
        loading: true,
        canReconnect: false,
        panelOpen: true,
        bubbleVisible: false,
        bubblePassive: false
      });
    }

    setVisualState('talking');
    setChatPaused(true);

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
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setChatPaused(false);
      }, 15000);
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

  restoreHistory();
  messageId = state.history.reduce((max, item) => Math.max(max, item.id), 0);
  state.activeAssistantId = activeAssistantId;
  if (state.history.length > 0) {
    state.bubbleMessage = getLastAssistantText() || getDefaultPrompt();
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
