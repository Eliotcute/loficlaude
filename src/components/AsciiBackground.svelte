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
  let particleCanvas;
  let particleCtx;
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
  let reducedMotion = false;
  let pageVisible = true;
  let motionQuery;
  let resizeFrame;
  let resizeObserver;
  let lastPaintTimestamp = 0;
  const targetFrameMs = 1000 / 30;
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
    if (!canvas || !particleCanvas || !staticCanvas) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = width;
    canvas.height = height;
    particleCanvas.width = width;
    particleCanvas.height = height;
    staticCanvas.width = width;
    staticCanvas.height = height;
    rebuildStatic();
    if (reducedMotion) {
      drawReducedFrame();
    }
  }

  function scheduleResize() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      resize();
    });
  }

  function drawReducedFrame() {
    if (!ctx || !particleCtx || !staticCanvas) return;
    if (scene !== activeScene) {
      rebuildStatic();
    }
    ctx.drawImage(staticCanvas, 0, 0);
    particleCtx.clearRect(0, 0, width, height);
    drawAmbientParticles(particleCtx, particles);
  }

  function startAnimation({ resetClock = false } = {}) {
    if (pageVisible && !reducedMotion && !animationFrame) {
      if (resetClock) {
        lastTime = 0;
      }
      animationFrame = window.requestAnimationFrame(loop);
    }
  }

  function handleVisibilityChange() {
    pageVisible = document.visibilityState !== 'hidden';
    if (!pageVisible) {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      return;
    }

    if (reducedMotion) {
      drawReducedFrame();
    } else {
      startAnimation({ resetClock: true });
    }
  }

  function handleMotionPreference(event) {
    reducedMotion = event.matches;
    if (reducedMotion) {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      drawReducedFrame();
      return;
    }
    // Keep the frame clock continuous so rain, stars, and meteors advance.
    startAnimation();
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
    animationFrame = null;
    if (reducedMotion) {
      drawReducedFrame();
      return;
    }

    if (lastPaintTimestamp && timestamp - lastPaintTimestamp < targetFrameMs) {
      startAnimation();
      return;
    }
    lastPaintTimestamp = timestamp;

    const dt = Math.min(0.05, (timestamp - (lastTime || timestamp)) / 1000);
    lastTime = timestamp;

    if (scene !== activeScene) {
      if (activeScene === '') {
        rebuildStatic();
      } else {
        prepareCrossfade(scene);
      }
    }

    if (ctx && particleCtx) {
      const hasTransition = transitionStart > 0 && previousStaticCanvas;
      const progress = hasTransition
        ? Math.min(1, (timestamp - transitionStart) / transitionDuration)
        : 1;
      const ambientFactor = dt * (rainVolume > 0 ? 1 : 0.55);

      // The static scene is opaque, so normal frames do not need a full-surface clear.
      particleCtx.clearRect(0, 0, width, height);
      if (hasTransition && progress < 1) {
        ctx.clearRect(0, 0, width, height);
      }

      if (hasTransition && progress < 1) {
        updateAmbientParticles(previousParticles, ambientFactor, width, height);
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(previousStaticCanvas, 0, 0);
        particleCtx.globalAlpha = 1 - progress;
        drawAmbientParticles(particleCtx, previousParticles);
      }

      updateAmbientParticles(particles, ambientFactor, width, height);
      ctx.globalAlpha = progress;
      ctx.drawImage(staticCanvas, 0, 0);
      particleCtx.globalAlpha = progress;
      drawAmbientParticles(particleCtx, particles);
      ctx.globalAlpha = 1;
      particleCtx.globalAlpha = 1;

      if (hasTransition && progress >= 1) {
        previousStaticCanvas = null;
        previousParticles = [];
        transitionStart = 0;
      }
    }

    startAnimation();
  }

  onMount(() => {
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    particleCtx = particleCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }
    if (particleCtx) {
      particleCtx.imageSmoothingEnabled = false;
    }
    staticCanvas = document.createElement('canvas');
    staticCtx = staticCanvas.getContext('2d', { alpha: true });
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = motionQuery.matches;
    pageVisible = document.visibilityState !== 'hidden';

    resize();
    window.addEventListener('resize', scheduleResize);
    resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(scheduleResize)
      : null;
    resizeObserver?.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    motionQuery.addEventListener?.('change', handleMotionPreference);
    startAnimation();

    return () => {
      window.removeEventListener('resize', scheduleResize);
      resizeObserver?.disconnect();
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      motionQuery?.removeEventListener?.('change', handleMotionPreference);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  });

  $: if (reducedMotion && ctx && scene !== activeScene) {
    drawReducedFrame();
  }
</script>

<div class="ascii-stage" class:working aria-label="ASCII animated background">
  <canvas bind:this={canvas} class="ascii-background"></canvas>
  <canvas bind:this={particleCanvas} class="ascii-particles" aria-hidden="true"></canvas>
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
    filter: brightness(1.12) saturate(1.08);
  }

  .ascii-particles {
    position: absolute;
    top: 0;
    left: -5%;
    width: 110%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
    pointer-events: none;
  }

  .working .ascii-background {
    filter: brightness(1.08) saturate(1.1);
  }

  @media (prefers-reduced-motion: reduce) {
    .ascii-background,
    .ascii-particles {
      transform: none;
      transition: none;
    }
  }
</style>
