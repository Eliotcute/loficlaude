export function getStartRitualCopy(values = {}) {
  const sceneName = values.sceneName || 'Lofi Night';
  const trackName = values.trackName || 'lofi radio';
  const rainVolume = Math.max(0, Math.min(100, Math.round(Number(values.rainVolume ?? 0))));
  const streakDays = Math.max(0, Math.round(Number(values.streakDays ?? 0)));

  if (streakDays > 1) {
    return `欢迎回来，第 ${streakDays} 天。${sceneName} 已恢复，雨声 ${rainVolume}%，我在。`;
  }

  return `${sceneName} 已恢复，${trackName} 准备好了。先慢慢开始。`;
}

export function getCompanionStatusCopy(state) {
  const copy = {
    listening: '我在听。',
    typing: '慢慢写，我看着。',
    thinking: '我想一下。',
    speaking: '给你回来了。',
    resting: '我先安静陪着。',
    error: '连接有点卡，我还在。'
  };

  return copy[state] ?? '还在呢。';
}

export function createSessionSummary(values = {}) {
  const minutes = Math.max(0, Math.round(Number(values.minutes ?? 0)));
  const sceneName = values.sceneName || '这个房间';

  if (minutes <= 0) {
    return '';
  }

  return `刚刚在 ${sceneName} 陪你专注了 ${minutes} 分钟。`;
}
