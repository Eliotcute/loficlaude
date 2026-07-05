import test from 'node:test';
import assert from 'node:assert/strict';

import { get } from 'svelte/store';

import { FORMS } from '../src/canvas/claudepixForms.js';
import { createClaudeOrchestrator } from '../src/utils/claudeOrch.js';
import { claudeForm } from '../src/stores/appState.js';
import { resetBridgeState } from '../src/stores/bridgeState.js';

const expressionWinkIndex = FORMS.findIndex((form) => form.id === 'expression_wink');

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
