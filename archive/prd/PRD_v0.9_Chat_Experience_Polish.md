# LoFiClaude v0.8 → v0.9 — 实现设计方案

> 状态：Ready for Implementation
> 基于：v0.8 验收反馈 + 三方交叉验证 + 代码级分析
> 设计原则：**Claude is present, not distracting.**

---

## 0. 产品愿景

LoFiClaude 是本地 Claude 的 ambient presence。用户在终端/编辑器里工作，眼角余光看到 Claude 的状态——它在想、在工作、在等你。打开 LoFiClaude 页面时听到 lofi 音乐，看到 ASCII 雨夜房间里的 Claude 小人。

v0.9 的核心目标：**对话闭环 + 终端互通。** 用户在 LoFiClaude 里的对话 = 终端里 tmux window 的同一场对话。你可以从浏览器输入，切到终端继续；也可以在终端输入，浏览器同步看到。

---

## F1+F2: 音乐频道扩展 + 自动 Failover

### 实现路径

**文件：** `src/audio/YouTubePlayer.js`

```
// 当前（3 个）
export const PLAYLIST = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl', genre: 'lofi' },
  { id: 'YmQ7jRgf4f0', name: 'Claude FM', genre: 'chill' },
  { id: '5yx6BWlEVcY', name: 'Chillhop Radio', genre: 'chill' }
];

// v0.9（8 个）
export const PLAYLIST = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl', genre: 'lofi' },
  { id: '5yx6BWlEVcY', name: 'Chillhop Radio', genre: 'chill' },
  { id: 'DWcJFNfaw9c', name: 'Chillhop Music', genre: 'chill' },
  { id: '7NOSDKb0HlU', name: 'Homework Radio', genre: 'lofi' },
  { id: '4xDzrJKXOOY', name: 'Synthwave Boy', genre: 'synthwave' },
  { id: 'lTRiuFIWV54', name: 'Jazz Vibes', genre: 'jazz' },
  { id: '36YnV9STBqc', name: 'Ambient Space', genre: 'ambient' },
  { id: '21qNxnCS8WU', name: 'Lofi Geek', genre: 'lofi' }
];
```

**Failover 逻辑：** 在 `YouTubePlayer.loadTrack()` 的错误回调中：
```
onError → skipCount++, if skipCount < playlist.length: loadTrack(currentIndex + 1)
         else: setError('All streams unavailable')
```

**MiniPlayer genre 色点：** 4px 圆点，色值映射 `lofi→#d4a574, jazz→#748fd4, ambient→#74d48a, synthwave→#d474c8, chill→#74d4d4`

**自定义 URL：** MiniPlayer 底部 `+` 按钮 → 弹出 text input → `PLAYLIST.push({ id: extractYouTubeId(url), name: 'Custom', genre: 'custom' })` → 写入 localStorage

### 文件改动清单
| 文件 | 改动 |
|------|------|
| `src/audio/YouTubePlayer.js` | +30 行：playlist 扩展 + failover 逻辑 |
| `src/components/MiniPlayer.svelte` | +20 行：genre 色点 + 自定义 URL 输入 |

---

## F3: Claude 对话时停止走动

### 状态机设计

```
                        用户发送消息
    IDLE ───────────────────────────────► CHAT_ACTIVE
                                            │
    CHAT_ACTIVE ──── 最后 delta + 3s ───► POST_REPLY (12s stillness)
                                            │
    POST_REPLY ───── 12s 超时 ───────────► IDLE (恢复走动)
```

### 实现路径

**`src/canvas/claudeMotion.js`**（+3 行）：
```
export let chatPaused = false;
export function setChatPaused(v) { chatPaused = v; }

// 在 updateClaudeMotion 中，idle→walk 转换之前：
if (chatPaused || claudeState.mode !== 'idle') return;
```

**`src/utils/claudeOrch.js`**（在现有 handleBridgeDelta / sendMessage 中）：
```
import { setChatPaused } from '../canvas/claudeMotion.js';

// sendMessage() 中：
setChatPaused(true);

// handleBridgeStatus('done') 中：
setTimeout(() => setChatPaused(false), 15000);  // 3s post-reply + 12s stillness
```

