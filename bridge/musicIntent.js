const RULES = [
  { pattern: /^(暂停|停一下|暂停音乐|pause)$/i, action: 'pause' },
  { pattern: /^(恢复播放|继续播放|resume|播放音乐)$/i, action: 'resume' },
  { pattern: /^(下一首|next song)$/i, action: 'next' },
  { pattern: /^(上一首|prev(?:ious)? song)$/i, action: 'prev' },
  { pattern: /^(停止音乐|停止播放|stop music)$/i, action: 'stop' },
  { pattern: /^(?:切换到网易云(?:音乐)?(?:播放)?|网易云(?:音乐)?播放|播放网易云(?:音乐)?)(?:[，,]?\s*(?:播放)?(?:一些|一下)?\s*lofi)?$/i, action: 'play_playlist', query: 'lofi' },
  { pattern: /^播放(?:一些|一下)?\s*lofi$/i, action: 'play_playlist', query: 'lofi' },
  { pattern: /^play lofi$/i, action: 'play_playlist', query: 'lofi' }
];

function parseMusicIntent(text) {
  const clean = `${text ?? ''}`.trim();
  if (!clean) return null;
  const choice = clean.match(/^(?:播放|选择)?\s*(?:第\s*)?([1-5]|[一二三四五])\s*(?:个|号|首)?$/i);
  if (choice) { const n = {'一':1,'二':2,'三':3,'四':4,'五':5}[choice[1]] || Number(choice[1]); return { action: 'select_playlist', index: n - 1 }; }
  if (/^(取消|算了|cancel)$/i.test(clean)) return { action: 'cancel_selection' };
  const match = RULES.find((rule) => rule.pattern.test(clean));
  return match ? { action: match.action, ...(match.query ? { query: match.query } : {}) } : null;
}

module.exports = { parseMusicIntent };
