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
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.listeners = {};
  }

  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }

  async play() {
    this.playCalls += 1;
  }

  pause() {
    this.pauseCalls += 1;
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
    return {
      loop: false,
      started: false,
      connect() {},
      disconnect() {},
      start() {
        this.started = true;
      },
      stop() {}
    };
  }

  createGain() {
    return {
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

test('RainPlayer initializes Rainy Mood as the primary audio source', async () => {
  const statuses = [];
  const player = new RainPlayer({ AudioElement: FakeAudio, onStatus: (status) => statuses.push(status) });

  await player.init('medium', false);
  player.setVolume(55);
  await player.play();

  assert.equal(FakeAudio.instance.src, RAINY_MOOD_SOURCES[0].src);
  assert.equal(FakeAudio.instance.volume, 0.55);
  assert.equal(FakeAudio.instance.playCalls, 1);
  assert.equal(player.usingFallback, false);
  assert.deepEqual(statuses, ['rainy-mood']);

  FakeAudio.instance.volume = 0;
  await player.play();
  assert.equal(FakeAudio.instance.volume, 0.55);

  player.setVolume(0);
  assert.equal(FakeAudio.instance.pauseCalls, 1);
  player.setVolume(40);
  assert.equal(FakeAudio.instance.playCalls, 3);
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
    assert.deepEqual(statuses, ['rainy-mood', 'fallback']);

    player.setVolume(0);
    assert.equal(player.ctx.state, 'suspended');
    player.setVolume(30);
    assert.equal(player.ctx.state, 'running');
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});
