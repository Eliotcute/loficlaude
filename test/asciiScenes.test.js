import test from 'node:test';
import assert from 'node:assert/strict';

import { SCENES, getSceneDefinition } from '../src/canvas/asciiScenes.js';
import { SCENE_NAME_MAP, SCENE_ORDER, getSceneName } from '../src/utils/appPersistence.js';

test('Claude FM reference scenes are available as original procedural layouts', () => {
  assert.deepEqual(SCENE_ORDER, [
    'lofiNight',
    'softRain',
    'starDrift',
    'fmStudio',
    'recordRoom',
    'focusConsole'
  ]);

  for (const key of SCENE_ORDER) {
    const definition = getSceneDefinition(key);
    assert.ok(definition.objects.length >= 3);
    assert.ok(Array.isArray(definition.particles));
    assert.equal(getSceneName(key), SCENE_NAME_MAP[key]);
  }
});

test('unknown scenes fall back to the original night scene', () => {
  assert.equal(getSceneDefinition('unknown').objects, SCENES.lofiNight.objects);
});
