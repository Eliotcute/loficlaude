const { execFile } = require('node:child_process');

const COMMANDS = new Set(['play', 'pause', 'resume', 'stop', 'next', 'prev', 'state', 'volume', 'search']);

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
    if (!['volume', 'search'].includes(action) && args.length > 0) {
      onError('Music command arguments are not allowed');
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const cliArgs = action === 'search' ? ['search', 'playlist', '--keyword', args[0] ?? 'lofi'] : [action, ...args];
      execFileImpl(command, [...cliArgs, '--output', 'json'], { timeout: 8000, maxBuffer: 128 * 1024 }, (error, stdout = '') => {
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
    refresh() { return run('state'); },
    playPlaylist(query = 'lofi') {
      return new Promise((resolve) => {
        execFileImpl(command, ['search', 'playlist', '--keyword', query, '--output', 'json'], { timeout: 8000, maxBuffer: 512 * 1024 }, (error, stdout = '') => {
          if (error) { publish({ status: 'error' }); onError('网易云音乐暂时不可用'); resolve(false); return; }
          try {
            const record = JSON.parse(stdout)?.data?.records?.[0];
            if (!record?.originalId || !record?.id) throw new Error('no playlist');
            execFileImpl(command, ['play', '--playlist', '--encrypted-id', String(record.id), '--original-id', String(record.originalId), '--output', 'json'], { timeout: 8000, maxBuffer: 128 * 1024 }, (playError, playStdout = '') => {
              if (playError) { publish({ status: 'error' }); onError('网易云歌单播放失败'); resolve(false); return; }
              publish({ status: 'playing', title: record.name, playlist: record.name });
              resolve(true);
            });
          } catch { publish({ status: 'error' }); onError('没有找到 lofi 歌单'); resolve(false); }
        });
      });
    }
  };
}

module.exports = { COMMANDS, createMusicController };