### 文件改动清单
| 文件 | 改动 |
|------|------|
| `src/canvas/claudeMotion.js` | +3 行 |
| `src/utils/claudeOrch.js` | +4 行 |

---

## F4: 聊天对话体验

### 核心状态机

```
            用户点击 Claude
                 │
    ┌────────────▼────────────┐
    │    BUBBLE VISIBLE        │
    │    (今天想做点什么呢？)    │
    └────────────┬────────────┘
                 │ 用户发第一条消息
    ┌────────────▼────────────┐
    │    BUBBLE + 双边对话     │
    │    (You: xxx)            │
    │    (Claude: yyy...)     │  ← streaming 光标
    └────────────┬────────────┘
                 │ 用户发第二条消息
    ┌────────────▼────────────┐
    │    CHAT PANEL OPEN      │
    │    完整历史 + 输入框     │
    │    关闭→回到气泡摘要     │
    └─────────────────────────┘
```

### 实现路径

**`src/utils/claudeOrch.js` sendMessage() 重构：**

```
async function sendMessage(text) {
  // ... validation ...

  const userRounds = state.history.filter(m => m.role === 'user').length;

  pushMessage('user', clean);

  if (get(connectionStatus) === 'connected') {
    streamingText.set('');
    activeAssistantId = pushMessage('assistant', '');
    bridgeClient.sendMessage(clean);
  } else {
    // Fallback: direct Anthropic API
    const reply = await claudeChat.getResponse(clean, getChatContext());
    pushMessage('assistant', reply);
  }

  // KEY CHANGE: Two-round progression
  if (userRounds === 0) {
    // First message: keep bubble, show conversation
    sync({ history: state.history, loading: true, panelOpen: false, bubbleVisible: true, bubblePassive: false });
  } else {
    // Second message: open chat panel
    sync({ history: state.history, loading: true, panelOpen: true, bubbleVisible: false });
  }

  setVisualState('talking');
  setChatPaused(true);
  return state;
}
```

**`src/components/ClaudeBubble.svelte` 改动：**
- 气泡内消息列表（替代单条 bubbleMessage）
- `{#each recentMessages as msg}` 渲染
- 最大高度 200px，overflow-y: auto
- 保留 "Ask Claude" 输入框在底部

**断连保护：**
```
// 在 ClaudeBubble.svelte handleSubmit 中：
if (!$bridgeConnected) {
  shakeElement(bubbleRoot);  // CSS animation: 红色脉冲 500ms
  showErrorHint('Bridge not connected — run `node bridge/index.js`');
  return;  // 消息保留在 input 中
}
```

**localStorage 持久化：**
```
// claudeOrch.js
function persistHistory() {
  try {
    const subset = state.history.slice(-50);
    localStorage.setItem('loficlaude-chat-history', JSON.stringify(subset));
  } catch {
    // quota exceeded — silently degrade
  }
}

function restoreHistory() {
  try {
    const raw = localStorage.getItem('loficlaude-chat-history');
    if (raw) state.history = JSON.parse(raw);
  } catch { /* ignore corrupt data */ }
}
```

### 文件改动清单
| 文件 | 改动 |
|------|------|
| `src/utils/claudeOrch.js` | +50 行：sendMessage 重构 + persist/restore |
| `src/components/ClaudeBubble.svelte` | +30 行：消息列表渲染 + 断连 shake |
| `src/components/ClaudeChatPanel.svelte` | +5 行：移除 slice(-5) |

---

## F5: 打字机效果

### 实现路径（纯 CSS + 1 个 class）

**`src/components/ClaudeChatPanel.svelte` 和 `ClaudeBubble.svelte`：**

```css
/* 像素风闪烁光标 */
.streaming-text::after {
  content: '';
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #d4a574;
  vertical-align: text-bottom;
  margin-left: 1px;
  animation: pixel-blink 500ms steps(1) infinite;
}

@keyframes pixel-blink {
  0%, 65%  { opacity: 1; }
  66%, 100% { opacity: 0; }
}

/* 淡入效果：新到达的文本 */
.streaming-text span.delta {
  animation: text-fade-in 120ms ease-out;
}

@keyframes text-fade-in {
  from { opacity: 0.6; }
  to   { opacity: 1; }
}
```

