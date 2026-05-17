<script>
  import { onMount, onDestroy } from 'svelte';
  import { claude, rain } from '../stores/appState.js';
  import { ClaudeSprite } from './ClaudeSprite.js';

  const claudeMood = claude.mood;
  const rainVolume = rain.volume;

  export let started = false;

  const FRAME_MS = 1000 / 15;
  const LOGICAL_WIDTH = 320;
  const LOGICAL_HEIGHT = 180;

  let canvas;
  let ctx;
  let animationFrame = null;
  let lastTimestamp = 0;
  let accumulator = 0;

  const claudeSprite = new ClaudeSprite();
  const stars = [];
  const drops = [];

  $: if ($claudeMood) {
    if ($claudeMood === 'jump') {
      claudeSprite.triggerJump();
    } else {
      claudeSprite.setState($claudeMood);
    }
  }

  function targetDropCount() {
    const normalized = Math.max(0, Math.min(100, $rainVolume));
    return Math.round((normalized / 100) * 40);
  }

  function initParticles() {
    stars.length = 0;
    for (let i = 0; i < 30; i += 1) {
      stars.push(createStar(true));
    }

    drops.length = 0;
    syncDropCount(true);
  }

  function createStar(seed = false) {
    return {
      x: Math.random() * LOGICAL_WIDTH,
      y: Math.random() * LOGICAL_HEIGHT,
      size: Math.random() < 0.7 ? 1 : 2,
      twinkleSpeed: 1.2 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      alpha: seed ? 0.35 + Math.random() * 0.5 : 0.2
    };
  }

  function createDrop() {
    return {
      x: Math.random() * LOGICAL_WIDTH,
      y: Math.random() * LOGICAL_HEIGHT,
      len: 8 + Math.random() * 10,
      speed: 70 + Math.random() * 80,
      alpha: 0.28 + Math.random() * 0.28
    };
  }

  function syncDropCount(seed = false) {
    const count = targetDropCount();

    while (drops.length < count) {
      const drop = createDrop();
      if (seed) {
        drop.y = Math.random() * LOGICAL_HEIGHT;
      }
      drops.push(drop);
    }

    if (drops.length > count) {
      drops.length = count;
    }
  }

  function resizeCanvas() {
    canvas.width = LOGICAL_WIDTH;
    canvas.height = LOGICAL_HEIGHT;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    claudeSprite.setPosition(LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }

  function handleWindowPointerDown(event) {
    if (!canvas || !claudeSprite.containsPoint) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const logicalX = ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const logicalY = ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;

    if (claudeSprite.containsPoint(logicalX, logicalY)) {
      claudeSprite.triggerJump();
    }
  }

  export function start() {
    if (!ctx || animationFrame !== null) {
      return;
    }

    lastTimestamp = 0;
    accumulator = 0;
    animationFrame = window.requestAnimationFrame(gameLoop);
  }

  export function stop() {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function update(dt) {
    syncDropCount();

    for (const star of stars) {
      star.phase += dt * star.twinkleSpeed;
      star.alpha = 0.22 + ((Math.sin(star.phase) + 1) / 2) * 0.58;
    }

    for (const drop of drops) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * 0.03 * dt;
      if (drop.y - drop.len > LOGICAL_HEIGHT || drop.x < -10) {
        drop.x = Math.random() * LOGICAL_WIDTH;
        drop.y = -drop.len;
      }
    }

    claudeSprite.update(dt);
  }

  function render() {
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    for (const star of stars) {
      ctx.fillStyle = `rgba(232, 224, 216, ${star.alpha.toFixed(3)})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    ctx.lineCap = 'round';
    for (const drop of drops) {
      ctx.strokeStyle = `rgba(188, 214, 255, ${drop.alpha.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 2, drop.y + drop.len);
      ctx.stroke();
    }

    claudeSprite.draw(ctx);
  }

  function gameLoop(timestamp) {
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    const deltaMs = Math.min(100, timestamp - lastTimestamp);
    lastTimestamp = timestamp;
    accumulator += deltaMs;

    while (accumulator >= FRAME_MS) {
      const dt = FRAME_MS / 1000;
      update(dt);
      render();
      accumulator -= FRAME_MS;
    }

    animationFrame = window.requestAnimationFrame(gameLoop);
  }

  onMount(() => {
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    resizeCanvas();
    initParticles();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointerdown', handleWindowPointerDown);

    if (started) {
      start();
    } else {
      render();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointerdown', handleWindowPointerDown);
    };
  });

  onDestroy(() => {
    stop();
  });

  $: if (started) {
    start();
  } else {
    stop();
    if (ctx) {
      render();
    }
  }
</script>

<canvas bind:this={canvas} class="canvas-engine" aria-label="LoFiClaude particle overlay"></canvas>

<style>
  .canvas-engine {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
    image-rendering: pixelated;
  }
</style>
