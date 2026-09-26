<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { claude, claudeForm, ui } from '../stores/appState.js';
  import { FORM_NAMES, FORMS, getForm, getFormName, getFormSelectionFrame, getPaletteForForm } from '../canvas/claudepixForms.js';
  import { createClaudeMotionState, getPatrolBounds, updateClaudeMotion } from '../canvas/claudeMotion.js';

  const dispatch = createEventDispatcher();
  const claudeMood = claude.mood;
  const claudeDirection = claude.direction;
  const currentClaudeForm = claudeForm;
  const uiMiniPlayerExpanded = ui.miniPlayerExpanded;

  let spriteCanvas;
  let spriteCtx;
  let raf;
  let lastTime = 0;
  const pxScale = 4;
  const tripleClickWindowMs = 1200;
  let clickTimestamps = [];
  let activeFormIndex = 0;
  let formFrameIndex = 0;
  let formFrameElapsedMs = 0;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartSpriteX = 0;
  let dragStartSpriteY = 0;
  let lastDragClientX = 0;
  let wasDragged = false;
  let spriteRoot;
  let spriteX = 0;
  let spriteY = 0;
  let formMenuOpen = false;
  let reducedMotion = false;
  let pageVisible = true;
  let motionQuery;
  let previousViewport = { width: 0, height: 0 };
  let resizeFrame;
  let formMenuUp = false;
  let formMenuLeft = false;
  let motionSyncElapsedMs = 0;
  let lastPublishedMotion = null;
  let lastPaintTimestamp = 0;
  let lastDrawnGrid = null;
  let lastDrawnPalette = null;
  const targetFrameMs = 1000 / 30;
  const storeSyncIntervalMs = 100;

  let motionState = {
    x: 0,
    y: 0,
    direction: 'left',
    mode: 'idle',
    patrolDir: -1,
    idleTime: 1000,
    frameTime: 0,
    frameIndex: 0,
    isDragging: false,
    isFalling: false,
    velocityY: 0
  };
  let cachedPlayerHeight = null;
  let cachedPlayerHeightAt = 0;
  const getPlayerHeight = () => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (cachedPlayerHeight != null && now - cachedPlayerHeightAt < 250) return cachedPlayerHeight;
    cachedPlayerHeight = document.querySelector('.player-shell')?.getBoundingClientRect().height || null;
    cachedPlayerHeightAt = now;
    return cachedPlayerHeight;
  };

  function applySpriteTransform() {
    spriteX = motionState.x;
    spriteY = motionState.y;
    if (spriteRoot) {
      spriteRoot.style.transform = `translate3d(${spriteX}px, ${spriteY}px, 0)`;
    }
  }

  function syncStores({ force = true } = {}) {
    const nextMotion = {
      x: motionState.x,
      y: motionState.y,
      direction: motionState.direction,
      mode: motionState.mode,
      idleTime: motionState.idleTime,
      frameTime: motionState.frameTime,
      frameIndex: motionState.frameIndex
    };
    if (!force && lastPublishedMotion &&
      Math.abs(nextMotion.x - lastPublishedMotion.x) < 0.75 &&
      Math.abs(nextMotion.y - lastPublishedMotion.y) < 0.75 &&
      nextMotion.direction === lastPublishedMotion.direction &&
      nextMotion.mode === lastPublishedMotion.mode &&
      nextMotion.frameIndex === lastPublishedMotion.frameIndex) {
      return;
    }

    const previous = lastPublishedMotion;
    lastPublishedMotion = nextMotion;
    if (!previous || nextMotion.x !== previous.x) claude.x.set(motionState.x);
    if (!previous || nextMotion.y !== previous.y) claude.y.set(motionState.y);
    if (!previous || nextMotion.direction !== previous.direction) claude.direction.set(motionState.direction);
    if (!previous || nextMotion.mode !== previous.mode) claude.mode.set(motionState.mode);
    if (!previous || nextMotion.x !== previous.x) claude.targetX.set(motionState.x);
    if (!previous || nextMotion.y !== previous.y) claude.targetY.set(motionState.y);
    if (!previous || nextMotion.idleTime !== previous.idleTime) claude.idleTime.set(motionState.idleTime);
    if (!previous || nextMotion.frameIndex !== previous.frameIndex) claude.frameTime.set(motionState.frameTime);
    if (!previous || nextMotion.frameIndex !== previous.frameIndex) claude.frameIndex.set(motionState.frameIndex);
    if (!previous || nextMotion.x !== previous.x || nextMotion.y !== previous.y) {
      claude.bubbleAnchor.set({ x: motionState.x + 48, y: motionState.y - 12 });
    }
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
    // Frames hold for hundreds of ms; repainting an unchanged grid at 30fps is wasted work.
    if (grid === lastDrawnGrid && palette === lastDrawnPalette) return;
    lastDrawnGrid = grid;
    lastDrawnPalette = palette;
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
    const frames = Array.isArray(form.frames) && form.frames.length > 0
      ? form.frames
      : [{ hold: 900, grid: form.baseGrid }];

    if (frames.length > 1) {
      formFrameElapsedMs += dtMs;
      let guard = 0;
      while (formFrameElapsedMs >= Math.max(16, Number(frames[formFrameIndex]?.hold) || 900) && guard < frames.length) {
        formFrameElapsedMs -= Math.max(16, Number(frames[formFrameIndex]?.hold) || 900);
        formFrameIndex = (formFrameIndex + 1) % frames.length;
        guard += 1;
      }
    }

    const currentFrame = frames[formFrameIndex];
    return {
      grid: currentFrame?.grid ?? form.baseGrid,
      palette: getPaletteForForm(formIndex)
    };
  }

  function tick(timestamp) {
    raf = null;
    if (reducedMotion) {
      drawStaticForm();
      return;
    }

    const falling = motionState.isFalling;
    if (!falling && lastPaintTimestamp && timestamp - lastPaintTimestamp < targetFrameMs) {
      startAnimation();
      return;
    }
    lastPaintTimestamp = timestamp;

    const dt = Math.min(falling ? 0.032 : 0.05, (timestamp - (lastTime || timestamp)) / 1000);
    lastTime = timestamp;

    if (!formMenuOpen) {
      updateClaudeMotion(
        motionState,
        { width: window.innerWidth, height: window.innerHeight, playerExpanded: $uiMiniPlayerExpanded, playerHeight: getPlayerHeight() },
        dt
      );
    }
    applySpriteTransform();

    motionSyncElapsedMs += dt * 1000;
    if (falling || motionSyncElapsedMs >= storeSyncIntervalMs) {
      syncStores({ force: falling });
      motionSyncElapsedMs = 0;
    }
    const renderedForm = getAnimatedFormFrame(dt * 1000, $currentClaudeForm);
    drawGrid(renderedForm.grid, renderedForm.palette);
    startAnimation();
  }

  function drawStaticForm() {
    if (!spriteCtx) return;
    resetFormAnimation($currentClaudeForm);
    const form = getForm($currentClaudeForm);
    drawGrid(form.frames[0]?.grid ?? form.baseGrid, getPaletteForForm($currentClaudeForm));
  }

  function startAnimation({ resetClock = false } = {}) {
    if (pageVisible && !reducedMotion && !raf) {
      if (resetClock) {
        lastTime = 0;
      }
      raf = window.requestAnimationFrame(tick);
    }
  }

  function handleVisibilityChange() {
    pageVisible = document.visibilityState !== 'hidden';
    if (!pageVisible) {
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = null;
      }
      return;
    }

    if (reducedMotion) {
      drawStaticForm();
    } else {
      startAnimation({ resetClock: true });
    }
  }

  function handleMotionPreference(event) {
    reducedMotion = event.matches;
    if (reducedMotion) {
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = null;
      }
      drawStaticForm();
      return;
    }
    startAnimation({ resetClock: true });
  }

  function handleSpriteClick(event) {
    if (formMenuOpen) {
      formMenuOpen = false;
    }
    if (wasDragged) {
      wasDragged = false;
      return;
    }

    const now = Date.now();
    const nativeTripleClick = event?.detail >= 3;
    clickTimestamps = nativeTripleClick
      ? []
      : [...clickTimestamps, now].filter((timestamp) => now - timestamp <= tripleClickWindowMs);
    if (nativeTripleClick || clickTimestamps.length >= 3) {
      const nextFormIndex = ($currentClaudeForm + 1) % FORM_NAMES.length;
      clickTimestamps = [];
      selectForm(nextFormIndex);
      return;
    }

    dispatch('activate');
  }

  function selectForm(index) {
    const nextFormIndex = ((Number(index) || 0) % FORM_NAMES.length + FORM_NAMES.length) % FORM_NAMES.length;
    claudeForm.set(nextFormIndex);
    const selected = getFormSelectionFrame(nextFormIndex);
    activeFormIndex = nextFormIndex;
    formFrameIndex = selected.index;
    formFrameElapsedMs = 0;
    drawGrid(selected.frame.grid, getPaletteForForm(nextFormIndex));
    formMenuOpen = false;
    dispatch('formchange', {
      index: nextFormIndex,
      name: getFormName(nextFormIndex)
    });
  }

  function handleContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    clickTimestamps = [];
    formMenuUp = event.clientY > window.innerHeight - 360;
    formMenuLeft = event.clientX > window.innerWidth / 2;
    formMenuOpen = true;
  }

  function handleDocumentPointerDown(event) {
    if (formMenuOpen && !spriteRoot?.contains(event.target)) {
      formMenuOpen = false;
    }
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Escape') {
      formMenuOpen = false;
    }
  }

  function handlePointerMove(event) {
    const bounds = getPatrolBounds(window.innerWidth, window.innerHeight, $uiMiniPlayerExpanded, getPlayerHeight());
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    motionState.x = Math.max(bounds.left, Math.min(bounds.right, dragStartSpriteX + deltaX));
    motionState.y = Math.max(72, Math.min(bounds.y, dragStartSpriteY + deltaY));

    if (event.clientX < lastDragClientX) {
      motionState.direction = 'left';
    } else if (event.clientX > lastDragClientX) {
      motionState.direction = 'right';
    }
    lastDragClientX = event.clientX;
    applySpriteTransform();
    syncStores();
  }

  function cleanupDragListeners() {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
  }

  function handlePointerUp() {
    const bounds = getPatrolBounds(window.innerWidth, window.innerHeight, $uiMiniPlayerExpanded, getPlayerHeight());
    motionState.isDragging = false;
    const dragged = Math.hypot(motionState.x - dragStartSpriteX, motionState.y - dragStartSpriteY) > 4;
    if (dragged) {
      wasDragged = true;
      motionState.patrolDir = motionState.x < bounds.horizon ? 1 : -1;
    }
    motionState.direction = motionState.patrolDir === -1 ? 'left' : 'right';
    motionState.mode = 'idle';
    motionState.idleTime = 1000;
    motionState.velocityY = 0;
    motionState.isFalling = motionState.y < bounds.y;
    if (spriteRoot) spriteRoot.style.transition = 'none';
    cleanupDragListeners();
    applySpriteTransform();
    syncStores();
    startAnimation({ resetClock: true });
  }

  function handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartSpriteX = motionState.x;
    dragStartSpriteY = motionState.y;
    lastDragClientX = event.clientX;
    motionState.mode = 'idle';
    motionState.isDragging = true;
    motionState.isFalling = false;
    motionState.velocityY = 0;
    if (spriteRoot) spriteRoot.style.transition = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }

  function handleResize() {
    const previousBounds = getPatrolBounds(
      previousViewport.width || window.innerWidth,
      previousViewport.height || window.innerHeight,
      $uiMiniPlayerExpanded, getPlayerHeight()
    );
    const bounds = getPatrolBounds(window.innerWidth, window.innerHeight, $uiMiniPlayerExpanded, getPlayerHeight());
    const previousRange = previousBounds.right - previousBounds.left;
    const positionRatio = previousRange > 0 ? (motionState.x - previousBounds.left) / previousRange : 1;
    motionState.x = bounds.left + Math.max(0, Math.min(1, positionRatio)) * (bounds.right - bounds.left);
    motionState.y = motionState.isDragging || motionState.isFalling ? Math.min(motionState.y, bounds.y) : bounds.y;
    previousViewport = { width: window.innerWidth, height: window.innerHeight };
    applySpriteTransform();
    syncStores();
  }

  function scheduleResize() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      handleResize();
    });
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSpriteClick({ detail: 0 });
    }
  }

  onMount(() => {
    spriteCtx = spriteCanvas.getContext('2d', { alpha: true });
    motionState = createClaudeMotionState(window.innerWidth, window.innerHeight);
    previousViewport = { width: window.innerWidth, height: window.innerHeight };
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = motionQuery.matches;
    pageVisible = document.visibilityState !== 'hidden';
    resetFormAnimation($currentClaudeForm);
    applySpriteTransform();
    syncStores();
    drawStaticForm();
    window.addEventListener('resize', scheduleResize);
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(scheduleResize)
      : null;
    const playerShell = document.querySelector('.player-shell');
    resizeObserver?.observe(playerShell);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleDocumentKeydown);
    motionQuery.addEventListener?.('change', handleMotionPreference);
    startAnimation({ resetClock: true });

    return () => {
      cleanupDragListeners();
      window.removeEventListener('resize', scheduleResize);
      resizeObserver?.disconnect();
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleDocumentKeydown);
      motionQuery?.removeEventListener?.('change', handleMotionPreference);
      if (raf) window.cancelAnimationFrame(raf);
    };
  });

  $: {
    setModeFromMood($claudeMood);
    if (reducedMotion && spriteCtx && $currentClaudeForm >= 0) {
      drawStaticForm();
    }
  }
