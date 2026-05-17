<script>
  import { scene } from '../stores/appState.js';

  const currentScene = scene.current;

  const SCENE_BG_MAP = {
    lofiNight: '/backgrounds/lofi-night.png',
    softRain: '/backgrounds/soft-rain.png',
    starDrift: '/backgrounds/star-drift.png'
  };

  let activeScene = 'lofiNight';
  let previousScene = null;
  let fadeTimer;

  $: nextScene = $currentScene && SCENE_BG_MAP[$currentScene] ? $currentScene : 'lofiNight';
  $: if (nextScene !== activeScene) {
    previousScene = activeScene;
    activeScene = nextScene;
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      previousScene = null;
    }, 1000);
  }

  function backgroundStyle(sceneKey) {
    return `background-image: url(${SCENE_BG_MAP[sceneKey]});`;
  }
</script>

<div class="static-bg" aria-hidden="true">
  {#if previousScene}
    <div class="bg-layer bg-old" style={backgroundStyle(previousScene)}></div>
  {/if}
  <div class="bg-layer bg-new" style={backgroundStyle(activeScene)}></div>
  <div class="dark-overlay"></div>
</div>

<style>
  .static-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
    background: linear-gradient(180deg, #06090d 0%, #090d12 100%);
  }

  .bg-layer {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  .bg-old {
    opacity: 1;
  }

  .bg-new {
    opacity: 0;
    animation: fade-in 1s ease forwards;
  }

  .dark-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.5));
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
