import test from 'node:test';
import assert from 'node:assert/strict';

import { get } from 'svelte/store';

import { PLAYLIST, YouTubePlayer } from '../src/audio/YouTubePlayer.js';
import { player as playerStore } from '../src/stores/appState.js';

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
