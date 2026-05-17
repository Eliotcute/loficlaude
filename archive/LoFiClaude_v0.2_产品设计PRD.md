# LoFiClaude v0.2 — 优化后 PRD & 产品设计方案

> 产品版本：v0.2 MVP  
> 状态：Design Revision  
> 核心方向：去播放器化、去菜单化、强化“像素房间 + Claude 伴侣”  
> 设计原则：**Less player, more place. Less chat app, more companion.**

---

## 1. 产品一句话

**一个会陪你听雨的像素 lofi 小房间。**

用户打开页面后，进入一个安静的像素夜晚：窗外下雨，lofi 在播放，一个橙色像素小 Claude 安静待在角落。用户可以轻量控制音乐、雨声和定时，也可以点击 Claude 和它说话。

---

## 2. 产品定位调整

### 2.1 原定位

一个极度简约的 lofi + 雨声 + AI 气氛伴侣 web app，全屏像素画背景，深色毛玻璃 UI。

### 2.2 优化后定位

一个沉浸式的 **lofi ambient room**，核心不是“播放器”，而是“氛围空间”。

| 维度 | 定义 |
|---|---|
| 产品类型 | Ambient room / lofi companion / digital pet |
| 核心体验 | 打开后进入一个安静像素房间，被 lofi、雨声和 Claude 陪伴 |
| 主要交互 | 少操作、低干扰、点击 Claude 触发对话 |
| 视觉重心 | Canvas 像素场景 > Claude 小人 > 当前播放状态 > 控件 |
| 情绪关键词 | 安静、深夜、陪伴、像素、雨声、暖橙色、发呆 |

---

## 3. 核心设计原则

### 3.1 不像播放器，像一个房间

界面不应该像 Spotify、Calm 或普通音乐 App。用户不是来“管理播放列表”的，而是进入一个可以停留的空间。

因此：

- 不使用大面积播放器卡片
- 不使用底部 tab bar
- 不突出复杂控制
- 让 Canvas 背景长期占据视觉主导

### 3.2 不像聊天软件，像一个角色

AI 伴侣不应该默认是一个完整聊天窗口。Claude 应该先是一个“住在画面里的角色”，聊天只是点击它后自然发生的事情。

因此：

- 默认不显示聊天面板
- 点击 Claude 后弹出轻量气泡
- 多轮对话时再扩展成小面板
- AI 说话短、轻、应景，不打扰

### 3.3 常驻信息极少，操作按需出现

默认只显示用户需要知道的状态：

- 正在播放什么
- 是否播放中
- 雨声音量
- 定时状态
- 当前场景

其他功能通过点击、hover 或快捷键展开。

---

## 4. 优化后的信息架构

### 4.1 默认界面只保留 4 个元素

```text
┌────────────────────────────────────┐
│ LoFiClaude              🌧  45:00  │
│                                    │
│                                    │
│          full-screen pixel rain     │
│                                    │
│                                    │
│                         ┌────────┐ │
│                         │ 还在呢 🎵 │ │
│                         └───▲────┘ │
│                           Claude   │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ lofi hip hop radio      ▌▌ 🌧60 │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

| 元素 | 说明 |
|---|---|
| 全屏 Canvas | 像素雨 / 云 / 星空，是主视觉 |
| 顶部状态条 | 显示产品名、当前场景、timer |
| Claude 小人 | 角落角色，可点击 |
| 底部 mini player | 极简播放状态和雨声状态 |

---

## 5. 页面结构

### 5.1 主界面 Ambient Mode

这是用户 90% 时间停留的状态。

#### 视觉布局

```text
┌─────────────────────────────────────────────┐
│ LoFiClaude                         🌧 45:00 │
│                                             │
│                                             │
│             Pixel Canvas Scene              │
│                                             │
│                                             │
│                              ┌───────────┐  │
│                              │ 雨声刚刚好 │  │
│                              └────▲──────┘  │
│                                   🐙        │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ NOW PLAYING   lofi hip hop radio   ▌▌ 🌧60 │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 默认显示内容

| 区域 | 内容 |
|---|---|
| 左上 | `LoFiClaude` |
| 右上 | 当前场景图标 + timer |
| 中间 | Canvas 场景 |
| 角落 | Claude 小人 |
| 底部 | mini player |

---

### 5.2 点击开始页

