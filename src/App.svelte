<script>
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import AmbientHeader from './components/AmbientHeader.svelte';
  import MiniPlayer from './components/MiniPlayer.svelte';
  import ClaudeBubble from './components/ClaudeBubble.svelte';
  import ClaudeChatPanel from './components/ClaudeChatPanel.svelte';
  import KeyboardHint from './components/KeyboardHint.svelte';
  import AsciiBackground from './components/AsciiBackground.svelte';
  import ClaudeSprite from './components/ClaudeSprite.svelte';
  import { PLAYLIST } from './audio/YouTubePlayer.js';
  import { hasStarted, uiMode, player, rain, scene, timer, claude, ui } from './stores/appState.js';
  import { bridgeClient } from './bridge/bridgeClient.js';
  import { connectionStatus } from './stores/bridgeState.js';
  import { setupKeyboardShortcuts } from './utils/keyboard.js';
  import { createSessionController } from './utils/session.js';
  import { createAudioInitializer } from './utils/audioInit.js';
  import { createClaudeOrchestrator } from './utils/claudeOrch.js';

  const PERSIST_KEY = 'lofi-claude-phase4-state';
  const SCENE_NAME_MAP = {
    lofiNight: 'Lofi Night',
    softRain: 'Soft Rain',
    starDrift: 'Star Drift'
  };
  const SCENE_ORDER = ['lofiNight', 'softRain', 'starDrift'];

  const currentTrackIndex = player.currentTrackIndex;
  const currentTrackTitle = player.currentTrackTitle;
  const playerIsPlaying = player.isPlaying;
  const rainVolume = rain.volume;
  const rainType = rain.type;
  const rainMuted = rain.muted;
  const currentScene = scene.current;
  const sceneLocked = scene.locked;
  const claudeMode = claude.mode;
  const timerActive = timer.active;
  const timerRemainingSeconds = timer.remainingSeconds;
  const shortcutVisible = ui.shortcutVisible;
  const claudeBubbleAnchor = claude.bubbleAnchor;

  let suppressPersist = false;
  let unsubscribePersist = [];
  let unsubscribeScene;
  let teardownKeyboard = () => {};
  let lastNonZeroRainVolume = 60;

  let claudeBubbleVisible = false;
  let claudeBubblePassive = false;
  let claudeBubbleMessage = '今天想做点什么呢？';
  let claudePanelOpen = false;
  let claudeLoading = false;
  let claudeCanReconnect = false;
  let claudeHistory = [];

  const audio = createAudioInitializer({
    mountId: 'youtube-player-host',
    getCurrentTrackIndex: () => $currentTrackIndex,
    getRainType: () => $rainType,
    getRainMuted: () => $rainMuted,
    getRainVolume: () => $rainVolume,
    onLoading: (loading) => player.isLoading.set(loading),
    onError: (error) => player.error.set(error)
  });

  const claudeOrch = createClaudeOrchestrator({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? '',
    getChatContext: () => ({
      trackName: $currentTrackTitle,
      sceneName: getSceneName($currentScene),
      rainVolume: $rainVolume
    }),
    onMood: (mood) => claude.mood.set(mood),
    onBubbleVisible: (visible) => claude.bubbleVisible.set(visible),
    onPanelVisible: (open) => claude.chatOpen.set(open)
  });

  const session = createSessionController({
    getHasStarted: () => $hasStarted,
    getTimerActive: () => $timerActive,
    getTimerRemainingSeconds: () => $timerRemainingSeconds,
    onSetTimerRemaining: (seconds) => timer.remainingSeconds.set(seconds),
    onTimerFinished: handleTimerFinished,
    onIdleStart: (idleSince) => {
      ui.idleSince.set(idleSince);
      uiMode.set('focus');
    },
    onIdleEnd: () => {
      ui.idleSince.set(null);
      if ($hasStarted) {
        uiMode.set('default');
      }
    },
    isSceneLocked: () => $sceneLocked,
    onSceneRotate: rotateScene
  });

  function refreshClaudeState() {
    const state = claudeOrch.getState();
    claudeBubbleVisible = state.bubbleVisible;
    claudeBubblePassive = state.bubblePassive;
    claudeBubbleMessage = state.bubbleMessage;
    claudePanelOpen = state.panelOpen;
    claudeLoading = state.loading;
    claudeCanReconnect = state.canReconnect;
    claudeHistory = state.history;
  }

  function setActivityState() {
    session.markActivity();
  }

  function closeClaudeBubble() {
    claudeOrch.closeBubble();
    refreshClaudeState();
  }

  function closeClaudePanel() {
    claudeOrch.closePanel();
    refreshClaudeState();
  }

  function handleClaudeFormChange(event) {
    const formName = event.detail?.name ?? '新形态';
    claudeOrch.showTransientBubble(`切换形态：${formName}`, 2000);
    refreshClaudeState();
  }

  async function handleClaudeActivate() {
    setActivityState();
    await claudeOrch.handleClick();
    refreshClaudeState();
  }

  function closeTransientUi() {
    ui.scenePopoverOpen.set(false);
    ui.timerPopoverOpen.set(false);
    ui.rainPopoverOpen.set(false);
    ui.miniPlayerExpanded.set(false);
    closeClaudeBubble();
    closeClaudePanel();
  }

  function getStoreValue(store) {
    let value;
    const unsubscribe = store.subscribe((nextValue) => {
      value = nextValue;
    });
    unsubscribe();
    return value;
  }

  function normalizeTrackTitle(index) {
    const track = PLAYLIST[((index % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length];
    return track?.name ?? 'lofi hip hop radio - beats';
  }

  function normalizeTrackIndex(index) {
    return ((index % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
  }

  function persistState() {
    if (suppressPersist || typeof window === 'undefined') {
      return;
    }

    const snapshot = {
      lastTrackIndex: getStoreValue(player.currentTrackIndex),
      rainVolume: getStoreValue(rain.volume),
      rainType: getStoreValue(rain.type),
      currentScene: getStoreValue(scene.current),
      sceneLocked: getStoreValue(scene.locked)
    };

    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(snapshot));
  }

  function restoreState() {
    if (typeof window === 'undefined') {
      return;
    }

    suppressPersist = true;

    const stored = window.localStorage.getItem(PERSIST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        const restoredTrackIndex = normalizeTrackIndex(Number(parsed.lastTrackIndex ?? 0));
        const restoredRainVolume = Math.max(0, Math.min(100, Number(parsed.rainVolume ?? 60)));
        const restoredRainType = ['light', 'medium', 'heavy'].includes(parsed.rainType) ? parsed.rainType : 'medium';
        const restoredScene = ['lofiNight', 'softRain', 'starDrift'].includes(parsed.currentScene)
          ? parsed.currentScene
          : 'lofiNight';

        player.currentTrackIndex.set(restoredTrackIndex);
        player.currentTrackTitle.set(normalizeTrackTitle(restoredTrackIndex));
        rain.volume.set(restoredRainVolume);
        rain.muted.set(restoredRainVolume === 0);
        rain.type.set(restoredRainType);
        scene.current.set(restoredScene);
        scene.locked.set(Boolean(parsed.sceneLocked));

        if (restoredRainVolume > 0) {
          lastNonZeroRainVolume = restoredRainVolume;
        }
      } catch {
        // Ignore invalid stored JSON and continue with defaults.
      }
    }

    suppressPersist = false;
  }

  async function startExperience() {
    hasStarted.set(true);
    uiMode.set('default');
    claude.mood.set(get(connectionStatus) === 'connected' ? 'idle' : 'sleep');
    setActivityState();
    await audio.initAudio(true);
    if (get(connectionStatus) !== 'connected') {
      claudeOrch.showTransientBubble('Start the local bridge to wake me up', 2800);
      refreshClaudeState();
    }
  }

  async function togglePlayback() {
    if (!$hasStarted) {
      await startExperience();
      return;
    }

    if (!$playerIsPlaying) {
      await audio.initAudio(true);
      return;
    }

    const { youtubePlayer } = audio.getPlayers();
    youtubePlayer?.pause();
  }

  async function selectTrack(index) {
    const normalizedIndex = normalizeTrackIndex(index);
    player.currentTrackIndex.set(normalizedIndex);
    player.currentTrackTitle.set(normalizeTrackTitle(normalizedIndex));

    if (!$hasStarted) {
      await startExperience();
    }

    await audio.initAudio(false);

    const { youtubePlayer } = audio.getPlayers();
    if (youtubePlayer) {
      youtubePlayer.loadTrack(index);
      youtubePlayer.play();
      await claudeOrch.showAmbientComment('trackChange', true);
      refreshClaudeState();
    }
  }

  async function playNextTrack() {
    await selectTrack($currentTrackIndex + 1);
  }

  async function playPreviousTrack() {
    await selectTrack($currentTrackIndex - 1);
  }

  function setRainVolume(nextVolume) {
    const clamped = Math.max(0, Math.min(100, Math.round(nextVolume)));

    if (clamped > 0) {
      lastNonZeroRainVolume = clamped;
    }

    rain.volume.set(clamped);
    rain.muted.set(clamped === 0);
    const { rainPlayer } = audio.getPlayers();
    rainPlayer?.setVolume(clamped);
  }

  function setRainType(type) {
    rain.type.set(type);
    const { rainPlayer } = audio.getPlayers();
    rainPlayer?.loadType(type);
  }

  function toggleRainMute() {
    if ($rainVolume === 0) {
      setRainVolume(lastNonZeroRainVolume || 60);
      return;
    }

    lastNonZeroRainVolume = $rainVolume;
    setRainVolume(0);
  }

  function getSceneName(key) {
    return SCENE_NAME_MAP[key] ?? 'Lofi Night';
  }

  function rotateScene() {
    if ($sceneLocked) {
      return;
    }

    const currentIndex = SCENE_ORDER.indexOf($currentScene);
    const nextScene = SCENE_ORDER[(currentIndex + 1) % SCENE_ORDER.length];
    scene.current.set(nextScene);
    claudeOrch.showAmbientComment('trackChange', true).then(refreshClaudeState);
  }

  function selectTimer(minutes) {
    if (minutes === null) {
      timer.active.set(false);
      timer.remainingSeconds.set(0);
      return;
    }

    timer.active.set(true);
    timer.minutes.set(minutes);
    timer.remainingSeconds.set(minutes * 60);
  }

  function handleTimerFinished() {
    timer.active.set(false);
    timer.remainingSeconds.set(0);
    claude.mood.set('sleep');

    const { youtubePlayer, rainPlayer } = audio.getPlayers();
    youtubePlayer?.pause();
    rainPlayer?.fadeOut(4000);

    claudeOrch.showAmbientComment('timerEnding', true).then(refreshClaudeState);
  }

  async function sendClaudeMessage(text) {
    await claudeOrch.sendMessage(text);
    refreshClaudeState();
  }

  function reconnectClaudeBridge() {
    claudeOrch.reconnectBridge();
    refreshClaudeState();
  }

  function startIdleTimer() {
    session.start();
  }

  function startSceneRotation() {
    session.resetSceneRotation();
  }

  onMount(() => {
    restoreState();
    claudeOrch.attachBridge(bridgeClient);
    refreshClaudeState();

    teardownKeyboard = setupKeyboardShortcuts({
      onActivity: setActivityState,
      onEscape: closeTransientUi,
      onTogglePlayback: togglePlayback,
      onPreviousTrack: playPreviousTrack,
      onNextTrack: playNextTrack,
      getRainVolume: () => $rainVolume,
      onSetRainVolume: setRainVolume,
      onToggleRainMute: toggleRainMute,
      onToggleTimerPopover: () => {
        ui.timerPopoverOpen.update((open) => !open);
        ui.scenePopoverOpen.set(false);
      },
      onToggleShortcutHint: () => ui.shortcutVisible.update((visible) => !visible),
      isSceneLocked: () => $sceneLocked,
      onSceneHotkey: (key) => scene.current.set(key)
    });

    if (typeof window !== 'undefined') {
      unsubscribePersist = [
        player.currentTrackIndex,
        rain.volume,
        rain.type,
        scene.current,
        scene.locked
      ].map((store) =>
        store.subscribe(() => {
          persistState();
        })
      );

      unsubscribeScene = scene.current.subscribe(() => {
        session.resetSceneRotation();
      });
    }

    if ($rainVolume > 0) {
      lastNonZeroRainVolume = $rainVolume;
    }

    startIdleTimer();
    startSceneRotation();

    return () => {
      session.stop();
      teardownKeyboard();
      unsubscribePersist.forEach((unsubscribe) => unsubscribe());
      unsubscribePersist = [];
      unsubscribeScene?.();
      audio.destroy();
    };
  });
</script>

<main class="app-shell" aria-label="LoFiClaude phase four shell">
  <section class="canvas-zone" aria-label="Canvas scene" on:mousemove={setActivityState}>
    <AsciiBackground scene={$currentScene} rainVolume={$rainVolume} working={$claudeMode === 'working'} />
    <ClaudeSprite on:activate={handleClaudeActivate} on:formchange={handleClaudeFormChange} />

    {#if !$hasStarted}
      <div class="empty-state" aria-live="polite">
        <p class="empty-state-text">Claude is asleep until bridge connects</p>
        <button type="button" class="start-overlay" on:click={startExperience}>
          Start room
        </button>
      </div>
    {/if}
  </section>

  <AmbientHeader />

  <MiniPlayer
    onTogglePlay={togglePlayback}
    onPreviousTrack={playPreviousTrack}
    onNextTrack={playNextTrack}
    onSetRainType={setRainType}
    onSetRainVolume={setRainVolume}
    onSelectTimer={selectTimer}
    onMarkActivity={setActivityState}
  />

  <KeyboardHint visible={$shortcutVisible} />

  {#if claudeBubbleVisible}
    <ClaudeBubble
      message={claudeBubbleMessage}
      anchor={$claudeBubbleAnchor}
      passive={claudeBubblePassive}
      loading={claudeLoading}
      on:close={closeClaudeBubble}
      on:send={(event) => sendClaudeMessage(event.detail.text)}
    />
  {/if}

  {#if claudePanelOpen}
    <ClaudeChatPanel
      sceneName={getSceneName($currentScene)}
      messages={claudeHistory}
      loading={claudeLoading}
      canReconnect={claudeCanReconnect}
      on:close={closeClaudePanel}
      on:send={(event) => sendClaudeMessage(event.detail.text)}
      on:reconnect={reconnectClaudeBridge}
    />
  {/if}

  <div id="youtube-player-host" class="youtube-host" aria-hidden="true"></div>
</main>

<style>
  .youtube-host {
    position: fixed;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    left: -9999px;
    top: -9999px;
  }

  .empty-state {
    position: absolute;
    inset: 0;
    z-index: 7;
    display: grid;
    place-items: center;
    pointer-events: none;
  }

  .empty-state-text {
    margin: 0;
    padding-bottom: 92px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: rgba(231, 219, 202, 0.82);
    letter-spacing: 0.02em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  }

  .start-overlay {
    pointer-events: auto;
  }
</style>
