import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createSessionState } from '../bridge/sessionState.js';
import config from '../bridge/config.js';

test('bridge workspace is the project root regardless of launch directory', () => {
  assert.equal(config.workspace, path.resolve(import.meta.dirname, '..'));
});

test('session state resumes only after Claude confirms initialization', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'loficlaude-session-test-'));
  const statePath = path.join(directory, 'session.json');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const firstState = createSessionState({ statePath });
  const first = firstState.getLaunchOptions();
  const beforeInitRestart = createSessionState({ statePath });

  assert.match(first.sessionId, /^[0-9a-f-]{36}$/);
  assert.equal(first.resume, false);
  assert.deepEqual(firstState.getLaunchOptions(), first);
  assert.deepEqual(beforeInitRestart.getLaunchOptions(), first);

  firstState.markInitialized();
  const initializedRestart = createSessionState({ statePath });
  assert.deepEqual(initializedRestart.getLaunchOptions(), { sessionId: first.sessionId, resume: true });
});

test('session state refuses malformed persisted identifiers', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'loficlaude-session-test-'));
  const statePath = path.join(directory, 'session.json');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(statePath, JSON.stringify({ sessionId: '../../bad' }), { mode: 0o600 });

  assert.throws(() => createSessionState({ statePath }), /Invalid persisted Claude session id/);
});

test('session state reset replaces corrupt persisted state', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'loficlaude-session-test-'));
  const statePath = path.join(directory, 'session.json');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(statePath, '{broken', { mode: 0o600 });

  const reset = createSessionState({ statePath, reset: true });

  assert.equal(reset.getLaunchOptions().resume, false);
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(statePath, 'utf8')));
});

test('session state rotates the conversation only when explicitly reset', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'loficlaude-session-test-'));
  const statePath = path.join(directory, 'session.json');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const original = createSessionState({ statePath });
  const originalLaunch = original.getLaunchOptions();
  const reset = createSessionState({ statePath, reset: true });
  const resetLaunch = reset.getLaunchOptions();

  assert.notEqual(resetLaunch.sessionId, originalLaunch.sessionId);
  assert.equal(resetLaunch.resume, false);
});

test('session state never persists Bridge credentials', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'loficlaude-session-test-'));
  const statePath = path.join(directory, 'session.json');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(statePath, JSON.stringify({
    sessionId: '11111111-1111-4111-8111-111111111111',
    bridgeToken: '22222222-2222-4222-8222-222222222222',
    initialized: true
  }), { mode: 0o600 });

  const state = createSessionState({ statePath });
  const persisted = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  assert.equal(state.bridgeToken, undefined);
  assert.equal('bridgeToken' in persisted, false);
  assert.deepEqual(state.getLaunchOptions(), {
    sessionId: '11111111-1111-4111-8111-111111111111',
    resume: true
  });
});

test('a stale session instance cannot overwrite a newer reset', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'loficlaude-session-test-'));
  const statePath = path.join(directory, 'session.json');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const stale = createSessionState({ statePath });
  const reset = createSessionState({ statePath, reset: true });
  stale.markInitialized();

  assert.deepEqual(createSessionState({ statePath }).getLaunchOptions(), reset.getLaunchOptions());
});

test('a failed resume is replaced once when the persisted session still matches', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'loficlaude-session-test-'));
  const statePath = path.join(directory, 'session.json');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const state = createSessionState({ statePath });
  state.markInitialized();
  const failed = state.getLaunchOptions();
  const replacement = state.replaceFailedResume(failed.sessionId);

  assert.equal(replacement.resume, false);
  assert.notEqual(replacement.sessionId, failed.sessionId);
  assert.deepEqual(createSessionState({ statePath }).getLaunchOptions(), replacement);
  assert.equal(state.replaceFailedResume(failed.sessionId), null);
});
