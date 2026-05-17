# LoFiClaude — Engineering Specification v0.2

> 面向 Codex 的开发执行规格书
> 版本：v0.2 (匹配产品设计 PRD + 设计风格强化版)
> 架构：Svelte + Vite + Canvas + Howler.js + YouTube iframe API

---

## 项目初始化

```bash
cd /Users/lieliot/Documents/eliot-codex/loficlaude
npm create vite@latest . -- --template svelte
npm install
```

依赖：
```json
{
  "dependencies": {
    "howler": "^2.2.4"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "svelte": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

字体（index.html `<head>` 中）：
```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&display=swap" rel="stylesheet">
```

---

## 状态管理 — appState.js

```javascript
// Svelte writable stores
import { writable, derived } from 'svelte/store';

export const hasStarted = writable(false);
export const uiMode = writable('default'); // default | focus | interactive | companion | sleep

export const player = {
  isPlaying: writable(false),
  currentTrackIndex: writable(0),
  currentTrackTitle: writable(''),
  isLoading: writable(false),
  error: writable(null)
};

export const rain = {
  volume: writable(60),  // 0-100
  type: writable('medium'), // light | medium | heavy
  muted: writable(false)
};

export const scene = {
  current: writable('lofiNight'), // lofiNight | softRain | starDrift
  locked: writable(false),
  transitionProgress: writable(0)
};

export const timer = {
  active: writable(false),
  minutes: writable(45),
  remainingSeconds: writable(2700)
};

export const claude = {
  mood: writable('idle'), // idle | nod | talk | sleep | jump
  bubbleVisible: writable(false),
  bubbleText: writable(''),
  chatOpen: writable(false),
  speaking: writable(false)
};

export const ui = {
  idleSince: writable(null),
  miniPlayerExpanded: writable(false),
  rainPopoverOpen: writable(false),
  timerPopoverOpen: writable(false),
  scenePopoverOpen: writable(false),
  shortcutVisible: writable(false)
};
```

**持久化**：在 App.svelte 的 onMount 中从 localStorage 恢复，每次状态变化时保存。

---

## UI 布局

### 默认态（用户 90% 时间所见）

```
┌────────────────────────────────────────────┐
│ LoFiClaude                        🌧 45:00 │
│                                             │
│                                             │
│          Full-screen Canvas Scene           │
│          (lofi night / soft rain / stars)   │
│                                             │
│                              ┌───────────┐  │
│                              │ 雨声刚刚好 🌧│  ← Claude 气泡
│                              └────▲──────┘  │
│                                   🐙         │  ← Claude 小人
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ lofi hip hop radio - beats   ◀ ❚❚ ▶ 🌧60│ │
│ └─────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### 硬设计约束（必须遵守）

- Canvas 占屏比 ≥ 80%
- 默认可见可点击按钮 ≤ 6 个
- 底部 mini player 高度 ≤ 屏幕 10%
- popover 最大宽度 ≤ 320px
- Claude 气泡最大宽度 ≤ 280px，1-2 行文字
- 对话面板 ≤ 340px × 360px
- 常驻 UI 总面积 ≤ 屏幕 15%
- 5 秒无操作后 UI 透明度降至 0.25-0.35（专注态）

---

## 组件实现

### 文件结构

```
src/
├── App.svelte                  # 主布局 + 点击开始 + idle fade
├── components/
│   ├── AmbientHeader.svelte    # 顶栏: LoFiClaude + scene icon + timer
│   ├── MiniPlayer.svelte       # 底部迷你播放条（默认态）
│   ├── ExpandedPlayer.svelte   # mini player 展开态
│   ├── RainPopover.svelte      # 雨声控制弹出
│   ├── TimerPopover.svelte     # 定时弹出
│   ├── ScenePopover.svelte     # 场景切换弹出
│   ├── ClaudeBubble.svelte     # Claude 气泡（被动/主动）
│   ├── ClaudeChatPanel.svelte  # Claude 对话面板
│   └── KeyboardHint.svelte     # 快捷键提示
├── canvas/
│   ├── CanvasEngine.svelte     # Canvas 主循环
│   ├── ClaudeSprite.js         # Claude 角色动画
│   └── scenes/
│       ├── LofiNightScene.js   # 黑底点阵场景（默认）
│       ├── SoftRainScene.js    # 细雨场景
│       └── StarDriftScene.js   # 星空场景
├── audio/
│   ├── YouTubePlayer.js        # YouTube iframe API 封装
│   └── RainPlayer.js           # Howler.js 雨声播放器
├── ai/
│   └── ClaudeChat.js           # Claude API + 预设句子兜底
└── stores/
    └── appState.js             # Svelte stores
```

### App.svelte

