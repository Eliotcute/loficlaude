import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyMusicFeedback, updateMusicFeedback } from '../src/utils/musicFeedback.js';

const intent = (action, status) => ({ type: 'music_intent', action, status });

test('music candidates survive completion, Claude deltas and resting events', () => {
  let state = updateMusicFeedback(emptyMusicFeedback(), intent('play_playlist', 'started'));
  assert.equal(state.status, 'pending');
  state = updateMusicFeedback(state, { type: 'music_search_results', choices: [{ name: 'Lofi' }, { name: 'Rain Lofi' }] });
  state = updateMusicFeedback(state, intent('play_playlist', 'completed'));
  assert.equal(state.status, 'choices');
  assert.equal(state.choices.length, 2);
  for (const event of [{ type: 'assistant_delta', text: '回复' }, { type: 'status', value: 'done' }, { type: 'resting' }]) {
    assert.equal(updateMusicFeedback(state, event), state);
  }
});

test('new searches, selections, cancellation and disconnect clear old choices', () => {
  const selected = updateMusicFeedback(emptyMusicFeedback(), { type: 'music_search_results', choices: [{ name: 'Lofi' }] });
  for (const action of ['play_playlist', 'select_playlist', 'cancel_selection']) {
    assert.deepEqual(updateMusicFeedback(selected, intent(action, 'started')).choices, []);
  }
  assert.deepEqual(updateMusicFeedback(selected, { type: 'reset' }), emptyMusicFeedback());
});

test('music errors are bounded and cleared by the next request', () => {
  const failed = updateMusicFeedback(emptyMusicFeedback(), { type: 'music_error', message: 'x'.repeat(400) });
  assert.equal(failed.status, 'error');
  assert.equal(failed.message.length, 240);
  const retried = updateMusicFeedback(failed, intent('resume', 'started'));
  assert.equal(retried.status, 'pending');
  assert.notEqual(retried.message, failed.message);
});

test('candidate feedback only retains bounded display names, never credentials', () => {
  const state = updateMusicFeedback(emptyMusicFeedback(), { type: 'music_search_results', choices: [null, {}, ...Array.from({ length: 8 }, () => ({ name: 'n'.repeat(200), token: 'fixture-only', id: '1' }))] });
  assert.equal(state.choices.length, 5);
  assert.deepEqual(Object.keys(state.choices[0]), ['name']);
  assert.equal(state.choices[0].name.length, 160);
});

test('a specific music error is not overwritten by the following failed intent', () => {
  let state = updateMusicFeedback(emptyMusicFeedback(), intent('play_playlist', 'started'));
  state = updateMusicFeedback(state, { type: 'music_error', message: '网易云未登录或登录已过期，请在终端运行 ncm-cli login 扫码登录后重试' });
  state = updateMusicFeedback(state, intent('play_playlist', 'failed'));
  assert.match(state.message, /ncm-cli login/);
  assert.match(updateMusicFeedback(updateMusicFeedback(emptyMusicFeedback(), intent('next', 'started')), intent('next', 'failed')).message, /音乐操作未完成/);
});
