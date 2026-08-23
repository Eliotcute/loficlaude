import test from 'node:test';
import assert from 'node:assert/strict';

import { createAmbientParticles, updateAmbientParticles } from '../src/canvas/ambientParticles.js';

test('soft rain particles advance between animation frames', () => {
  const particles = createAmbientParticles('softRain', 800, 600);
  const rain = particles.find((particle) => particle.type === 'rain');
  assert.ok(particles.some((particle) => particle.type === 'ripple'));
  assert.equal(particles.filter((particle) => particle.type === 'rain').length, 180);
  const initialY = rain.y;

  updateAmbientParticles(particles, 1 / 60, 800, 600);

  assert.ok(rain.y > initialY);
});
