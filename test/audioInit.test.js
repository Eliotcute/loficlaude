import test from 'node:test';
import assert from 'node:assert/strict';

import { createAudioInitializer } from '../src/utils/audioInit.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test('audio initialization shares one in-flight result and honors a later autoplay request', async () => {
  const youtubeReady = deferred();
  const youtubePlayer = {
    playCalls: 0,
    init: () => youtubeReady.promise,
    setVolume() {},
    play() {
      this.playCalls += 1;
    },
    destroy() {}
  };
  const rainPlayer = {
    playCalls: 0,
    async init() {},
    setVolume() {},
    play() {
      this.playCalls += 1;
    },
    destroy() {}
  };
  const audio = createAudioInitializer({
    createYouTubePlayer: () => youtubePlayer,
    createRainPlayer: () => rainPlayer
  });

  const first = audio.initAudio(false);
  const second = audio.initAudio(true);
  let settled = false;
  second.then(() => {
    settled = true;
  });
  await Promise.resolve();

  assert.equal(first, second);
  assert.equal(settled, false);
  youtubeReady.resolve();
  await second;
  assert.equal(youtubePlayer.playCalls, 1);
  assert.equal(rainPlayer.playCalls, 1);
});

test('audio initialization starts the local rain boundary before waiting for YouTube', async () => {
  const calls = [];
  const youtubeReady = deferred();
  const audio = createAudioInitializer({
    createYouTubePlayer: () => ({
      init() {
        calls.push('youtube');
        return youtubeReady.promise;
      },
      setVolume() {},
      destroy() {}
    }),
    createRainPlayer: () => ({
      init() {
        calls.push('rain');
      },
      setVolume() {},
      destroy() {}
    })
  });

  const initialization = audio.initAudio(false);
  assert.deepEqual(calls, ['rain', 'youtube']);
  youtubeReady.resolve();
  await initialization;
});
