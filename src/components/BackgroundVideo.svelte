<script>
  import { createEventDispatcher } from 'svelte';

  export let scene;

  const dispatch = createEventDispatcher();

  const SCENE_QUERY_MAP = {
    lofiNight: 'lofi room night cozy animation',
    softRain: 'rainy night window city',
    starDrift: 'night sky stars timelapse'
  };

  const SCENE_LOCAL_MAP = {
    lofiNight: '/backgrounds/lofi-room.mp4',
    softRain: '/backgrounds/rain-city.mp4',
    starDrift: '/backgrounds/dotted-space.mp4'
  };

  const currentScene = scene.current;
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY ?? '';

  let videoSrc = '';
  let mode = 'none';
  let loading = false;
  let loadToken = 0;
  let sceneKey = 'lofiNight';

  $: sceneKey = $currentScene;
  $: if (sceneKey) {
    resolveVideo(sceneKey);
  }

  async function resolveVideo(sceneKey) {
    const token = ++loadToken;
    loading = true;

    const pexelsUrl = apiKey ? await fetchPexelsVideo(sceneKey) : '';
    if (token !== loadToken) {
      return;
    }

    if (pexelsUrl) {
      mode = 'pexels';
      videoSrc = pexelsUrl;
      loading = false;
      dispatch('fallback', { fallbackToCanvas: false, mode: 'pexels' });
      return;
    }

    mode = 'local';
    videoSrc = SCENE_LOCAL_MAP[sceneKey] ?? SCENE_LOCAL_MAP.lofiNight;
    loading = false;
  }

  async function fetchPexelsVideo(sceneKey) {
    try {
      const query = encodeURIComponent(SCENE_QUERY_MAP[sceneKey] ?? SCENE_QUERY_MAP.lofiNight);
      const response = await fetch(`https://api.pexels.com/videos/search?query=${query}&per_page=1`, {
        headers: {
          Authorization: apiKey
        }
      });

      if (!response.ok) {
        return '';
      }

      const payload = await response.json();
      const files = payload?.videos?.[0]?.video_files ?? [];
      const selected = files.find((file) => file?.quality === 'hd' && file?.file_type === 'video/mp4')
        ?? files.find((file) => file?.quality === 'sd' && file?.file_type === 'video/mp4')
        ?? files.find((file) => file?.file_type === 'video/mp4');

      return selected?.link ?? '';
    } catch {
      return '';
    }
  }

  function handleVideoError() {
    if (mode === 'pexels') {
      mode = 'local';
      videoSrc = SCENE_LOCAL_MAP[sceneKey] ?? SCENE_LOCAL_MAP.lofiNight;
      return;
    }

    if (mode === 'local') {
      mode = 'none';
      videoSrc = '';
      dispatch('fallback', { fallbackToCanvas: true, mode: 'canvas' });
    }
  }

  function handleCanPlay() {
    dispatch('fallback', { fallbackToCanvas: false, mode });
  }
</script>

<div class="background-video-layer" aria-hidden="true">
  {#if videoSrc}
    {#key videoSrc}
      <video
        class="background-video"
        autoplay
        muted
        loop
        playsinline
        preload="metadata"
        on:error={handleVideoError}
        on:canplay={handleCanPlay}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    {/key}
  {/if}

  <div class="background-overlay"></div>

  {#if loading}
    <div class="background-loading"></div>
  {/if}
</div>

<style>
  .background-video-layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
    background: linear-gradient(180deg, #06090d 0%, #090d12 100%);
  }

  .background-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.55) contrast(0.95);
  }

  .background-overlay {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 70% 15%, rgba(212, 165, 116, 0.12), transparent 40%),
      linear-gradient(180deg, rgba(4, 6, 8, 0.24) 0%, rgba(7, 10, 14, 0.55) 100%);
  }

  .background-loading {
    position: absolute;
    inset: 0;
    background: rgba(8, 10, 12, 0.35);
  }
</style>
