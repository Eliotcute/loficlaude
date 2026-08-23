import test from 'node:test';
import assert from 'node:assert/strict';

import { get } from 'svelte/store';

import { isolateYouTubeFrame, PLAYLIST, YouTubePlayer } from '../src/audio/YouTubePlayer.js';
import { player as playerStore } from '../src/stores/appState.js';

test('YouTube iframe accessibility isolation unfocuses the frame without hiding it', () => {
  const attributes = new Map();
  const frame = {
    setAttribute(name, value) {
      attributes.set(name, value);
    }
  };

  isolateYouTubeFrame(frame);

  assert.equal(attributes.get('aria-hidden'), 'true');
  assert.equal(attributes.get('role'), 'presentation');
  assert.equal(attributes.get('tabindex'), '-1');
  assert.equal(frame.hidden, undefined);
});

test('YouTubePlayer skips to the next channel on playback errors', () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    setTimeout(callback) {
      callback();
      return 1;
    }
  };

  try {
    const youtubePlayer = new YouTubePlayer();
    youtubePlayer.ready = true;
    youtubePlayer.instance = {
      loadVideoById(id) {
        this.loadedId = id;
      }
    };

    youtubePlayer.handleError({ data: 150 });

    assert.equal(get(playerStore.currentTrackIndex), 1);
    assert.equal(get(playerStore.currentTrackTitle), PLAYLIST[1].name);
    assert.equal(youtubePlayer.instance.loadedId, PLAYLIST[1].id);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('YouTubePlayer stops automatic failover after every channel fails', () => {
  const originalWindow = globalThis.window;
  let timeoutCalls = 0;
  const loadedIds = [];
  globalThis.window = {
    setTimeout(callback) {
      timeoutCalls += 1;
      callback();
      return timeoutCalls;
    }
  };

  try {
    const youtubePlayer = new YouTubePlayer();
    youtubePlayer.ready = true;
    youtubePlayer.instance = {
      loadVideoById(id) {
        loadedIds.push(id);
      }
    };

    for (let index = 0; index < PLAYLIST.length + 2; index += 1) {
      youtubePlayer.handleError({ data: 150 });
    }

    assert.equal(youtubePlayer.failedAll, true);
    assert.equal(timeoutCalls, PLAYLIST.length - 1);
    assert.equal(loadedIds.length, PLAYLIST.length - 1);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('YouTubePlayer play retries the current station after automatic failover is exhausted', () => {
  const originalWindow = globalThis.window;
  const loadedIds = [];
  let playCalls = 0;
  globalThis.window = {
    setTimeout(callback) {
      callback();
      return 1;
    }
  };

  try {
    const youtubePlayer = new YouTubePlayer();
    youtubePlayer.ready = true;
    youtubePlayer.instance = {
      loadVideoById(id) {
        loadedIds.push(id);
      },
      playVideo() {
        playCalls += 1;
      },
      setVolume() {}
    };

    for (let index = 0; index < PLAYLIST.length; index += 1) {
      youtubePlayer.handleError({ data: 150 });
    }
    loadedIds.length = 0;

    youtubePlayer.play();

    assert.equal(get(playerStore.error), null);
    assert.equal(get(playerStore.isLoading), true);
    assert.deepEqual(loadedIds, [PLAYLIST.at(-1).id]);
    assert.equal(playCalls, 1);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('YouTubePlayer can initialize after the iframe API script fails once', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  let activeScript = null;
  let appendCount = 0;
  let timerId = 0;
  const timers = new Map();

  globalThis.window = {
    setTimeout(callback) {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimeout(id) {
      timers.delete(id);
    }
  };
  globalThis.document = {
    head: {
      append(script) {
        activeScript = script;
        appendCount += 1;
        if (appendCount === 1) {
          queueMicrotask(() => script.onerror());
          return;
        }

        globalThis.window.YT = {
          Player: class {
            constructor(_mountId, options) {
              this.options = options;
              queueMicrotask(() => options.events.onReady());
            }

            setVolume() {}
            destroy() {}
          }
        };
        queueMicrotask(() => globalThis.window.onYouTubeIframeAPIReady());
      }
    },
    createElement() {
      return {
        remove() {
          activeScript = null;
        }
      };
    },
    getElementById(id) {
      if (id === 'youtube-player-host') {
        return {};
      }
      return id === 'youtube-iframe-api' ? activeScript : null;
    }
  };

  try {
    const { YouTubePlayer: IsolatedYouTubePlayer } = await import('../src/audio/YouTubePlayer.js?api-retry-test');
    const youtubePlayer = new IsolatedYouTubePlayer();

    await assert.rejects(youtubePlayer.init(0), /Failed to load YouTube iframe API script/);
    await youtubePlayer.init(0);

    assert.equal(appendCount, 2);
    assert.equal(get(playerStore.error), null);
    youtubePlayer.destroy();
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
