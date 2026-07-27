import test from 'node:test';
import assert from 'node:assert/strict';

import { get } from 'svelte/store';

import { FORMS } from '../src/canvas/claudepixForms.js';
import { createClaudeOrchestrator } from '../src/utils/claudeOrch.js';
import { claudeForm } from '../src/stores/appState.js';
import { resetBridgeState } from '../src/stores/bridgeState.js';

const expressionWinkIndex = FORMS.findIndex((form) => form.id === 'expression_wink');
const expressionSleepIndex = FORMS.findIndex((form) => form.id === 'expression_sleep');
const idleBreatheIndex = FORMS.findIndex((form) => form.id === 'idle_breathe');

test('Claude orchestrator uses an existing form while talking and streaming', () => {
  resetBridgeState();
  const bridgeClient = {
    connect() {
      return true;
    },
    sendMessage() {
      return true;
    }
  };
  const orchestrator = createClaudeOrchestrator();
  orchestrator.attachBridge(bridgeClient);

  bridgeClient.onStatus('talking');
  assert.equal(get(claudeForm), expressionWinkIndex);
  assert.equal(orchestrator.getState().companionState, 'speaking');

  claudeForm.set(0);
  bridgeClient.onDelta('hello');
  assert.equal(get(claudeForm), expressionWinkIndex);
  assert.equal(orchestrator.getState().companionState, 'speaking');

  bridgeClient.onTool('Read');
  assert.equal(orchestrator.getState().companionState, 'thinking');

  bridgeClient.onStatus('done');
  assert.equal(orchestrator.getState().companionState, 'idle');
  assert.equal(orchestrator.getState().sessionStatus, 'connected');
});

test('Claude bubble stays lightweight across multiple browser messages', async () => {
  resetBridgeState();
  const orchestrator = createClaudeOrchestrator();

  await orchestrator.sendMessage('first');
  let state = orchestrator.getState();
  assert.equal(state.bubbleVisible, true);
  assert.equal(state.panelOpen, false);

  await orchestrator.sendMessage('second');
  state = orchestrator.getState();
  assert.equal(state.bubbleVisible, true);
  assert.equal(state.panelOpen, false);
  assert.equal(state.history.filter((item) => item.role === 'user').length, 2);
});

test('Claude orchestrator returns to idle after a local companion reply', async () => {
  resetBridgeState();
  const orchestrator = createClaudeOrchestrator();

  await orchestrator.sendMessage('stay with me');

  assert.equal(orchestrator.getState().companionState, 'idle');
  assert.equal(orchestrator.getState().stateReason, 'local_reply_complete');
});

test('Claude history opens only through the explicit panel action', async () => {
  resetBridgeState();
  const orchestrator = createClaudeOrchestrator();

  await orchestrator.sendMessage('show me later');
  assert.equal(orchestrator.getState().panelOpen, false);

  orchestrator.openPanel();
  const state = orchestrator.getState();
  assert.equal(state.panelOpen, true);
  assert.equal(state.bubbleVisible, false);
});

test('Claude orchestrator exposes listening and resting visual states', () => {
  resetBridgeState();
  const bridgeClient = {
    connect() {
      return true;
    },
    sendMessage() {
      return true;
    }
  };
  const orchestrator = createClaudeOrchestrator();
  orchestrator.attachBridge(bridgeClient);

  bridgeClient.onStatus('connected');
  assert.equal(get(claudeForm), idleBreatheIndex);

  orchestrator.markListening();
  assert.equal(get(claudeForm), expressionWinkIndex);
  assert.equal(orchestrator.getState().companionState, 'listening');

  orchestrator.markResting();
  assert.equal(get(claudeForm), expressionSleepIndex);
  assert.equal(orchestrator.getState().companionState, 'resting');

  orchestrator.markActive();
  assert.equal(get(claudeForm), idleBreatheIndex);
  assert.equal(orchestrator.getState().companionState, 'idle');
});

