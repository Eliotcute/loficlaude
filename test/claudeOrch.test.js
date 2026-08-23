import test from 'node:test';
import assert from 'node:assert/strict';

import { get } from 'svelte/store';

import { FORMS } from '../src/canvas/claudepixForms.js';
import { chatPaused } from '../src/canvas/claudeMotion.js';
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

test('Claude latest assistant reply replaces the stale typing prompt', async () => {
  resetBridgeState();
  const orchestrator = createClaudeOrchestrator();

  await orchestrator.sendMessage('show the reply');
  const state = orchestrator.getState();
  const latestAssistant = [...state.history].reverse().find((item) => item.role === 'assistant');

  assert.ok(latestAssistant?.text);
  assert.equal(state.bubbleMessage, latestAssistant.text);
});

test('Claude orchestrator returns to idle after a local companion reply', async () => {
  resetBridgeState();
  const orchestrator = createClaudeOrchestrator();

  await orchestrator.sendMessage('stay with me');

  assert.equal(orchestrator.getState().companionState, 'idle');
  assert.equal(orchestrator.getState().stateReason, 'local_reply_complete');
});

test('Claude resting state keeps the most recent completed reply visible', async () => {
  resetBridgeState();
  const orchestrator = createClaudeOrchestrator();

  await orchestrator.sendMessage('stay with me');
  const reply = orchestrator.getState().bubbleMessage;

  orchestrator.markResting();

  const rested = orchestrator.getState();
  assert.equal(rested.companionState, 'resting');
  assert.equal(rested.bubbleMessage, reply);
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

test('Claude orchestrator keeps the local companion awake while disconnected', () => {
  resetBridgeState();
  const orchestrator = createClaudeOrchestrator();

  orchestrator.markActive();

  assert.equal(get(claudeForm), idleBreatheIndex);
  assert.equal(orchestrator.getState().companionState, 'idle');
});

test('Closing Claude chat resumes the sprite patrol', async () => {
  resetBridgeState();
  const orchestrator = createClaudeOrchestrator();

  await orchestrator.handleClick();
  assert.equal(chatPaused, true);

  orchestrator.markResting();
  orchestrator.closeBubble();
  assert.equal(chatPaused, false);
  assert.equal(orchestrator.getState().companionState, 'idle');
  assert.equal(orchestrator.getState().stateReason, 'chat_closed');
});

test('Closing Claude history resumes the sprite patrol', async () => {
  resetBridgeState();
  const orchestrator = createClaudeOrchestrator();

  await orchestrator.handleClick();
  orchestrator.openPanel();
  orchestrator.markResting();
  orchestrator.closePanel();

  assert.equal(chatPaused, false);
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

test('Claude history restore removes expired entries from local storage', () => {
  resetBridgeState();
  const originalWindow = globalThis.window;
  const now = Date.now();
  const persisted = [
    { id: 1, role: 'assistant', text: 'expired', source: 'assistant', createdAt: now - 8 * 24 * 60 * 60 * 1000 }
  ];
  const removedKeys = [];

  globalThis.window = {
    localStorage: {
      getItem() {
        return JSON.stringify(persisted);
      },
      setItem() {
        assert.fail('empty normalized history should not be persisted');
      },
      removeItem(key) {
        removedKeys.push(key);
      }
    }
  };

  try {
    const orchestrator = createClaudeOrchestrator();
    assert.deepEqual(orchestrator.getState().history, []);
    assert.deepEqual(removedKeys, ['loficlaude-chat-history']);
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

test('Claude history restore canonicalizes untrusted entries and keyed ids', async () => {
  resetBridgeState();
  const originalWindow = globalThis.window;
  const now = Date.now();
  let storedHistory = null;
  const oversizedText = 'x'.repeat(200001);
  const persisted = [
    { id: Number.MAX_SAFE_INTEGER, role: 'user', text: 'first', source: 'browser', createdAt: now },
    { id: Number.MAX_SAFE_INTEGER, role: 'assistant', text: oversizedText, source: 'assistant', createdAt: now },
    { id: -1, role: 'system', text: 'not allowed', source: 'unknown', createdAt: now },
    { id: 1.5, role: 'user', text: 'not safe', source: 'browser', createdAt: now }
  ];

  globalThis.window = {
    localStorage: {
      getItem() {
        return JSON.stringify(persisted);
      },
      setItem(_key, value) {
        storedHistory = JSON.parse(value);
      },
      removeItem() {}
    },
    setTimeout() {
      return 1;
    },
    clearTimeout() {}
  };

  try {
    const orchestrator = createClaudeOrchestrator();
    const restored = orchestrator.getState().history;

    assert.deepEqual(restored.map((item) => item.id), [1, 2]);
    assert.deepEqual(restored.map((item) => item.role), ['user', 'assistant']);
    assert.equal(restored[1].text.length, 200000);
    assert.deepEqual(storedHistory, restored);

    await orchestrator.sendMessage('next');
    assert.deepEqual(orchestrator.getState().history.slice(-2).map((item) => item.id), [3, 4]);
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

test('Claude disconnect does not mark an already completed reply as interrupted', async () => {
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

  await orchestrator.sendMessage('completed local reply');
  const completedText = orchestrator.getState().history.at(-1).text;
  bridgeClient.onDisconnect();

  assert.equal(orchestrator.getState().history.at(-1).text, completedText);
});

test('Claude transient reconnect preserves and completes the active streamed reply', async () => {
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

  await orchestrator.sendMessage('keep streaming');
  bridgeClient.onDelta('partial');
  bridgeClient.onDisconnect({ willReconnect: true });

  assert.equal(orchestrator.getState().loading, true);
  assert.equal(orchestrator.getState().history.at(-1).text, 'partial');

  bridgeClient.onDelta(' reply');
  bridgeClient.onStatus('done');
  assert.equal(orchestrator.getState().history.at(-1).text, 'partial reply');
  assert.equal(orchestrator.getState().loading, false);
});

test('Claude CLI exit interrupts only the active reply and the bridge remains sendable', async () => {
  resetBridgeState();
  const sent = [];
  const bridgeClient = {
    connect() {
      return true;
    },
    sendMessage(text) {
      sent.push(text);
      return true;
    }
  };
  const orchestrator = createClaudeOrchestrator();
  orchestrator.attachBridge(bridgeClient);
  bridgeClient.onStatus('connected');

  await orchestrator.sendMessage('first turn');
  bridgeClient.onDelta('partial');
  bridgeClient.onStatus('disconnected');

  assert.equal(orchestrator.getState().bridgeStatus, 'connected');
  assert.equal(orchestrator.getState().loading, false);
  assert.match(orchestrator.getState().history.at(-1).text, /\(interrupted\)$/);

  await orchestrator.sendMessage('resume next turn');
  assert.deepEqual(sent, ['first turn', 'resume next turn']);
});

test('Claude refresh appends replayed deltas to the persisted incomplete reply', () => {
  resetBridgeState();
  const originalWindow = globalThis.window;
  const stored = JSON.stringify([
    { id: 1, role: 'user', text: 'question', source: 'browser', complete: true, createdAt: Date.now() },
    { id: 2, role: 'assistant', text: 'partial', source: 'assistant', complete: false, createdAt: Date.now() }
  ]);
  globalThis.window = {
    localStorage: {
      getItem: () => stored,
      setItem() {},
      removeItem() {}
    },
    setTimeout: () => 1,
    clearTimeout() {}
  };

  try {
    const bridgeClient = { connect: () => true, sendMessage: () => true };
    const orchestrator = createClaudeOrchestrator();
    orchestrator.attachBridge(bridgeClient);
    bridgeClient.onDelta(' reply');
    bridgeClient.onStatus('done');

    const assistants = orchestrator.getState().history.filter((item) => item.role === 'assistant');
    assert.equal(assistants.length, 1);
    assert.equal(assistants[0].text, 'partial reply');
    assert.equal(assistants[0].complete, true);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('Claude bridge errors finalize the active placeholder instead of leaving stale pending state', async () => {
  resetBridgeState();
  const bridgeClient = { connect: () => true, sendMessage: () => true };
  const orchestrator = createClaudeOrchestrator();
  orchestrator.attachBridge(bridgeClient);
  bridgeClient.onStatus('connected');

  await orchestrator.sendMessage('too large');
  bridgeClient.onError('Message too long');

  const assistant = orchestrator.getState().history.at(-1);
  assert.equal(assistant.complete, true);
  assert.match(assistant.text, /\(interrupted\)$/);
});