由于浏览器自动播放限制，首次进入需要点击启动。

#### 页面设计

```text
┌────────────────────────────────────┐
│                                    │
│            Pixel Night              │
│                                    │
│              🐙                    │
│                                    │
│        Click to start 🎵            │
│                                    │
│      lofi · rain · quiet company    │
│                                    │
└────────────────────────────────────┘
```

#### 设计要求

- 不使用白色弹窗
- 文字居中，极简
- 背景 Canvas 可静态渲染一帧
- 点击任意区域启动 AudioContext、YouTube iframe、雨声播放器和动画循环

---

## 6. 底部控制设计

### 6.1 删除底部 tab bar

删除以下常驻菜单：

```text
SCENE    CHAT    TIMER    MORE
```

原因：

- 过于工具化
- 干扰沉浸感
- 与“像素房间”定位不匹配
- 用户会觉得这是一个功能型 App，而不是氛围空间

---

### 6.2 改为 mini player

底部只保留一条轻量状态栏。

#### 默认状态

```text
┌────────────────────────────────────────┐
│ lofi hip hop radio       ▌▌   🌧 60  45 │
└────────────────────────────────────────┘
```

#### 展开状态

用户 hover 或点击 mini player 后，展开为完整控制条。

```text
┌────────────────────────────────────────┐
│ NOW PLAYING                            │
│ lofi hip hop radio - beats to relax    │
│                                        │
│ ◄    ▌▌    ►      RAIN ─────●── 60%    │
└────────────────────────────────────────┘
```

---

### 6.3 mini player 行为

| 操作 | 行为 |
|---|---|
| 点击播放按钮 | 播放 / 暂停 |
| 点击歌名 | 展开歌单 |
| 点击雨声区域 | 展开雨声控制 |
| 点击 timer | 展开 timer 选择 |
| hover 底部条 | 显示更多控制 |
| 鼠标离开 3 秒 | 自动收起 |
| 按 `H` | 显示 / 隐藏快捷键提示 |

---

### 6.4 视觉规范

```css
.mini-player {
  height: 56px;
  background: rgba(10, 10, 15, 0.52);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(212, 165, 116, 0.16);
  border-radius: 18px;
  color: #e8e0d8;
}
```

#### 尺寸建议

| 状态 | 高度 |
|---|---|
| 默认 mini | 52–64px |
| 展开控制 | 120–150px |
| 移动端暂不做 | v0.1 不适配 |

---

## 7. Claude 角色交互设计

### 7.1 Claude 是核心入口

Claude 小人承担两个功能：

1. 氛围角色
2. AI 伴侣入口

不再使用底部 `CHAT` tab。

---

### 7.2 Claude 默认状态

| 状态 | 行为 |
|---|---|
| 空闲 | 轻微上下浮动，偶尔眨眼 |
| 播放中 | 头部随节奏轻微摆动 |
| 雨景中 | 偶尔抬头看雨 |
| 用户无操作 | 安静待着，偶尔冒一句 |
| timer 快结束 | 进入困倦状态，冒 Zzz |
| AI 回复中 | 小人轻微跳动 / speaking 动画 |

---

### 7.3 点击 Claude 后的轻量气泡

点击 Claude 后，不直接打开大聊天窗口，而是先出现一个轻量气泡。

```text
        ┌────────────────────────┐
        │ LoFiClaude             │
        │ 雨声和 lofi 真的很配 🌧 │
        │                        │
        │ ask something...    ↵  │
        └───────────────▲────────┘
                    Claude
```

#### 气泡规则

| 项目 | 规则 |
|---|---|
| 位置 | Claude 头顶上方 |
| 宽度 | 260–320px |
| 高度 | 自适应，默认 120px 内 |
| 文本 | 1–2 行为主 |
| 停留 | 被动气泡 8 秒后淡出 |
| 主动点击 | 不自动消失，直到用户关闭或点击外部 |
| 输入框 | 点击 Claude 后显示 |
| 关闭方式 | 点击外部 / Esc |

---

### 7.4 多轮对话时扩展为小面板

当用户连续对话超过 2 轮，气泡扩展为右侧小面板。

```text
┌────────────────────────────┐
│ LoFiClaude              ×  │
│ scene: rain · rain: 60%    │
│                            │
│ Claude: 还在呢 🎵          │
│ You: 陪我专注 25 分钟       │
│ Claude: 好，我会安静陪你。  │
│                            │
│ say something...       ↵   │
└────────────────────────────┘
```

