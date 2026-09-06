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