</script>

<div
  class="claude-sprite"
  role="button"
  aria-label="Claude"
  tabindex="0"
  bind:this={spriteRoot}
  style="transform: translate3d({spriteX}px, {spriteY}px, 0);"
  on:pointerdown={handlePointerDown}
  on:click={handleSpriteClick}
  on:contextmenu={handleContextMenu}
  on:keydown={handleKeyDown}>
  <canvas
    bind:this={spriteCanvas}
    width="24"
    height="24"
    style="width: {24 * pxScale}px; height: {24 * pxScale}px; image-rendering: pixelated; display: block; transform: scaleX({$claudeDirection === 'left' ? 1 : -1});"
  ></canvas>

  {#if formMenuOpen}
    <div class="form-menu" class:menu-left={formMenuLeft} class:menu-up={formMenuUp} role="menu" aria-label="Claude forms">
      <div class="form-menu-title">CLAUDE FORM</div>
      <div class="form-grid">
        {#each FORM_NAMES as name, index}
          <button
            type="button"
            role="menuitem"
            class:selected={index === $currentClaudeForm}
            aria-label={`${name} (${FORMS[index].id})`}
            title={FORMS[index].name}
            on:pointerdown|stopPropagation
            on:click|stopPropagation={() => selectForm(index)}
          >
            {name}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .claude-sprite {
    position: absolute;
    width: 96px;
    height: 96px;
    z-index: 15;
    cursor: pointer;
    transition: none;
    will-change: transform;
    pointer-events: auto;
    touch-action: none;
    user-select: none;
    outline: none;
  }

  .claude-sprite:focus:not(:focus-visible) {
    outline: none;
  }

  .claude-sprite:focus-visible {
    outline: none;
    box-shadow: none;
  }

  .form-menu {
    position: absolute;
    left: 100px;
    top: -8px;
    width: 224px;
    padding: 8px;
    border: 1px solid rgba(212, 165, 116, 0.34);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.96);
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.42);
    z-index: 40;
    animation: form-menu-in 120ms ease;
  }

  .form-menu.menu-left {
    left: auto;
    right: 100px;
  }

  .form-menu.menu-up {
    top: auto;
    bottom: 100px;
  }

  .form-menu-title {
    padding: 2px 4px 7px;
    color: rgba(232, 224, 216, 0.72);
    font: 10px/1 'IBM Plex Mono', monospace;
    letter-spacing: 0.05em;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 5px;
  }

  .form-grid button {
    min-width: 0;
    min-height: 36px;
    padding: 5px 6px;
    border: 1px solid rgba(212, 165, 116, 0.2);
    border-radius: 8px;
    background: rgba(12, 15, 18, 0.72);
    color: #e8e0d8;
    font: 11px/1.15 'IBM Plex Mono', monospace;
    text-align: left;
    cursor: pointer;
  }

  .form-grid button:hover,
  .form-grid button:focus-visible,
  .form-grid button.selected {
    border-color: rgba(212, 165, 116, 0.54);
    background: rgba(212, 165, 116, 0.14);
    outline: none;
  }

  @keyframes form-menu-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .form-menu {
      left: 0;
      right: auto;
      top: 100px;
      width: min(224px, calc(100vw - 24px));
    }

    .form-menu.menu-up {
      top: auto;
      bottom: 100px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .claude-sprite {
      transition: none;
    }
  }
</style>
