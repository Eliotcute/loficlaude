const { execFile } = require('node:child_process');

const COMMANDS = new Set(['play', 'pause', 'resume', 'stop', 'next', 'prev', 'state', 'volume', 'search']);

function normalizePlaylist(record) {
  if (!record || typeof record !== 'object') return null;
  const id = String(record.id ?? '');
  const originalId = String(record.originalId ?? '');
  if (!/^(?:[a-f\d]{32}|[1-9]\d{0,19})$/i.test(id) || !/^[1-9]\d{0,19}$/.test(originalId)) return null;
  if (typeof record.originalId === 'number' && !Number.isSafeInteger(record.originalId)) return null;
  return { id, originalId, name: typeof record.name === 'string' ? record.name.slice(0, 160) : '未命名歌单' };
}

function validQuery(query) {
  return typeof query === 'string' && query.trim().length > 0 && query.length <= 120 && !/[\x00-\x1f]/.test(query);
}

function readReply(output) {
  const parsed = JSON.parse(output);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.success === false ||
      (parsed.code != null && parsed.code !== 200)) throw new Error('Invalid CLI response');
  return parsed;
}

function createMusicController({ execFileImpl = execFile, command = 'ncm-cli', onState = () => {}, onError = () => {} } = {}) {
  let state = { provider: 'netease-local', status: 'unavailable', title: '', volume: null };

  function publish(next) {
    state = { ...state, ...next };
    onState({ ...state });
    return state;
  }

  function parseState(output) {
    try {
      const parsed = readReply(output);
      const value = parsed?.state ?? parsed;
      if (!['playing', 'paused', 'stopped', 'idle'].includes(value?.status)) throw new Error('Missing player state');
      return {
        status: value?.status === 'playing' ? 'playing' : value?.status === 'paused' ? 'paused' : 'idle',
        volume: Number.isFinite(value?.volume) ? value.volume : null
      };
    } catch {
      return { status: 'error', message: '无法确认网易云播放状态' };
    }
  }

  function run(action, args = []) {
    if (!COMMANDS.has(action) || !Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
      onError('Unsupported music command');
      return Promise.resolve(false);
    }
    if (action === 'volume' && (!/^(?:100|[1-9]?\d)$/.test(args[0] ?? '') || args.length !== 1)) {
      onError('Invalid music volume');
      return Promise.resolve(false);
    }
    if (action === 'search' && (args.length !== 1 || !validQuery(args[0]))) {
      onError('Invalid music search');
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
        if (action !== 'state') {
          try {
            const reply = readReply(stdout);
            if (reply.success !== true && !reply.state && reply.code !== 200) throw new Error('Missing acknowledgement');
          } catch {
            publish({ status: 'error' });
            onError('网易云未能完成音乐操作');
            resolve(false);
            return;
          }
          if (action === 'search') { resolve(true); return; }
          run('state').then((ok) => {
            const expected = { play: 'playing', resume: 'playing', pause: 'paused', stop: 'idle' }[action];
            const confirmed = ok && (!expected || state.status === expected);
            if (ok && !confirmed) onError('网易云播放状态尚未确认，请重试');
            resolve(confirmed);
          });
          return;
        }
        const next = parseState(stdout);
        if (next.status === 'error') {
          publish(next);
          onError(next.message || '网易云音乐未能播放');
          resolve(false);
          return;
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
    searchPlaylists(query = 'lofi') {
      if (!validQuery(query)) { onError('Invalid music search'); return Promise.resolve([]); }
      return new Promise((resolve) => {
        execFileImpl(command, ['search', 'playlist', '--keyword', query, '--output', 'json'], { timeout: 8000, maxBuffer: 512 * 1024 }, (error, stdout = '') => {
          if (error) { onError('网易云音乐暂时不可用'); resolve([]); return; }
          try {
            const records = readReply(stdout)?.data?.records;
            if (!Array.isArray(records)) throw new Error('Missing records');
            resolve(records.map(normalizePlaylist).filter(Boolean).slice(0, 5));
          } catch { onError('无法读取网易云搜索结果'); resolve([]); }
        });
      });
    },
    playPlaylistById(record) {
      const playlist = normalizePlaylist(record);
      if (!playlist) { onError('Invalid playlist'); return Promise.resolve(false); }
      return new Promise((resolve) => execFileImpl(command, ['play', '--playlist', '--encrypted-id', playlist.id, '--original-id', playlist.originalId, '--output', 'json'], { timeout: 8000, maxBuffer: 128 * 1024 }, (error, stdout = '') => {
        if (error) { onError('网易云歌单播放失败'); resolve(false); return; }
        try {
          const reply = readReply(stdout);
          if (reply.success !== true) throw new Error('Missing acknowledgement');
        } catch { onError('网易云歌单播放失败'); resolve(false); return; }
        run('state').then((ok) => {
          if (!ok || state.status !== 'playing') {
            onError('网易云尚未开始播放，请检查队列后重试');
            resolve(false);
            return;
          }
          publish({ title: playlist.name, playlist: playlist.name });
          resolve(true);
        });
      }));
    },
    async playPlaylist(query = 'lofi') {
      const choices = await this.searchPlaylists(query);
      return choices.length > 0 ? this.playPlaylistById(choices[0]) : false;
    }
  };
}

module.exports = { COMMANDS, createMusicController };
