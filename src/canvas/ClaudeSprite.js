const PALETTE = {
  body: '#df805f',
  shadow: '#b85f48',
  highlight: '#f09a72',
  hair: '#141414',
  headset: '#e8e0d8',
  eyes: '#050505',
  star: '#f1d478'
};

const BASE_FRAME = {
  hair: [
    [8, 2, 8, 2],
    [7, 4, 10, 1]
  ],
  body: [
    [7, 5, 10, 14],
    [6, 10, 12, 8]
  ],
  shadow: [
    [7, 14, 10, 5],
    [8, 19, 8, 2]
  ],
  highlight: [
    [8, 7, 3, 7],
    [11, 8, 2, 2]
  ],
  headset: [
    [6, 6, 1, 5],
    [17, 6, 1, 5],
    [7, 5, 10, 1]
  ],
  eyesOpen: [
    [9, 9, 1, 1],
    [14, 9, 1, 1]
  ],
  eyesClosed: [
    [9, 9, 2, 1],
    [13, 9, 2, 1]
  ],
  mouthClosed: [[11, 13, 2, 1]],
  mouthOpen: [[11, 13, 2, 2]],
  armUp: [[16, 11, 3, 3]],
  armDown: [[16, 13, 3, 2]],
  legWide: [
    [8, 20, 3, 2],
    [13, 20, 3, 2]
  ],
  legTuck: [[10, 20, 4, 2]],
  star: [[19, 7, 2, 2]],
  walkLegsA: [
    [8, 20, 3, 2],
    [13, 21, 3, 1]
  ],
  walkLegsB: [
    [8, 21, 3, 1],
    [13, 20, 3, 2]
  ],
  walkArmA: [[16, 12, 3, 2]],
  walkArmB: [[16, 13, 3, 2]]
};

function drawRects(ctx, rects, scale, x, y, color) {
  ctx.fillStyle = color;
  rects.forEach(([rx, ry, rw, rh]) => {
    ctx.fillRect(x + rx * scale, y + ry * scale, rw * scale, rh * scale);
  });
}

