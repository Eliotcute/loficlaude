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

  claudeForm.set(0);
  bridgeClient.onDelta('hello');
  assert.equal(get(claudeForm), expressionWinkIndex);
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

  orchestrator.markResting();
  assert.equal(get(claudeForm), expressionSleepIndex);

  orchestrator.markActive();
  assert.equal(get(claudeForm), idleBreatheIndex);
});
