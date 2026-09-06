const PRESETS = {
  light: { cutoff: 700, gain: 0.15, remoteGain: 0.7 },
  medium: { cutoff: 1200, gain: 0.28, remoteGain: 0.85 },
  heavy: { cutoff: 2200, gain: 0.5, remoteGain: 1 }
};

export const RAINY_MOOD_SOURCES = [
  { src: 'https://media.rainymood.com/0.m4a', type: 'audio/mp4' },
  { src: 'https://media.rainymood.com/0.ogg', type: 'audio/ogg' },
  { src: 'https://media.rainymood.com/0.mp3', type: 'audio/mpeg' }
];

export const LOCAL_RAIN_SOURCES = [{ src: '/0.m4a', type: 'audio/mp4' }];

let sharedCtx = null;
let sharedNoiseBuffer = null;

function normalizeType(type) {
  return Object.hasOwn(PRESETS, type) ? type : 'medium';
}

function getContext() {
  if (!sharedCtx) {
    const runtime = typeof window === 'undefined' ? globalThis : window;
    const AudioContextImpl = runtime.AudioContext || runtime.webkitAudioContext;
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
  constructor(options = {}) {
    this.AudioElement = options.AudioElement ?? globalThis.Audio;
    this.sources = options.sources ?? LOCAL_RAIN_SOURCES;
    this.preferLocal = options.preferLocal ?? false;
    this.onStatus = options.onStatus ?? (() => {});
    this.audio = null;
    this.ctx = null;
    this.source = null;
    this.gain = null;
    this.filter = null;
    this.type = 'medium';
    this.volume = 60;
    this.started = false;
    this.remoteStarted = false;
    this.fallbackStarted = false;
    this.shouldPlay = false;
    this.usingFallback = false;
    this.fadeTimer = null;
    this.presetGain = PRESETS.medium.gain;
    this.remoteGain = PRESETS.medium.remoteGain;
  }

  async init(initialType = 'medium', autoplay = false) {
    this.type = normalizeType(initialType);
    this.presetGain = PRESETS[this.type].gain;
    this.remoteGain = PRESETS[this.type].remoteGain;

    if (this.preferLocal) {
      this.startFallback(false);
    } else if (!this.audio && this.AudioElement) {
      this.audio = new this.AudioElement();
      this.audio.loop = true;
      this.audio.preload = 'none';
      this.audio.crossOrigin = 'anonymous';
      this.audio.addEventListener?.('error', () => {
        if (this.shouldPlay && this.remoteStarted && !this.usingFallback) {
          this.startFallback(true);
        }
      });
      this.loadRainyMoodSources();
      this.setVolume(this.volume);
      this.onStatus(this.sources.every(({ src }) => src.startsWith('/')) ? 'local-recording' : 'rainy-mood');
    } else if (!this.audio) {
      this.startFallback(false);
    }

    if (autoplay) {
      await this.play();
    }
  }

  loadRainyMoodSources() {
    if (!this.audio || this.sources.length === 0) {
      return;
    }

    const doc = typeof document === 'undefined' ? null : document;
    if (!doc || !this.audio.appendChild) {
      this.audio.src = this.sources[0].src;
      return;
    }

    for (const sourceConfig of this.sources) {
      const sourceNode = doc.createElement('source');
      sourceNode.src = sourceConfig.src;
      sourceNode.type = sourceConfig.type;
      this.audio.appendChild(sourceNode);
    }
  }

  startFallback(autoplay = false) {
    if (this.usingFallback) {
      return;
    }

    this.remoteStarted = false;
    this.usingFallback = true;
    this.onStatus('fallback');
    this.audio?.pause?.();
    this.ctx = getContext();
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
      this.playFallback();
    }
  }

  applyPreset(type) {
    const normalized = normalizeType(type);
    const preset = PRESETS[normalized];
    this.type = normalized;
    this.presetGain = preset.gain;
    this.remoteGain = preset.remoteGain;

    if (this.filter && this.ctx) {
      const now = this.ctx.currentTime;
      this.filter.frequency.setTargetAtTime(preset.cutoff, now, 0.3);
    }

    if (this.gain) {
      this.setVolume(this.volume);
    }

    if (this.audio && !this.usingFallback) {
      this.setVolume(this.volume);
    }
  }

  loadType(type) {
    if (type === 'stop') {
      this.stop();
      return;
    }
    if (this.usingFallback && this.fallbackStarted) {
      this.applyPreset(type);
      return;
    }

    this.applyPreset(type);
  }

  stop() {
    this.shouldPlay = false;
    this.clearFadeTimer();
    this.audio?.pause?.();
    if (this.audio) this.audio.currentTime = 0;
    this.onStatus('stopped');
  }

  setVolume(volume) {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.volume = clamped;

    if (this.gain && this.ctx) {
      this.gain.gain.setValueAtTime((clamped / 100) * this.presetGain, this.ctx.currentTime);
      if (clamped === 0 && this.ctx.state === 'running') {
        this.ctx.suspend?.();
      } else if (clamped > 0 && this.shouldPlay && this.ctx.state === 'suspended') {
        this.ctx.resume?.();
      }
    }

    if (this.audio) {
      this.audio.volume = (clamped / 100) * this.remoteGain;
      if (clamped === 0) {
        this.audio.pause?.();
      } else if (this.shouldPlay && !this.usingFallback && this.audio.paused !== false) {
        this.audio.play?.().catch?.(() => {});
      }
    }
  }

  async play() {
    this.shouldPlay = true;
    if (this.audio && !this.usingFallback) {
      try {
        this.audio.volume = (this.volume / 100) * this.remoteGain;
        await this.audio.play();
        this.remoteStarted = true;
        this.started = true;
        return;
      } catch {
        this.startFallback(false);
      }
    }

    await this.playFallback();
  }

  async playFallback() {
    if (!this.ctx || !this.source || this.fallbackStarted) {
      if (this.ctx?.state === 'suspended') {
        await this.ctx.resume();
      }
      this.setVolume(this.volume);
      return;
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.source.start(0);
    this.fallbackStarted = true;
    this.started = true;
  }

  fadeOut(ms = 3000) {
    this.shouldPlay = false;
    if (this.audio && !this.usingFallback) {
      this.clearFadeTimer();
      const startVolume = this.audio.volume;
      const startedAt = Date.now();
      this.fadeTimer = setInterval(() => {
        const progress = Math.min(1, (Date.now() - startedAt) / ms);
        this.audio.volume = startVolume * (1 - progress);
        if (progress >= 1) {
          this.clearFadeTimer();
          this.audio.pause?.();
        }
      }, 100);
      return;
    }

    if (!this.gain || !this.ctx) {
      return;
    }

    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + ms / 1000);
    this.fadeTimer = setTimeout(() => {
      this.fadeTimer = null;
      if (!this.shouldPlay && this.usingFallback && this.ctx?.state === 'running') {
        this.ctx.suspend?.();
      }
    }, ms);
  }

  clearFadeTimer() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  destroy() {
    this.clearFadeTimer();
    this.shouldPlay = false;
    if (this.audio) {
      this.audio.pause?.();
      this.audio.removeAttribute?.('src');
      this.audio.load?.();
    }

    if (this.source) {
      try {
        if (this.fallbackStarted) {
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
    this.audio = null;
    this.started = false;
    this.remoteStarted = false;
    this.fallbackStarted = false;
    this.usingFallback = false;
  }
}