```
顶层组件职责：
1. 全屏布局（Canvas 铺满 + 控件绝对定位在上层）
2. 点击开始画面（静态 Canvas 帧 + "Click to start 🎵"）
3. 初始化 YouTubePlayer + RainPlayer + CanvasEngine
4. 快捷键监听（on:keydown 全局）
5. localStorage 恢复/保存
6. 空闲检测：5 秒无操作 → uiMode = 'focus' → UI 透明度降低
7. 鼠标移动时恢复 uiMode = 'default'
```

**点击开始流程**：
```
打开页面 → 静态 Canvas 场景 + "Click to start 🎵" 
→ 用户点击 → AudioContext.init() → YouTubePlayer.init() 
→ RainPlayer.init('medium') → CanvasEngine.start() 
→ 进入 default 态
```

**空闲检测逻辑**：
```
lastMouseMove = Date.now()
setInterval(每1秒检查:
  if Date.now() - lastMouseMove > 5000 → uiMode = 'focus'
  → AmbientHeader opacity: 0.8 → 0.25
  → MiniPlayer opacity: 0.8 → 0.25
  → Claude opacity: 保持 0.95-1
  鼠标移动时立即恢复 opacity 到默认值
)
```

### AmbientHeader.svelte

```
位置：固定在顶栏，padding 24px
透明度：默认 0.8，focus 态 0.25

结构：
┌─────────────────────────────────────┐
│ LoFiClaude           🌧  45:00      │
└─────────────────────────────────────┘

左侧：产品名 "LoFiClaude" — 字体 Press Start 2P，12-14px
右侧：当前场景图标 + timer
  - 点击场景图标 → 展开 ScenePopover
  - 点击 timer → 展开 TimerPopover
  - 如果 timer 关闭，只显示场景图标
```

### MiniPlayer.svelte + ExpandedPlayer.svelte

**MiniPlayer（默认态）**：
```
高度：48px，距底部 20px，水平居中
样式：background: rgba(8,10,12,0.45)
      border: 1px solid rgba(212,165,116,0.28)
      border-radius: 8px
      backdrop-filter: blur(8px)

默认显示：
┌──────────────────────────────────────────────┐
│ lofi hip hop radio - beats   ◀ ❚❚ ▶ 🌧60 45 │
└──────────────────────────────────────────────┘

透明度：默认 0.8，focus 态 0.25
```

**ExpandedPlayer（点击 mini player 后）**：
```
点击 mini player 播放区 → 展开：

┌──────────────────────────────────────────────┐
│ lofi hip hop radio - beats to relax          │
│                                              │
│ ◄                  ❚❚                  ►    │
└──────────────────────────────────────────────┘

关闭方式：点击外部 / Esc / 鼠标离开 3 秒
```

### Popover 系统

所有 popover 共用行为：
- 点击外部关闭
- Esc 关闭
- 5 秒无操作后自动关闭（非交互态）
- 120ms fade + slight move 动画
- 样式：background: rgba(8,10,12,0.72), border: 1px solid rgba(212,165,116,0.3), backdrop-filter: blur(10px)

**RainPopover**：
```
┌────────────────────┐
│ RAIN               │
│ light medium heavy │
│ ───────●──── 60%   │
└────────────────────┘
```

**TimerPopover**：
```
┌─────────┐
│ TIMER   │
│ 25 min  │
│ 45 min  │
│ 60 min  │
│ Off     │
└─────────┘
```

**ScenePopover**：
```
┌────────────┐
│ SCENE      │
│ 🌙 Night   │
│ 🌧 Rain    │
│ ⭐ Stars   │
│ 🔒 Lock    │
└────────────┘
```

### ClaudeBubble.svelte + ClaudeChatPanel.svelte

**ClaudeBubble（点击 Claude 后）**：
```
位置：Claude 头顶上方
最大宽度：280px
样式：background: rgba(232,224,216,0.92), color: #111, border-radius: 14px

┌──────────────────────┐
│ LoFiClaude        ×  │
│ 今天想做点什么呢？    │   ← 输入态
│ ask something...  →  │
└──────────▲───────────┘
      Claude

被动冒泡：8 秒后自动淡出
主动点击：不自动消失，Esc / 点击外部关闭
```

**ClaudeChatPanel（多轮对话扩展）**：
```
触发条件：对话超过 2 轮
位置：右侧浮层
限制：≤ 340px × 360px

┌─────────────────────────────┐
│ LoFiClaude              ×  │
│ scene: lofiNight rain:60%  │
│                             │
│ Claude: 还在呢 🎵          │
│ You: 陪我专注 25 分钟       │
│ Claude: 好，安静陪你。      │
│                             │
│ say something...       ↵   │
└─────────────────────────────┘
```

