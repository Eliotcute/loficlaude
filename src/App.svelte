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
  import { sceneUsesRain } from './canvas/asciiScenes.js';
  import { hasStarted, uiMode, player, rain, scene, timer, claude, ui, focus } from './stores/appState.js';
  import { bridgeClient } from './bridge/bridgeClient.js';
  import { claudeForm } from './stores/appState.js';
  import { connectionStatus } from './stores/bridgeState.js';
  import { setupKeyboardShortcuts } from './utils/keyboard.js';
  import { createSessionController } from './utils/session.js';
  import { createAudioInitializer } from './utils/audioInit.js';
  import { createClaudeOrchestrator } from './utils/claudeOrch.js';
  import {
    PERSIST_KEY,
    FOCUS_KEY,
    SCENE_ORDER,
    createFocusSnapshot,
    createStartedFocusSnapshot,
    createPersistedSnapshot,
    getSceneName,
    incrementActiveFocusMinute,
    normalizeTrackIndex,
    normalizeTrackTitle,
    parseFocusSnapshot,
    parsePersistedSnapshot,
    readStorageValue,
    writeStorageValue
  } from './utils/appPersistence.js';
  import { createSessionSummary, getStartRitualCopy } from './utils/rituals.js';
  import { emptyMusicFeedback, updateMusicFeedback } from './utils/musicFeedback.js';
  import { normalizeRecentPlaylist, readRecentPlaylist, saveRecentPlaylist } from './utils/recentPlaylist.js';

  const currentTrackIndex = player.currentTrackIndex;
  const currentTrackTitle = player.currentTrackTitle;
  const playerIsPlaying = player.isPlaying;
  const musicStatus = player.musicStatus;
  const musicProvider = player.musicProvider;
  const rainVolume = rain.volume;
  const rainType = rain.type;
  const rainMuted = rain.muted;
  const currentScene = scene.current;
  const sceneLocked = scene.locked;
  const claudeMode = claude.mode;
  const timerActive = timer.active;
  const timerRemainingSeconds = timer.remainingSeconds;
  const shortcutVisible = ui.shortcutVisible;
  const bridgeSettingsOpen = ui.bridgeSettingsOpen;
  const claudeBubbleAnchor = claude.bubbleAnchor;

  let suppressPersist = false;
  let unsubscribePersist = [];
  let unsubscribeScene;
  let unsubscribeBridgeSettings;
  let teardownKeyboard = () => {};
  let focusInterval;
  let restoredFocusSnapshot = null;
  let lastNonZeroRainVolume = 60;
  let lastActivityNotifiedAt = 0;

  let claudeBubbleVisible = false;
  let claudeBubblePassive = false;
  let claudeBubbleMessage = '今天想做点什么呢？';
  let claudeCompanionState = 'resting';
  let claudePanelOpen = false;
  let claudeLoading = false;
  let claudeCanReconnect = false;
  let claudeActiveAssistantId = null;
  let claudeHistory = [];
  let claudeSessionStatus = 'disconnected';
  let claudeBridgeStatus = 'disconnected';
  let claudeToolRunning = null;
  let claudeLastError = '';
  let musicFeedback = emptyMusicFeedback();
  let recentPlaylist = null;
  // Formal V1.1 decision: ship the lofi station with explicit rain/music states.
  // YouTube's iframe widget keeps a cross-origin postMessage polling loop alive
  // and can stall the UI on localhost (especially while the settings panel opens).
  // Keep it opt-in until the provider is explicitly selected by the user.
  const ENABLE_YOUTUBE_AUDIO = true;

  const audio = createAudioInitializer({
    enableYouTube: ENABLE_YOUTUBE_AUDIO,
    shouldUseYouTube: () => get(player.musicProvider) === 'youtube',
    mountId: 'youtube-player-host',
    getCurrentTrackIndex: () => $currentTrackIndex,
    getRainType: () => $rainType,
    getRainMuted: () => $rainMuted,
    getRainVolume: () => $rainVolume,
    onLoading: (loading) => player.isLoading.set(loading),
    onMusicStatus: (status) => player.musicStatus.set(status),
    onError: (error) => player.error.set(error),
    onRainStatus: (status) => rain.sourceStatus.set(status)
  });

  const claudeOrch = createClaudeOrchestrator({
    onMood: (mood) => claude.mood.set(mood),
    onBubbleVisible: (visible) => claude.bubbleVisible.set(visible),
    onPanelVisible: (open) => claude.chatOpen.set(open),
    onStateChange: applyClaudeState
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
      claudeOrch.markActive();
      refreshClaudeState();
    },
    isSceneLocked: () => $sceneLocked,
    onSceneRotate: rotateScene
  });

  function applyClaudeState(state) {
    claudeBubbleVisible = state.bubbleVisible;
    claudeBubblePassive = state.bubblePassive;
    claudeBubbleMessage = state.bubbleMessage;
    claudeCompanionState = state.companionState ?? 'resting';
    claudePanelOpen = state.panelOpen;
    claudeLoading = state.loading;
    claudeCanReconnect = state.canReconnect;
    claudeActiveAssistantId = state.activeAssistantId;
    claudeHistory = state.history;
    claudeSessionStatus = state.sessionStatus ?? 'disconnected';
    claudeBridgeStatus = state.bridgeStatus ?? 'disconnected';
    claudeToolRunning = state.toolRunning ?? null;
    claudeLastError = state.lastError ?? '';
  }

  function refreshClaudeState() {
    applyClaudeState(claudeOrch.getState());
  }

  let pendingSourcePause = null;
  let switchingSource = false;
  function handleMusicState(state) {
    const status = state?.status ?? 'unavailable';
    if (pendingSourcePause) {
      if (['paused', 'idle', 'error'].includes(status)) pendingSourcePause(status !== 'error');
      return;
    }
    if (get(player.musicProvider) !== 'netease-local') return;
    if (state?.provider === 'netease-local') {
      player.musicProvider.set('netease-local');
      audio.getPlayers().youtubePlayer?.pause();
    }
    player.musicStatus.set(status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : status === 'error' ? 'error' : 'idle');
    player.isPlaying.set(status === 'playing');
    if (status !== 'error') player.error.set(null);
    if (state?.title) player.currentTrackTitle.set(state.title);
    if (status === 'playing') {
      const record = normalizeRecentPlaylist(state?.playlistRecord);
      if (record) {
        recentPlaylist = record;
        saveRecentPlaylist(record);
      }
    }
  }

  function handleMusicIntent(event) {
    claudeOrch.handleMusicRoute(event);
    refreshClaudeState();
    if (event.status === 'started' && ['play_playlist', 'select_playlist', 'resume'].includes(event.action)) {
      audio.getPlayers().youtubePlayer?.pause();
      player.musicProvider.set('netease-local');
    }
    musicFeedback = updateMusicFeedback(musicFeedback, event);
    if (event?.status === 'started') player.error.set(null);
    if (event?.status === 'completed' && event.action !== 'cancel_selection' && !musicFeedback.choices.length) {
      claudeOrch.markMusicChange();
    }
  }

  function playRecentPlaylist() {
    if (!recentPlaylist || get(connectionStatus) !== 'connected') return;
    audio.getPlayers().youtubePlayer?.pause();
    if (!bridgeClient.sendMusicCommand('play_playlist', [], recentPlaylist)) {
      musicFeedback = updateMusicFeedback(musicFeedback, { type: 'music_error', message: 'Bridge 未连接，请重新连接后重试。' });
    }
  }

  function handleMusicSearchResults(event) {
    musicFeedback = updateMusicFeedback(musicFeedback, event);
  }

  function setActivityState() {
    const now = Date.now();
    if (now - lastActivityNotifiedAt < 250) {
      return;
    }
    lastActivityNotifiedAt = now;
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

  function clearClaudeHistory() {
    claudeOrch.clearHistory();
    refreshClaudeState();
  }

  function openClaudeHistory() {
    setActivityState();
    closeTransientUi();
    claudeOrch.openPanel();
    refreshClaudeState();
  }

  function markClaudeTyping() {
    setActivityState();
    claudeOrch.markUserTyping();
    refreshClaudeState();
  }

  function markClaudeListening() {
    setActivityState();
    claudeOrch.markListening();
    refreshClaudeState();
  }

  function handleClaudeFormChange(event) {
    const formName = event.detail?.name ?? '新形态';
    // Switching forms should close the lightweight chat without letting the
    // normal close path overwrite the newly selected form with idle_breathe.
    claudeOrch.closePanel({ resumePatrol: false });
    claudeOrch.showTransientBubble(`切换形态：${formName}`, 2000);
    refreshClaudeState();
  }

  async function handleClaudeActivate() {
    setActivityState();
    ui.bridgeSettingsOpen.set(false);
    await claudeOrch.handleClick();
    refreshClaudeState();
  }

  function closeTransientUi() {
    ui.scenePopoverOpen.set(false);
    ui.timerPopoverOpen.set(false);
    ui.rainPopoverOpen.set(false);
    ui.miniPlayerExpanded.set(false);
    ui.bridgeSettingsOpen.set(false);
    closeClaudeBubble();
    closeClaudePanel();
  }

  function persistState() {
    if (suppressPersist || typeof window === 'undefined') {
      return;
    }

    const snapshot = createPersistedSnapshot({
      lastTrackIndex: get(player.currentTrackIndex),
      rainVolume: get(rain.volume),
      rainType: get(rain.type),
      currentScene: get(scene.current),
      sceneLocked: get(scene.locked)
    });

    writeStorageValue(window.localStorage, PERSIST_KEY, JSON.stringify(snapshot));
  }

  function applyFocusSnapshot(snapshot) {
    focus.todayMinutes.set(snapshot.todayMinutes);
    focus.streakDays.set(snapshot.streakDays);
    focus.sessionCount.set(snapshot.sessionCount);
    focus.lastSummary.set(snapshot.lastSummary);
  }

  function getCurrentFocusSnapshot() {
    return createFocusSnapshot({
      todayMinutes: get(focus.todayMinutes),
      streakDays: get(focus.streakDays),
      sessionCount: get(focus.sessionCount),
      lastSummary: get(focus.lastSummary)
    });
  }

  function persistFocusSnapshot(snapshot = getCurrentFocusSnapshot()) {
    if (typeof window === 'undefined') {
      return;
    }

    writeStorageValue(window.localStorage, FOCUS_KEY, JSON.stringify(snapshot));
  }

  function restoreState() {
    if (typeof window === 'undefined') {
      return;
    }

    suppressPersist = true;

    const stored = readStorageValue(window.localStorage, PERSIST_KEY);
    if (stored) {
      try {
        const restored = parsePersistedSnapshot(stored, PLAYLIST);

        if (restored) {
          player.currentTrackIndex.set(restored.trackIndex);
          player.currentTrackTitle.set(restored.trackTitle);
          rain.volume.set(restored.rainVolume);
          rain.muted.set(restored.rainMuted);
          rain.type.set(restored.rainType);
          scene.current.set(restored.currentScene);
          scene.locked.set(restored.sceneLocked);

          if (restored.lastNonZeroRainVolume) {
            lastNonZeroRainVolume = restored.lastNonZeroRainVolume;
          }
        }
      } catch {
        // Ignore invalid stored JSON and continue with defaults.
      }
    }

    const storedFocus = readStorageValue(window.localStorage, FOCUS_KEY);
    try {
      restoredFocusSnapshot = parseFocusSnapshot(storedFocus);
      applyFocusSnapshot(restoredFocusSnapshot);
    } catch {
      restoredFocusSnapshot = createFocusSnapshot({});
      applyFocusSnapshot(restoredFocusSnapshot);
    }

    suppressPersist = false;
  }

  async function startExperience() {
    if (get(connectionStatus) !== 'connected') player.musicProvider.set('youtube');
    const wasStarted = get(hasStarted);
    hasStarted.set(true);
    uiMode.set('default');
    claudeOrch.markActive();
    refreshClaudeState();
    setActivityState();

    if (!wasStarted) {
      const startedFocus = createStartedFocusSnapshot(restoredFocusSnapshot ?? getCurrentFocusSnapshot());
      restoredFocusSnapshot = startedFocus;
      applyFocusSnapshot(startedFocus);
      persistFocusSnapshot(startedFocus);
    }

    await audio.initAudio(true, { playRain: false, playYouTube: false });
    claudeOrch.showTransientBubble(
      getStartRitualCopy({
        sceneName: getSceneName($currentScene),
        trackName: $currentTrackTitle,
        rainVolume: $rainVolume,
        streakDays: get(focus.streakDays)
      }),
      4200
    );
    refreshClaudeState();
  }

  async function togglePlayback(source = null) {
    if (switchingSource) return;
    if (source === 'youtube') {
      if ($musicProvider === 'netease-local') {
        switchingSource = true;
        const paused = await new Promise((resolve) => {
          const timeout = setTimeout(() => finish(false), 10000);
          const finish = (ok) => { clearTimeout(timeout); pendingSourcePause = null; resolve(ok); };
          pendingSourcePause = finish;
          if (!bridgeClient.sendMusicCommand('pause')) finish(false);
        });
        switchingSource = false;
        if (!paused) { player.error.set('未能确认网易云已暂停，请重试；暂不启动 YouTube。'); return; }
      }
      player.musicProvider.set('youtube');
      player.isPlaying.set(false);
      player.error.set(null);
      player.currentTrackTitle.set(normalizeTrackTitle($currentTrackIndex, PLAYLIST));
      player.musicStatus.set('loading');
      await audio.initAudio(true);
      return;
    }
    if (source === 'netease-local' && get(connectionStatus) !== 'connected') {
      player.error.set('请先连接本机 Bridge，再选择网易云。');
      return;
    }
    if (source === 'netease-local' && get(connectionStatus) === 'connected') {
      player.musicProvider.set('netease-local');
      audio.getPlayers().youtubePlayer?.pause();
      await sendClaudeMessage('播放网易云 lofi');
      return;
    }
    if (get(connectionStatus) !== 'connected' && $musicProvider !== 'youtube') {
      player.musicProvider.set('youtube');
      player.isPlaying.set(false);
      player.musicStatus.set('idle');
      player.currentTrackTitle.set(normalizeTrackTitle($currentTrackIndex, PLAYLIST));
    }
    if (!$hasStarted) {
      await startExperience();
      if (get(connectionStatus) !== 'connected') return;
    }
    if ($musicProvider === 'netease-local' && get(connectionStatus) === 'connected' && bridgeClient.sendMusicCommand) {
      audio.getPlayers().youtubePlayer?.pause();
      if ($playerIsPlaying || $musicStatus === 'paused') {
        bridgeClient.sendMusicCommand($playerIsPlaying ? 'pause' : 'resume');
      } else if (recentPlaylist) {
        playRecentPlaylist();
      } else {
        await sendClaudeMessage('播放 lofi');
      }
      return;
    }
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
    const normalizedIndex = normalizeTrackIndex(index, PLAYLIST.length);
    player.currentTrackIndex.set(normalizedIndex);
    player.currentTrackTitle.set(normalizeTrackTitle(normalizedIndex, PLAYLIST));

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
    if ($musicProvider === 'netease-local' && get(connectionStatus) === 'connected' && bridgeClient.sendMusicCommand) {
      audio.getPlayers().youtubePlayer?.pause();
      bridgeClient.sendMusicCommand('next');
      return;
    }
    await selectTrack($currentTrackIndex + 1);
  }

  async function playPreviousTrack() {
    if ($musicProvider === 'netease-local' && get(connectionStatus) === 'connected' && bridgeClient.sendMusicCommand) {
      audio.getPlayers().youtubePlayer?.pause();
      bridgeClient.sendMusicCommand('prev');
      return;
    }
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

  function setMusicVolume(nextVolume) {
    const volume = Math.max(0, Math.min(100, Math.round(nextVolume)));
    if ($musicProvider === 'netease-local' && get(connectionStatus) === 'connected' && bridgeClient.sendMusicCommand) {
      bridgeClient.sendMusicCommand('volume', [String(volume)]);
    }
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

  function rotateScene() {
    if ($sceneLocked) {
      return;
    }

    const currentIndex = Math.max(0, SCENE_ORDER.indexOf($currentScene));
    const nextScene = SCENE_ORDER.find((key, index) => {
      const candidate = SCENE_ORDER[(currentIndex + 1 + index) % SCENE_ORDER.length];
      return candidate !== $currentScene && !sceneUsesRain(candidate);
    });
    if (!nextScene) {
      return;
    }
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

    const summary = createSessionSummary({
      minutes: get(timer.minutes),
      sceneName: getSceneName($currentScene)
    });
    if (summary) {
      focus.lastSummary.set(summary);
      restoredFocusSnapshot = createFocusSnapshot({ ...getCurrentFocusSnapshot(), lastSummary: summary });
      persistFocusSnapshot(restoredFocusSnapshot);
    }

    const { youtubePlayer, rainPlayer } = audio.getPlayers();
    youtubePlayer?.fadeOut?.(4000);
    rainPlayer?.fadeOut(4000);

    claudeOrch.showAmbientComment('timerEnding', true).then(refreshClaudeState);
  }

  async function sendClaudeMessage(text) {
    await claudeOrch.sendMessage(text);
    refreshClaudeState();
  }

  async function sendClaudePanelMessage(text) {
    await claudeOrch.sendMessage(text);
    claudeOrch.openPanel();
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

  function startFocusTracking() {
    if (typeof window === 'undefined') {
      return;
    }

    focusInterval = window.setInterval(() => {
      if (!get(hasStarted)) {
        return;
      }

      if (document.visibilityState === 'hidden' || get(ui.idleSince)) {
        return;
      }

      const incremented = incrementActiveFocusMinute(restoredFocusSnapshot ?? getCurrentFocusSnapshot());
      restoredFocusSnapshot = incremented;
      applyFocusSnapshot(incremented);
      persistFocusSnapshot(incremented);
    }, 60000);
  }

  onMount(() => {
    let previousRoom = '';
    const roomTimer = setInterval(() => {
      const socket = bridgeClient.socket;
      if (!socket || socket.readyState !== 1 || get(connectionStatus) !== 'connected') { previousRoom = ''; return; }
      const value = { scene: get(scene.current), rain: { type: get(rain.type), status: get(rain.sourceStatus), volume: get(rain.volume), muted: get(rain.muted) }, timer: { active: get(timer.active), remainingSeconds: get(timer.remainingSeconds) }, companion: { state: get(claude.mode), form: get(claudeForm) } };
      const encoded = JSON.stringify({ type: 'room_update', value });
      if (encoded !== previousRoom) { socket.send(encoded); previousRoom = encoded; }
    }, 500);
    // The room observer is independent of animation frames and stops on unmount.
    const cleanupRoom = () => clearInterval(roomTimer);
    const flushChat = () => claudeOrch.flushHistory();
    window.addEventListener('pagehide', cleanupRoom, { once: true });
    window.addEventListener('pagehide', flushChat);
    restoreState();
    recentPlaylist = readRecentPlaylist();
    claudeOrch.attachBridge(bridgeClient);
    bridgeClient.onMusicState = handleMusicState;
    bridgeClient.onMusicIntent = handleMusicIntent;
    bridgeClient.onMusicSearchResults = handleMusicSearchResults;
    bridgeClient.onMusicError = (event) => {
      musicFeedback = updateMusicFeedback(musicFeedback, event);
      player.error.set(musicFeedback.message);
    };
    const handleChatDisconnect = bridgeClient.onDisconnect;
    bridgeClient.onDisconnect = (info) => {
      musicFeedback = emptyMusicFeedback();
      handleChatDisconnect(info);
    };
    refreshClaudeState();
    unsubscribeBridgeSettings = ui.bridgeSettingsOpen.subscribe((open) => {
      if (open) {
        closeClaudeBubble();
        closeClaudePanel();
      }
    });

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
        ui.bridgeSettingsOpen.set(false);
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
    startFocusTracking();

    return () => {
      cleanupRoom();
      window.removeEventListener('pagehide', flushChat);
      claudeOrch.flushHistory();
      session.stop();
      teardownKeyboard();
      if (focusInterval) {
        window.clearInterval(focusInterval);
      }
      unsubscribePersist.forEach((unsubscribe) => unsubscribe());
      unsubscribePersist = [];
      unsubscribeScene?.();
      unsubscribeBridgeSettings?.();
      audio.destroy();
    };
  });
</script>

<main class="app-shell" aria-label="LoFiClaude ambient room">
  <section class="canvas-zone" aria-label="Canvas scene" on:mousemove={setActivityState}>
    <AsciiBackground scene={$currentScene} rainVolume={$rainVolume} working={$claudeMode === 'working'} paused={$bridgeSettingsOpen} />
    <ClaudeSprite on:activate={handleClaudeActivate} on:formchange={handleClaudeFormChange} />

    {#if !$hasStarted}
      <div class="empty-state" aria-live="polite">
        <div class="empty-state-copy">
          <p class="empty-state-title">LoFiClaude</p>
          <p class="empty-state-text">会陪你工作的 AI 桌面房间</p>
          <p class="empty-state-hint">可先进入本地陪伴模式，稍后再连接 Claude</p>
        </div>
        <button type="button" class="start-overlay" on:click={startExperience}>
          Start room
        </button>
      </div>
    {/if}
  </section>

  <AmbientHeader />

  <MiniPlayer
    musicStatus={$musicStatus}
    musicProvider={$musicProvider}
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
      companionState={claudeCompanionState}
      messages={claudeHistory}
      activeAssistantId={claudeActiveAssistantId}
      anchor={$claudeBubbleAnchor}
      passive={claudeBubblePassive && !musicFeedback.choices.length && musicFeedback.status !== 'pending'}
      loading={claudeLoading}
      {musicFeedback}
      {recentPlaylist}
      on:close={closeClaudeBubble}
      on:send={(event) => sendClaudeMessage(event.detail.text)}
      on:history={openClaudeHistory}
      on:typing={markClaudeTyping}
      on:listening={markClaudeListening}
      on:musicChoice={(event) => sendClaudeMessage(`播放第 ${event.detail.index} 个`)}
      on:musicCancel={() => sendClaudeMessage('取消')}
      on:playRecent={playRecentPlaylist}
    />
  {/if}

  {#if claudePanelOpen}
    <ClaudeChatPanel
      sceneName={getSceneName($currentScene)}
      messages={claudeHistory}
      activeAssistantId={claudeActiveAssistantId}
      loading={claudeLoading}
      canReconnect={claudeCanReconnect}
      sessionStatus={claudeSessionStatus}
      bridgeStatus={claudeBridgeStatus}
      toolRunning={claudeToolRunning}
      lastError={claudeLastError}
      on:close={closeClaudePanel}
      on:clear={clearClaudeHistory}
      on:send={(event) => sendClaudePanelMessage(event.detail.text)}
      on:reconnect={reconnectClaudeBridge}
    />
  {/if}

  {#if ENABLE_YOUTUBE_AUDIO}
    <div class="youtube-host" aria-hidden="true" tabindex="-1" role="presentation">
      <div id="youtube-player-host" class="youtube-player-mount"></div>
    </div>
  {/if}
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

  .youtube-player-mount {
    width: 1px;
    height: 1px;
  }

  .empty-state {
    position: absolute;
    inset: 0;
    z-index: 7;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 22px;
    padding: 12vh 24px 24vh;
    pointer-events: none;
  }

  .empty-state-copy {
    margin: 0;
    display: grid;
    gap: 8px;
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .empty-state-title,
  .empty-state-text,
  .empty-state-hint {
    margin: 0;
  }

  .empty-state-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 14px;
    color: rgba(231, 219, 202, 0.92);
  }

  .empty-state-text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: rgba(231, 219, 202, 0.82);
    letter-spacing: 0.02em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  }

  .empty-state-hint {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: rgba(231, 219, 202, 0.72);
  }

  .start-overlay {
    pointer-events: auto;
    z-index: 1;
  }

  @media (max-height: 760px) {
    .empty-state {
      padding: 96px 20px 150px;
      gap: 16px;
    }
  }
</style>