#### 小面板限制

| 项目 | 建议 |
|---|---|
| 最大宽度 | 320px |
| 最大高度 | 360px |
| 位置 | 右侧或 Claude 附近浮层 |
| 背景 | 深色毛玻璃 |
| 不做 | 全屏聊天、不做聊天列表、不做复杂 Markdown |

---

## 8. 顶部状态区设计

### 8.1 默认顶部状态

```text
LoFiClaude                         🌧 45:00
```

#### 左侧

- 产品名：`LoFiClaude`
- 字体：Press Start 2P
- 颜色：`#e8e0d8`

#### 右侧

- 当前场景图标：🌧 / ☁ / ⭐
- timer：`45:00`
- 如果 timer 关闭，只显示场景图标

---

### 8.2 点击场景图标展开

```text
┌──────────────┐
│ 🌧 Rain       │
│ ☁ Cloud      │
│ ⭐ Stars      │
│ 🔒 Lock scene │
└──────────────┘
```

#### 行为

| 操作 | 行为 |
|---|---|
| 点击 Rain | 切换雨景 |
| 点击 Cloud | 切换云景 |
| 点击 Stars | 切换星空 |
| 点击 Lock | 锁定当前场景，停止自动轮换 |
| 按 `1/2/3` | 快速切换场景 |

---

## 9. 雨声控制设计

雨声不再常驻一个大卡片，而是通过点击 mini player 中的 `🌧60` 展开。

### 9.1 默认显示

```text
🌧 60
```

### 9.2 展开控制

```text
┌────────────────────────────┐
│ RAIN                       │
│ light   medium   heavy     │
│ ─────────────●────── 60%    │
└────────────────────────────┘
```

### 行为

| 控件 | 行为 |
|---|---|
| 滑块 | 调整雨声音量 |
| Light / Medium / Heavy | 切换雨声文件 |
| M | 静音 / 恢复 |
| ↑ / ↓ | 音量 ±10% |

---

## 10. Timer 设计

Timer 不作为底部 tab，而是顶部或 mini player 里的轻状态。

### 10.1 默认显示

```text
45:00
```

### 10.2 点击后展开

```text
┌──────────┐
│ 25 min   │
│ 45 min   │
│ 60 min   │
│ Off      │
└──────────┘
```

### 10.3 到时行为

| 时间点 | 行为 |
|---|---|
| 剩余 5 分钟 | Claude 冒泡提醒 |
| 剩余 1 分钟 | 音乐和雨声轻微淡出 |
| 到时 | 音量 3–5 秒淡出至 0 |
| 到时后 | Claude 睡觉动画，显示 `Zzz` |

---

## 11. AI 伴侣设计

### 11.1 角色设定

```text
你是 LoFiClaude，一个住在像素雨夜里的 lofi 伴侣。
你不吵闹，不主动打断太多。
你会根据当前音乐、雨声、场景和时间，说一句很轻的话。
你的语气像耳语，短句，温柔，有一点像深夜电台。
```

---

### 11.2 说话风格

| 规则 | 说明 |
|---|---|
| 短 | 每次 1–2 句 |
| 安静 | 不用过度热情 |
| 应景 | 结合当前场景 / 雨声 / timer / 歌曲 |
| 低频 | 自动触发不要太频繁 |
| 陪伴感 | 像在旁边，不像客服 |

#### 示例

```text
雨声刚刚好，适合慢慢写。
```

```text
这首歌有点软，别急。
```

```text
还有 5 分钟，我们慢慢收尾。
```

```text
窗外变成星空了 ⭐
```

---

### 11.3 事件触发

| 触发事件 | Claude 行为 | 频率限制 |
|---|---|---|
| 首次打开 | 打招呼 | 每 session 1 次 |
| 切歌 | 评论新歌氛围 | 至少间隔 60 秒 |
| 雨声 > 50% | 提醒雨声变大 | 至少间隔 90 秒 |
| 雨声 < 20% | 提醒雨声变小 | 至少间隔 90 秒 |
| 场景切换 | 评论新场景 | 每次可触发 |
| timer 剩 5 分钟 | 轻提醒 | 必触发 |
| 用户 10 分钟无操作 | 安静问候 | 每 10 分钟最多 1 次 |
| 用户点击 Claude | 打开气泡 | 立即 |

