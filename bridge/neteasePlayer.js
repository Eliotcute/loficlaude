const { spawn } = require('node:child_process');

// ncm-cli's player service requires a TTY subscriber. macOS `script` provides
// a lightweight pseudo-terminal while keeping the TUI hidden from the user.
function createNeteasePlayer({ command = 'ncm-cli', spawnImpl = spawn, platform = process.platform } = {}) {
  let processHandle = null;
  let starting = null;

  function ensureStarted() {
    if (processHandle && !processHandle.killed) return Promise.resolve(true);
    if (starting) return starting;
    if (platform !== 'darwin') return Promise.resolve(false);

    starting = new Promise((resolve) => {
      const child = spawnImpl('/bin/sh', ['-c', `tail -f /dev/null | /usr/bin/script -q /dev/null ${command} tui`], {
        stdio: ['ignore', 'ignore', 'ignore'],
        detached: true
      });
      processHandle = child;
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        starting = null;
        if (!ok) processHandle = null;
        resolve(ok);
      };
      child.once('spawn', () => setTimeout(() => finish(true), 500));
      child.once('error', () => finish(false));
      child.once('exit', () => finish(false));
    });
    return starting;
  }

  function close() {
    const child = processHandle;
    processHandle = null;
    starting = null;
    if (!child || child.killed) return;
    // The TUI starts ncm-cli and mpv as descendants; terminate the whole
    // detached process group so closing the last browser client cannot leave
    // audio running in the background.
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
    setTimeout(() => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ }
    }, 1500).unref();
  }

  return { ensureStarted, close };
}

module.exports = { createNeteasePlayer };