function randBetween(minMs, maxMs) {
  return minMs + Math.random() * (maxMs - minMs);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class ClaudeSprite {
  constructor() {
    this.baseSize = 24;
    this.scale = 4;
    this.x = 0;
    this.y = 0;
    this.width = this.baseSize * this.scale;
    this.height = this.baseSize * this.scale;
    this.floatTime = 0;
    this.state = 'idle';
    this.stateElapsed = 0;
    this.jumpBoost = 0;
    this.nodPhase = 0;
    this.talkPhase = 0;
    this.sleepPhase = 0;
    this.blinkTimer = randBetween(4000, 8000);
    this.blinkElapsed = 0;
    this.pendingState = null;
    this.pendingStateDuration = 0;

    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.homeX = 0;
    this.homeY = 0;

    this.isWalking = false;
    this.walkTarget = null;
    this.walkSpeed = 22;
    this.walkFrame = 0;
    this.walkFrameTimer = 0;
    this.walkFrameDuration = 0.26;
    this.idleTimer = 0;
    this.nextActionTime = randBetween(30000, 60000);
    this.walkCount = 0;
    this.sightseeingUntil = 0;

    this.marginX = 8;
    this.minY = 0;
    this.maxY = 0;
  }

  setPosition(canvasWidth, canvasHeight) {
    const oldHomeX = this.homeX;
    const oldHomeY = this.homeY;

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.homeX = canvasWidth - 48 - this.width;
    this.homeY = canvasHeight - 96 - this.height;

    this.minY = Math.max(4, this.homeY - Math.round(canvasHeight * 0.08));
    this.maxY = Math.max(this.minY, this.homeY + Math.round(canvasHeight * 0.02));

    if (oldHomeX === 0 && oldHomeY === 0) {
      this.x = this.homeX;
      this.y = this.homeY;
    }

    this.clampToBounds();
  }

  setState(nextState, durationMs = 0) {
    if (!nextState || this.state === nextState) {
      return;
    }

    if (nextState !== 'walk') {
      this.stopWalking();
    }

    this.state = nextState;
    this.stateElapsed = 0;

    if (nextState === 'jump') {
      this.jumpBoost = 1;
      this.pendingState = 'idle';
      this.pendingStateDuration = 520;
    } else if (durationMs > 0) {
      this.pendingState = 'idle';
      this.pendingStateDuration = durationMs;
    } else {
      this.pendingState = null;
      this.pendingStateDuration = 0;
    }
  }

  triggerJump() {
    this.stopWalking();
    this.setState('jump');
  }

  update(dt) {
    this.floatTime += dt;
    this.stateElapsed += dt * 1000;

    this.blinkTimer -= dt * 1000;
    if (this.state !== 'sleep' && this.state !== 'jump' && this.blinkTimer <= 0) {
      this.blinkElapsed = 120;
      this.blinkTimer = randBetween(4000, 8000);
    }

    if (this.pendingState && this.stateElapsed >= this.pendingStateDuration) {
      this.state = this.pendingState;
      this.stateElapsed = 0;
      this.pendingState = null;
      this.pendingStateDuration = 0;
    }

    this.nodPhase += dt * 3.2;
    this.talkPhase += dt * 8;
    this.sleepPhase += dt * 1.6;

    if (this.jumpBoost > 0) {
      this.jumpBoost = Math.max(0, this.jumpBoost - dt * 2.6);
    }

    if (this.blinkElapsed > 0) {
      this.blinkElapsed = Math.max(0, this.blinkElapsed - dt * 1000);
    }

    if (this.state === 'idle' && !this.isWalking) {
      if (this.sightseeingUntil > 0) {
        this.sightseeingUntil -= dt * 1000;
      } else {
        this.idleTimer += dt * 1000;
        if (this.idleTimer >= this.nextActionTime) {
          this.startWalking();
        }
      }
    }

    if (this.isWalking) {
      this.updateWalking(dt);
    }
  }

  startWalking() {
    if (this.canvasWidth <= 0 || this.canvasHeight <= 0) {
      return;
    }

    const shouldSightsee = this.walkCount > 0 && this.walkCount % 4 === 0;
    const leftBound = this.marginX;
    const rightBound = this.canvasWidth - this.width - this.marginX;

    let targetX;
    let targetY;

    if (shouldSightsee) {
      targetX = Math.random() > 0.5 ? leftBound : rightBound;
      targetY = clamp(this.homeY - Math.round(this.canvasHeight * 0.03), this.minY, this.maxY);
      this.sightseeingUntil = randBetween(5000, 8000);
    } else {
      targetX = randBetween(leftBound, rightBound);
      targetY = clamp(this.homeY + (Math.random() - 0.5) * this.canvasHeight * 0.05, this.minY, this.maxY);
      this.sightseeingUntil = 0;
    }

    this.walkTarget = { x: targetX, y: targetY };
    this.isWalking = true;
    this.state = 'walk';
    this.stateElapsed = 0;
    this.walkFrame = 0;
    this.walkFrameTimer = 0;
  }

  stopWalking() {
    this.isWalking = false;
    this.walkTarget = null;
    this.walkFrameTimer = 0;
    this.walkFrame = 0;
    this.idleTimer = 0;
    this.nextActionTime = randBetween(30000, 60000);
  }

  updateWalking(dt) {
    if (!this.walkTarget) {
      this.stopWalking();
      this.state = 'idle';
      return;
    }

    const dx = this.walkTarget.x - this.x;
    const dy = this.walkTarget.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1.5) {
      this.x = this.walkTarget.x;
      this.y = this.walkTarget.y;
      this.walkCount += 1;
      this.stopWalking();
      this.state = 'idle';
      if (this.sightseeingUntil <= 0) {
        this.nextActionTime = randBetween(20000, 60000);
      }
      this.clampToBounds();
      return;
    }

    const step = this.walkSpeed * dt;
    const ratio = Math.min(1, step / dist);
    this.x += dx * ratio;
    this.y += dy * ratio;

    this.walkFrameTimer += dt;
    if (this.walkFrameTimer >= this.walkFrameDuration) {
      this.walkFrame = 1 - this.walkFrame;
      this.walkFrameTimer = 0;
    }

    this.clampToBounds();
  }

  clampToBounds() {
    if (this.canvasWidth <= 0 || this.canvasHeight <= 0) {
      return;
    }

    const minX = this.marginX;
    const maxX = this.canvasWidth - this.width - this.marginX;
    this.x = clamp(this.x, minX, maxX);
    this.y = clamp(this.y, this.minY, this.maxY);
  }

  getHitArea() {
    return {
      x: this.x - 10,
      y: this.y - 10,
      width: this.width + 20,
      height: this.height + 20
    };
  }

  containsPoint(px, py) {
    const area = this.getHitArea();
    return px >= area.x && px <= area.x + area.width && py >= area.y && py <= area.y + area.height;
  }

  draw(ctx) {
    const scale = this.scale;
    const floatOffset = this.state === 'walk' ? 0 : Math.sin(this.floatTime * 2) * 2;
    let stateOffsetY = 0;

    if (this.state === 'nod') {
      stateOffsetY = Math.sin(this.nodPhase) * 1.6;
    }

    if (this.state === 'jump') {
      stateOffsetY -= Math.sin((1 - this.jumpBoost) * Math.PI) * 12;
    }

    if (this.state === 'sleep') {
      stateOffsetY += 2;
    }

    const x = Math.round(this.x);
    const y = Math.round(this.y + floatOffset + stateOffsetY);

    drawRects(ctx, BASE_FRAME.hair, scale, x, y, PALETTE.hair);
    drawRects(ctx, BASE_FRAME.body, scale, x, y, PALETTE.body);
    drawRects(ctx, BASE_FRAME.shadow, scale, x, y, PALETTE.shadow);
    drawRects(ctx, BASE_FRAME.highlight, scale, x, y, PALETTE.highlight);
    drawRects(ctx, BASE_FRAME.headset, scale, x, y, PALETTE.headset);

    const blink = this.state === 'blink' || this.blinkElapsed > 0;
    drawRects(ctx, blink ? BASE_FRAME.eyesClosed : BASE_FRAME.eyesOpen, scale, x, y, PALETTE.eyes);

    const talking = this.state === 'talk' && Math.sin(this.talkPhase) > 0;
    drawRects(ctx, talking ? BASE_FRAME.mouthOpen : BASE_FRAME.mouthClosed, scale, x, y, PALETTE.eyes);

    if (this.state === 'sleep') {
      drawRects(ctx, BASE_FRAME.legTuck, scale, x, y, PALETTE.shadow);
      this.drawSleepMarks(ctx, x, y, scale);
    } else if (this.state === 'walk') {
      const walkLegs = this.walkFrame === 0 ? BASE_FRAME.walkLegsA : BASE_FRAME.walkLegsB;
      const walkArm = this.walkFrame === 0 ? BASE_FRAME.walkArmA : BASE_FRAME.walkArmB;
      drawRects(ctx, walkLegs, scale, x, y, PALETTE.shadow);
      drawRects(ctx, walkArm, scale, x, y, PALETTE.body);
    } else {
      drawRects(ctx, BASE_FRAME.legWide, scale, x, y, PALETTE.shadow);
    }

    if (this.state === 'jump') {
      drawRects(ctx, BASE_FRAME.armUp, scale, x, y - scale, PALETTE.body);
    } else if (this.state !== 'walk') {
      const armRects = this.state === 'nod' && Math.sin(this.nodPhase) > 0 ? BASE_FRAME.armUp : BASE_FRAME.armDown;
      drawRects(ctx, armRects, scale, x, y, PALETTE.body);
    }

    const starPulse = 0.65 + Math.sin(this.floatTime * 4.2) * 0.35;
    ctx.globalAlpha = Math.max(0.25, starPulse);
    drawRects(ctx, BASE_FRAME.star, scale, x, y, PALETTE.star);
    ctx.globalAlpha = 1;
  }

  drawSleepMarks(ctx, x, y, scale) {
    const phase = this.sleepPhase;
    const z1x = x + 19 * scale + Math.sin(phase) * 2;
    const z1y = y - 2 * scale - (phase % 1) * 8;
    const z2x = x + 21 * scale + Math.sin(phase + 0.6) * 2;
    const z2y = y - 6 * scale - ((phase + 0.5) % 1) * 8;

    ctx.fillStyle = 'rgba(232, 224, 216, 0.85)';
    ctx.fillRect(z1x, z1y, 2 * scale, 1 * scale);
    ctx.fillRect(z1x + 1 * scale, z1y + 1 * scale, 2 * scale, 1 * scale);

    ctx.fillRect(z2x, z2y, 2 * scale, 1 * scale);
    ctx.fillRect(z2x + 1 * scale, z2y + 1 * scale, 2 * scale, 1 * scale);
  }
}