test('Claude orchestrator settles offline typing back to resting', () => {
  resetBridgeState();
  const originalWindow = globalThis.window;
  const timeouts = new Map();
  let nextTimeoutId = 0;

  globalThis.window = {
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
    setTimeout(callback) {
      nextTimeoutId += 1;
      timeouts.set(nextTimeoutId, callback);
      return nextTimeoutId;
    },
    clearTimeout(timeoutId) {
      timeouts.delete(timeoutId);
    }
  };

  try {
    const orchestrator = createClaudeOrchestrator();

    orchestrator.markUserTyping();
    assert.equal(orchestrator.getState().companionState, 'typing');

    const typingTimeout = [...timeouts.values()][0];
    typingTimeout();

    const settled = orchestrator.getState();
    assert.equal(settled.companionState, 'resting');
    assert.equal(settled.bubbleMessage, '我先安静陪着。');
  } finally {
    globalThis.window = originalWindow;
  }
});

test('Claude orchestrator keeps blocked status copy ahead of history', async () => {
  resetBridgeState();
  const bridgeClient = {
    connect() {
      return true;
    },
    sendMessage() {
      return true;
    }
  };
  const orchestrator = createClaudeOrchestrator();
  orchestrator.attachBridge(bridgeClient);

  await orchestrator.sendMessage('remember this reply');
  bridgeClient.onStatus('blocked');

  const blocked = orchestrator.getState();
  assert.equal(blocked.companionState, 'error');
  assert.equal(blocked.bubbleMessage, '连接有点卡，我还在。');
});

test('Claude click keeps transient status copy ahead of history', async () => {
  resetBridgeState();
  const originalWindow = globalThis.window;
  let nextTimeoutId = 0;

  globalThis.window = {
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
    setTimeout() {
      nextTimeoutId += 1;
      return nextTimeoutId;
    },
    clearTimeout() {}
  };

  try {
    const orchestrator = createClaudeOrchestrator();
    await orchestrator.handleClick();
    await orchestrator.sendMessage('keep this in history');
    orchestrator.showTransientBubble('当前状态优先', 2000);

    await orchestrator.handleClick();

    assert.equal(orchestrator.getState().bubbleMessage, '当前状态优先');
  } finally {
    globalThis.window = originalWindow;
  }
});

test('Claude history restore drops entries older than seven days', () => {
  resetBridgeState();
  const originalWindow = globalThis.window;
  const now = Date.now();
  const persisted = [
    { id: 1, role: 'assistant', text: 'expired', source: 'assistant', createdAt: now - 8 * 24 * 60 * 60 * 1000 },
    { id: 2, role: 'assistant', text: 'recent', source: 'assistant', createdAt: now - 24 * 60 * 60 * 1000 }
  ];

  globalThis.window = {
    localStorage: {
      getItem() {
        return JSON.stringify(persisted);
      },
      setItem() {}
    }
  };

  try {
    const orchestrator = createClaudeOrchestrator();
    assert.deepEqual(orchestrator.getState().history.map((item) => item.text), ['recent']);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('Claude history migration timestamps legacy entries', () => {
  resetBridgeState();
  const originalWindow = globalThis.window;
  let storedHistory = null;

  globalThis.window = {
    localStorage: {
      getItem() {
        return JSON.stringify([{ id: 1, role: 'assistant', text: 'legacy', source: 'assistant' }]);
      },
      setItem(_key, value) {
        storedHistory = JSON.parse(value);
      }
    }
  };

  try {
    const orchestrator = createClaudeOrchestrator();
    assert.equal(orchestrator.getState().history[0].text, 'legacy');
    assert.equal(typeof storedHistory[0].createdAt, 'number');
  } finally {
    globalThis.window = originalWindow;
  }
});

test('Claude history can be cleared from memory and local storage', async () => {
  resetBridgeState();
  const originalWindow = globalThis.window;
  const removedKeys = [];

  globalThis.window = {
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem(key) {
        removedKeys.push(key);
      }
    },
    setTimeout() {
      return 1;
    },
    clearTimeout() {}
  };

  try {
    const orchestrator = createClaudeOrchestrator();
    await orchestrator.sendMessage('remove this conversation');
    assert.ok(orchestrator.getState().history.length > 0);

    orchestrator.clearHistory();

    assert.deepEqual(orchestrator.getState().history, []);
    assert.deepEqual(removedKeys, ['loficlaude-chat-history']);
  } finally {
    globalThis.window = originalWindow;
  }
});
