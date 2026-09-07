import assert from 'node:assert/strict';
import test from 'node:test';
import { createNeteasePlayer } from '../bridge/neteasePlayer.js';

test('netease player uses macOS script to keep the TUI service alive', async () => {
  const calls = [];
  const child = {
    killed: false,
    stdin: { end() { calls.push('stdin.end'); } },
    once(event, handler) { if (event === 'spawn') queueMicrotask(handler); return this; },
    kill(signal) { calls.push(signal); this.killed = true; }
  };
  const player = createNeteasePlayer({
    platform: 'darwin',
    spawnImpl(command, args, options) {
      calls.push({ command, args, options });
      return child;
    }
  });

  assert.equal(await player.ensureStarted(), true);
  assert.deepEqual(calls[0], {
    command: '/usr/bin/script',
    args: ['-q', '/dev/null', 'ncm-cli', 'tui'],
    options: { stdio: ['pipe', 'ignore', 'ignore'], detached: false }
  });
  player.close();
  assert.deepEqual(calls.slice(1), ['stdin.end', 'SIGTERM']);
});

test('netease player is unavailable on non-macOS hosts', async () => {
  let spawned = false;
  const player = createNeteasePlayer({ platform: 'linux', spawnImpl: () => { spawned = true; } });
  assert.equal(await player.ensureStarted(), false);
  assert.equal(spawned, false);
});
