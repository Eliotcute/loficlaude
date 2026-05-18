# LoFiClaude v0.4 — ASCII 动态背景 + Claude Motion 设计 PRD & 技术架构

> 版本：v0.4  
> 状态：Design / Tech Architecture Revision  
> 当前基础：已有 Web 页面、底部播放器、Claude 小人、点击 Claude 可对话并弹出对话框  
> 本次核心升级：从“静态/普通 Canvas 背景”升级为 **Claude FM 风格的程序化 ASCII 背景 + 可移动 Claude Sprite 角色系统**  
> 设计原则：**Low-interruption as a hard rule. Claude is a living companion, not a button. Background is a generated ambient world, not a static wallpaper.**

---

## 1. 产品一句话

**一个在 ASCII 点阵世界里陪你听 lofi 的 Claude 小人。**

用户打开页面后，进入一个黑底点阵风格的 lofi 空间。背景由程序生成：点阵窗户、桌子、植物、城市、星球、星星、雨。Claude 小人不是背景的一部分，而是独立 sprite 角色，可以在场景中低频走动、停留、点头、冒泡、和用户对话。

---

## 2. 本次改版目标

当前网站已经具备：

- 深色背景
- 雨滴 Canvas
- 底部播放器 / 上拉控制
- Claude 小人
- 点击 Claude 可弹出对话框
- Claude 可进行对话

但还存在：

| 问题 | 当前表现 | v0.4 目标 |
|---|---|---|
| 背景不够像 Claude FM | 当前更像普通黑色雨幕 | 改为黑底 ASCII / 点阵环境 |
| Claude 缺少生命感 | 角色基本固定在右下角 | Claude 可低频移动、停留、做动作 |
| 背景和角色融合不够 | Claude 像贴在 UI 上 | Claude 在场景底部活动区域中行走 |
| 沉浸感不足 | 画面空、层次少 | 程序化点阵房间 + 城市 + 星球 + 粒子 |
| 技术结构不清 | Canvas / UI / 角色可能耦合 | 拆成 Background、Motion、Sprite、UI、AI 层 |

---

## 3. Design North Star

LoFiClaude 的默认界面应该像一个正在播放音乐的 ASCII 夜晚屏保。

用户不操作时，它几乎不像一个 App。  
用户需要控制时，播放器轻轻出现。  
用户需要陪伴时，点击 Claude。  
Claude 不是一个按钮，而是住在这个点阵世界里的小伙伴。

---

## 4. 设计风格方向

### 4.1 关键词

| 关键词 | 说明 |
|---|---|
| ASCII / Dotted | 用点阵而不是厚重插画构成环境 |
| 黑底 | 接近 Claude FM / lofi.cafe 的黑色空间 |
| 低对比 | 背景点阵不抢 UI 和 Claude |
| 少量暖色 | 暖橙只用于灯光、状态、激活态 |
| Claude 橙 | Claude 是画面中最明显的色块 |
| 低频动画 | 背景和角色都要慢，不要像游戏 |
| 可久待 | 画面适合开着放在旁边 |

---

## 5. 低干扰硬规则

这些是实现约束，不是审美建议。

### 5.1 默认界面只允许出现

1. ASCII 背景
2. Claude 小人
3. 当前播放状态
4. 雨声 / timer 状态
5. 必要顶部 HUD

其他功能必须隐藏在：

- 点击
- hover
- 上拉播放器
- 快捷键
- Claude 对话框
- popover

之后。

### 5.2 禁止项

- 默认显示大白卡片
- 默认显示完整聊天窗口
- 底部 tab bar
- 大面积播放器面板常驻
- 高饱和背景
- 背景里出现过多真实插画细节
- Claude 长时间高频跑动
- UI 按钮数量过多

### 5.3 默认 UI 限制

| 项目 | 限制 |
|---|---|
| 默认可见按钮 | 不超过 6 个 |
| 默认播放器高度 | 48–56px |
| 默认 popover | 不显示 |
| 默认聊天面板 | 不显示 |
| Claude 气泡 | 被动最多 1–2 行 |
| 5 秒无操作 | HUD opacity 降到 0.25–0.4 |

