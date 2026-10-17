const { execFile } = require('node:child_process');
const { createNeteasePlayer } = require('./neteasePlayer');

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

const LOGIN_HINT = '请在终端运行 ncm-cli login 扫码登录后重试';

function cliMessage(output) {
  try {
    const parsed = JSON.parse(output);
    return typeof parsed?.message === 'string' ? parsed.message : '';
  } catch { return ''; }
}

// Maps known ncm-cli failures to actionable text; unknown causes return null so
// callers keep their generic message instead of echoing raw CLI output.
// ncm-cli 0.1.7 loads `search` from a remote manifest; with an expired login the
// cached manifest was observed empty, so the failure surfaces as "unknown command".
function describeFailure(error, stdout = '', stderr = '') {
  if (error?.code === 'ENOENT') return '网易云音乐 CLI 未安装';
  if (error?.killed) return '网易云音乐 CLI 响应超时，请重试';
  if (/unknown command/.test(String(stderr))) return `网易云命令未加载（通常是登录已过期），${LOGIN_HINT}`;
  if (/未登录|重新授权|登录.*过期/.test(cliMessage(stdout))) return `网易云未登录或登录已过期，${LOGIN_HINT}`;
  return null;
}

function readReply(output) {
  const parsed = JSON.parse(output);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.success === false ||
      (parsed.code != null && parsed.code !== 200)) throw new Error('Invalid CLI response');
  return parsed;
}

function createMusicController({ execFileImpl = execFile, command = 'ncm-cli', onState = () => {}, onError = () => {}, player = null } = {}) {
  const playback = player || (execFileImpl === execFile
    ? createNeteasePlayer({ command })
    : { ensureStarted: () => Promise.resolve(true), close() {} });
  let state = { provider: 'netease-local', status: 'unavailable', title: '', volume: null };
  let cliMissing = false;
  let lastBackgroundError = '';

  // Background refreshes repeat every few seconds; report each distinct failure once.
  function reportError(message, background) {
    if (background && message === lastBackgroundError) return;
    if (background) lastBackgroundError = message;
    onError(message);
  }

  function publish(next) {
    const merged = { ...state, ...next };
    // The Bridge polls every few seconds; unchanged state must not become an event.
    if (Object.keys(merged).every((key) => merged[key] === state[key])) return state;
    state = merged;
    onState({ ...state });
    return state;
  }

  function parseState(output) {
    try {
      const parsed = readReply(output);
      const value = parsed?.state ?? parsed;
      if (!['playing', 'paused', 'stopped', 'idle'].includes(value?.status)) throw new Error('Missing player state');
      const next = {
        status: value?.status === 'playing' ? 'playing' : value?.status === 'paused' ? 'paused' : 'idle',
        volume: Number.isFinite(value?.volume) ? value.volume : null
      };
      if (typeof value?.title === 'string') next.title = value.title;
      if (Number.isFinite(value?.position)) next.position = value.position;
      if (Number.isFinite(value?.duration)) next.duration = value.duration;
      return next;
    } catch {
      return { status: 'error', message: '无法确认网易云播放状态' };
    }
  }

  function run(action, args = [], background = false) {
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
    return Promise.resolve(['play', 'pause', 'resume', 'next', 'prev'].includes(action) ? playback.ensureStarted() : true).then((playerReady) => new Promise((resolve) => {
      if (!playerReady && ['play', 'pause', 'resume', 'next', 'prev'].includes(action)) {
        publish({ status: 'error' });
        onError('网易云播放器未启动，请确认当前系统支持本机播放');
        resolve(false);
        return;
      }
      const cliArgs = action === 'search' ? ['search', 'playlist', '--keyword', args[0] ?? 'lofi'] : [action, ...args];
      execFileImpl(command, [...cliArgs, '--output', 'json'], { timeout: 8000, maxBuffer: 128 * 1024 }, (error, stdout = '', stderr = '') => {
        if (error) {
          cliMissing = error.code === 'ENOENT';
          const message = describeFailure(error, stdout, stderr) || '网易云音乐暂时不可用';
          publish({ status: 'error' });
          reportError(message, background);
          resolve(false);
          return;
        }
        cliMissing = false;
        if (action !== 'state') {
          try {
            const reply = readReply(stdout);
            if (reply.success !== true && !reply.state && reply.code !== 200) throw new Error('Missing acknowledgement');
          } catch {
            publish({ status: 'error' });
            onError(describeFailure(null, stdout) || '网易云未能完成音乐操作');
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
          reportError(next.message || '网易云音乐未能播放', background);
          resolve(false);
          return;
        }
        lastBackgroundError = '';
        publish(next);
        resolve(true);
      });
    }));
  }

  return {
    getState: () => ({ ...state }),
    command(action, args) { return run(action, args); },
    // Background polling stops once the CLI is known to be missing; explicit
    // user commands still retry and clear the flag when the CLI appears.
    refresh() { return cliMissing ? Promise.resolve(false) : run('state', [], true); },
    searchPlaylists(query = 'lofi') {
      if (!validQuery(query)) { onError('Invalid music search'); return Promise.resolve([]); }
      return new Promise((resolve) => {
        execFileImpl(command, ['search', 'playlist', '--keyword', query, '--output', 'json'], { timeout: 8000, maxBuffer: 512 * 1024 }, (error, stdout = '', stderr = '') => {
          if (error) { onError(describeFailure(error, stdout, stderr) || '网易云音乐暂时不可用'); resolve([]); return; }
          try {
            const records = readReply(stdout)?.data?.records;
            if (!Array.isArray(records)) throw new Error('Missing records');
            resolve(records.map(normalizePlaylist).filter(Boolean).slice(0, 5));
          } catch { onError(describeFailure(null, stdout) || '无法读取网易云搜索结果'); resolve([]); }
        });
      });
    },
    playPlaylistById(record) {
      const playlist = normalizePlaylist(record);
      if (!playlist) { onError('Invalid playlist'); return Promise.resolve(false); }
      return playback.ensureStarted().then((playerReady) => {
        if (!playerReady) {
          publish({ status: 'error' });
          onError('网易云播放器未启动，请确认当前系统支持本机播放');
          return false;
        }
        return new Promise((resolve) => execFileImpl(command, ['play', '--playlist', '--encrypted-id', playlist.id, '--original-id', playlist.originalId, '--output', 'json'], { timeout: 8000, maxBuffer: 128 * 1024 }, (error, stdout = '', stderr = '') => {
        if (error) { onError(describeFailure(error, stdout, stderr) || '网易云歌单播放失败'); resolve(false); return; }
        try {
          const reply = readReply(stdout);
          if (reply.success !== true) throw new Error('Missing acknowledgement');
        } catch { onError(describeFailure(null, stdout) || '网易云歌单播放失败'); resolve(false); return; }
        run('state').then((ok) => {
          if (!ok || state.status !== 'playing') {
            onError('网易云尚未开始播放，请检查队列后重试');
            resolve(false);
            return;
          }
          publish({ title: playlist.name, playlist: playlist.name, playlistRecord: playlist });
          resolve(true);
        });
        }));
      });
    },
    async playPlaylist(query = 'lofi') {
      const choices = await this.searchPlaylists(query);
      return choices.length > 0 ? this.playPlaylistById(choices[0]) : false;
    },
    close() { playback.close(); }
  };
}

module.exports = { COMMANDS, createMusicController };
