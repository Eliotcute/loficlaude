import { get } from 'svelte/store';
import { ClaudeChat } from '../ai/ClaudeChat.js';
import { bridgeClient as sharedBridgeClient } from '../bridge/bridgeClient.js';
import { FORMS } from '../canvas/claudepixForms.js';
import { setChatPaused } from '../canvas/claudeMotion.js';
import { claudeForm } from '../stores/appState.js';
import { getCompanionStatusCopy } from './rituals.js';
import {
  claudeStatus,
  connectionStatus,
  lastError,
  getSessionStatus,
  resetBridgeState,
  streamingText,
  toolRunning
} from '../stores/bridgeState.js';

const FORM_INDEX_BY_ID = FORMS.reduce((map, form, index) => {
  map[form.id] = index;
  return map;
}, {});

const STATUS_VISUALS = {
  idle: { mood: 'idle', formId: 'idle_breathe' },
  listening: { mood: 'talk', formId: 'expression_wink' },
  typing: { mood: 'talk', formId: 'expression_surprise' },
  thinking: { mood: 'thinking', formId: 'work_think' },
  speaking: { mood: 'talk', formId: 'expression_wink' },
  resting: { mood: 'sleep', formId: 'expression_sleep' },
  error: { mood: 'blocked', formId: 'expression_surprise' },
  working: { mood: 'working', formId: 'work_coding' },
  done: { mood: 'happy', formId: 'dance_djmix' }
};

const BRIDGE_STATUS_STATE = {
  connecting: 'thinking',
  connected: 'idle',
  thinking: 'thinking',
  talking: 'speaking',
  delta: 'speaking',
  working: 'thinking',
  blocked: 'error',
  done: 'idle',
  disconnected: 'resting',
  error: 'error'
};