---

## 6. 页面层级架构

推荐分 5 层：

```text
Layer 1: Base Background
  黑底 / 深色渐变 / 暗角

Layer 2: ASCII Generated Scene
  点阵房间、窗户、桌子、植物、城市、星球、云

Layer 3: Ambient Overlay
  雨、星星闪烁、轻粒子、流星、水波

Layer 4: Claude Sprite Layer
  Claude 移动、idle、walk、talk、sleep、bubble anchor

Layer 5: HUD UI Layer
  Header、Mini Player、Player Drawer、Popover、Chat Panel
```

---

## 7. ASCII 背景系统

### 7.1 背景不再作为静态 PNG 的主方案

v0.4 的核心背景应由 Canvas 程序化生成，而不是依赖静态图。

静态 PNG 可保留为 fallback 或 loading placeholder，但主体验应是：

```text
black canvas + dotted shapes + subtle animation
```

---

### 7.2 背景基础元素

| 元素 | 说明 |
|---|---|
| Window | 左侧或背景中的点阵窗框 |
| Desk | 底部点阵桌面 / 平台 |
| Plant | 点阵植物，低亮度 |
| Lamp | 小范围暖橙灯光 |
| City | 远处城市剪影，少量橙色窗灯 |
| Planet | 点阵星球 / 月亮 |
| Clouds | 点阵云，缓慢漂移 |
| Stars | 小点闪烁 |
| Rain | 细线 / 点阵雨滴 |
| Poster / Frame | 墙上的点阵画框 |

---

### 7.3 三个场景

#### Scene 1：lofi-night

默认场景。

视觉：

- 黑底
- 点阵房间
- 左侧窗户 / 桌面
- 远处城市
- 点阵星球
- 少量暖灯

适合：

- 默认打开
- 工作 / 学习

---

#### Scene 2：soft-rain

雨声主场景。

视觉：

- 黑蓝背景
- 点阵城市
- 细雨
- 水面或地面反光
- 少量暖灯

适合：

- 雨声音量较高
- 专注 / 放松

---

#### Scene 3：star-drift

星空漂浮场景。

视觉：

- 大面积黑底
- 点阵星球
- 点阵星星
- 少量流星
- 城市剪影较低
- Claude 可在底部平台走动

适合：

- 夜晚
- 低雨声
- 发呆

---

## 8. ASCII Renderer 技术设计

### 8.1 核心文件

```text
src/canvas/
├── asciiRenderer.js
├── asciiObjects.js
├── asciiScenes.js
├── ambientParticles.js
└── canvasLoop.js
```

---

### 8.2 数据结构

#### asciiScenes.js

```js
export const scenes = {
  "lofi-night": {
    baseColor: "#0b0d0e",
    objects: [
      { type: "window", x: 60, y: 100, w: 260, h: 340 },
      { type: "desk", x: 0, y: 760, w: 700, h: 160 },
      { type: "plant", x: 160, y: 680, scale: 1 },
      { type: "planet", x: 1120, y: 180, r: 90 },
      { type: "city", baseY: 760 },
      { type: "cloud", x: 760, y: 220, scale: 1 },
      { type: "lamp", x: 250, y: 710 }
    ],
    particles: ["stars"]
  },

  "soft-rain": {
    baseColor: "#071018",
    objects: [
      { type: "city", baseY: 735 },
      { type: "balcony", y: 780 },
      { type: "cloud", x: 650, y: 130, scale: 1.3 },
      { type: "lamp", x: 220, y: 600 }
    ],
    particles: ["rain", "waterRipples"]
  },

  "star-drift": {
    baseColor: "#060913",
    objects: [
      { type: "planet", x: 720, y: 250, r: 95 },
      { type: "city", baseY: 790 },
      { type: "platform", y: 820 },
      { type: "cloud", x: 280, y: 500, scale: 1.2 }
    ],
    particles: ["stars", "meteors"]
  }
};
```

---

### 8.3 点阵渲染函数

