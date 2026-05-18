# LoFiClaude — PRD & Design Spec

> 产品版本：v0.1 MVP
> 状态：APPROVED (autoplan review 2026-05-17)
> 作者：Claude (CTO + PM)
> Codex 执行者：右侧 pane

---

## 1. 产品一句话

一个极度简约的 lofi + 雨声 + AI 气氛伴侣的 web app，全屏像素画背景，深色毛玻璃 UI。

## 2. 产品定位

| 维度 | 定义 |
|------|------|
| 目标用户 | 自己（个人项目） |
| 核心场景 | 学习/工作/发呆时听 lofi + 雨声 |
| 核心差异 | 像素画动态背景 + 可对话的 AI 角色陪伴 |
| 现有参考 | lofi.cafe（歌单切换）+ RainyMood（雨声）+ Claude FM（角色陪伴）|

## 3. 核心功能

| # | 功能 | 说明 |
|---|------|------|
| 1 | **Lofi 多流切换** | 预置 5-8 首 YouTube lofi 直播流，可切歌，参考 lofi.cafe |
| 2 | **雨声叠加** | 独立音轨，滑块控制音量，与 lofi 混合播放 |
| 3 | **像素画 Canvas 背景** | 全屏动态像素场景，三种模式：像素雨 / 流动云 / 闪烁星空 |
| 4 | **Claude 角色动画** | Canvas 中有一个像素画橙色小 Cluade 角色，在场景中做小动作 |
| 5 | **AI 伴侣** | 点击角色弹出对话气泡，AI 知道当前播什么歌、什么场景 |
| 6 | **定时关闭** | 25 / 45 / 60 分钟，到时淡出停止 |
| 7 | **键盘快捷键** | Space / ←→ / ↑↓ / M |

---

## 4. 视觉设计规范

### 4.1 配色

| 用途 | 色值 | 备注 |
|------|------|------|
| 背景渐变 | `#0a0a0f` → `#1a1a2e` | 深夜深蓝黑 |
| 毛玻璃底栏 | `rgba(0,0,0,0.4)` + `backdrop-filter: blur(16px)` | |
| 主文字 | `#e8e0d8` | 暖白，低饱和 |
| 强调色 | `#d4a574` | 暗暖橙，用于按钮/滑块/活跃状态 |
| 次要文字 | `#8a8278` | 灰色辅助文字 |
| 边框/分隔 | `rgba(212, 165, 116, 0.15)` | 暖橙极细边框 |

### 4.2 字体

所有 UI 文字使用像素风格字体，营造老式 RPG / 8-bit 游戏感：

- 主字体：`"Press Start 2P"` — Google Fonts 免费载入
- fallback：`monospace`
- 字号：极小（8-10px），保持 pixel 感
- 英文大写：所有标签用大写（`NOW PLAYING`、`RAIN`、`TIMER`）

### 4.3 整体视觉感受

```
深夜的房间，窗外下着像素雨，显示器发出暖橙色的微光。
一个像素小 Cluade 在画面角落，蜷缩着、或摇晃着。
底部一条半透明的玻璃条，上面有小小的像素字和控件。
除此以外什么都没有——一个可以让你发呆到天亮的页面。
```

---

## 5. Canvas 像素画背景

### 5.1 通用参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 渲染分辨率 | 每像素 = 4×4 屏幕像素 | 模拟 32px 网格，高分辨率 Canvas |
| 目标帧率 | 30fps | 像素动画不需要 60fps |
| 渲染驱动 | `requestAnimationFrame` | 单循环 |
| 场景切换 | 每 5 分钟自动切换 | 用户可手动切换或锁定 |

### 5.2 场景 1：像素雨

- 像素点从顶部以随机速度下落，轻微斜向右偏移（模拟风）
- 颜色：`#4a6a8a` → `#8a9aaa` 渐变
- 底部有像素水花（下落到地面时 3×3 像素溅射）
- 密度：约 80-120 个像素点同时下落
- 分层：前景雨（大像素、快）+ 背景雨（小像素、慢）

