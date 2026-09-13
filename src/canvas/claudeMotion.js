function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const PATROL_SPEED = 34;
const IDLE_PAUSE_MS = 1000;
const GRAVITY = 980;
const TERMINAL_VELOCITY = 560;
export let chatPaused = false;

export function setChatPaused(value) {
  chatPaused = Boolean(value);
}

export function getPatrolBounds(width, height, playerExpanded, measuredPlayerHeight = null) {
  const collapsedPlayerHeight = 72;
  // Keep Clawd's feet on the player shell's top edge. The expanded drawer is
  // content-sized (music, rain and focus controls), so reserve its measured
  // desktop height rather than letting the sprite walk through the panel.
  const expandedPlayerHeight = 720;
  const playerBottomGap = 20;
  const spriteHeight = 96;
  const playerHeight = playerExpanded ? (Number.isFinite(measuredPlayerHeight) ? measuredPlayerHeight : expandedPlayerHeight) : collapsedPlayerHeight;
  const playerTop = height - playerHeight - playerBottomGap;
  const y = Math.max(120, playerTop - spriteHeight + (playerExpanded ? 8 : 0));

  return {
    left: 32,
    right: Math.max(48, width - 120),
    y,
    horizon: width / 2
  };
}

export function createClaudeMotionState(viewportWidth, viewportHeight) {
  const bounds = getPatrolBounds(viewportWidth, viewportHeight, false);
  return {
    x: bounds.right,
    y: bounds.y,
    direction: 'left',
    mode: 'idle',
    patrolDir: -1,
    idleTime: IDLE_PAUSE_MS,
    frameTime: 0,
    frameIndex: 0,
    isDragging: false,
    isFalling: false,
    velocityY: 0
  };
}

export function updateClaudeMotion(claudeState, viewport, dt) {
  const bounds = getPatrolBounds(viewport.width, viewport.height, viewport.playerExpanded, viewport.playerHeight);
  claudeState.x = clamp(claudeState.x, bounds.left, bounds.right);

  if (claudeState.isDragging) {
    return;
  }

  if (claudeState.isFalling) {
    claudeState.velocityY = Math.min(TERMINAL_VELOCITY, claudeState.velocityY + GRAVITY * dt);
    const nextY = claudeState.y + claudeState.velocityY * dt;
    if (nextY >= bounds.y) {
      claudeState.y = bounds.y;
      claudeState.velocityY = 0;
      claudeState.isFalling = false;
      claudeState.mode = 'idle';
      claudeState.idleTime = IDLE_PAUSE_MS;
    } else {
      claudeState.y = nextY;
    }
    return;
  }

  claudeState.y = bounds.y;

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
    if (chatPaused || claudeState.mode !== 'idle') {
      return;
    }

    claudeState.idleTime -= dt * 1000;
    if (claudeState.idleTime <= 0) {
      claudeState.patrolDir = claudeState.x < bounds.horizon ? 1 : -1;
      claudeState.direction = claudeState.patrolDir === -1 ? 'left' : 'right';
      claudeState.mode = 'walk';
    }
    return;
  }

  if (claudeState.mode === 'walk') {
    claudeState.x += claudeState.patrolDir * PATROL_SPEED * dt;
    claudeState.x = clamp(claudeState.x, bounds.left, bounds.right);
    claudeState.y = bounds.y;
    claudeState.direction = claudeState.patrolDir === -1 ? 'left' : 'right';

    const reachedLeft = claudeState.patrolDir === -1 && claudeState.x <= bounds.left;
    const reachedRight = claudeState.patrolDir === 1 && claudeState.x >= bounds.right;

    if (reachedLeft || reachedRight) {
      claudeState.patrolDir *= -1;
      claudeState.mode = 'idle';
      claudeState.idleTime = IDLE_PAUSE_MS;
    }
  }
}
