function isTypingTarget(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

export function setupKeyboardShortcuts(callbacks = {}) {
  const {
    onActivity = () => {},
    onEscape = () => {},
    onTogglePlayback = () => {},
    onPreviousTrack = () => {},
    onNextTrack = () => {},
    getRainVolume = () => 0,
    onSetRainVolume = () => {},
    onToggleRainMute = () => {},
    onToggleTimerPopover = () => {},
    onToggleShortcutHint = () => {},
    isSceneLocked = () => false,
    onSceneHotkey = () => {}
  } = callbacks;

  const onKeydown = (event) => {
    const key = event.key.toLowerCase();

    if (key === 'escape') {
      onEscape();
      return;
    }

    if (isTypingTarget(event)) {
      return;
    }

    if (key === ' ') {
      event.preventDefault();
      onTogglePlayback();
      return;
    }

    if (key === 'arrowleft') {
      event.preventDefault();
      onPreviousTrack();
      return;
    }

    if (key === 'arrowright') {
      event.preventDefault();
      onNextTrack();
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      onSetRainVolume(getRainVolume() + 10);
      return;
    }

    if (key === 'arrowdown') {
      event.preventDefault();
      onSetRainVolume(getRainVolume() - 10);
      return;
    }

    if (key === 'm') {
      onToggleRainMute();
      return;
    }

    if (key === 't') {
      onToggleTimerPopover();
      return;
    }

    if (key === 'h') {
      onToggleShortcutHint();
      return;
    }

    if (isSceneLocked()) {
      return;
    }

    if (key === '1') {
      onSceneHotkey('lofiNight');
    } else if (key === '2') {
      onSceneHotkey('softRain');
    } else if (key === '3') {
      onSceneHotkey('starDrift');
    } else if (key === '4') {
      onSceneHotkey('fmStudio');
    } else if (key === '5') {
      onSceneHotkey('recordRoom');
    } else if (key === '6') {
      onSceneHotkey('focusConsole');
    }
  };

  const onUserActivity = () => onActivity();

  if (typeof window !== 'undefined') {
    ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach((eventName) => {
      window.addEventListener(eventName, onUserActivity);
    });
    window.addEventListener('keydown', onKeydown);
  }

  return () => {
    if (typeof window !== 'undefined') {
      ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach((eventName) => {
        window.removeEventListener(eventName, onUserActivity);
      });
      window.removeEventListener('keydown', onKeydown);
    }
  };
}