### KeyboardHint.svelte

```
按 H 显示/隐藏：
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

---

## Canvas 实现

### CanvasEngine.svelte

```
export 方法: switchScene(index), start(), stop()

核心循环：
function gameLoop(timestamp) {
  ctx.clearRect(0, 0, width, height);
  
  // 5 层渲染
  drawBase(ctx);          // 层1: 纯黑/深蓝黑渐变
  drawFarSky(ctx);        // 层2: 点阵星球、点阵云（极慢漂移）
  drawSkyline(ctx);       // 层3: 城市剪影、灯光闪烁
  drawParticles(ctx, dt); // 层4: 星星/雨滴/流星
  drawForeground(ctx);    // 层5: 窗台/桌面剪影（静态）
  
  claudeSprite.update(dt);
  claudeSprite.draw(ctx);
  
  requestAnimationFrame(gameLoop);
}
```

### 场景切换

每种场景共用 5 层架构，层 4（particles）内容不同：

- **LofiNightScene**（默认）: 点阵星球 + 点阵云 + 城市剪影 + 暖橙灯光
- **SoftRainScene**: 细线雨滴 + 水面反光 + 稀疏窗光
- **StarDriftScene**: 大面积深蓝 + 点阵星星 + 流星偶发

切换使用 1 秒 alpha 淡入淡出。

### ClaudeSprite.js — 角色动画

**角色规格**：
- 橙色像素小人（不是章鱼、不是 3D）
- 基础 sprite: 24×24px，屏幕放大 4x = 96×96px
- 包含：橙色身体、黑色头发顶部块面、白色耳机弧线、黑色方块眼睛、一只手举起、旁边黄色小星
- 位置：距右 48px，距底 80-120px

**色板**：
```
身体主色: #df805f
身体阴影: #b85f48
身体高光: #f09a72
头发黑:   #141414
耳机白:   #e8e0d8
眼睛黑:   #050505
星星黄:   #f1d478
```

**动画状态**：

| 状态 | 帧数 | 触发 | 行为 |
|------|------|------|------|
| idle | 2 帧 | 默认 | 轻微浮动，每 4-8 秒眨眼 |
| blink | 2 帧 | 每 4-8 秒随机 | 眼睛闭/开 |
| nod | 2 帧 | 音乐播放中 | 头部随节奏微动 |
| talk | 2 帧 | Claude 回复/冒泡 | 嘴巴开合 |
| sleep | 2 帧 | timer 到时 | 蜷缩，Zzz 飘出 |
| jump | 3 帧 | 点击 Claude | 小跳一下 |

**点击热区**：sprite 周围扩展 10px 作为 click hit area。

---

## 音频实现

### YouTubePlayer.js

歌单（同 v0.1）：

```javascript
const PLAYLIST = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl - beats to relax' },
  { id: 'YmQ7jRgf4f0', name: 'Claude FM' },
  { id: '5yx6BWlEVcY', name: 'Chillhop Radio' },
  // 待补充
];
```

API 监听：onReady, onStateChange, onError。失败时跳过下一首。

### RainPlayer.js

使用 Howler.js，支持三种雨声强度 type: 'light' | 'medium' | 'heavy'

Rain volume 轻微影响雨滴密度（Canvas 中），用 store 联动。

---

## AI 伴侣 — ClaudeChat.js

### 行为规则

```
1. 默认不说话，只有用户点击 Claude 才交互
2. 事件触发冒泡（极简）：
   - 切歌时（间隔 ≥ 60 秒）
   - 首次打开时（仅一次）
   - timer 剩 5 分钟时（必触发）
3. 主动点击 Claude → 打开气泡 + 输入框
4. 对话 ≥ 2 轮 → 气泡扩展为聊天面板
5. 使用 Claude API（用户自备 Key），无 Key 用 fallback 句子
```

### Fallback 句子

```javascript
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

### API Context

每次调用附带：当前场景名、歌曲名、雨声音量、timer 状态。

---

## 用户流程

### 首次进入
```
打开页面 → 静态 Canvas 帧 + "Click to start 🎵"
→ 点击任意区域 → 初始化音频 → 播 lofi + 雨声
→ Claude 冒泡一次打招呼
→ 进入 default 态
```

### 听歌
```
Canvas 播放像素动画 → mini player 显示歌名
Space 暂停/播放 → ←→ 切歌 → 切歌后 Claude 偶尔评论
```

### 调雨声
```
点击 mini player 中 🌧60 → 弹出 RainPopover
→ 调滑块/切换强度 → 3 秒无操作自动收起
```

### 和 Claude 对话
```
点击 Claude → 小跳动画 → 弹出气泡 + 输入框
→ 用户输入 → Claude 回复
→ 超过 2 轮 → 扩展为聊天面板
```