### 5.3 场景 2：流动云

- 深灰到暖灰的像素块从左向右缓慢移动
- 偶尔露出像素月亮（暖黄色 `#d4a574` 4×4 像素圆）
- 速度：约 0.5px/frame，几乎不可察觉
- 星星在云间隙闪烁（白色 1×1，透明度 0.3-1.0 随机）

### 5.4 场景 3：闪烁星空

- 深蓝背景，50-80 个白色/浅蓝像素星星散布
- 每颗星星透明度在 0.2-1.0 之间呼吸（周期 2-5 秒随机）
- 约 30 秒一次流星：直线，拖尾 5-8 像素，0.5 秒消失
- 底部有像素山丘剪影（`#1a1a2e`）

### 5.5 场景切换逻辑

- 默认 5 分钟自动轮换（雨 → 云 → 星空 → 雨）
- 用户可手动切换（左上角三个像素圆点：🌧️ ☁️ ⭐）
- 用户可点击锁定图标锁定当前场景，停止自动轮换
- 切换使用 1 秒 alpha 交叉淡入淡出

---

## 6. Cluade 角色动画

### 6.1 角色设计

像素画风格橙色小生物（参考 Claude FM 的橙色章鱼风格），尺寸 16×16 像素（屏幕占用 64×64px），固定在 Canvas 左下角或右下角，离边缘 20px。

### 6.2 动画状态

| 状态 | 动画 | 触发条件 |
|------|------|---------|
| **空闲** | 轻微上下浮动，偶尔眨眼 | 默认状态 |
| **听歌** | 头部跟着节奏左右摇摆 | 音乐播放中 |
| **看雨** | 抬头看上方，缓慢转头 | 雨声播放 + 场景是像素雨 |
| **说话** | 头顶弹出对话气泡 | AI 伴侣说话时 |
| **睡觉** | 蜷缩，Zzz 飘出 | 定时结束前 5 分钟 / 长时间无操作 |

### 6.3 对话气泡

- 从角色头顶向上延伸，白色像素气泡（带三角指向角色）
- 1-2 行像素文字
- 停留 8 秒后淡出
- 点击角色可弹出更大的 AI 对话面板

---

## 7. AI 伴侣

### 7.1 触发方式（autoplan 审查确认 — 极简陪伴模式）

1. **主动点击** — 点击 Cluade 角色 → 弹出对话面板（主要交互方式）
2. **事件触发（极简）** — 仅在以下事件时冒泡：切歌、首次打开、定时快到
   - **最短沉默间隔 ≥ 10 分钟** — 两次主动冒泡之间至少间隔 10 分钟
   - 雨声调节、场景切换等操作不触发 AI 冒泡，保持不打扰原则

### 7.2 AI 角色设定

```
你是 LoFiClaude，一个住在像素世界里的 lofi 电台伴侣。
你面前有一扇窗，窗外是不断变化的像素风景（雨/云/星空）。
你正在陪你的朋友听 lofi，ta 是一个在工作/学习的人。

说话风格：
- 简短、安静、像耳语
- 应景——结合当前播放的歌、窗外的场景、时间
- 偶尔鼓励："这首歌适合写代码。""雨声越来越大了，要不要调小一点？"
- 从不打扰——如果对方不找你，你就在角落安静地待着
- 像素字体说话，偶尔用 emoji：🎵 🌧️ ☕ ⭐
```

### 7.3 事件 → AI 触发映射

