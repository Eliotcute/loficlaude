import test from 'node:test';
import assert from 'node:assert/strict';

import { createMusicController } from '../bridge/musicController.js';

const playlist = { id: 'A'.repeat(32), originalId: '2540031947', name: 'Lofi study' };

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

test('playlist playback rejects CLI business failures even with exit code zero', async () => {
  const states = [];
  const controller = createMusicController({
    onState: (state) => states.push(state),
    execFileImpl(command, args, options, callback) {
      callback(null, JSON.stringify({ success: false, message: 'private diagnostic detail' }));
    }
  });
  assert.equal(await controller.playPlaylistById(playlist), false);
  assert.equal(states.some((state) => state.status === 'playing'), false);
});

test('playlist success requires a confirmed playing state', async () => {
  const calls = [];
  const controller = createMusicController({
    execFileImpl(command, args, options, callback) {
      calls.push(args);
      callback(null, JSON.stringify(args[0] === 'state'
        ? { success: true, state: { status: 'stopped', volume: 60 } }
        : { success: true }));
    }
  });
  assert.equal(await controller.playPlaylistById(playlist), false);
  assert.deepEqual(calls.map((args) => args[0]), ['play', 'state']);
  assert.equal(controller.getState().status, 'idle');
});

test('selected playlist passes validated IDs and publishes only confirmed state', async () => {
  const calls = [];
  const controller = createMusicController({
    execFileImpl(command, args, options, callback) {
      calls.push(args);
      callback(null, JSON.stringify(args[0] === 'state'
        ? { success: true, state: { status: 'playing', volume: 55 } }
        : { success: true }));
    }
  });
  assert.equal(await controller.playPlaylistById(playlist), true);
  assert.deepEqual(calls[0], ['play', '--playlist', '--encrypted-id', playlist.id, '--original-id', playlist.originalId, '--output', 'json']);
  assert.equal(controller.getState().title, playlist.name);
  assert.equal(controller.getState().volume, 55);
  assert.equal(controller.getState().status, 'playing');
});

test('invalid playlist IDs and invalid search arguments never reach the CLI', async () => {
  let calls = 0;
  const controller = createMusicController({
    execFileImpl(command, args, options, callback) { calls++; callback(null, '{}'); }
  });
  for (const record of [null, {}, { ...playlist, id: '--help' }, { ...playlist, originalId: '../file' }]) {
    assert.equal(await controller.playPlaylistById(record), false);
  }
  assert.deepEqual(await controller.searchPlaylists({ query: 'lofi' }), []);
  assert.equal(await controller.command('search', ['lofi', '--help']), false);
  assert.equal(calls, 0);
});

test('search accepts the verified records schema and strips unrelated fields', async () => {
  const controller = createMusicController({
    execFileImpl(command, args, options, callback) {
      callback(null, JSON.stringify({ code: 200, data: { records: [
        { ...playlist, originalId: Number(playlist.originalId), describe: 'not for UI', extMap: {} },
        { id: '--help', originalId: 1, name: 'invalid' }
      ] } }));
    }
  });
  assert.deepEqual(await controller.searchPlaylists('lofi'), [playlist]);
});

test('invalid JSON cannot be mistaken for an idle player', async () => {
  const controller = createMusicController({
    execFileImpl(command, args, options, callback) { callback(null, 'not JSON'); }
  });
  assert.equal(await controller.refresh(), false);
  assert.equal(controller.getState().status, 'error');
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

test('unchanged polled state is not republished', async () => {
  const states = [];
  const controller = createMusicController({
    onState: (state) => states.push(state),
    execFileImpl(command, args, options, callback) {
      callback(null, JSON.stringify({ state: { status: 'paused', volume: 40 } }));
    }
  });
  await controller.refresh();
  await controller.refresh();
  await controller.refresh();
  assert.equal(states.length, 1);
});

test('missing CLI stops background polling but explicit commands still retry', async () => {
  const errors = [];
  let calls = 0;
  const controller = createMusicController({
    onError: (message) => errors.push(message),
    execFileImpl(command, args, options, callback) {
      calls += 1;
      const error = new Error('missing');
      error.code = 'ENOENT';
      callback(error);
    }
  });
  assert.equal(await controller.refresh(), false);
  assert.equal(await controller.refresh(), false);
  assert.equal(await controller.refresh(), false);
  assert.equal(calls, 1);
  assert.deepEqual(errors, ['网易云音乐 CLI 未安装']);
  assert.equal(await controller.command('state'), false);
  assert.equal(calls, 2);
});

test('expired login surfaces an actionable message instead of a generic failure', async () => {
  const errors = [];
  const controller = createMusicController({
    onError: (message) => errors.push(message),
    execFileImpl(command, args, options, callback) {
      if (args[0] === 'search') {
        const error = new Error('Command failed');
        error.code = 1;
        callback(error, '', "error: unknown command 'search'\n");
        return;
      }
      callback(null, JSON.stringify({ success: false, message: '未登录，请执行 ncm-cli login 完成登录' }));
    }
  });
  assert.deepEqual(await controller.searchPlaylists('lofi'), []);
  assert.equal(await controller.playPlaylistById(playlist), false);
  assert.equal(errors.length, 2);
  for (const message of errors) assert.match(message, /ncm-cli login/);
});

test('unknown CLI failures keep the generic message and never echo raw output', async () => {
  const errors = [];
  const controller = createMusicController({
    onError: (message) => errors.push(message),
    execFileImpl(command, args, options, callback) {
      callback(Object.assign(new Error('boom'), { code: 2 }), JSON.stringify({ message: 'private diagnostic detail' }), 'stack trace');
    }
  });
  assert.deepEqual(await controller.searchPlaylists('lofi'), []);
  assert.deepEqual(errors, ['网易云音乐暂时不可用']);
});
