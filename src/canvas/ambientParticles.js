import { seedRandom } from './asciiRenderer.js';
import { getSceneDefinition } from './asciiScenes.js';

export function createAmbientParticles(sceneKey, width, height) {
  const rng = seedRandom(`particles-${sceneKey}`);
  const particles = [];
  const effects = getSceneDefinition(sceneKey).particles;

  const areaScale = Math.min(1, (1280 * 720) / Math.max(1, width * height));
  if (effects.includes('rain')) {
    const rainCount = Math.max(48, Math.round(180 * areaScale));
    for (let i = 0; i < rainCount; i += 1) {
      particles.push({
        type: 'rain',
        x: rng() * width,
        y: rng() * height,
        vy: 150 + rng() * 220,
        len: 10 + rng() * 10,
        phase: rng() * Math.PI * 2
      });
    }
    for (let i = 0; i < (effects.includes('waterRipples') ? 24 : 0); i += 1) {
      particles.push({
        type: 'ripple',
        x: rng() * width,
        y: height * (0.82 + rng() * 0.14),
        age: rng() * 1.4,
        duration: 1.4 + rng() * 0.8
      });
    }
  }
  if (effects.includes('stars')) {
    const starCount = Math.max(24, Math.round(80 * areaScale));
    for (let i = 0; i < starCount; i += 1) {
      particles.push({ type: 'star', x: rng() * width, y: rng() * height * 0.8, tw: rng() * Math.PI * 2, tws: 1 + rng() * 3 });
    }
    if (effects.includes('meteors')) {
      for (let i = 0; i < 5; i += 1) {
        particles.push({ type: 'meteor', x: rng() * width, y: rng() * height * 0.4, vx: 180 + rng() * 120, vy: 85 + rng() * 65 });
      }
    }
  }

  return particles;
}

export function updateAmbientParticles(particles, dt, width, height) {
  for (const p of particles) {
    if (p.type === 'rain') {
      p.y += p.vy * dt;
      p.x -= p.vy * 0.06 * dt;
      p.phase += dt * 2;
      if (p.y > height + 12 || p.x < -12) {
        p.x = Math.random() * width;
        p.y = -12;
      }
    } else if (p.type === 'ripple') {
      p.age += dt;
      if (p.age > p.duration) {
        p.x = Math.random() * width;
        p.y = height * (0.82 + Math.random() * 0.14);
        p.age = 0;
      }
    } else if (p.type === 'star') {
      p.tw += p.tws * dt;
    } else if (p.type === 'meteor') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x > width + 40 || p.y > height * 0.7) {
        p.x = -Math.random() * 120;
        p.y = Math.random() * height * 0.3;
      }
    }
  }
}

export function drawAmbientParticles(ctx, particles) {
  const baseAlpha = ctx.globalAlpha;

  for (const p of particles) {
    if (p.type === 'rain') {
      const glow = 0.52 + ((Math.sin(p.phase) + 1) * 0.5) * 0.3;
      ctx.fillStyle = 'rgb(176,210,255)';
      ctx.globalAlpha = baseAlpha * glow;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      ctx.fillRect(x, y, 2, 2);
      ctx.fillRect(x - 1, y + 3, 2, Math.max(5, Math.round(p.len * 0.62)));
    } else if (p.type === 'ripple') {
      const progress = p.age / p.duration;
      const alpha = Math.max(0, 0.32 * (1 - progress));
      const width = Math.max(2, Math.round(progress * 12));
      ctx.fillStyle = 'rgb(164,196,220)';
      ctx.globalAlpha = baseAlpha * alpha;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      ctx.fillRect(x - width, y, width * 2 + 1, 1);
      if (width > 3) {
        ctx.fillRect(x - width + 2, y + 2, width * 2 - 3, 1);
      }
    } else if (p.type === 'star') {
      const a = 0.3 + ((Math.sin(p.tw) + 1) * 0.5) * 0.65;
      ctx.fillStyle = 'rgb(245,236,220)';
      ctx.globalAlpha = baseAlpha * a;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    } else if (p.type === 'meteor') {
      ctx.strokeStyle = 'rgb(255,241,198)';
      ctx.globalAlpha = baseAlpha * 0.55;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 22, p.y - 10);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = baseAlpha;
}