```js
function dot(ctx, x, y, color, size = 2) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}

function dottedRect(ctx, x, y, w, h, options) {
  const spacing = options.spacing ?? 8;
  const density = options.density ?? 1;
  const color = options.color ?? "rgba(230,230,220,0.65)";

  for (let yy = y; yy < y + h; yy += spacing) {
    for (let xx = x; xx < x + w; xx += spacing) {
      if (Math.random() < density) {
        dot(ctx, xx, yy, color);
      }
    }
  }
}
```

注意：  
静态对象不应该每帧重新随机，否则画面会闪烁。应使用 seed 或提前生成点阵缓存。

---

### 8.4 性能优化

| 问题 | 方案 |
|---|---|
| 点阵对象每帧重绘成本高 | 静态背景画到 offscreen canvas |
| 粒子需要动画 | 单独 Canvas 或单独 draw pass |
| resize 频繁 | debounce resize |
| 高 DPI | 使用 devicePixelRatio，但限制 max DPR=2 |
| 背景闪烁 | 使用 seeded random 固定点阵 |
| 低端设备 | 降低点数 density / spacing |

---

### 8.5 Canvas 循环

```js
function loop(timestamp) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  drawStaticBackgroundIfNeeded();
  updateParticles(delta);
  drawParticles(ctx);
  updateClaude(delta);
  drawClaude(ctx);

  requestAnimationFrame(loop);
}
```

如果 Claude 用 DOM sprite，也可以将 Claude 从 canvas 中拆出，Canvas 只负责背景。

---

## 9. Claude Motion System

### 9.1 设计目标

Claude 是独立 sprite，不烘焙进背景。

Claude 可以在底部活动区域内低频移动。  
移动不承担游戏玩法，只用于增强陪伴感。

---

### 9.2 Claude 活动区域

Claude 不应全屏乱跑，只在底部 20–30% 区域活动。

```js
const walkBounds = {
  minX: 80,
  maxX: window.innerWidth - 160,
  minY: window.innerHeight * 0.66,
  maxY: window.innerHeight * 0.84
};
```

播放器展开时，Claude 必须避开 drawer。

```js
if (ui.playerExpanded) {
  walkBounds.maxY = window.innerHeight - 280;
}
```

---

### 9.3 移动规则

| 规则 | 数值 |
|---|---|
| idle 等待时间 | 5–12 秒 |
| 是否移动 | 每次 idle 结束 40–60% 概率移动 |
| 单次移动距离 | 屏幕宽度 10–35% |
| 移动速度 | 20–36px/s |
| 移动方式 | 线性或 ease-in-out |
| 点击 Claude | 停止移动，进入 talk |
| 气泡显示时 | 不移动 |
| sleep 状态 | 不移动 |

---

### 9.4 Claude 状态机

```text
idle
  ├─ random → walk
  ├─ music playing → bop
  ├─ user click → talk
  └─ timer end → sleep

walk
  ├─ arrive target → idle
  ├─ user click → talk
  └─ timer end → sleep

talk
  ├─ bubble close → idle
  └─ multi-turn chat → chat

chat
  ├─ close panel → idle
  └─ timer end → sleep

sleep
  └─ user restart / play → idle
```

---

### 9.5 状态定义

| 状态 | 表现 | 触发 |
|---|---|---|
| idle | 轻微上下浮动，偶尔眨眼 | 默认 |
| walk | 走向目标点 | 随机触发 |
| bop | 随音乐轻微点头 | 播放中且未移动 |
| talk | 停住，显示气泡 | 点击 / AI 回复 |
| chat | 对话面板打开 | 多轮对话 |
| sleep | 低头 / Zzz | timer 结束 |
| jump | 小跳一下 | 点击瞬间 |

---

## 10. Claude Sprite 设计

### 10.1 视觉参考

必须参考用户提供的 Claude FM 小人：

- 橙色像素身体
- 黑色头顶 / 头发块
- 白色耳机弧线
- 黑色方块眼睛
- 一只手举起
- 右侧黄色小星
- 身体偏横向，不是普通人形
- 不要做成章鱼

