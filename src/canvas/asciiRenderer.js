function hashSeed(seed) {
  let h = 2166136261;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function canvasBufferSize(cssWidth, cssHeight, maxEdge = 1280) {
  const width = Math.max(1, Math.floor(Number(cssWidth) || 0));
  const height = Math.max(1, Math.floor(Number(cssHeight) || 0));
  const edge = Math.max(width, height);
  const scale = edge > maxEdge ? maxEdge / edge : 1;
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale))
  };
}

export function seedRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function dot(ctx, x, y, color, size = 2) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}

export function dottedRect(ctx, x, y, w, h, options = {}) {
  const spacing = options.spacing ?? 8;
  const density = options.density ?? 0.5;
  const color = options.color ?? 'rgba(230,230,220,0.65)';
  const size = options.size ?? 2;
  const rng = seedRandom(options.seed ?? `${x}-${y}-${w}-${h}`);

  for (let yy = y; yy < y + h; yy += spacing) {
    for (let xx = x; xx < x + w; xx += spacing) {
      if (rng() < density) {
        dot(ctx, xx, yy, color, size);
      }
    }
  }
}

export function dottedCircle(ctx, cx, cy, r, options = {}) {
  const spacing = options.spacing ?? 8;
  const density = options.density ?? 0.55;
  const color = options.color ?? 'rgba(230,230,220,0.6)';
  const size = options.size ?? 2;
  const rng = seedRandom(options.seed ?? `${cx}-${cy}-${r}`);

  for (let y = cy - r; y <= cy + r; y += spacing) {
    for (let x = cx - r; x <= cx + r; x += spacing) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r && rng() < density) {
        dot(ctx, x, y, color, size);
      }
    }
  }
}

export function dottedLine(ctx, x1, y1, x2, y2, options = {}) {
  const spacing = options.spacing ?? 8;
  const color = options.color ?? 'rgba(230,230,220,0.55)';
  const size = options.size ?? 2;
  const density = options.density ?? 1;
  const rng = seedRandom(options.seed ?? `${x1}-${y1}-${x2}-${y2}`);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;

  for (let d = 0; d <= len; d += spacing) {
    if (rng() <= density) {
      const t = d / len;
      dot(ctx, x1 + dx * t, y1 + dy * t, color, size);
    }
  }
}

export function dottedCloud(ctx, x, y, w, h, options = {}) {
  const rng = seedRandom(options.seed ?? `${x}-${y}-${w}-${h}`);
  const count = options.count ?? 7;
  for (let i = 0; i < count; i += 1) {
    const cx = x + rng() * w;
    const cy = y + rng() * h;
    const r = (Math.min(w, h) * 0.18) + rng() * (Math.min(w, h) * 0.2);
    dottedCircle(ctx, cx, cy, r, {
      seed: `${options.seed}-blob-${i}`,
      spacing: options.spacing ?? 7,
      density: options.density ?? 0.42,
      color: options.color ?? 'rgba(220,224,230,0.45)',
      size: options.size ?? 2
    });
  }
}

