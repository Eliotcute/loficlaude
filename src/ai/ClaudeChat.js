export const fallbackLines = [
  '雨声和 lofi 真的很配 🌧',
  '这首歌很适合慢慢写 🎵',
  '窗外变暗了，别太累。',
  '星星在眨眼 ⭐',
  '还在呢，我陪你。',
  '要不要休息一下？☕',
  '这段节奏很舒服。',
  '还有 5 分钟，我们慢慢收尾。'
];

const ambientFallback = {
  firstOpen: '今天想做点什么呢？',
  trackChange: '新的一首开始了，节奏刚好。',
  timerEnding: '时间快到了，准备慢慢收尾。'
};

function pickRandom(lines) {
  return lines[Math.floor(Math.random() * lines.length)] ?? '还在呢，我陪你。';
}

export class ClaudeChat {
  async getResponse(userMessage) {
    const cleanMessage = `${userMessage ?? ''}`.trim();
    if (!cleanMessage) {
      return pickRandom(fallbackLines);
    }

    return pickRandom(fallbackLines);
  }

  async getAmbientComment(eventType) {
    return ambientFallback[eventType] ?? pickRandom(fallbackLines);
  }
}