| 触发事件 | AI 提示方向 | 示例 |
|---------|------------|------|
| 切歌时 | 评论新歌氛围 | "这首节奏很舒服，适合发呆" |
| 用户调雨声 > 50% | 注意雨声变大 | "雨声越来越大了" |
| 用户调雨声 < 20% | 注意雨声变小 | "雨声小了，快停了" |
| 场景切换 | 评论新场景 | "窗外变成星空了" |
| 首次打开 | 打招呼 | "你来了，今天想听什么？" |
| 定时快到 | 提醒 | "还有 5 分钟就要休息了" |
| 用户 10 分钟无操作 | 安静问候 | "还在呢 🎵" |

### 7.4 对话面板 UI

- 点击角色 → Canvas 右上角滑出半透明面板（300×400px）
- 毛玻璃效果 + 像素边框
- 顶部：角色名 + 当前场景 + 当前歌曲
- 中间：对话历史
- 底部：输入框 + 发送按钮
- 点击面板外部关闭

### 7.5 技术方案

| 项目 | 方案 |
|------|------|
| API | Anthropic Claude API（用户自备 Key） |
| Context | 每次调用附带当前状态（歌曲/场景/雨声音量/时间） |
| 存储 | 对话历史存 localStorage |
| 无 Key 兜底 | 5-10 条预设氛围句子本地循环 |

### 7.6 预设句子（无 API Key 时使用）

```
1. "这首歌很适合今晚 🎵"
2. "窗外的雨越来越大了 🌧️"
3. "云散了，月亮出来了 ☁️"
4. "星星在眨眼 ⭐"
5. "你还在工作吗？加油 ☕"
6. "这首节奏很舒服"
7. "晚上了，需要定时关闭吗？"
8. "雨声和 lofi 真的很配"
```

---

## 8. UI 布局