---

### 10.2 Sprite Sheet 规格

```text
public/sprites/claude-sprite.png
```

建议：

| 项目 | 数值 |
|---|---|
| 单帧尺寸 | 24×24 px |
| 显示倍率 | 4x |
| 默认显示尺寸 | 96×96 px |
| 帧间距 | 0 |
| 渲染方式 | image-rendering: pixelated |

---

### 10.3 Sprite Sheet 帧布局

```text
row 0: idle_1 idle_2 blink_1 blink_2
row 1: walk_right_1 walk_right_2 walk_right_3 walk_right_4
row 2: walk_left_1  walk_left_2  walk_left_3  walk_left_4
row 3: talk_1 talk_2 bop_1 bop_2
row 4: sleep_1 sleep_2 jump_1 jump_2
```

MVP 可以先做 8 帧：

```text
idle_1
idle_2
walk_1
walk_2
talk_1
talk_2
sleep_1
sleep_2
```

---

### 10.4 CSS 渲染

```css
.claude-sprite {
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
  position: absolute;
  transform: translate3d(var(--x), var(--y), 0);
  cursor: pointer;
}
```

---

## 11. Claude 对话系统

当前网站已有点击 Claude 可对话的基础，v0.4 保留并强化。

### 11.1 点击 Claude

```text
点击 Claude
↓
Claude 停止移动
↓
Claude 小跳一下
↓
显示输入气泡 / 对话框
↓
进入 talk 状态
```

---

### 11.2 对话框定位

对话框应绑定 Claude 当前坐标，而不是固定在屏幕中央。

```js
bubble.x = claude.x + 40;
bubble.y = claude.y - 100;
```

边界处理：

- 如果 Claude 靠右，气泡向左展开
- 如果 Claude 靠底，气泡向上展开
- 如果播放器 drawer 展开，气泡不遮挡 drawer

---

### 11.3 气泡类型

#### 被动气泡

用于事件触发。

```text
┌───────────────┐
│ 还在呢 🎵      │
└──────▲────────┘
```

规则：

- 1–2 行
- 8 秒淡出
- 不显示输入框
- 频率低

#### 输入气泡

用户点击 Claude 后出现。

```text
┌──────────────────────┐
│ LoFiClaude        ×  │
│ 今天想做点什么呢？    │
│ ask something...  →  │
└──────────▲───────────┘
```

#### 多轮对话面板

超过 2 轮后展开。

```text
┌────────────────────────┐
│ LoFiClaude          ×  │
│ scene: soft-rain       │
│                        │
│ Claude: 还在呢 🎵      │
│ You: 陪我专注 25 分钟   │
│ Claude: 好，我陪你。    │
│                        │
│ ask something...    →  │
└────────────────────────┘
```

---

### 11.4 AI 上下文

每次调用 AI 时附带当前状态：

```js
const context = {
  track: player.currentTrackTitle,
  scene: background.currentScene,
  rainVolume: rain.volume,
  rainType: rain.type,
  timerRemaining: timer.remainingSeconds,
  timeOfDay: new Date().toLocaleTimeString(),
  claudeMood: claude.mode
};
```

---

### 11.5 无 API Key fallback

```js
const fallbackLines = [
  "还在呢 🎵",
  "雨声刚刚好 🌧",
  "这首适合慢慢写。",
  "我们安静一点。",
  "还有 5 分钟，慢慢收尾吧。",
  "星星在看着呢。",
  "雨变大了，要不要小一点？"
];
```

---

## 12. 播放器系统

### 12.1 当前方向保留

底部播放器继续使用：

- 默认 mini bar
- 点击 / 上拉展开 drawer
- 低干扰
- 无底部 tab bar

---

### 12.2 Mini Bar

```text
┌────────────────────────────────────┐
│ Claude FM                 ❚❚  🌧60 │
└────────────────────────────────────┘
```

---

### 12.3 Expanded Drawer

