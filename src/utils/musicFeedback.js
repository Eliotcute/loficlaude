const LABELS = {
  play_playlist: '网易云 lofi', select_playlist: '歌单播放', cancel_selection: '歌单选择',
  pause: '暂停音乐', resume: '继续播放', next: '下一首', prev: '上一首', stop: '停止音乐'
};

export function emptyMusicFeedback() {
  return { status: 'idle', message: '', choices: [] };
}

export function updateMusicFeedback(state, event) {
  if (event?.type === 'reset') return emptyMusicFeedback();
  if (event?.type === 'music_search_results') {
    const choices = (Array.isArray(event.choices) ? event.choices : [])
      .filter((item) => item && typeof item.name === 'string')
      .slice(0, 5).map((item) => ({ name: item.name.slice(0, 160) }));
    return { status: choices.length ? 'choices' : 'error', choices,
      message: choices.length ? '网易云歌单' : '没有找到歌单，请重新搜索。' };
  }
  if (event?.type === 'music_error') {
    return { ...state, status: 'error', message: typeof event.message === 'string' ? event.message.slice(0, 240) : '音乐请求失败，请重试。' };
  }
  if (event?.type !== 'music_intent') return state;
  const label = LABELS[event.action] ?? '音乐';
  if (event.status === 'started') {
    return { status: 'pending', message: `正在处理：${label}…`,
      choices: ['play_playlist', 'select_playlist', 'cancel_selection'].includes(event.action) ? [] : state.choices };
  }
  if (event.status === 'failed') {
    // The Bridge reports the specific cause via music_error before the intent fails.
    if (state.status === 'error' && state.message) return state;
    return { ...state, status: 'error', message: '音乐操作未完成，请检查登录、网络或重新搜索。' };
  }
  if (event.status === 'completed') {
    if (state.choices.length) return { ...state, status: 'choices', message: '网易云歌单' };
    return { status: 'completed', choices: [], message: event.action === 'cancel_selection' ? '已取消选择' : `已完成：${label}` };
  }
  return state;
}