---

### 11.4 无 API Key 兜底

无 API Key 时仍然保留完整角色体验，只使用本地预设句。

```js
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

---

## 12. Canvas 视觉方案

### 12.1 总体方向

Canvas 应该成为页面主体。所有 UI 都应像是“漂浮在场景上的轻量 HUD”。

#### 风格关键词

- 深夜
- 像素雨
- 暖色窗光
- 深蓝黑背景
- 低饱和
- 轻微动画
- 不炫技

---

### 12.2 场景 1：像素雨

视觉：深夜窗外下雨，有暖橙色室内灯光。

#### 元素

- 深蓝夜空
- 像素雨滴
- 远处建筑剪影
- 暖橙色窗光
- 水面或地面反光
- Claude 小人在右下角

#### 动画

- 雨滴斜向下落
- 远景雨慢，近景雨快
- 底部偶尔水花
- Claude 偶尔抬头看雨

---

### 12.3 场景 2：流动云

视觉：云层慢慢移动，月亮偶尔露出。

#### 元素

- 深灰云块
- 暖色月亮
- 少量星星
- 城市剪影
- Claude 小人安静坐着

#### 动画

- 云层极慢移动
- 星星轻微闪烁
- 月亮被云遮挡又出现

---

### 12.4 场景 3：闪烁星空

视觉：深蓝星空，底部山丘剪影，偶尔流星。

#### 元素

- 50–80 颗星星
- 底部山丘
- 远处小灯
- Claude 小人看星星

#### 动画

- 星星呼吸闪烁
- 30 秒左右一次流星
- Claude 偶尔抬头

---

## 13. 视觉规范

### 13.1 配色

| 用途 | 色值 |
|---|---|
| 背景深黑 | `#0a0a0f` |
| 深夜蓝 | `#1a1a2e` |
| 主文字 | `#e8e0d8` |
| 次要文字 | `#8a8278` |
| 暖橙强调 | `#d4a574` |
| 成功绿 / speaking | `#5fd6a4` |
| 毛玻璃背景 | `rgba(10, 10, 15, 0.52)` |
| 面板边框 | `rgba(212, 165, 116, 0.16)` |
| 气泡背景 | `rgba(232, 224, 216, 0.92)` |
| 气泡文字 | `#111111` |

---

### 13.2 字体

不建议所有文字都使用 `Press Start 2P`，否则聊天和歌名会难读。

| 用途 | 字体 |
|---|---|
| Logo / 标签 / 小按钮 | `Press Start 2P` |
| 歌名 / 聊天正文 | `IBM Plex Mono`, `JetBrains Mono`, `ui-monospace` |
| fallback | `monospace` |

#### 字号

| 场景 | 字号 |
|---|---|
| 顶部 Logo | 12–14px |
| 小标签 | 8–10px |
| mini player 歌名 | 12–14px |
| 气泡正文 | 13–15px |
| 聊天输入 | 13px |

---

### 13.3 UI 形态

#### 深色毛玻璃面板

```css
.panel {
  background: rgba(10, 10, 15, 0.52);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(212, 165, 116, 0.16);
  border-radius: 18px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
}
```

#### Claude 气泡

```css
.bubble {
  background: rgba(232, 224, 216, 0.92);
  color: #111;
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
}
```

---

## 14. 核心组件

### 14.1 组件结构

```text
src/
├── App.svelte
├── components/
│   ├── AmbientHeader.svelte
│   ├── MiniPlayer.svelte
│   ├── ExpandedPlayer.svelte
│   ├── RainPopover.svelte
│   ├── TimerPopover.svelte
│   ├── ScenePopover.svelte
│   ├── ClaudeBubble.svelte
│   ├── ClaudeChatPanel.svelte
│   └── KeyboardHint.svelte
├── canvas/
│   ├── CanvasEngine.svelte
│   ├── ClaudeSprite.js
│   ├── scenes/
│   │   ├── RainScene.js
│   │   ├── CloudScene.js
│   │   └── StarryScene.js
├── audio/
│   ├── YouTubePlayer.js
│   └── RainPlayer.js
├── ai/
│   └── ClaudeChat.js
└── stores/
    └── appState.js
```

---

## 15. 状态设计

### 15.1 appState