```text
┌────────────────────────────────────┐
│ NOW PLAYING                        │
│ Claude FM 克劳德调频               │
│                                    │
│        ◀      ❚❚      ▶            │
│                                    │
│ RAIN     light medium heavy        │
│          ─────────●──── 60%        │
│                                    │
│ TIMER    25  45  60  off           │
└────────────────────────────────────┘
```

---

### 12.4 播放器与 Claude 避让

播放器展开时：

- Claude 不应被遮挡
- Claude 活动区域上移
- 气泡不覆盖 drawer

---

## 13. 顶部 HUD

### 13.1 左上

```text
+ LoFiClaude
```

可选：

- 点击 `+` 打开 scene popover / 设置
- hover 时轻微提亮

### 13.2 右上

```text
🎵 Track Name
🌧 60
45:00
```

Claude FM 风格中，右上角音乐 HUD 可以显示当前歌名：

```text
♪ Apple - Taking Photos  Elli
```

LoFiClaude 可显示：

```text
♪ Claude FM - 克劳德调频
```

---

## 14. 技术架构

### 14.1 总体架构

```text
Svelte + Vite
│
├── Canvas Background System
│   ├── ASCII renderer
│   ├── scene objects
│   ├── particle overlay
│   └── seeded random cache
│
├── Claude Motion System
│   ├── sprite renderer
│   ├── state machine
│   ├── path target picker
│   └── collision / bounds with UI
│
├── Audio System
│   ├── YouTube iframe player
│   └── RainPlayer / Howler
│
├── AI Companion System
│   ├── Claude API
│   ├── local fallback
│   └── context builder
│
├── UI System
│   ├── AmbientHeader
│   ├── PlayerDrawer
│   ├── Popovers
│   └── Chat Bubble / Panel
│
└── State / Persistence
    ├── Svelte stores
    ├── localStorage
    └── idle detector
```

---

### 14.2 文件结构

```text
src/
├── App.svelte
├── components/
│   ├── AmbientHeader.svelte
│   ├── AsciiBackground.svelte
│   ├── CanvasOverlay.svelte
│   ├── ClaudeSprite.svelte
│   ├── ClaudeBubble.svelte
│   ├── ClaudeChatPanel.svelte
│   ├── PlayerDrawer.svelte
│   ├── RainPopover.svelte
│   ├── TimerPopover.svelte
│   ├── ScenePopover.svelte
│   └── KeyboardHint.svelte
├── canvas/
│   ├── asciiRenderer.js
│   ├── asciiScenes.js
│   ├── asciiObjects.js
│   ├── ambientParticles.js
│   └── seededRandom.js
├── claude/
│   ├── claudeMotion.js
│   ├── claudeStateMachine.js
│   └── spriteFrames.js
├── audio/
│   ├── YouTubePlayer.js
│   └── RainPlayer.js
├── ai/
│   ├── ClaudeChat.js
│   ├── fallbackLines.js
│   └── buildContext.js
├── stores/
│   ├── appState.js
│   ├── playerStore.js
│   ├── claudeStore.js
│   └── uiStore.js
└── utils/
    ├── idle.js
    ├── localStorage.js
    └── bounds.js
```

---

### 14.3 public 目录

```text
public/
├── sprites/
│   └── claude-sprite.png
├── rain/
│   ├── rain-light.mp3
│   ├── rain-medium.mp3
│   └── rain-heavy.mp3
└── backgrounds/
    ├── fallback-lofi-night.png
    ├── fallback-soft-rain.png
    └── fallback-star-drift.png
```

---

## 15. 状态结构

```js
const appState = {
  hasStarted: false,

  background: {
    mode: "ascii",
    currentScene: "lofi-night",
    locked: false,
    seed: 12345
  },

  player: {
    isPlaying: false,
    currentTrackIndex: 0,
    currentTrackTitle: "Claude FM 克劳德调频",
    isLoading: false,
    error: null
  },

  rain: {
    volume: 60,
    type: "medium",
    muted: false
  },

  timer: {
    active: true,
    minutes: 45,
    remainingSeconds: 2700
  },

  claude: {
    x: 1200,
    y: 720,
    targetX: 1200,
    targetY: 720,
    direction: "right",
    mode: "idle",
    frame: 0,
    idleTime: 8000,
    bubbleVisible: false,
    bubbleText: "",
    chatOpen: false,
    conversationTurns: 0
  },

  ui: {
    idle: false,
    playerExpanded: false,
    rainPopoverOpen: false,
    timerPopoverOpen: false,
    scenePopoverOpen: false,
    shortcutVisible: false
  }
};
```

