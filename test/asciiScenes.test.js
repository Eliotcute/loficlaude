import test from 'node:test';
import assert from 'node:assert/strict';

import { SCENES, SCENE_CATALOG, getSceneDefinition, sceneUsesRain } from '../src/canvas/asciiScenes.js';
import { SCENE_NAME_MAP, SCENE_ORDER, getSceneName, parsePersistedSnapshot } from '../src/utils/appPersistence.js';

test('Claude FM reference scenes are available as original procedural layouts', () => {
  assert.deepEqual(SCENE_ORDER, [
    'lofiNight',
    'softRain',
    'starDrift',
    'fmStudio',
    'recordRoom',
    'focusConsole',
    'coffeeShop',
    'library',
    'rainWindow',
    'nightStreet',
    'sunsetRoom'
  ]);

  for (const key of SCENE_ORDER) {
    const definition = getSceneDefinition(key);
    assert.ok(definition.objects.length >= 3);
    assert.ok(Array.isArray(definition.particles));
    assert.equal(getSceneName(key), SCENE_NAME_MAP[key]);
  }
});

test('rain scenes are explicit so auto-rotate can skip them', () => {
  assert.equal(sceneUsesRain('lofiNight'), false);
  assert.equal(sceneUsesRain('starDrift'), false);
  assert.equal(sceneUsesRain('softRain'), true);
  assert.equal(sceneUsesRain('rainWindow'), true);
});

test('unknown scenes fall back to the original night scene', () => {
  assert.equal(getSceneDefinition('unknown').objects, SCENES.lofiNight.objects);
  assert.equal(getSceneDefinition('__proto__'), SCENES.lofiNight);
  assert.equal(getSceneName('constructor'), 'Lofi Night');
});

test('catalog keeps picker, header, persistence and renderer metadata consistent', () => {
  assert.deepEqual(SCENE_CATALOG.map(({ key }) => key), Object.keys(SCENES));
  const playlist = [{ name: 'test station' }];
  for (const item of SCENE_CATALOG) {
    assert.ok(item.label.length > 0);
    assert.ok(item.icon.length > 0);
    assert.equal(item.icon, getSceneDefinition(item.key).icon);
    assert.equal(item.name, getSceneName(item.key));
    const restored = parsePersistedSnapshot(JSON.stringify({ currentScene: item.key }), playlist);
    assert.equal(restored.currentScene, item.key);
  }
});
