# LoFiClaude — Phase 4：Claude AI 交互 + 快捷键 + 持久化

## 任务

### 1. src/components/ClaudeBubble.svelte
点击 Claude 角色后弹出气泡：
```
位置：Claude 头顶上方
最大宽度：280px
样式：background: rgba(232,224,216,0.92), color: #111, border-radius: 14px

┌──────────────────────┐
│ LoFiClaude        ×  │
│ 今天想做点什么呢？    │
│ ask something...  →  │
└──────────▲───────────┘
      Claude
```
- 被动气泡 8 秒后自动淡出
- 主动点击 Esc / 点击外部关闭
- 点击 × 关闭

### 2. src/components/ClaudeChatPanel.svelte
多轮对话（≥2 轮）后扩展为小面板：
```
位置：右侧浮层
限制：≤ 340px × 360px
样式：深色毛玻璃 rgba(8,10,12,0.72)
边框：1px solid rgba(212,165,116,0.3)

显示：
- 顶部：角色名 + 当前场景 + 关闭按钮
- 中间：最近 3-5 条对话
- 底部：输入框 + 发送
```
- Esc 关闭 / × 关闭

### 3. src/ai/ClaudeChat.js
```javascript
class ClaudeChat {
  constructor(apiKey) { ... }
  
  async getResponse(userMessage, context) {
    // context: { trackName, sceneName, rainVolume }
    // 有 API Key → 调 Claude API
    // 无 Key → fallbackLines 随机返回
  }
  
  async getAmbientComment(eventType) {
    // eventType: 'firstOpen' | 'trackChange' | 'timerEnding'
    // 返回一句话
  }
}

const fallbackLines = [
  "雨声和 lofi 真的很配 🌧",
  "这首歌很适合慢慢写 🎵",
  "窗外变暗了，别太累。",
  "星星在眨眼 ⭐",
  "还在呢，我陪你。",
  "要不要休息一下？☕",
  "这段节奏很舒服。",
  "还有 5 分钟，我们慢慢收尾。"
];
```

### 4. src/components/KeyboardHint.svelte
按 H 显示/隐藏：
```
┌──────────────┐
│ Space 播放   │
│ ←→   切歌    │
│ ↑↓   雨声    │
│ M    静音    │
│ 1-3  场景    │
│ T    定时    │
│ Esc  关面板  │
│ H    隐藏    │
└──────────────┘
```

### 5. 全局快捷键（在 App.svelte 中实现）
| 快捷键 | 操作 |
|--------|------|
| Space | 播放/暂停 |
| ← | 上一首 |
| → | 下一首 |
| ↑ | 雨声 +10% |
| ↓ | 雨声 -10% |
| M | 雨声静音 |
| 1/2/3 | 切换场景 |
| T | 打开 timer |

在 App.svelte 的 onMount 中添加 `on:keydown` 监听。

### 6. localStorage 持久化（在 App.svelte 中实现）
保存/恢复：
- lastTrackIndex
- rainVolume
- rainType
- currentScene
- sceneLocked

## 文件结构新增
```
src/
├── ai/
│   └── ClaudeChat.js        ← 新增
└── components/
    ├── ClaudeBubble.svelte  ← 新增
    ├── ClaudeChatPanel.svelte ← 新增
    └── KeyboardHint.svelte  ← 新增
```

## 验收标准
- [ ] 点击 Claude 弹出气泡
- [ ] 气泡内可输入，Claude 回复（API 或预设）
- [ ] 超过 2 轮扩展为聊天面板
- [ ] 快捷键全部生效
- [ ] 刷新后状态恢复
- [ ] npm run build 通过