---

## 16. Claude Motion 核心伪代码

```js
function updateClaude(delta, state, ui) {
  if (state.mode === "sleep") return;

  if (state.mode === "talk" || state.chatOpen) {
    updateTalkAnimation(delta);
    return;
  }

  if (state.mode === "idle") {
    state.idleTime -= delta;

    if (state.idleTime <= 0) {
      if (Math.random() < 0.5) {
        state.target = pickNextTarget(getWalkBounds(ui));
        state.mode = "walk";
      } else {
        state.idleTime = random(5000, 12000);
      }
    }

    updateIdleAnimation(delta);
    return;
  }

  if (state.mode === "walk") {
    moveTowardTarget(delta, state);

    if (distanceToTarget(state) < 4) {
      state.mode = "idle";
      state.idleTime = random(5000, 12000);
    }
  }
}
```

---

## 17. 交互流程

### 17.1 启动

```text
进入页面
↓
显示 ASCII 背景静态初始态
↓
Click to start
↓
启动音频 + Canvas loop + Claude motion
↓
Claude 冒泡：还在呢 🎵
```

---

### 17.2 Claude 自动移动

```text
Claude idle 5–12 秒
↓
随机选择是否移动
↓
选择底部活动区域内目标点
↓
缓慢走过去
↓
停下，继续 idle / bop
```

---

### 17.3 点击 Claude 对话

```text
点击 Claude
↓
Claude 停止移动 + 小跳
↓
气泡跟随 Claude 坐标出现
↓
用户输入
↓
Claude 回复
↓
对话超过 2 轮后扩展小面板
```

---

### 17.4 播放器展开

```text
点击底部 mini bar / 上拉
↓
Player Drawer 展开
↓
Claude 活动区域上移避让
↓
Esc / 点击背景收起
↓
Claude 恢复原活动区域
```

---

## 18. 声音与视觉联动

| 事件 | Claude 反馈 | 背景反馈 |
|---|---|---|
| 音乐播放 | 轻微点头 / bop | 音乐 HUD 高亮 |
| 暂停 | 停止点头 | HUD 变暗 |
| 切歌 | 冒泡评论 | 右上歌名更新 |
| 雨声 > 60 | 看雨 / 冒泡 | 雨滴密度略增 |
| 雨声 < 20 | 安静 idle | 雨滴变稀 |
| timer 剩 5 分钟 | 困倦提醒 | 暗角略增强 |
| timer 结束 | sleep | 音乐雨声淡出 |

---

## 19. localStorage

| Key | 说明 | 默认 |
|---|---|---|
| `backgroundScene` | 当前场景 | `lofi-night` |
| `backgroundMode` | 背景模式 | `ascii` |
| `rainVolume` | 雨声音量 | 60 |
| `rainType` | 雨声类型 | `medium` |
| `lastTrack` | 最后播放曲目 | 0 |
| `timerMinutes` | 定时分钟 | 45 |
| `sceneLocked` | 是否锁定场景 | false |
| `chatHistory` | 最近对话 | 最近 20 条 |
| `claudePosition` | 可选，最后位置 | 不建议默认恢复，可随机 |

---

## 20. 实施计划

### Phase 1：ASCII 背景系统

目标：背景从空黑雨幕升级为 Claude FM 风格点阵世界。

任务：

- [ ] 新建 `AsciiBackground.svelte`
- [ ] 新建 `asciiRenderer.js`
- [ ] 新建 `asciiScenes.js`
- [ ] 实现 dotted rect / circle / line / cloud
- [ ] 实现 lofi-night 场景
- [ ] 实现 soft-rain 场景
- [ ] 实现 star-drift 场景
- [ ] 静态对象使用 offscreen canvas 缓存
- [ ] 粒子层单独动画

