import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseMusicIntent } = require('../bridge/musicIntent.js');

test('parses safe conversational music intents', () => {
  assert.deepEqual(parseMusicIntent('切换到网易云，播放一些 lofi'), { action: 'play_playlist', query: 'lofi' });
  assert.deepEqual(parseMusicIntent('暂停音乐'), { action: 'pause' });
  assert.deepEqual(parseMusicIntent('下一首'), { action: 'next' });
  assert.deepEqual(parseMusicIntent('播放第 3 个'), { action: 'select_playlist', index: 2 });
  assert.equal(parseMusicIntent('删除所有文件'), null);
});

test('recognizes the documented standalone commands and Chinese choices', () => {
  for (const text of ['切换到网易云', '播放 lofi', '播放一些 lofi', 'play lofi']) {
    assert.deepEqual(parseMusicIntent(text), { action: 'play_playlist', query: 'lofi' }, text);
  }
  assert.deepEqual(parseMusicIntent('继续播放'), { action: 'resume' });
  assert.deepEqual(parseMusicIntent('播放第二个'), { action: 'select_playlist', index: 1 });
  assert.deepEqual(parseMusicIntent('取消'), { action: 'cancel_selection' });
});

test('treats standalone lofi as the default music search', () => {
  assert.deepEqual(parseMusicIntent('lofi'), { action: 'play_playlist', query: 'lofi' });
});

test('negated, quoted and unrelated conversation never controls music', () => {
  for (const text of ['不要暂停音乐', '别切换到网易云', '继续', '继续讲故事', '停止雨声',
    '如何播放 lofi', '为什么下一首没有切换', '解释 pause', 'next week', 'stopwatch',
    '"暂停音乐"', '播放第 8 个', '播放第二个是什么意思']) {
    assert.equal(parseMusicIntent(text), null, text);
  }
});