const DONE_TO_IDLE_DELAY_MS = 900;
const CHAT_HISTORY_STORAGE_KEY = 'loficlaude-chat-history';
const CHAT_HISTORY_MAX = 50;
const CHAT_HISTORY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const IDLE_ACTIVITY_DELAY_MS = 1200;

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
    history: [],
    companionState: 'resting',
    stateReason: 'initial'
  };
  let hasOpenedClaude = false;
  let messageId = 0;
  let transientBubbleTimer = null;
  let doneVisualTimer = null;
  let typingVisualTimer = null;
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

  function clearTypingVisualTimer() {
    if (typingVisualTimer) {
      window.clearTimeout(typingVisualTimer);
      typingVisualTimer = null;
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

      const restoredAt = Date.now();
      let migratedLegacyEntry = false;
      state.history = parsed
        .slice(-CHAT_HISTORY_MAX)
        .filter((item) => item && typeof item.id === 'number' && typeof item.role === 'string')
        .filter((item) => !Number.isFinite(item.createdAt) || item.createdAt >= restoredAt - CHAT_HISTORY_MAX_AGE_MS)
        .map((item) => ({
          id: item.id,
          role: item.role,
          text: typeof item.text === 'string' ? item.text : '',
          source: typeof item.source === 'string' ? item.source : 'browser',
          createdAt: Number.isFinite(item.createdAt) ? item.createdAt : (migratedLegacyEntry = true, restoredAt)
        }));

      if (migratedLegacyEntry) {
        persistHistory();
      }
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

  function setVisualState(key, reason = key) {
    const companionState = BRIDGE_STATUS_STATE[key] ?? key;
    const visual = STATUS_VISUALS[key] ?? STATUS_VISUALS[companionState] ?? STATUS_VISUALS.idle;

    if (key !== 'done') {
      clearDoneVisualTimer();
    }

    sync({ companionState, stateReason: reason });
    onMood(visual.mood);
    setFormById(visual.formId);

    if (key === 'done') {
      clearDoneVisualTimer();
      if (typeof window === 'undefined') {
        setVisualState('connected', 'done_return_idle');
        return;
      }

      doneVisualTimer = window.setTimeout(() => {
        doneVisualTimer = null;
        if (get(connectionStatus) === 'connected') {
          setVisualState('connected', 'done_return_idle');
        }
      }, DONE_TO_IDLE_DELAY_MS);
    }
  }

  function completeLocalReply() {
    setVisualState('speaking', 'local_reply');

    if (typeof window === 'undefined') {
      setVisualState('idle', 'local_reply_complete');
      return;
    }

    doneVisualTimer = window.setTimeout(() => {
      doneVisualTimer = null;
      if (!state.loading) {
        setVisualState('idle', 'local_reply_complete');
      }
    }, DONE_TO_IDLE_DELAY_MS);
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

  function clearHistory() {
    activeAssistantId = null;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
      } catch {
        // Ignore storage failures.
      }
    }
    return sync({ history: [], bubbleMessage: getDefaultPrompt() });
  }

  function openPanel() {
    closeBubble();
    return sync({ panelOpen: true });
  }

  function markUserTyping() {
    clearTypingVisualTimer();
    setVisualState('typing', 'user_input');
    sync({ bubbleMessage: getCompanionStatusCopy('typing') });

    if (typeof window === 'undefined') {
      return state;
    }

    typingVisualTimer = window.setTimeout(() => {
      typingVisualTimer = null;
      if (!state.loading) {
        if (get(connectionStatus) === 'connected') {
          setVisualState('connected', 'typing_idle');
        } else {
          setVisualState('resting', 'typing_resting');
          sync({ bubbleMessage: getCompanionStatusCopy('resting') });
        }
      }
    }, IDLE_ACTIVITY_DELAY_MS);

    return state;
  }

  function markListening() {
    if (!state.loading) {
      setVisualState('listening', 'input_focus');
      sync({ bubbleMessage: getCompanionStatusCopy('listening') });
    }
    return state;
  }

  function markResting() {
    if (!state.loading) {
      setVisualState('resting', 'idle_timeout');
      sync({ bubbleMessage: getCompanionStatusCopy('resting'), bubbleVisible: !state.panelOpen, bubblePassive: true });
    }
    return state;
  }

  function markActive() {
    if (!state.loading) {
      setVisualState(get(connectionStatus) === 'connected' ? 'connected' : 'disconnected', 'activity');
    }
    return state;
  }

  function pushMessage(role, text, source = role === 'user' ? 'browser' : 'assistant') {
    messageId += 1;
    const entry = { id: messageId, role, text, source, createdAt: Date.now() };
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

    connectionStatus.set(status === 'connecting' ? 'connecting' : status === 'disconnected' ? 'disconnected' : 'connected');

    if (status === 'done' || status === 'blocked' || status === 'connected') {
      activeAssistantId = null;
      toolRunning.set(null);
      streamingText.set('');
      sync({
        loading: false,
        canReconnect: false,
        bubbleMessage: status === 'blocked'
          ? getCompanionStatusCopy('error')
          : getLastAssistantText() || getDefaultPrompt()
      });
    }

    if (status === 'done') {
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          setChatPaused(false);
        }, 15000);
      }
    }

    setVisualState(status, `bridge_${status}`);
  }

  function handleBridgeUser(text, source = 'unknown') {
    const clean = `${text ?? ''}`.trim();
    if (!clean) {
      return;
    }

    const last = [...state.history].reverse().find((item) => item.role === 'user');
    if (!last || last.text !== clean || last.source !== source) {
      pushMessage('user', clean, source);
      sync({ history: state.history });
    }
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

    setVisualState('delta', 'bridge_delta');
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
    setVisualState('working', 'bridge_tool');
  }

  function handleBridgeError(message) {
    lastError.set(message || 'Bridge error');
    toolRunning.set(null);
    streamingText.set('');
    activeAssistantId = null;
    sync({ loading: false, canReconnect: true, bubbleMessage: message || 'Bridge error' });
    setChatPaused(false);
    setVisualState('error', 'bridge_error');
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
    setVisualState('disconnected', 'bridge_disconnect');
  }

  function attachBridge(client = sharedBridgeClient) {
    bridgeClient = client;
    bridgeClient.onStatus = handleBridgeStatus;
    bridgeClient.onDelta = handleBridgeDelta;
    bridgeClient.onTool = handleBridgeTool;
    bridgeClient.onUser = handleBridgeUser;
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

    pushMessage('user', clean, 'browser');

    clearTypingVisualTimer();
    sync({
      history: state.history,
      loading: true,
      canReconnect: false,
      panelOpen: false,
      bubbleVisible: true,
      bubblePassive: false,
      bubbleMessage: clean
    });

    setVisualState('thinking', 'user_submit');
    sync({ bubbleMessage: getCompanionStatusCopy('thinking') });
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
    completeLocalReply();
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
    setVisualState('connecting', 'bridge_reconnect');
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
    setChatPaused(true);
    closePanel();

    if (!hasOpenedClaude) {
      hasOpenedClaude = true;
      sync({ bubbleMessage: getDefaultPrompt(), bubbleVisible: true, bubblePassive: false });
      if (get(connectionStatus) === 'connected') {
        await showAmbientComment('firstOpen', false);
      }
      return state;
    }

    if (transientBubbleTimer || state.loading || state.companionState !== 'idle') {
      return sync({ bubbleVisible: true });
    }

    if (state.history.length > 0) {
      sync({ bubbleMessage: getLastAssistantText() || getDefaultPrompt(), bubbleVisible: true, bubblePassive: false });
      return state;
    }

    sync({ bubbleMessage: getDefaultPrompt(), bubbleVisible: true, bubblePassive: false });
    return state;
  }

  function getState() {
    return {
      ...state,
      sessionStatus: getSessionStatus(get(connectionStatus), get(claudeStatus)),
      bridgeStatus: get(connectionStatus),
      claudeStatus: get(claudeStatus),
      streamingText: get(streamingText),
      toolRunning: get(toolRunning),
      lastError: get(lastError)
    };
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
    clearHistory,
    reconnectBridge,
    showAmbientComment,
    showTransientBubble,
    sendMessage,
    handleClick,
    openPanel,
    markUserTyping,
    markListening,
    markResting,
    markActive
  };
}