验收：

- 背景明显是 ASCII / 点阵风格
- 不再是纯黑雨幕
- 背景不闪烁
- UI 仍然清晰

---

### Phase 2：Claude Motion System

目标：Claude 小人可以在背景中低频走动。

任务：

- [ ] 新建 `claudeMotion.js`
- [ ] 新建 `claudeStateMachine.js`
- [ ] 定义 walkBounds
- [ ] 实现 idle / walk / talk / sleep
- [ ] 实现随机目标点
- [ ] 实现播放器展开避让
- [ ] 点击 Claude 停止移动
- [ ] 气泡跟随 Claude 位置

验收：

- Claude 会低频走动
- 不会走到 UI 下面
- 点击后停止并弹出对话
- 气泡位置跟随 Claude
- 移动速度慢，不像游戏

---

### Phase 3：Claude Sprite Sheet

目标：替换当前静态小人为多帧 sprite。

任务：

- [ ] 准备 `claude-sprite.png`
- [ ] 实现 sprite frame 切换
- [ ] idle 2 帧
- [ ] walk 2–4 帧
- [ ] talk 2 帧
- [ ] sleep 2 帧
- [ ] 保持 pixelated 渲染

验收：

- Claude 明显像参考图
- 有耳机、黑头发、小星星
- 不是章鱼
- 行走有帧动画

---

### Phase 4：对话框增强

目标：现有对话框绑定 Claude 运动系统。

任务：

- [ ] 对话框跟随 Claude 坐标
- [ ] 靠边时自动换方向
- [ ] 对话时 Claude 进入 talk 状态
- [ ] 关闭后恢复 idle
- [ ] 多轮后展开小面板
- [ ] 保留现有 AI 对话能力

验收：

- 点击 Claude 后对话框从角色身边出现
- 对话时 Claude 不乱走
- 对话框不遮挡播放器
- 关闭后恢复移动

---

### Phase 5：Polish

目标：整体像 Claude FM 风格 ambient screen。

任务：

- [ ] HUD idle fade
- [ ] 右上音乐 HUD
- [ ] 星星轻微闪烁
- [ ] 雨声与雨滴密度联动
- [ ] timer 结束睡觉动画
- [ ] keyboard shortcuts 更新

验收：

- 默认界面低干扰
- 背景有生命感
- Claude 有陪伴感
- 产品不像普通播放器

---

## 21. Design QA Checklist

### 背景

- [ ] 黑底 / 深色为主
- [ ] 点阵构成房间 / 城市 / 星球
- [ ] 不是厚重插画
- [ ] 不出现大面积高饱和颜色
- [ ] 背景不抢 Claude

### Claude

- [ ] 独立 sprite 层
- [ ] 可移动
- [ ] 点击可对话
- [ ] 对话时停止移动
- [ ] 有耳机
- [ ] 有黄色小星星
- [ ] 有 idle / walk / talk / sleep

### UI

- [ ] 默认无大白卡
- [ ] 默认无完整聊天面板
- [ ] 默认按钮不超过 6 个
- [ ] 底部播放器可上拉
- [ ] 5 秒无操作后 HUD 变淡
- [ ] Esc 关闭浮层

### 交互

- [ ] Claude 不会走进 drawer
- [ ] Claude 不会走出屏幕
- [ ] 气泡不会超出屏幕
- [ ] Scene 切换后 Claude 位置合理
- [ ] timer 结束后 Claude 睡觉

---

## 22. 最终结论

v0.4 的核心不是继续找背景图，而是把 LoFiClaude 做成：

```text
程序化 ASCII 点阵背景
+
独立可移动 Claude Sprite
+
点击 Claude 对话
+
低干扰播放器 HUD
```

这样才最接近 Claude FM 的感觉：  
Claude 不是贴图，而是在 ASCII 世界里“活着”。

最终目标：

> 一个小小的 Claude 在黑色点阵房间里走来走去，听着 lofi，偶尔看你一眼，等你点击它说话。