### Timer 结束
```
剩余 5 分钟 → Claude 提醒 → 背景亮度降低
→ 到时 → 音乐+雨声 3-5 秒淡出 → Claude 睡觉 → Zzz
```

---

## 快捷键

| 快捷键 | 操作 |
|--------|------|
| `Space` | 播放/暂停 |
| `←` | 上一首 |
| `→` | 下一首 |
| `↑` | 雨声 +10% |
| `↓` | 雨声 -10% |
| `M` | 雨声静音 |
| `1` | 切换 lofiNight 场景 |
| `2` | 切换 softRain 场景 |
| `3` | 切换 starDrift 场景 |
| `T` | 打开 timer |
| `H` | 快捷键提示 |
| `Esc` | 关闭气泡/面板/popover |

---

## 实施计划

### Phase 1：项目骨架
```
目标：可运行的 Svelte + Vite 项目，看到页面框架
```
- [ ] 初始化 Svelte + Vite + 依赖
- [ ] 实现 App.svelte 布局（全屏 Canvas + 顶栏 + 底部 mini player）
- [ ] 实现 AmbientHeader（产品名 + scene icon + timer）
- [ ] 实现 MiniPlayer（默认态 + 透明度响应）
- [ ] 实现 stores/appState.js
- [ ] 实现点击开始画面

### Phase 2：Canvas 像素引擎
```
目标：全屏像素画动画流畅运行，三种场景可切换
```
- [ ] CanvasEngine.svelte — 5 层渲染循环
- [ ] LofiNightScene.js — 点阵星球 + 云 + 城市剪影
- [ ] SoftRainScene.js — 细线雨滴 + 反光
- [ ] StarDriftScene.js — 星空 + 流星
- [ ] 1 秒场景切换淡入淡出
- [ ] ClaudeSprite.js — 6 种动画状态

### Phase 3：音频 + 控件
```
目标：lofi 可播、雨声可调、控件可展
```
- [ ] YouTubePlayer.js — iframe API + 歌单切换 + 错误跳过
- [ ] RainPlayer.js — Howler.js + 三种雨声
- [ ] ExpandedPlayer.svelte — 展开播放控制
- [ ] RainPopover — 雨声控制弹出
- [ ] TimerPopover — 定时弹出
- [ ] ScenePopover — 场景切换弹出

### Phase 4：Claude 交互 + 快捷功能
```
目标：AI 伴侣可用、快捷键就绪
```
- [ ] ClaudeBubble.svelte — 被动/主动气泡
- [ ] ClaudeChatPanel.svelte — 对话面板
- [ ] ClaudeChat.js — API + fallback
- [ ] KeyboardHint.svelte
- [ ] 快捷键全局监听
- [ ] localStorage 持久化

### Phase 5：部署
- [ ] Vercel 部署
- [ ] 最终测试

---

## 注意事项

1. **YouTube iframe API** 必须在全局加载，不能用 import
2. **Howler.js AudioContext** 只在用户交互后初始化（点击开始画面解决）
3. **Canvas 尺寸** onMount + onResize 时取 window.innerWidth/Height
4. **localStorage** 只在浏览器端做，SSR 需 `typeof window !== 'undefined'`
5. **Press Start 2P + IBM Plex Mono** 需要网络加载
6. **YouTube 直播流不可拖动进度条** — 不实现 seek
7. **Svelte 的 on:click 和 Canvas 事件** — Canvas 点击需要单独 addEventListener

---

## 验收标准

### Phase 1
- [ ] npm run dev 启动，见到全屏 Canvas + 顶栏 + mini player
- [ ] "Click to start 🎵" 点击后消失
- [ ] 5 秒无操作 mini player 透明度降低
- [ ] 鼠标移动恢复透明度

### Phase 2
- [ ] LofiNight 场景正常渲染（点阵星球+城市剪影）
- [ ] SoftRain 场景雨滴动画流畅
- [ ] StarDrift 场景星星闪烁+流星
- [ ] 场景切换有淡入淡出
- [ ] Claude 角色在角落浮动+眨眼

### Phase 3
- [ ] YouTube 流可播放，可切歌
- [ ] 雨声可调音量，可切换 light/medium/heavy
- [ ] 点击 mini player 展开控制
- [ ] Rain/Timer/Scene popover 可正常展开收起

### Phase 4
- [ ] 点击 Claude 弹出气泡
- [ ] 气泡内可输入，Claude 回复（API 或预设）
- [ ] 超过 2 轮扩展为聊天面板
- [ ] 快捷键全部生效
- [ ] 刷新后状态恢复

### Phase 5
- [ ] Vercel 部署成功