```js
const appState = {
  hasStarted: false,

  player: {
    isPlaying: false,
    currentTrackIndex: 0,
    currentTrackTitle: "",
    isLoading: false,
    error: null
  },

  rain: {
    volume: 60,
    type: "medium",
    muted: false
  },

  scene: {
    current: "rain",
    locked: false,
    transitionProgress: 0
  },

  timer: {
    active: false,
    minutes: 45,
    remainingSeconds: 2700
  },

  claude: {
    mood: "idle",
    bubbleVisible: false,
    bubbleText: "",
    chatOpen: false,
    speaking: false
  },

  ui: {
    miniPlayerExpanded: false,
    rainPopoverOpen: false,
    timerPopoverOpen: false,
    scenePopoverOpen: false,
    shortcutVisible: false
  }
};
```

---

## 16. 用户流程

### 16.1 首次进入

```text
打开页面
↓
看到静态像素夜景 + Click to start
↓
点击页面
↓
初始化音频和 Canvas
↓
播放 lofi，雨声以默认 30% 或 60% 开始
↓
Claude 冒泡：你来了，今天想听什么？
```

---

### 16.2 听歌流程

```text
用户停留在页面
↓
Canvas 持续播放像素动画
↓
底部 mini player 显示当前歌
↓
用户可按 Space 暂停
↓
用户可按 ← / → 切歌
↓
切歌后 Claude 偶尔评论一句
```

---

### 16.3 雨声调整流程

```text
点击 mini player 的 🌧60
↓
弹出 RainPopover
↓
调节音量 / 切换 light medium heavy
↓
3 秒无操作后自动收起
↓
Claude 根据音量变化偶尔冒泡
```

---

### 16.4 和 Claude 对话流程

```text
点击 Claude 小人
↓
出现 ClaudeBubble
↓
显示一句当前氛围话
↓
用户输入一句话
↓
Claude 回复
↓
如果超过 2 轮，对话区域扩展为小面板
```

---

## 17. 快捷键

| 快捷键 | 操作 |
|---|---|
| `Space` | 播放 / 暂停 |
| `←` | 上一首 |
| `→` | 下一首 |
| `↑` | 雨声 +10% |
| `↓` | 雨声 -10% |
| `M` | 雨声静音 |
| `1` | 切换雨景 |
| `2` | 切换云景 |
| `3` | 切换星空 |
| `T` | 打开 timer |
| `H` | 显示 / 隐藏快捷键 |
| `Esc` | 关闭气泡 / 面板 / popover |

---

## 18. MVP 范围

### 18.1 v0.2 MVP 必做

- 全屏 Canvas 背景
- 三种场景：雨 / 云 / 星空
- Claude 角色动画
- 点击 Claude 弹出气泡
- 本地预设 Claude 句子
- YouTube lofi 多流切换
- 雨声独立播放与音量控制
- mini player
- timer 25 / 45 / 60
- localStorage 持久化
- 快捷键

---

### 18.2 v0.2 MVP 暂不做

- 底部 tab bar
- 完整大聊天 App
- 用户登录
- 数据库
- 移动端适配
- 复杂歌单管理
- 社交分享
- WebGL / 3D
- AI 长期记忆
- 天气 API 联动

---

## 19. 关键交互细节

### 19.1 控件自动隐藏

为了保持沉浸感：

| 元素 | 自动隐藏策略 |
|---|---|
| mini player | 默认显示，5 秒无操作后透明度降低 |
| expanded player | 鼠标离开 3 秒后收起 |
| popover | 点击外部 / Esc / 3 秒无操作关闭 |
| Claude 被动气泡 | 8 秒后淡出 |
| 快捷键提示 | 按 H 显示 / 隐藏 |

---

### 19.2 UI 透明度策略

| 状态 | 透明度 |
|---|---|
| 默认 mini player | 0.75 |
| hover | 1 |
| 用户无操作 5 秒后 | 0.35 |
| 鼠标移动 | 恢复 0.75 |
| 面板展开 | 1 |

这样可以让 UI 不抢画面。

---

## 20. 开发任务拆分

### Phase 1：布局重构

目标：从“大白播放器 + 底部 tab”改成“全屏 Canvas + mini player”。

任务：

