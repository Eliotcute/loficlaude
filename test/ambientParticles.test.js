import test from 'node:test';
import assert from 'node:assert/strict';

import { createAmbientParticles, updateAmbientParticles } from '../src/canvas/ambientParticles.js';
import { SCENES } from '../src/canvas/asciiScenes.js';

test('soft rain particles advance between animation frames', () => {
  const particles = createAmbientParticles('softRain', 800, 600);
  const rain = particles.find((particle) => particle.type === 'rain');
  assert.ok(particles.some((particle) => particle.type === 'ripple'));
  assert.equal(particles.filter((particle) => particle.type === 'rain').length, 180);
  const initialY = rain.y;

  updateAmbientParticles(particles, 1 / 60, 800, 600);

  assert.ok(rain.y > initialY);
});

test('all scene particle declarations drive their runtime effects', () => {
  const types = { rain: 'rain', waterRipples: 'ripple', stars: 'star', meteors: 'meteor' };
  for (const [key, scene] of Object.entries(SCENES)) {
    const particles = createAmbientParticles(key, 800, 600);
    for (const [effect, type] of Object.entries(types)) {
      assert.equal(particles.some((p) => p.type === type), scene.particles.includes(effect), `${key}: ${effect}`);
    }
    assert.ok(particles.length <= 260, `${key} exceeds the particle budget`);
  }
});
