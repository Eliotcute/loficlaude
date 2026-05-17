const TICK_MS = 1000;
const IDLE_THRESHOLD_MS = 5000;
const SCENE_ROTATION_MS = 5 * 60 * 1000;

export function createSessionController(callbacks = {}) {
  const {
    getHasStarted = () => false,
    getTimerActive = () => false,
    getTimerRemainingSeconds = () => 0,
    onSetTimerRemaining = () => {},
    onTimerFinished = () => {},
    onIdleStart = () => {},
    onIdleEnd = () => {},
    isSceneLocked = () => false,
    onSceneRotate = () => {}
  } = callbacks;

  let lastActivityAt = Date.now();
  let lastSceneRotationAt = Date.now();
  let intervalId;

  function markActivity() {
    lastActivityAt = Date.now();
    onIdleEnd();
  }

  function resetSceneRotation() {
    lastSceneRotationAt = Date.now();
  }

  function start() {
    if (intervalId) {
      return;
    }

    intervalId = window.setInterval(() => {
      if (!getHasStarted()) {
        return;
      }

      if (getTimerActive()) {
        const current = getTimerRemainingSeconds();
        if (current > 0) {
          const nextRemaining = current - 1;
          onSetTimerRemaining(nextRemaining);
          if (nextRemaining <= 0) {
            onTimerFinished();
          }
        }
      }

      const idleForMs = Date.now() - lastActivityAt;
      if (idleForMs >= IDLE_THRESHOLD_MS) {
        onIdleStart(lastActivityAt + IDLE_THRESHOLD_MS);
      }

      const elapsedSinceRotation = Date.now() - lastSceneRotationAt;
      if (!isSceneLocked() && elapsedSinceRotation >= SCENE_ROTATION_MS) {
        lastSceneRotationAt = Date.now();
        onSceneRotate();
      }
    }, TICK_MS);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return {
    start,
    stop,
    markActivity,
    resetSceneRotation
  };
}
