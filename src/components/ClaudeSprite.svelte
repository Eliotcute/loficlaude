<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { claude, ui } from '../stores/appState.js';
  import { getFrame, PALETTE } from '../canvas/spriteFrames.js';
  import { createClaudeMotionState, updateClaudeMotion } from '../canvas/claudeMotion.js';

  const dispatch = createEventDispatcher();
  const claudeMood = claude.mood;
  const claudeX = claude.x;
  const claudeY = claude.y;
  const claudeDirection = claude.direction;
  const uiMiniPlayerExpanded = ui.miniPlayerExpanded;

  let spriteCanvas;
  let spriteCtx;
  let raf;
  let lastTime = 0;
  const pxScale = 4;
  let hovering = false;

  let motionState = {
    x: 0,
    y: 0,
    direction: 'left',
    mode: 'idle',
    targetX: 0,
    targetY: 0,
    idleTime: 8000,
    frameTime: 0,
    frameIndex: 0
  };

  function syncStores() {
    claude.x.set(motionState.x);
    claude.y.set(motionState.y);
    claude.direction.set(motionState.direction);
    claude.mode.set(motionState.mode);
    claude.targetX.set(motionState.targetX);
    claude.targetY.set(motionState.targetY);
    claude.idleTime.set(motionState.idleTime);
    claude.frameTime.set(motionState.frameTime);
    claude.frameIndex.set(motionState.frameIndex);
    claude.bubbleAnchor.set({ x: motionState.x + 48, y: motionState.y - 8 });
  }

  function setModeFromMood(mood) {
    if (mood === 'sleep') {
      motionState.mode = 'sleep';
    } else if (mood === 'talk' || mood === 'nod') {
      motionState.mode = 'talk';
    } else if (mood === 'thinking' || mood === 'working' || mood === 'blocked' || mood === 'happy') {
      motionState.mode = mood;
      if (mood === 'working') {
        motionState.direction = 'right';
      }
    } else if (
      motionState.mode === 'sleep' ||
      motionState.mode === 'talk' ||
      motionState.mode === 'thinking' ||
      motionState.mode === 'working' ||
      motionState.mode === 'blocked' ||
      motionState.mode === 'happy'
    ) {
      motionState.mode = 'idle';
    }
    syncStores();
  }

  function drawFrame(frame) {
    if (!spriteCtx || !frame) return;
    spriteCtx.clearRect(0, 0, 24, 24);
    for (let y = 0; y < frame.length; y += 1) {
      for (let x = 0; x < frame[y].length; x += 1) {
        const index = frame[y][x];
        if (index === 0) continue;
        spriteCtx.fillStyle = PALETTE[index];
        spriteCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  function tick(timestamp) {
    const dt = Math.min(0.05, (timestamp - (lastTime || timestamp)) / 1000);
    lastTime = timestamp;

    if (!hovering) {
      updateClaudeMotion(
        motionState,
        { width: window.innerWidth, height: window.innerHeight, playerExpanded: $uiMiniPlayerExpanded },
        dt
      );
    }

    syncStores();
    drawFrame(getFrame(motionState.mode, motionState.frameIndex));
    raf = window.requestAnimationFrame(tick);
  }

  function handleSpriteClick() {
    motionState.mode = 'idle';
    motionState.idleTime = 9000;
    syncStores();
    dispatch('activate');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSpriteClick();
    }
  }

  onMount(() => {
    spriteCtx = spriteCanvas.getContext('2d', { alpha: true });
    motionState = createClaudeMotionState(window.innerWidth, window.innerHeight);
    syncStores();
    drawFrame(getFrame('idle', 0));
    raf = window.requestAnimationFrame(tick);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  });

  $: setModeFromMood($claudeMood);
</script>

<div
  class="claude-sprite"
  role="button"
  aria-label="Claude"
  tabindex="0"
  style="transform: translate3d({$claudeX}px, {$claudeY}px, 0);"
  on:click={handleSpriteClick}
  on:keydown={handleKeyDown}
  on:mouseenter={() => { hovering = true; }}
  on:mouseleave={() => { hovering = false; }}>
  <canvas
    bind:this={spriteCanvas}
    width="24"
    height="24"
    style="width: {24 * pxScale}px; height: {24 * pxScale}px; image-rendering: pixelated; display: block; transform: scaleX({$claudeDirection === 'left' ? 1 : -1});"
  ></canvas>
</div>

<style>
  .claude-sprite {
    position: absolute;
    min-width: 96px;
    min-height: 96px;
    z-index: 6;
    cursor: pointer;
    transition: transform 0.22s ease-out;
    will-change: transform;
    pointer-events: auto;
  }

  .claude-sprite:focus:not(:focus-visible) {
    outline: none;
  }

  .claude-sprite:focus-visible {
    outline: 1px solid rgba(212, 165, 116, 0.82);
    outline-offset: 5px;
    box-shadow: 0 0 0 5px rgba(212, 165, 116, 0.08);
  }
</style>
