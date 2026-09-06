import test from 'node:test';
import assert from 'node:assert/strict';

import { RainPlayer, RAINY_MOOD_SOURCES } from '../src/audio/RainPlayer.js';

class FakeAudio {
  constructor() {
    this.constructor.instance = this;
    this.loop = false;
    this.preload = '';
    this.crossOrigin = '';
    this.src = '';
    this.volume = 1;
    this.paused = true;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.listeners = {};
  }

  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }

  async play() {
    this.playCalls += 1;
    this.paused = false;
  }

  pause() {
    this.pauseCalls += 1;
    this.paused = true;
  }
}

class RejectingAudio extends FakeAudio {
  async play() {
    this.playCalls += 1;
    throw new Error('blocked');
  }
}

class FakeAudioContext {
  constructor() {
    this.constructor.instance = this;
    this.currentTime = 0;
    this.sampleRate = 10;
    this.state = 'running';
    this.destination = {};
  }

  createBuffer() {
    return {
      getChannelData() {
        return new Float32Array(40);
      }
    };
  }

  createBufferSource() {
    this.source = {
      loop: false,
      started: false,
      connect() {},
      disconnect() {},
      start() {
        if (this.started) {
          throw new Error('InvalidStateError');
        }
        this.started = true;
      },
      stop() {}
    };
    return this.source;
  }

  createGain() {
    this.gainNode = {
      gain: {
        value: 0,
        setValueAtTime(value) {
          this.value = value;
        },
        cancelScheduledValues() {},
        linearRampToValueAtTime(value) {
          this.value = value;
        }
      },
      connect() {},
      disconnect() {}
    };
    return this.gainNode;
  }

  createBiquadFilter() {
    return {
      type: '',
      Q: { value: 0 },
      frequency: {
        setTargetAtTime() {}
      },
      connect() {},
      disconnect() {}
    };
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }
}

test('RainPlayer initializes the bundled local rain audio source', async () => {
  const statuses = [];
  const player = new RainPlayer({ AudioElement: FakeAudio, onStatus: (status) => statuses.push(status) });

  await player.init('medium', false);
  player.setVolume(55);
  await player.play();

  assert.equal(FakeAudio.instance.src, '/0.m4a');
  assert.equal(FakeAudio.instance.volume, 0.4675);
  assert.equal(FakeAudio.instance.playCalls, 1);
  assert.equal(player.usingFallback, false);
  assert.deepEqual(statuses, ['local-recording']);

  FakeAudio.instance.volume = 0;
  await player.play();
  assert.equal(FakeAudio.instance.volume, 0.4675);
  player.loadType('heavy');
  assert.equal(FakeAudio.instance.volume, 0.55);
  player.loadType('light');
  assert.equal(FakeAudio.instance.volume, 0.385);

  player.setVolume(0);
  assert.equal(FakeAudio.instance.pauseCalls, 1);
  player.setVolume(40);
  assert.equal(FakeAudio.instance.playCalls, 3);
});

test('RainPlayer applies the initial rain type to remote volume', async () => {
  const player = new RainPlayer({ AudioElement: FakeAudio });

  await player.init('light', false);
  player.setVolume(50);

  assert.equal(FakeAudio.instance.volume, 0.35);
});

test('RainPlayer can initialize directly with the local generated source', async () => {
  const originalAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;
  const statuses = [];

  class UnexpectedAudio {
    constructor() {
      throw new Error('remote audio should not be created');
    }
  }

  try {
    const player = new RainPlayer({
      AudioElement: UnexpectedAudio,
      preferLocal: true,
      onStatus: (status) => statuses.push(status)
    });

    await player.init('light', false);

    assert.equal(player.usingFallback, true);
    assert.equal(player.audio, null);
    assert.deepEqual(statuses, ['fallback']);
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});

test('RainPlayer suspends fallback output after fade and resumes it without restarting the source', async () => {
  const originalAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;

  try {
    const player = new RainPlayer({ AudioElement: RejectingAudio });

    await player.init('medium', true);
    player.fadeOut(0);
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(FakeAudioContext.instance.state, 'suspended');

    await player.play();
    assert.equal(FakeAudioContext.instance.state, 'running');
    assert.ok(FakeAudioContext.instance.gainNode.gain.value > 0);
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});

test('RainPlayer starts fallback after a remote stream error even after remote playback started', async () => {
  const originalAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;

  try {
    const statuses = [];
    const player = new RainPlayer({ AudioElement: FakeAudio, onStatus: (status) => statuses.push(status) });

    await player.init('medium', false);
    await player.play();
    FakeAudio.instance.listeners.error();

    assert.equal(player.usingFallback, true);
    assert.equal(player.remoteStarted, false);
    assert.equal(player.fallbackStarted, true);
    assert.equal(player.ctx.source.started, true);
    assert.deepEqual(statuses, ['local-recording', 'fallback']);
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});

test('RainPlayer ignores a delayed remote error after playback is stopped', async () => {
  const originalAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;

  try {
    const statuses = [];
    const player = new RainPlayer({ AudioElement: FakeAudio, onStatus: (status) => statuses.push(status) });

    await player.init('medium', false);
    await player.play();
    player.fadeOut(4000);
    FakeAudio.instance.listeners.error();

    assert.deepEqual(statuses, ['local-recording']);
    player.destroy();
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});

test('RainPlayer falls back to generated rain when Rainy Mood playback fails', async () => {
  const originalAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;

  try {
    const statuses = [];
    const player = new RainPlayer({ AudioElement: RejectingAudio, onStatus: (status) => statuses.push(status) });

    await player.init('heavy', true);

    assert.equal(RejectingAudio.instance.playCalls, 1);
    assert.equal(player.usingFallback, true);
    assert.equal(player.started, true);
    assert.deepEqual(statuses, ['local-recording', 'fallback']);

    player.setVolume(0);
    assert.equal(player.ctx.state, 'suspended');
    player.setVolume(30);
    assert.equal(player.ctx.state, 'running');
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});
