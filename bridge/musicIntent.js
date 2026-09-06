const RULES = [
  { pattern: /(暂停|停一下|pause)/i, action: 'pause' },
  { pattern: /(继续|恢复播放|resume)/i, action: 'resume' },
  { pattern: /(下一首|next)/i, action: 'next' },
  { pattern: /(上一首|prev)/i, action: 'prev' },
  { pattern: /(停止雨声|停止音乐|停止播放|stop)/i, action: 'stop' },
  { pattern: /(切换到网易云|网易云播放|播放网易云|播放.*lofi|play.*lofi)/i, action: 'play_playlist', query: 'lofi' }
];

function parseMusicIntent(text) {
  const clean = `${text ?? ''}`.trim();
  if (!clean) return null;
  const choice = clean.match(/(?:播放|选择)第?\s*([1-5])\s*个?/i);
  if (choice) return { action: 'select_playlist', index: Number(choice[1]) - 1 };
  const match = RULES.find((rule) => rule.pattern.test(clean));
  return match ? { action: match.action, ...(match.query ? { query: match.query } : {}) } : null;
}

module.exports = { parseMusicIntent };
