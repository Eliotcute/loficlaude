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
  let rainOptions;
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
    createRainPlayer: (options) => {
      rainOptions = options;
      return rainPlayer;
    }
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
  assert.equal(rainOptions.preferLocal, false);
});

test('audio initialization starts rain before waiting for YouTube', async () => {
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

test('preloaded audio stays silent until a later playback request', async () => {
  const youtubePlayer = {
    playCalls: 0,
    async init() {},
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

  await audio.initAudio(false);
  assert.equal(youtubePlayer.playCalls, 0);
  assert.equal(rainPlayer.playCalls, 0);

  await audio.initAudio(true);
  assert.equal(youtubePlayer.playCalls, 1);
  assert.equal(rainPlayer.playCalls, 1);
});

test('audio initialization settles with rain and exposes a retryable music error when YouTube times out', async () => {
  const loadingStates = [];
  const errors = [];
  const youtubePlayer = {
    init() {
      return new Promise(() => {});
    },
    setVolume() {},
    destroy() {}
  };
  const rainPlayer = {
    initCalls: 0,
    init() {
      this.initCalls += 1;
    },
    setVolume() {},
    destroy() {}
  };
  const audio = createAudioInitializer({
    createYouTubePlayer: () => youtubePlayer,
    createRainPlayer: () => rainPlayer,
    youtubeInitializationTimeoutMs: 5,
    onLoading: (loading) => loadingStates.push(loading),
    onError: (error) => errors.push(error)
  });

  await audio.initAudio(false);

  assert.equal(rainPlayer.initCalls, 1);
  assert.deepEqual(loadingStates, [true, false]);
  assert.match(errors.at(-1), /Music unavailable: YouTube initialization timed out\. Retry from player\./);
});

test('audio initialization retries YouTube after a timeout while keeping rain available', async () => {
  let youtubeInitCalls = 0;
  const youtubePlayer = {
    playCalls: 0,
    init() {
      youtubeInitCalls += 1;
      return youtubeInitCalls === 1 ? new Promise(() => {}) : Promise.resolve();
    },
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
    createRainPlayer: () => rainPlayer,
    youtubeInitializationTimeoutMs: 5
  });

  await audio.initAudio(false);
  await audio.initAudio(true);

  assert.equal(youtubeInitCalls, 2);
  assert.equal(youtubePlayer.playCalls, 1);
  assert.equal(rainPlayer.playCalls, 1);
});
