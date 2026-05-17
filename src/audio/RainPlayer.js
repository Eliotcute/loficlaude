import { Howl } from 'howler';

const RAIN_SOURCES = {
  light: '/rain-light.mp3',
  medium: '/rain-medium.mp3',
  heavy: '/rain-heavy.mp3'
};

function normalizeType(type) {
  return Object.hasOwn(RAIN_SOURCES, type) ? type : 'medium';
}

export class RainPlayer {
  constructor() {
    this.type = 'medium';
    this.volume = 60;
    this.instance = null;
  }

  async init(initialType = 'medium') {
    this.type = normalizeType(initialType);
    this.instance = this.createInstance(this.type);
    this.play();
  }

  loadType(type) {
    const nextType = normalizeType(type);
    if (nextType === this.type) {
      return;
    }

    const previous = this.instance;
    const shouldPlay = previous ? previous.playing() : true;

    this.type = nextType;
    this.instance = this.createInstance(nextType);

    if (shouldPlay) {
      this.instance.play();
    }

    if (previous) {
      previous.stop();
      previous.unload();
    }
  }

  setVolume(volume) {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.volume = clamped;

    if (this.instance) {
      this.instance.volume(clamped / 100);
    }
  }

  play() {
    if (!this.instance) {
      return;
    }
    this.instance.play();
  }

  fadeOut(ms = 3000) {
    if (!this.instance) {
      return;
    }

    const from = this.instance.volume();
    this.instance.fade(from, 0, ms);

    window.setTimeout(() => {
      if (this.instance) {
        this.instance.pause();
      }
    }, ms);
  }

  destroy() {
    if (this.instance) {
      this.instance.stop();
      this.instance.unload();
    }

    this.instance = null;
  }

  createInstance(type) {
    return new Howl({
      src: [RAIN_SOURCES[type]],
      loop: true,
      html5: true,
      volume: this.volume / 100
    });
  }
}
