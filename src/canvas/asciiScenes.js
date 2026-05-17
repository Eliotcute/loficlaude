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
  }
};

export function getSceneDefinition(key) {
  return SCENES[key] ?? SCENES.lofiNight;
}
