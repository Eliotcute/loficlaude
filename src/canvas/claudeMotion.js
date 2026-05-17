function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function createClaudeMotionState(viewportWidth, viewportHeight) {
  const bounds = getWalkBounds(viewportWidth, viewportHeight, false);
  return {
    x: bounds.maxX - 40,
    y: bounds.maxY - 20,
    direction: 'left',
    mode: 'idle',
    targetX: 0,
    targetY: 0,
    idleTime: rand(5000, 12000),
    frameTime: 0,
    frameIndex: 0
  };
}

export function getWalkBounds(width, height, playerExpanded) {
  const playerClearance = playerExpanded ? 420 : 160;

  return {
    minX: 32,
    maxX: Math.max(48, width - 120),
    minY: Math.round(height * 0.54),
    maxY: Math.max(Math.round(height * 0.56), height - playerClearance)
  };
}

export function updateClaudeMotion(claudeState, viewport, dt) {
  const bounds = getWalkBounds(viewport.width, viewport.height, viewport.playerExpanded);
  claudeState.x = clamp(claudeState.x, bounds.minX, bounds.maxX);
  claudeState.y = clamp(claudeState.y, bounds.minY, bounds.maxY);

  claudeState.frameTime += dt;
  if (claudeState.frameTime > 0.42) {
    claudeState.frameIndex = (claudeState.frameIndex + 1) % 2;
    claudeState.frameTime = 0;
  }

  if (
    claudeState.mode === 'sleep' ||
    claudeState.mode === 'talk' ||
    claudeState.mode === 'thinking' ||
    claudeState.mode === 'working' ||
    claudeState.mode === 'blocked' ||
    claudeState.mode === 'happy'
  ) {
    return;
  }

  if (claudeState.mode === 'idle') {
    claudeState.idleTime -= dt * 1000;
    if (claudeState.idleTime <= 0) {
      if (Math.random() < 0.5) {
        claudeState.targetX = rand(bounds.minX, bounds.maxX);
        claudeState.targetY = rand(bounds.minY, bounds.maxY);
        claudeState.mode = 'walk';
      } else {
        claudeState.idleTime = rand(5000, 12000);
      }
    }
    return;
  }

  if (claudeState.mode === 'walk') {
    const dx = claudeState.targetX - claudeState.x;
    const dy = claudeState.targetY - claudeState.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      claudeState.mode = 'idle';
      claudeState.idleTime = rand(5000, 12000);
      return;
    }

    const speed = 34 * dt;
    claudeState.x += (dx / dist) * speed;
    claudeState.y += (dy / dist) * speed;
    claudeState.direction = dx > 0 ? 'right' : 'left';
  }
}
