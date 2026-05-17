<script>
  import { onMount } from 'svelte';
  import { drawStaticScene } from '../canvas/asciiRenderer.js';
  import { getSceneDefinition } from '../canvas/asciiScenes.js';
  import { createAmbientParticles, updateAmbientParticles, drawAmbientParticles } from '../canvas/ambientParticles.js';

  export let scene = 'lofiNight';
  export let rainVolume = 60;

  let canvas;
  let ctx;
  let staticCanvas;
  let staticCtx;
  let animationFrame;
  let width = 0;
  let height = 0;
  let particles = [];
  let lastTime = 0;
  let cachedScene = '';

  function rebuildStatic() {
    if (!ctx || !staticCtx || width === 0 || height === 0) return;
    drawStaticScene(staticCtx, getSceneDefinition(scene), width, height);
    particles = createAmbientParticles(scene, width, height);
    cachedScene = scene;
  }

  function resize() {
    if (!canvas || !staticCanvas) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = width;
    canvas.height = height;
    staticCanvas.width = width;
    staticCanvas.height = height;
    rebuildStatic();
  }

  function loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - (lastTime || timestamp)) / 1000);
    lastTime = timestamp;

    if (scene !== cachedScene) {
      rebuildStatic();
    }

    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(staticCanvas, 0, 0);
      updateAmbientParticles(particles, dt * (rainVolume > 0 ? 1 : 0.55), width, height);
      drawAmbientParticles(ctx, particles);
    }

    animationFrame = window.requestAnimationFrame(loop);
  }

  onMount(() => {
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    staticCanvas = document.createElement('canvas');
    staticCtx = staticCanvas.getContext('2d', { alpha: true });

    resize();
    window.addEventListener('resize', resize);
    animationFrame = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  });
</script>

<canvas bind:this={canvas} class="ascii-background" aria-label="ASCII animated background"></canvas>

<style>
  .ascii-background {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
    pointer-events: none;
    z-index: 0;
  }
</style>