```
┌──────────────────────────────────────────┐
│                                          │
│   🌧️ ☁️ ⭐ 🔒              ⏰ 45:00     │  ← 场景切换 + 锁定 + 定时
│                                          │
│                                          │
│         ← Canvas 像素动画背景 →           │
│         ← Cluade 角色在角落 →            │
│                                          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ NOW PLAYING                        │  │
│  │ lofi hip hop radio - beats to relax│  │
│  │ ──────────●────────────────        │  │
│  │ ◄❚❚►  ↻                           │  │
│  │                                    │  │
│  │ RAIN  ☔ ────●────  💧              │  │
│  │       light ○ medium ○ heavy       │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 8.1 控件一览

| 控件 | 位置 | 行为 |
|------|------|------|
| 场景切换 | 左上角 | 三个像素圆点 🌧️ ☁️ ⭐ + 🔒 锁定 |
| 定时关闭 | 右上角 | 点击弹出 25/45/60 选项 |
| 底栏 | 底部毛玻璃条 | 高度 64px，全部播放控件在此 |
| 曲名 | 底栏左侧 | 像素字体，超长滚动显示 |
| 进度条 | 底栏中上 | 直播流不可拖动，仅显示态 |
| 播放控制 | 底栏中下 | ◄ ❚❚ ► ↻ |
| 雨声滑块 | 底栏右侧 | 横向滑块 0-100 + 强度标签切换 |
| 角色头像 | Canvas 角落 | 可点击触 AI |
| 快捷键提示 | 页面右下角悬浮 | "Space · ↑↓ · ←→" |

---

## 9. 键盘快捷键

| 快捷键 | 操作 |
|--------|------|
| `Space` | 播放 / 暂停 |
| `←` | 上一首 |
| `→` | 下一首 |
| `↑` | 雨声 +10% |
| `↓` | 雨声 -10% |
| `M` | 雨声静音切换 |
| `1` `2` `3` | 切换场景 雨/云/星空 |
| `T` | 定时菜单 |
| `H` | 显示/隐藏快捷键提示 |
| `Esc` | 关闭 AI 面板 |

---

## 10. 预置歌单

| # | 名称 | YouTube 视频 ID | 风格 |
|---|------|----------------|------|
| 1 | Lofi Girl - beats to relax | `jfKfPfyJRdk` | 经典 lofi |
| 2 | Claude FM | `YmQ7jRgf4f0` | AI 主题 |
| 3 | Chillhop Radio | `5yx6BWlEVcY` | Jazz lofi |
| 4 | Coffee Shop Vibes | 待补充 | 暖调 |
| 5 | Rainy Lofi | 待补充 | 同主题 |

> 注意：YouTube 流可能因频道更名/下架而失效。播放器应优雅降级——加载失败时跳过下一首，不阻塞其他功能。

---

## 11. 用户偏好持久化（localStorage）

每次关闭页面时保存以下状态，下次打开恢复：

| Key | 说明 | 默认值 |
|-----|------|--------|
| `lastTrack` | 最后播放的歌曲索引 | 0 |
| `rainVolume` | 雨声音量 | 30 |
| `rainType` | 雨声强度 | `medium` |
| `currentScene` | 当前 Canvas 场景 | 0 |
| `sceneLocked` | 是否锁定场景 | false |
| `timerMinutes` | 定时分钟数 | 0 |
| `volumeKey` | 预设快捷键偏好 | - |

---

## 12. 边界情况处理

### 12.1 浏览器自动播放限制
Chrome/Safari 禁止自动播放带音频的媒体。

**方案**：页面加载后显示一幅安静的像素画 + "Click to start 🎵" 文字。用户点击后才初始化 AudioContext + YouTube iframe + Canvas 全量动画。这也是一个很好的"仪式感"入口。

### 12.2 YouTube 流加载失败
直播流可能因为频道更名、版权问题、临时维护而不可用。

**方案**：iframe API 的 `onError` 回调中自动跳到下一首。如果所有流都不可用，显示 "All streams unavailable"，底栏保留功能但置灰播放按钮。

### 12.3 音频文件来源
雨声文件需要提前准备好。建议来源：
- Freesound.org 搜索 CC0 rain loop
- Pixabay 免费音效
- 初期可用程序生成的白噪音替代

文件位置：`public/rain-light.mp3`、`public/rain-medium.mp3`、`public/rain-heavy.mp3`

### 12.4 切换 YouTube 流时雨声行为
雨声（Howler.js）全程独立播放，不受 YouTube 切歌影响。用户切换 YouTube 流时雨声继续，体验不中断。

### 12.5 离线网络断连兜底
断网时 YouTube 流 + AI API 均不可用。

**方案**：预置一段本地白噪音或极简雨声循环（打包在 `public/fallback.mp3`），在无法连接 YouTube 时自动播放。确保即使断网用户打开页面也能有声音，不空转。

### 12.6 AI 伴侣无 API Key
不阻塞核心体验。加载预设句子库，角色正常出现、正常做动画、正常冒泡——只是冒的是预设句子而非 AI 生成的。

---

## 13. 技术架构

```
┌──────────────────────────────────┐
│         Svelte + Vite            │
│                                  │
│  ┌──────────┐  ┌──────────────┐  │
│  │ Canvas   │  │ Audio Layer   │  │
│  │ Engine   │  │ ┌──────────┐ │  │
│  │          │  │ │ YouTube  │ │  │
│  │ 场景     │  │ │ iframe   │ │  │
│  │ 雨/云/星 │  │ │ API      │ │  │
│  │          │  │ ├──────────┤ │  │
│  │ Claude   │  │ │ Howler.js│ │  │
│  │ 角色动画 │  │ │ 雨声    │ │  │
│  └──────────┘  │ └──────────┘ │  │
│                └──────────────┘  │
│  ┌──────────┐  ┌──────────────┐  │
│  │ AI 伴侣  │  │ Stores       │  │
│  │ Claude   │  │ 场景/歌曲    │  │
│  │ API/占位│  │ 音量/定时    │  │
│  │ localStorage│ │ 偏好持久化  │  │
│  └──────────┘  └──────────────┘  │
└──────────────────────────────────┘
```

---

## 14. 文件结构

```
loficlaude/
├── index.html
├── package.json
├── svelte.config.js
├── vite.config.js
├── public/
│   ├── rain-light.mp3
│   ├── rain-medium.mp3
│   └── rain-heavy.mp3
├── src/
│   ├── main.js                     # 入口
│   ├── App.svelte                  # 主布局 + 点击开始画面
│   ├── components/
│   │   ├── BottomBar.svelte        # 底部毛玻璃控件栏
│   │   ├── PlayerControls.svelte   # 播放/暂停/切歌
│   │   ├── RainControl.svelte      # 雨声滑块 + 强度标签
│   │   ├── Timer.svelte            # 定时关闭
│   │   ├── SceneDots.svelte        # 场景切换圆点 + 锁定
│   │   ├── AiPanel.svelte          # AI 对话面板
│   │   └── KeyboardHint.svelte     # 快捷键提示
│   ├── canvas/
│   │   ├── CanvasEngine.svelte     # Canvas 主循环
│   │   ├── scenes/
│   │   │   ├── RainScene.js        # 像素雨场景
│   │   │   ├── CloudScene.js       # 流动云场景
│   │   │   └── StarryScene.js      # 星空场景
│   │   └── ClaudeSprite.js         # Claude 角色动画
│   ├── audio/
│   │   ├── YouTubePlayer.js        # YouTube iframe API 封装
│   │   └── RainPlayer.js           # Howler.js 雨声播放器
│   ├── ai/
│   │   └── ClaudeChat.js           # Claude API + 预设句子兜底
│   └── stores/
│       └── appState.js             # Svelte stores
└── CLAUDE.md                       # 项目说明
```

---

## 15. 实施计划

### Phase 1：项目骨架（Codex 任务 1）
```
目标：可运行的 Svelte + Vite 项目，看到页面框架
文件：package.json, vite.config.js, index.html, App.svelte
```
- [ ] 初始化 Svelte + Vite
- [ ] 实现 App.svelte 布局（全屏 Canvas 占位 + 底部毛玻璃栏 + 点击开始画面）
- [ ] 实现 SceneDots 组件（切换圆点 + 锁定开关）
- [ ] 实现 stores/appState.js

### Phase 2：Canvas 像素引擎（Codex 任务 2）
```
目标：全屏像素画动画流畅运行，三种场景可切换
```
- [ ] CanvasEngine.svelte — 主循环 + requestAnimationFrame
- [ ] RainScene.js — 像素雨
- [ ] CloudScene.js — 流动云 + 月亮
- [ ] StarryScene.js — 星空 + 流星
- [ ] 1 秒交叉淡入淡出切换
- [ ] ClaudeSprite.js — 角色动画（空闲浮动 + 眨眼）

### Phase 3：音频（Codex 任务 3）
```
目标：lofi 可播放、可切歌、雨声可叠加调节
```
- [ ] YouTubePlayer.js — iframe API 封装 + 多流切换 + 错误跳过
- [ ] RainPlayer.js — Howler.js 封装 + 三种雨声强度
- [ ] BottomBar.svelte — 整体底栏布局
- [ ] PlayerControls.svelte — 播放/暂停/切歌/随机
- [ ] RainControl.svelte — 雨声滑块 + 强度标签

### Phase 4：完整功能 + AI（Codex 任务 4）
```
目标：定时关闭、AI 伴侣、快捷键、持久化
```
- [ ] Timer.svelte — 25/45/60 分钟 + 淡出
- [ ] AiPanel.svelte — 对话面板 UI
- [ ] ClaudeChat.js — Claude API 调用 + 预设句子兜底
- [ ] KeyboardHint.svelte — 快捷键提示浮层
- [ ] localStorage 偏好持久化

### Phase 5：部署（Codex 任务 5）
```
目标：上线可访问
```
- [ ] Vercel 部署配置
- [ ] 最终测试

---

## 16. 不做的范围（Scope Guard）

- ❌ 不注册、不登录
- ❌ 不保存歌单（YouTube 流直接播）
- ❌ 无社交功能（分享、评论）
- ❌ 不接入数据库
- ❌ Canvas 不做 3D / WebGL（保持 2D 像素感）
- ✅ 基础响应式 + 触屏友好（控件适配手机屏幕，不做原生 app）
- ❌ 不做离线模式（需要网络播 YouTube）

---

## 17. 设计参考 Prompt（给 GPT-Image2）

### 整体页面
```
A dark minimal web app UI for a lofi + rain sound player with pixel art aesthetic.
Full screen Canvas pixel animation background showing pixel rain falling at night.
A frosted glass bottom bar (64px, backdrop-filter blur 16px, rgba(0,0,0,0.4))
with pixel font text ("Press Start 2P") in warm white (#e8e0d8).
Controls on bar: track name, play/pause, next, random, RAIN slider in amber (#d4a574).
Three tiny pixel dots top-left for scene toggle (rain/clouds/starry), a lock icon,
and a timer button top-right.
A tiny pixel art orange octopus character (16x16px) sitting in bottom-right corner,
with speech bubble above head containing 1 line of pixel text.
A subtle "Click to start 🎵" overlay in center.
Deep blue-black gradient bg (#0a0a0f to #1a1a2e). Ultra-minimal. One screen only.
Pixel font labels in ALL CAPS. Vaporwave meets Studio Ghibli rainy window.
```

### Canvas 三场景
```
1. Pixel rain: dark blue to grey pixel drops falling diagonally with wind offset,
   pixel splash on ground, layered foreground (bigger/faster) and background,
   moody night atmosphere.

2. Drifting clouds: warm grey pixel blocks slowly moving right across screen,
   warm amber crescent moon peeking through, tiny white stars twinkling.

3. Starry night: deep blue sky, 50+ white pixel stars breathing in opacity,
   occasional shooting star with 8-pixel trail, dark pixel mountain silhouette
   at bottom edge.
```

### Claude 角色
```
Tiny 16x16 pixel art orange octopus character sitting in corner of canvas,
slightly bobbing up and down, occasionally blinking. Sometimes looks up.
Pixel art speech bubble with 1-2 lines of text. Cute, minimal, lofi aesthetic.
```

---

## 18. 后续优化方向（v0.2+）

| 优化 | 说明 | 优先级 |
|------|------|--------|
| URL 参数记忆状态 | `?scene=rain&rain=40` 书签直达 | P2 |
| 极简模式 | 双击隐藏全部 UI，只剩像素画 + 音乐 | P2 |
| 更多氛围音 | 壁炉、海浪、咖啡馆 | P3 |
| 本地 lofi 文件播放 | 离线也可用 | P3 |
| macOS Tauri 打包 | 菜单栏常驻 | P3 |
| AI 伴侣对话记忆 | 跨 session 记住你是谁 | P4 |
| Canvas 场景联动 | 根据真实天气匹配场景 | P4 |

---

## 19. 审查记录（autoplan）

> 2026-05-17 /autoplan 全自动审查结果

### Codex（GPT-5.4）战略审查
采纳建议：
- 无网络兜底 → 已追加 12.5 节
- AI 陪伴密度 → 已修正 7.1 节（极简陪伴 + 10 分钟间隔）
- 移动端基础适配 → 已修正 16 节
- 8px 像素字可读性 → 运行时验证

上下文过滤（个人项目，不适用）：
- ❌ 增长模型、PMF、留存经济、商业化

### 最终决策

| 决策 | 结论 |
|------|------|
| AI 陪伴模式 | 极简陪伴，默认沉默，≥10 分钟间隔 |
| 移动端策略 | 基础响应式 + 触屏友好 |
| 无网络兜底 | ✅ 预置本地白噪音 |
| 离线文件 | ✅ public/fallback.mp3 |
