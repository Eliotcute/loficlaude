const PRESETS = {
  light: { cutoff: 700, gain: 0.15 },
  medium: { cutoff: 1200, gain: 0.28 },
  heavy: { cutoff: 2200, gain: 0.5 }
};

let sharedCtx = null;
let sharedNoiseBuffer = null;

function normalizeType(type) {
  return Object.hasOwn(PRESETS, type) ? type : 'medium';
}

function getContext() {
  if (!sharedCtx) {
    const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
    sharedCtx = new AudioContextImpl();
  }
  return sharedCtx;
}

function createPinkNoiseBuffer(ctx, durationSec = 4) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
}

function getNoiseBuffer(ctx) {
  if (!sharedNoiseBuffer) {
    sharedNoiseBuffer = createPinkNoiseBuffer(ctx, 4);
  }
  return sharedNoiseBuffer;
}

export class RainPlayer {
  constructor() {
    this.ctx = null;
    this.source = null;
    this.gain = null;
    this.filter = null;
    this.type = 'medium';
    this.volume = 60;
    this.started = false;
    this.presetGain = PRESETS.medium.gain;
  }

  async init(initialType = 'medium', autoplay = false) {
    this.ctx = getContext();
    this.type = normalizeType(initialType);
    this.source = this.ctx.createBufferSource();
    this.source.buffer = getNoiseBuffer(this.ctx);
    this.source.loop = true;

    this.gain = this.ctx.createGain();
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.5;

    this.source.connect(this.gain);
    this.gain.connect(this.filter);
    this.filter.connect(this.ctx.destination);

    this.applyPreset(this.type);
    this.setVolume(this.volume);

    if (autoplay) {
      await this.play();
    }
  }

  applyPreset(type) {
    const normalized = normalizeType(type);
    const preset = PRESETS[normalized];
    this.type = normalized;
    this.presetGain = preset.gain;

    if (this.filter && this.ctx) {
      const now = this.ctx.currentTime;
      this.filter.frequency.setTargetAtTime(preset.cutoff, now, 0.3);
    }

    if (this.gain) {
      this.setVolume(this.volume);
    }
  }

  loadType(type) {
    if (this.started) {
      this.applyPreset(type);
      return;
    }

    this.type = normalizeType(type);
    this.presetGain = PRESETS[this.type].gain;
  }

  setVolume(volume) {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.volume = clamped;

    if (this.gain && this.ctx) {
      this.gain.gain.setValueAtTime((clamped / 100) * this.presetGain, this.ctx.currentTime);
    }
  }

  async play() {
    if (!this.ctx || !this.source || this.started) {
      if (this.ctx?.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.source.start(0);
    this.started = true;
  }

  fadeOut(ms = 3000) {
    if (!this.gain || !this.ctx) {
      return;
    }

    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + ms / 1000);
  }

  destroy() {
    if (this.source) {
      try {
        if (this.started) {
          this.source.stop();
        }
      } catch {
        // Ignore repeated stop calls during teardown.
      }
      this.source.disconnect();
    }

    this.gain?.disconnect();
    this.filter?.disconnect();

    this.source = null;
    this.gain = null;
    this.filter = null;
    this.ctx = null;
    this.started = false;
  }
}
