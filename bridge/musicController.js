const { execFile } = require('node:child_process');

const COMMANDS = new Set(['play', 'pause', 'resume', 'stop', 'next', 'prev', 'state', 'volume']);

function createMusicController({ execFileImpl = execFile, command = 'ncm-cli', onState = () => {}, onError = () => {} } = {}) {
  let state = { provider: 'netease-local', status: 'unavailable', title: '', volume: null };

  function publish(next) {
    state = { ...state, ...next };
    onState({ ...state });
    return state;
  }

  function parseState(output) {
    try {
      const parsed = JSON.parse(output);
      if (parsed?.success === false) {
        return { status: 'error', message: parsed.message || '网易云音乐未能播放' };
      }
      const value = parsed?.state ?? parsed;
      return {
        status: value?.status === 'playing' ? 'playing' : value?.status === 'paused' ? 'paused' : 'idle',
        volume: Number.isFinite(value?.volume) ? value.volume : null
      };
    } catch {
      return { status: 'idle' };
    }
  }

  function run(action, args = []) {
    if (!COMMANDS.has(action)) {
      onError('Unsupported music command');
      return Promise.resolve(false);
    }
    if (action === 'volume' && (!/^(?:100|[1-9]?\d)$/.test(args[0] ?? '') || args.length !== 1)) {
      onError('Invalid music volume');
      return Promise.resolve(false);
    }
    if (action !== 'volume' && args.length > 0) {
      onError('Music command arguments are not allowed');
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      execFileImpl(command, [action, ...args, '--output', 'json'], { timeout: 8000, maxBuffer: 128 * 1024 }, (error, stdout = '') => {
        if (error) {
          const message = error.code === 'ENOENT' ? '网易云音乐 CLI 未安装' : '网易云音乐暂时不可用';
          publish({ status: 'error' });
          onError(message);
          resolve(false);
          return;
        }
        const next = action === 'state' ? parseState(stdout) : parseState(stdout);
        if (next.status === 'error') {
          publish(next);
          onError(next.message || '网易云音乐未能播放');
          resolve(false);
          return;
        }
        if (action !== 'state') {
          next.status = action === 'pause' ? 'paused' : action === 'stop' ? 'idle' : action === 'play' || action === 'resume' ? 'playing' : state.status;
        }
        publish(next);
        resolve(true);
      });
    });
  }

  return {
    getState: () => ({ ...state }),
    command(action, args) { return run(action, args); },
    refresh() { return run('state'); }
  };
}

module.exports = { COMMANDS, createMusicController };