**渲染逻辑：**
```
{#if loading && item.role === 'assistant' && item.id === activeAssistantId}
  <p class="streaming-text">{item.text}<span class="delta"></span></p>
{:else}
  <p>{item.text}</p>
{/if}
```

### 文件改动清单
| 文件 | 改动 |
|------|------|
| `src/components/ClaudeChatPanel.svelte` | +15 行 CSS |
| `src/components/ClaudeBubble.svelte` | +10 行 CSS |

---

## F6: Claude 形态重设计

### 精简表

**移除（5 个）：** dance_sway, dance_bounce, dance_sway_dj, dance_bounce_dj, expression_surprise, expression_wink, idle_blink

**保留 + 新增（8 个）：**

| # | ID | 分类 | 视觉特征 | 帧数 |
|---|-----|------|---------|------|
| 0 | idle_breathe | 待机 | 呼吸起伏 | 14 |
| 1 | idle_look_around | 待机 | 视线移动+耳朵转 | 16 |
| 2 | work_coding | 工作 | 电脑+键盘 | 23 |
| 3 | work_think | 工作 | 头顶浮现符号 | 24 |
| 4 | nap | **新** — 休息 | 趴桌上、眼睛闭合 | ≥4 |
| 5 | journal | **新** — 记录 | 手持笔写字 | ≥4 |
| 6 | dance_djmix | 娱乐 | DJ 台+手势 | 17 |
| 7 | expression_sleep | 休息 | 闭眼呼吸 | 25 |

### 新增形态规格

**nap (趴桌睡觉)：**
- baseRows 预览：身体前倾 45°，头部贴在桌面上，眼睛 `...` 闭合
- 动画帧：f1) 静止 → f2) 肩膀微抬（吸气）→ f3) 静止 → f4) 肩膀落下（呼气）
- 颜色：标准 palette (terracotta + dark)

