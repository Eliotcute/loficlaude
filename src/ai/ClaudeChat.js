const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-5-haiku-latest';

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
  constructor(apiKey) {
    this.apiKey = apiKey?.trim() || '';
  }

  async getResponse(userMessage, context = {}) {
    const cleanMessage = `${userMessage ?? ''}`.trim();
    if (!cleanMessage) {
      return pickRandom(fallbackLines);
    }

    if (!this.apiKey) {
      return pickRandom(fallbackLines);
    }

    try {
      const payload = {
        model: MODEL,
        max_tokens: 120,
        system:
          'You are LoFiClaude, a calm ambient companion. Reply in concise Chinese, usually one short sentence.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  `User message: ${cleanMessage}`,
                  `Current track: ${context.trackName ?? 'unknown'}`,
                  `Scene: ${context.sceneName ?? 'unknown'}`,
                  `Rain volume: ${context.rainVolume ?? 0}%`
                ].join('\n')
              }
            ]
          }
        ]
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return pickRandom(fallbackLines);
      }

      const data = await response.json();
      const text = data?.content?.find((part) => part.type === 'text')?.text?.trim();
      return text || pickRandom(fallbackLines);
    } catch {
      return pickRandom(fallbackLines);
    }
  }

  async getAmbientComment(eventType) {
    const fallback = ambientFallback[eventType] ?? pickRandom(fallbackLines);

    if (!this.apiKey) {
      return fallback;
    }

    const promptByEvent = {
      firstOpen: '用户刚点开你。给一句简短欢迎语。',
      trackChange: '音乐刚切歌。给一句氛围评论。',
      timerEnding: '计时即将结束。给一句温和提醒。'
    };

    const prompt = promptByEvent[eventType] ?? '给一句简短陪伴语。';
    return this.getResponse(prompt, {});
  }
}
