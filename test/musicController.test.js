import test from 'node:test';
import assert from 'node:assert/strict';

import { createMusicController } from '../bridge/musicController.js';

test('music controller only executes whitelisted commands and parses state', async () => {
  const calls = [];
  const controller = createMusicController({
    execFileImpl(command, args, options, callback) {
      calls.push({ command, args, options });
      callback(null, JSON.stringify({ state: { status: 'playing', volume: 65 } }));
    }
  });

  assert.equal(await controller.command('state'), true);
  assert.deepEqual(controller.getState(), {
    provider: 'netease-local',
    status: 'playing',
    title: '',
    volume: 65
  });
  assert.equal(await controller.command('shell', ['rm', '-rf']), false);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['state', '--output', 'json']);
});

test('music controller reports missing CLI without exposing command details', async () => {
  const errors = [];
  const controller = createMusicController({
    onError: (message) => errors.push(message),
    execFileImpl(command, args, options, callback) {
      const error = new Error('missing');
      error.code = 'ENOENT';
      callback(error);
    }
  });

  assert.equal(await controller.command('resume'), false);
  assert.deepEqual(errors, ['网易云音乐 CLI 未安装']);
  assert.equal(controller.getState().status, 'error');
});