**journal (写笔记本)：**
- baseRows 预览：坐姿，面前有小本子，右手持笔
- 动画帧：f1) 笔在左侧 → f2) 笔移到右侧 → f3) 笔回左侧
- 颜色：新增 notebook 颜色 (beige #d4c9a8)

### 文件改动清单
| 文件 | 改动 |
|------|------|
| `src/canvas/claudepixForms.js` | 移除 5 个 form + 新增 2 个 form 数据 |

---

## F7: 终端会话可见（tmux 集成）

### 架构

```
┌─────────────────────────────────────────┐
│              Terminal (Ghostty)         │
│  ┌──────────────┬────────────────────┐  │
│  │ Claude (L)   │  loficlaude-claude │  │
│  │              │  (tmux window)     │  │
│  │              │                    │  │
│  │              │  $ claude -p       │  │
│  │              │  > Hello           │  │
│  │              │  Claude: Hi! ...   │  │
│  └──────────────┴────────────────────┘  │
│         ▲                    ▲          │
│         │                    │          │
│    tmux send-keys    tmux capture-pane  │
│         │                    │          │
│  ┌──────┴────────────────────┴───────┐  │
│  │         Bridge (index.js)         │  │
│  │    WebSocket ↔ tmux ↔ Claude      │  │
│  └────────────────┬──────────────────┘  │
│                   │ WebSocket           │
│  ┌────────────────▼──────────────────┐  │
│  │     LoFiClaude (Browser :5173)    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 实现路径

**`bridge/index.js` 改动：**

```
1. 检查 tmux 是否可用：
   execSync('tmux has-session', { stdio: 'ignore' })

2. 创建命名 window：
   execSync('tmux new-window -t 0 -n loficlaude-claude', { stdio: 'ignore' })

3. 存储 window 标识：
   const TMUX_TARGET = `${tmuxSession}:loficlaude-claude`

4. 启动 Claude（替代当前的 spawn('claude', ...)）：
   execSync(`tmux send-keys -t ${TMUX_TARGET} "claude -p --output-format stream-json" C-m`)

5. 增量读取 pane 输出（1s 轮询）：
   let lastLineCount = 0;
   setInterval(() => {
     const output = execSync(`tmux capture-pane -t ${TMUX_TARGET} -p -S -200`, { encoding: 'utf8' });
     const lines = output.split('\n').filter(Boolean);
     const newLines = lines.slice(lastLineCount);
     lastLineCount = lines.length;
     // parse newLines as JSON events → WebSocket send
   }, 1000);

6. 前端消息 → tmux：
   on('user_message', ({ text }) => {
     execSync(`tmux send-keys -t ${TMUX_TARGET} "${sanitizeForShell(text)}" C-m`);
   });

7. 关闭时保留 window：
   process.on('exit', () => {
     console.log('tmux window loficlaude-claude preserved');
   });
```

**降级路径：** tmux 不可用 → 回退到直接 spawn claude（当前行为）+ console.warn("tmux not available, terminal session disabled")

### 用户体验流

```
1. 用户运行: node bridge/index.js
2. 终端: 🔌 Bridge running on ws://localhost:9120
         📺 Claude session: tmux window 'loficlaude-claude'
3. 用户: Ctrl+B w → 选择 loficlaude-claude
4. 看到: claude -p 提示符
5. 打字: "帮我写一个 React hook"
6. Claude 回复流式出现
7. 同时: 浏览器 LoFiClaude 同步显示这段对话
8. 用户关闭浏览器 → 终端 window 里对话还在
9. 用户随时可以切回这个 window 继续对话
```

### 文件改动清单
| 文件 | 改动 | 复杂度 |
|------|------|--------|
| `bridge/index.js` | +80 行：tmux window 创建 + pane 轮询 | High |
| `bridge/server.js` | +10 行：WebSocket → tmux send-keys | Low |
| `bridge/config.js` | +3 行：tmux_enabled flag | Low |

---

## 7. 实施顺序

### Milestone 1: Chat UX Fix（P0 — 先做，影响最大）
```
F3: 停止走动        ClaudeMotion.js +3, claudeOrch.js +4
F4: 气泡→面板渐进    claudeOrch.js +50, ClaudeBubble.svelte +30
F5: 打字机 CSS       ChatPanel.svelte +15, Bubble.svelte +10
```
预估工时：30-45 分钟

### Milestone 2: Music + Terminal（P1）
```
F1+F2: 音乐扩展      YouTubePlayer.js +30, MiniPlayer.svelte +20
F7: tmux 终端会话    bridge/index.js +80, server.js +10
```
预估工时：45-60 分钟

### Milestone 3: Forms Refresh（P2）
```
F6: 形态精简+新增    claudepixForms.js 数据层重构
```
预估工时：60-90 分钟（像素素材设计占大部分）

---

## 8. 验证清单

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 8 个音乐频道可切换 | 浏览器逐一切换，确认播放 |
| 2 | 播放失败自动 skip | 手动塞一个死 ID，确认 failover |
| 3 | 对话时 Claude 站立不动 | 发消息 → 观察 15s |
| 4 | 第一轮消息气泡保留 | 发消息 → 气泡不消失 → 显示双边对话 |
| 5 | 第二轮自动打开面板 | 发第二条 → 面板开 → 显示完整历史 |
| 6 | 打字机闪烁 | 观察 streaming 末尾的琥珀色像素块 |
| 7 | 8 个形态三击可循环 | 三击 Claude → 循环 8 次确认 |
| 8 | 断连发送红色脉冲 | 不启 Bridge → 发消息 → 红色抖动 |
| 9 | 刷新后对话恢复 | 对话 → F5 → 历史还在 |
| 10 | 终端 tmux window 可见 | `node bridge/index.js` → Ctrl+B w → 看到 loficlaude-claude |
| 11 | 终端 ↔ 浏览器对话同步 | 终端输入 → 浏览器看到；浏览器输入 → 终端看到 |
| 12 | npm test 全过 | `npm test` |
| 13 | npm run build 干净 | `npm run build` |
