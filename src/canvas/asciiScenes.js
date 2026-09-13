export const SCENES = {
  lofiNight: {
    name: 'Lofi Night', label: 'Night', icon: '\u{1F319}',
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
    name: 'Soft Rain', label: 'Rain', icon: '\u{1F327}',
    objects: [
      { type: 'city', baseY: 0.76 },
      { type: 'cloud', x: 0.48, y: 0.13 },
      { type: 'lamp', x: 0.2, y: 0.66 }
    ],
    particles: ['rain', 'waterRipples']
  },
  starDrift: {
    name: 'Star Drift', label: 'Stars', icon: '\u{2B50}',
    objects: [
      { type: 'planet', x: 0.53, y: 0.22, r: 0.08 },
      { type: 'city', baseY: 0.82 },
      { type: 'cloud', x: 0.2, y: 0.5 }
    ],
    particles: ['stars', 'meteors']
  },
  fmStudio: {
    name: 'FM Studio', label: 'FM Studio', icon: '\u{1F4FB}',
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
    name: 'Record Room', label: 'Records', icon: '\u{1F4BF}',
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
    name: 'Focus Console', label: 'Console', icon: '\u2318',
    objects: [
      { type: 'window', x: 0.05, y: 0.1, w: 0.3, h: 0.36 },
      { type: 'console', x: 0.45, y: 0.18, w: 0.46, h: 0.38 },
      { type: 'desk', x: 0.0, y: 0.78, w: 1, h: 0.2 },
      { type: 'keyboard', x: 0.4, y: 0.72, w: 0.25, h: 0.08 },
      { type: 'plant', x: 0.18, y: 0.68 }
    ],
    particles: ['stars', 'meteors']
  },
  coffeeShop: {
    name: 'Coffee Shop', label: 'Coffee', icon: '\u2615',
    objects: [{ type: 'shelf', x: 0.05, y: 0.12, w: 0.25, h: 0.5 }, { type: 'desk', x: 0, y: 0.78, w: 1, h: 0.2 }, { type: 'lamp', x: 0.72, y: 0.7 }],
    particles: ['stars']
  },
  library: {
    name: 'Library', label: 'Library', icon: '\u{1F4DA}',
    objects: [{ type: 'shelf', x: 0.05, y: 0.1, w: 0.4, h: 0.58 }, { type: 'desk', x: 0, y: 0.8, w: 1, h: 0.18 }, { type: 'lamp', x: 0.55, y: 0.72 }],
    particles: ['stars']
  },
  rainWindow: {
    name: 'Rain Window', label: 'Rain Window', icon: '\u{1FA9F}',
    objects: [{ type: 'window', x: 0.18, y: 0.1, w: 0.64, h: 0.56 }, { type: 'desk', x: 0, y: 0.8, w: 1, h: 0.18 }, { type: 'lamp', x: 0.82, y: 0.72 }],
    particles: ['rain', 'waterRipples']
  },
  nightStreet: {
    name: 'Night Street', label: 'Night Street', icon: '\u{1F303}',
    objects: [{ type: 'city', baseY: 0.76 }, { type: 'lamp', x: 0.72, y: 0.62 }, { type: 'cloud', x: 0.3, y: 0.18 }],
    particles: ['rain', 'stars']
  },
  sunsetRoom: {
    name: 'Sunset Room', label: 'Sunset', icon: '\u{1F307}',
    objects: [{ type: 'window', x: 0.12, y: 0.12, w: 0.34, h: 0.42 }, { type: 'plant', x: 0.72, y: 0.66 }, { type: 'desk', x: 0, y: 0.8, w: 1, h: 0.18 }],
    particles: ['stars']
  }
};

export const DEFAULT_SCENE = 'lofiNight';
export const SCENE_CATALOG = Object.freeze(Object.entries(SCENES).map(([key, definition]) =>
  Object.freeze({ key, name: definition.name, label: definition.label, icon: definition.icon })
));
export const SCENE_ORDER = Object.freeze(SCENE_CATALOG.map(({ key }) => key));
export const SCENE_NAME_MAP = Object.freeze(Object.fromEntries(SCENE_CATALOG.map(({ key, name }) => [key, name])));

export function getSceneDefinition(key) {
  return Object.hasOwn(SCENES, key) ? SCENES[key] : SCENES[DEFAULT_SCENE];
}

export function sceneUsesRain(key) {
  return getSceneDefinition(key).particles.includes('rain');
}
