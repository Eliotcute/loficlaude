<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { claude, claudeForm, ui } from '../stores/appState.js';
  import { getFrame as getMotionFrame, PALETTE as MOTION_PALETTE } from '../canvas/spriteFrames.js';
  import { FORM_NAMES, getForm, getFormName, getPaletteForForm } from '../canvas/claudepixForms.js';
  import { createClaudeMotionState, getPatrolBounds, updateClaudeMotion } from '../canvas/claudeMotion.js';

  const dispatch = createEventDispatcher();
  const claudeMood = claude.mood;
  const claudeX = claude.x;
  const claudeY = claude.y;
  const claudeDirection = claude.direction;
  const currentClaudeForm = claudeForm;
  const uiMiniPlayerExpanded = ui.miniPlayerExpanded;

  let spriteCanvas;
  let spriteCtx;
  let raf;
  let lastTime = 0;
  const pxScale = 4;
  const tripleClickWindowMs = 800;
  let hovering = false;
  let clickTimestamps = [];
  let activeFormIndex = 0;
  let formFrameIndex = 0;
  let formFrameElapsedMs = 0;
  let dragStartX = 0;
  let dragStartSpriteX = 0;
  let lastDragClientX = 0;
  let wasDragged = false;
  let spriteRoot;

  let motionState = {
    x: 0,
    y: 0,
    direction: 'left',
    mode: 'idle',
    patrolDir: -1,
    idleTime: 1000,
    frameTime: 0,
    frameIndex: 0,
    isDragging: false
  };

  function syncStores() {
    claude.x.set(motionState.x);
    claude.y.set(motionState.y);
    claude.direction.set(motionState.direction);
    claude.mode.set(motionState.mode);
    claude.targetX.set(motionState.x);
    claude.targetY.set(motionState.y);
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

  function drawGrid(grid, palette) {
    if (!spriteCtx || !grid) return;
    spriteCtx.clearRect(0, 0, 24, 24);
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < grid[y].length; x += 1) {
        const index = grid[y][x];
        if (!index) continue;
        const color = palette[index];
        if (!color || color === 'transparent') continue;
        spriteCtx.fillStyle = color;
        spriteCtx.fillRect(x + 2, y + 2, 1, 1);
      }
    }
  }

  function drawMotionFrame(frame) {
    if (!spriteCtx || !frame) return;
    spriteCtx.clearRect(0, 0, 24, 24);
    for (let y = 0; y < frame.length; y += 1) {
      for (let x = 0; x < frame[y].length; x += 1) {
        const index = frame[y][x];
        if (!index) continue;
        spriteCtx.fillStyle = MOTION_PALETTE[index];
        spriteCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  function resetFormAnimation(index = $currentClaudeForm) {
    activeFormIndex = index;
    formFrameIndex = 0;
    formFrameElapsedMs = 0;
  }

  function getAnimatedFormFrame(dtMs, formIndex) {
    if (activeFormIndex !== formIndex) {
      resetFormAnimation(formIndex);
    }

    const form = getForm(formIndex);
    const frames = form.frames;

    if (frames.length > 1) {
      formFrameElapsedMs += dtMs;
      while (formFrameElapsedMs >= frames[formFrameIndex].hold) {
        formFrameElapsedMs -= frames[formFrameIndex].hold;
        formFrameIndex = (formFrameIndex + 1) % frames.length;
      }
    }

    const currentFrame = frames[formFrameIndex];
    return {
      grid: currentFrame.grid ?? form.baseGrid,
      palette: getPaletteForForm(formIndex)
    };
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
    if (motionState.mode === 'walk') {
      drawMotionFrame(getMotionFrame('walk', motionState.frameIndex, $currentClaudeForm));
    } else {
      const renderedForm = getAnimatedFormFrame(dt * 1000, $currentClaudeForm);
      drawGrid(renderedForm.grid, renderedForm.palette);
    }
    raf = window.requestAnimationFrame(tick);
  }

  function handleSpriteClick() {
    if (wasDragged) {
      wasDragged = false;
      return;
    }

    const now = Date.now();
    clickTimestamps = [...clickTimestamps, now].filter((timestamp) => now - timestamp <= tripleClickWindowMs);
    if (clickTimestamps.length >= 3) {
      let nextFormIndex = 0;
      claudeForm.update((index) => {
        nextFormIndex = (index + 1) % FORM_NAMES.length;
        return nextFormIndex;
      });
      resetFormAnimation(nextFormIndex);
      clickTimestamps = [];
      dispatch('formchange', {
        index: nextFormIndex,
        name: getFormName(nextFormIndex)
      });
      return;
    }

    dispatch('activate');
  }

  function handlePointerMove(event) {
    const bounds = getPatrolBounds(window.innerWidth, window.innerHeight, $uiMiniPlayerExpanded);
    const delta = event.clientX - dragStartX;
    const nextX = Math.max(bounds.left, Math.min(bounds.right, dragStartSpriteX + delta));
    motionState.x = nextX;
    motionState.y = bounds.y;

    if (event.clientX < lastDragClientX) {
      motionState.direction = 'left';
    } else if (event.clientX > lastDragClientX) {
      motionState.direction = 'right';
    }
    lastDragClientX = event.clientX;
    syncStores();
  }

  function cleanupDragListeners() {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
  }

  function handlePointerUp() {
    const bounds = getPatrolBounds(window.innerWidth, window.innerHeight, $uiMiniPlayerExpanded);
    motionState.isDragging = false;
    const dragged = Math.abs(motionState.x - dragStartSpriteX) > 4;
    if (dragged) {
      wasDragged = true;
      motionState.patrolDir = motionState.x < bounds.horizon ? 1 : -1;
    }
    motionState.direction = motionState.patrolDir === -1 ? 'left' : 'right';
    motionState.mode = 'idle';
    motionState.idleTime = 1000;
    if (spriteRoot) spriteRoot.style.transition = '';
    cleanupDragListeners();
    syncStores();
  }

  function handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    dragStartX = event.clientX;
    dragStartSpriteX = motionState.x;
    lastDragClientX = event.clientX;
    motionState.mode = 'walk';
    motionState.isDragging = true;
    if (spriteRoot) spriteRoot.style.transition = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }

  function handleResize() {
    const bounds = getPatrolBounds(window.innerWidth, window.innerHeight, $uiMiniPlayerExpanded);
    motionState.x = Math.max(bounds.left, Math.min(bounds.right, motionState.x));
    motionState.y = bounds.y;
    syncStores();
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
    resetFormAnimation($currentClaudeForm);
    syncStores();
    const initialForm = getAnimatedFormFrame(0, $currentClaudeForm);
    drawGrid(initialForm.grid, initialForm.palette);
    window.addEventListener('resize', handleResize);
    raf = window.requestAnimationFrame(tick);

    return () => {
      cleanupDragListeners();
      window.removeEventListener('resize', handleResize);
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
  bind:this={spriteRoot}
  style="transform: translate3d({$claudeX}px, {$claudeY}px, 0);"
  on:pointerdown={handlePointerDown}
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
