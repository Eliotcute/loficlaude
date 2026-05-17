import { ClaudeChat } from '../ai/ClaudeChat.js';

export function createClaudeOrchestrator(options = {}) {
  const {
    apiKey = '',
    getChatContext = () => ({}),
    onMood = () => {},
    onBubbleVisible = () => {},
    onPanelVisible = () => {}
  } = options;

  const claudeChat = new ClaudeChat(apiKey);

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

  function sync(next) {
    state = { ...state, ...next };
    onBubbleVisible(state.bubbleVisible);
    onPanelVisible(state.panelOpen);
    return state;
  }

  function closeBubble() {
    return sync({ bubbleVisible: false, bubblePassive: false });
  }

  function closePanel() {
    return sync({ panelOpen: false });
  }

  function pushMessage(role, text) {
    messageId += 1;
    state.history = [...state.history, { id: messageId, role, text }];
  }

  async function showAmbientComment(eventType, passive = true) {
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
    sync({ loading: true });
    onMood('talk');

    const reply = await claudeChat.getResponse(clean, getChatContext());

    pushMessage('assistant', reply);
    sync({ bubbleMessage: reply, loading: false });
    onMood('nod');

    const rounds = state.history.filter((item) => item.role === 'user').length;
    if (rounds >= 2) {
      sync({ bubbleVisible: false, panelOpen: true, bubblePassive: false });
    }

    return state;
  }

  async function handleClick() {
    closePanel();

    if (!hasOpenedClaude) {
      hasOpenedClaude = true;
      sync({ bubbleMessage: '今天想做点什么呢？', bubbleVisible: true, bubblePassive: false });
      await showAmbientComment('firstOpen', false);
      return state;
    }

    if (state.history.length > 0) {
      const latest = [...state.history].reverse().find((item) => item.role === 'assistant');
      sync({ bubbleMessage: latest?.text ?? '今天想做点什么呢？', bubbleVisible: true, bubblePassive: false });
      return state;
    }

    sync({ bubbleMessage: '今天想做点什么呢？', bubbleVisible: true, bubblePassive: false });
    return state;
  }

  function getState() {
    return state;
  }

  return {
    getState,
    closeBubble,
    closePanel,
    showAmbientComment,
    sendMessage,
    handleClick
  };
}
