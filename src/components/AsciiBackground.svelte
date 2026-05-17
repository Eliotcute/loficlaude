<script>
  import { onMount } from 'svelte';
  import { drawStaticScene } from '../canvas/asciiRenderer.js';
  import { getSceneDefinition } from '../canvas/asciiScenes.js';
  import { createAmbientParticles, updateAmbientParticles, drawAmbientParticles } from '../canvas/ambientParticles.js';

  export let scene = 'lofiNight';
  export let rainVolume = 60;
  export let working = false;

  let canvas;
  let ctx;
  let staticCanvas;
  let staticCtx;
  let animationFrame;
  let width = 0;
  let height = 0;
  let particles = [];
  let lastTime = 0;
  let activeScene = '';
  let previousStaticCanvas = null;
  let previousParticles = [];
  let transitionStart = 0;
  const transitionDuration = 1000;

  function drawSceneTo(canvasTarget, sceneKey) {
    if (!ctx || !staticCtx || width === 0 || height === 0) return;
    const targetCtx = canvasTarget.getContext('2d', { alpha: true });
    if (!targetCtx) return;
    canvasTarget.width = width;
    canvasTarget.height = height;
    drawStaticScene(targetCtx, getSceneDefinition(sceneKey), width, height);
  }

  function rebuildStatic() {
    if (!ctx || !staticCtx || width === 0 || height === 0) return;
    drawSceneTo(staticCanvas, scene);
    particles = createAmbientParticles(scene, width, height);
    activeScene = scene;
    previousStaticCanvas = null;
    previousParticles = [];
    transitionStart = 0;
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

  function prepareCrossfade(nextScene) {
    if (!staticCanvas || activeScene === '' || nextScene === activeScene) return;

    previousStaticCanvas = document.createElement('canvas');
    drawSceneTo(previousStaticCanvas, activeScene);
    previousParticles = particles.map((particle) => ({ ...particle }));

    drawSceneTo(staticCanvas, nextScene);
    particles = createAmbientParticles(nextScene, width, height);
    activeScene = nextScene;
    transitionStart = performance.now();
  }

  function loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - (lastTime || timestamp)) / 1000);
    lastTime = timestamp;

    if (scene !== activeScene) {
      if (activeScene === '') {
        rebuildStatic();
      } else {
        prepareCrossfade(scene);
      }
    }

    if (ctx) {
      ctx.clearRect(0, 0, width, height);

      const hasTransition = transitionStart > 0 && previousStaticCanvas;
      const progress = hasTransition
        ? Math.min(1, (timestamp - transitionStart) / transitionDuration)
        : 1;
      const ambientFactor = dt * (rainVolume > 0 ? 1 : 0.55);

      if (hasTransition && progress < 1) {
        updateAmbientParticles(previousParticles, ambientFactor, width, height);
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(previousStaticCanvas, 0, 0);
        drawAmbientParticles(ctx, previousParticles);
      }

      updateAmbientParticles(particles, ambientFactor, width, height);
      ctx.globalAlpha = progress;
      ctx.drawImage(staticCanvas, 0, 0);
      drawAmbientParticles(ctx, particles);
      ctx.globalAlpha = 1;

      if (hasTransition && progress >= 1) {
        previousStaticCanvas = null;
        previousParticles = [];
        transitionStart = 0;
      }
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

<div class="ascii-stage" class:working aria-label="ASCII animated background">
  <canvas bind:this={canvas} class="ascii-background"></canvas>
</div>

<style>
  .ascii-stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;
  }

  .ascii-background {
    position: absolute;
    top: 0;
    left: -5%;
    width: 110%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
    pointer-events: none;
    animation: pan-x 25s ease-in-out infinite alternate;
    will-change: transform;
  }

  @keyframes pan-x {
    0% {
      transform: translate3d(0%, 0, 0);
    }
    100% {
      transform: translate3d(8%, 0, 0);
    }
  }

  .working .ascii-background {
    filter: brightness(1.08) saturate(1.1);
    transition: filter 0.5s ease;
  }
</style>
