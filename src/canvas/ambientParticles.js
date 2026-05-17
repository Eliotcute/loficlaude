import { seedRandom } from './asciiRenderer.js';

export function createAmbientParticles(sceneKey, width, height) {
  const rng = seedRandom(`particles-${sceneKey}`);
  const particles = [];

  if (sceneKey === 'softRain') {
    for (let i = 0; i < 120; i += 1) {
      particles.push({ type: 'rain', x: rng() * width, y: rng() * height, vy: 120 + rng() * 180, len: 8 + rng() * 8 });
    }
  } else {
    for (let i = 0; i < 80; i += 1) {
      particles.push({ type: 'star', x: rng() * width, y: rng() * height * 0.8, tw: rng() * Math.PI * 2, tws: 1 + rng() * 3 });
    }
    if (sceneKey === 'starDrift') {
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
      if (p.y > height + 12 || p.x < -12) {
        p.x = Math.random() * width;
        p.y = -12;
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
  for (const p of particles) {
    if (p.type === 'rain') {
      ctx.strokeStyle = 'rgba(176,210,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2, p.y + p.len);
      ctx.stroke();
    } else if (p.type === 'star') {
      const a = 0.3 + ((Math.sin(p.tw) + 1) * 0.5) * 0.65;
      ctx.fillStyle = `rgba(245,236,220,${a.toFixed(3)})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    } else if (p.type === 'meteor') {
      ctx.strokeStyle = 'rgba(255,241,198,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 22, p.y - 10);
      ctx.stroke();
    }
  }
}
