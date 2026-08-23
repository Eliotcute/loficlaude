export const SCENES = {
  lofiNight: {
    objects: [
      { type: 'window', x: 0.08, y: 0.12, w: 0.22, h: 0.36 },
      { type: 'desk', x: 0.0, y: 0.78, w: 0.5, h: 0.2 },
      { type: 'plant', x: 0.17, y: 0.68 },
      { type: 'planet', x: 0.82, y: 0.17, r: 0.07 },
      { type: 'city', baseY: 0.78 },
      { type: 'cloud', x: 0.55, y: 0.22 },
      { type: 'lamp', x: 0.23, y: 0.74 }
    ],
    particles: ['stars']
  },
  softRain: {
    objects: [
      { type: 'city', baseY: 0.76 },
      { type: 'cloud', x: 0.48, y: 0.13 },
      { type: 'lamp', x: 0.2, y: 0.66 }
    ],
    particles: ['rain', 'waterRipples']
  },
  starDrift: {
    objects: [
      { type: 'planet', x: 0.53, y: 0.22, r: 0.08 },
      { type: 'city', baseY: 0.82 },
      { type: 'cloud', x: 0.2, y: 0.5 }
    ],
    particles: ['stars', 'meteors']
  },
  fmStudio: {
    objects: [
      { type: 'shelf', x: 0.04, y: 0.12, w: 0.28, h: 0.52 },
      { type: 'radio', x: 0.66, y: 0.18, w: 0.23, h: 0.2 },
      { type: 'desk', x: 0.0, y: 0.78, w: 1, h: 0.2 },
      { type: 'keyboard', x: 0.38, y: 0.73, w: 0.24, h: 0.08 },
      { type: 'lamp', x: 0.25, y: 0.74 },
      { type: 'city', baseY: 0.78 }
    ],
    particles: ['stars']
  },
  recordRoom: {
    objects: [
      { type: 'recordWall', x: 0.04, y: 0.12, w: 0.42, h: 0.48 },
      { type: 'turntable', x: 0.55, y: 0.5, w: 0.3, h: 0.22 },
      { type: 'desk', x: 0.0, y: 0.8, w: 1, h: 0.18 },
      { type: 'plant', x: 0.82, y: 0.67 },
      { type: 'cloud', x: 0.58, y: 0.14 }
    ],
    particles: ['stars']
  },
  focusConsole: {
    objects: [
      { type: 'window', x: 0.05, y: 0.1, w: 0.3, h: 0.36 },
      { type: 'console', x: 0.45, y: 0.18, w: 0.46, h: 0.38 },
      { type: 'desk', x: 0.0, y: 0.78, w: 1, h: 0.2 },
      { type: 'keyboard', x: 0.4, y: 0.72, w: 0.25, h: 0.08 },
      { type: 'plant', x: 0.18, y: 0.68 }
    ],
    particles: ['stars', 'meteors']
  }
};

export function getSceneDefinition(key) {
  return SCENES[key] ?? SCENES.lofiNight;
}