- [ ] 删除底部 tab bar
- [ ] 创建 `AmbientHeader.svelte`
- [ ] 创建 `MiniPlayer.svelte`
- [ ] 实现 mini player 默认态
- [ ] 实现 hover / click 展开态
- [ ] 调整 App.svelte 主布局
- [ ] 改为深色毛玻璃视觉

验收标准：

- 页面默认视觉以 Canvas 为主
- 底部只显示一条 mini player
- 无底部四项菜单
- 白色大卡片不再出现

---

### Phase 2：Claude 交互重构

目标：点击 Claude 小人后出现轻量气泡，而不是从菜单进入聊天。

任务：

- [ ] ClaudeSprite 支持 click hit area
- [ ] 创建 `ClaudeBubble.svelte`
- [ ] 实现被动气泡
- [ ] 实现点击 Claude 打开气泡
- [ ] 气泡内加入输入框
- [ ] 接入 fallbackLines
- [ ] Esc / 点击外部关闭

验收标准：

- Claude 是 AI 入口
- 点击 Claude 可对话
- 被动提示不会长期遮挡画面

---

### Phase 3：Popover 控件

目标：雨声、timer、场景都改为轻量 popover。

任务：

- [ ] `RainPopover.svelte`
- [ ] `TimerPopover.svelte`
- [ ] `ScenePopover.svelte`
- [ ] 点击 mini player 中雨声展开
- [ ] 点击 timer 展开
- [ ] 点击右上场景图标展开
- [ ] 点击外部关闭
- [ ] Esc 关闭

验收标准：

- 控件默认不打扰
- 用户需要时能快速展开
- 不再需要 More 页面

---

### Phase 4：状态持久化与快捷键

目标：完成基础体验闭环。

任务：

- [ ] localStorage 保存状态
- [ ] 恢复 lastTrack
- [ ] 恢复 rainVolume
- [ ] 恢复 rainType
- [ ] 恢复 currentScene
- [ ] 恢复 sceneLocked
- [ ] 实现快捷键
- [ ] 实现 KeyboardHint

验收标准：

- 刷新后状态恢复
- 快捷键可用
- H 可查看快捷键提示

---

### Phase 5：AI API 接入

目标：有 Key 时使用 Claude API，无 Key 时使用本地预设。

任务：

- [ ] `ClaudeChat.js`
- [ ] 用户输入调用 Claude API
- [ ] 每次调用附带当前状态
- [ ] 无 Key fallback
- [ ] 对话历史 localStorage
- [ ] 多轮后扩展为小面板

验收标准：

- 无 API Key 不影响使用
- 有 API Key 可以真实对话
- AI 回复短、轻、应景

---

## 21. 新版设计 Prompt

可以用下面的 prompt 重新生成更准确的原型图。

```text
A minimal dark pixel-art web app mockup for "LoFiClaude", an ambient lofi rain room, not a normal music player.

Full-screen pixel art night rain scene as the main focus. Deep blue-black background, warm orange window light, subtle rain animation feeling, quiet cozy mood.

A tiny orange pixel octopus companion named Claude sits in the bottom-right corner. Above it is a small speech bubble saying in Chinese: "雨声刚刚好 🌧". The bubble feels lightweight and cute, like a character speaking, not a chat app.

The UI is extremely minimal. No bottom tab bar. No big white music card. No mobile app navigation.

Top-left: small pixel text "LoFiClaude".
Top-right: small scene icon "🌧" and timer "45:00".

Bottom: a very thin dark frosted-glass mini player bar, height about 56px, with text:
"lofi hip hop radio" on the left, a pause icon in the middle, and "🌧 60" plus "45" on the right.
The mini player is translucent black with blur, warm amber border, subtle rounded corners.

Style:
- dark frosted glass UI
- pixel art background
- warm amber accent #d4a574
- warm white text #e8e0d8
- no large white cards
- no tab bar
- no clutter
- quiet, immersive, cozy, late-night atmosphere
- the product should feel like a pixel room, not a music player app
```

---

## 22. 最终设计结论

优化后的 LoFiClaude 应该长这样：

**默认是一个像素雨夜房间。**  
**底部只有一条很轻的 mini player。**  
**Claude 小人是主要交互入口。**  
**所有菜单都隐藏在点击、hover 和快捷键之后。**

这会让产品从“一个功能完整的音乐播放器”变成“一个有记忆点、有情绪、有陪伴感的 ambient app”。