export function drawStaticScene(ctx, sceneDef, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#090c10';
  ctx.fillRect(0, 0, width, height);

  const objects = sceneDef?.objects ?? [];
  objects.forEach((object, index) => {
    const seed = `${object.type}-${index}`;
    switch (object.type) {
      case 'window': {
        const x = object.x * width;
        const y = object.y * height;
        const w = object.w * width;
        const h = object.h * height;
        dottedRect(ctx, x, y, w, h, { seed, spacing: 8, density: 0.62, color: 'rgba(180,205,228,0.36)' });
        dottedLine(ctx, x + w * 0.5, y, x + w * 0.5, y + h, { seed: `${seed}-v`, spacing: 7, color: 'rgba(210,224,236,0.52)' });
        dottedLine(ctx, x, y + h * 0.5, x + w, y + h * 0.5, { seed: `${seed}-h`, spacing: 7, color: 'rgba(210,224,236,0.52)' });
        break;
      }
      case 'desk': {
        dottedRect(ctx, object.x * width, object.y * height, object.w * width, object.h * height, {
          seed,
          spacing: 7,
          density: 0.7,
          color: 'rgba(165,130,102,0.4)'
        });
        break;
      }
      case 'plant': {
        const x = object.x * width;
        const y = object.y * height;
        dottedRect(ctx, x, y + 18, 32, 20, { seed: `${seed}-pot`, spacing: 6, density: 0.7, color: 'rgba(150,118,90,0.5)' });
        dottedLine(ctx, x + 18, y + 18, x + 8, y - 24, { seed: `${seed}-stem1`, spacing: 6, color: 'rgba(132,180,120,0.5)' });
        dottedLine(ctx, x + 18, y + 18, x + 32, y - 18, { seed: `${seed}-stem2`, spacing: 6, color: 'rgba(132,180,120,0.5)' });
        break;
      }
      case 'planet': {
        dottedCircle(ctx, object.x * width, object.y * height, object.r * width, {
          seed,
          spacing: 8,
          density: 0.55,
          color: 'rgba(214,184,124,0.5)'
        });
        break;
      }
      case 'city': {
        const baseY = object.baseY * height;
        const rng = seedRandom(seed);
        let x = 0;
        while (x < width) {
          const w = 26 + rng() * 36;
          const h = 60 + rng() * 170;
          dottedRect(ctx, x, baseY - h, w, h, {
            seed: `${seed}-${Math.round(x)}`,
            spacing: 8,
            density: 0.52,
            color: 'rgba(120,136,155,0.32)'
          });
          x += w + 8;
        }
        break;
      }
      case 'cloud': {
        dottedCloud(ctx, object.x * width, object.y * height, width * 0.18, height * 0.12, {
          seed,
          spacing: 7,
          density: 0.42,
          color: 'rgba(205,214,226,0.35)'
        });
        break;
      }
      case 'lamp': {
        const x = object.x * width;
        const y = object.y * height;
        dottedLine(ctx, x, y - 54, x, y, { seed: `${seed}-pole`, spacing: 6, color: 'rgba(210,190,150,0.48)' });
        dottedCircle(ctx, x, y - 60, 14, { seed: `${seed}-bulb`, spacing: 5, density: 0.7, color: 'rgba(234,208,136,0.54)' });
        break;
      }
      case 'shelf': {
        const x = object.x * width;
        const y = object.y * height;
        const w = object.w * width;
        const h = object.h * height;
        dottedRect(ctx, x, y, w, h, { seed, spacing: 8, density: 0.62, color: 'rgba(190,198,210,0.38)' });
        for (let row = 1; row < 4; row += 1) {
          dottedLine(ctx, x, y + h * row / 4, x + w, y + h * row / 4, { seed: `${seed}-${row}`, spacing: 7, color: 'rgba(214,220,228,0.48)' });
        }
        break;
      }
      case 'radio': {
        const x = object.x * width;
        const y = object.y * height;
        const w = object.w * width;
        const h = object.h * height;
        dottedRect(ctx, x, y, w, h, { seed, spacing: 7, density: 0.7, color: 'rgba(218,204,176,0.48)' });
        dottedCircle(ctx, x + w * 0.34, y + h * 0.56, Math.min(w, h) * 0.2, { seed: `${seed}-dial`, spacing: 6, density: 0.72, color: 'rgba(226,218,196,0.56)' });
        dottedLine(ctx, x + w * 0.62, y + h * 0.32, x + w * 0.86, y + h * 0.32, { seed: `${seed}-display`, spacing: 5, color: 'rgba(226,218,196,0.62)' });
        break;
      }
      case 'keyboard': {
        const x = object.x * width;
        const y = object.y * height;
        const w = object.w * width;
        const h = object.h * height;
        dottedRect(ctx, x, y, w, h, { seed, spacing: 6, density: 0.7, color: 'rgba(170,184,198,0.42)' });
        dottedLine(ctx, x + w * 0.18, y + h * 0.65, x + w * 0.82, y + h * 0.65, { seed: `${seed}-space`, spacing: 6, color: 'rgba(212,220,228,0.52)' });
        break;
      }
      case 'recordWall': {
        const x = object.x * width;
        const y = object.y * height;
        const w = object.w * width;
        const h = object.h * height;
        dottedRect(ctx, x, y, w, h, { seed, spacing: 8, density: 0.24, color: 'rgba(190,198,210,0.3)' });
        for (let index = 0; index < 4; index += 1) {
          dottedCircle(ctx, x + w * (0.16 + index * 0.22), y + h * (0.3 + (index % 2) * 0.42), Math.min(w, h) * 0.13, { seed: `${seed}-${index}`, spacing: 6, density: 0.7, color: 'rgba(218,218,208,0.52)' });
        }
        break;
      }
      case 'turntable': {
        const x = object.x * width;
        const y = object.y * height;
        const w = object.w * width;
        const h = object.h * height;
        dottedRect(ctx, x, y, w, h, { seed, spacing: 7, density: 0.68, color: 'rgba(172,142,120,0.44)' });
        dottedCircle(ctx, x + w * 0.48, y + h * 0.5, Math.min(w, h) * 0.32, { seed: `${seed}-record`, spacing: 6, density: 0.74, color: 'rgba(220,220,212,0.56)' });
        dottedLine(ctx, x + w * 0.72, y + h * 0.2, x + w * 0.58, y + h * 0.48, { seed: `${seed}-arm`, spacing: 5, color: 'rgba(226,216,190,0.58)' });
        break;
      }
      case 'console': {
        const x = object.x * width;
        const y = object.y * height;
        const w = object.w * width;
        const h = object.h * height;
        dottedRect(ctx, x, y, w, h, { seed, spacing: 7, density: 0.52, color: 'rgba(150,168,188,0.36)' });
        dottedRect(ctx, x + w * 0.1, y + h * 0.12, w * 0.8, h * 0.56, { seed: `${seed}-screen`, spacing: 6, density: 0.48, color: 'rgba(208,222,230,0.5)' });
        dottedLine(ctx, x + w * 0.12, y + h * 0.84, x + w * 0.88, y + h * 0.84, { seed: `${seed}-base`, spacing: 6, color: 'rgba(196,182,154,0.5)' });
        break;
      }
      default:
        break;
    }
  });
}
