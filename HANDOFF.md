# LoFiClaude — Handoff Document

> 最后更新：2026-05-21
> 当前版本：v0.8（Bridge 已联调，Streaming Companion 已完成）
> 项目目录：`/Users/lieliot/Documents/eliot-codex/loficlaude`

---

## 项目一句话

一个在 ASCII 雨夜里陪你和本地 Claude 一起编码的 lofi 空间。

## 当前状态

### ✅ 已完成（v0.6）

| 模块 | 说明 |
|------|------|
| ASCII 程序化点阵背景 | Canvas 3 场景（lofi-night / soft-rain / star-drift），off-screen 缓存 |
| YouTube lofi 播放 | 5 个预设流，切歌/暂停/随机 |
| 雨声叠加 | 3 种强度（light/medium/heavy），独立音量 |
| Claude DOM Sprite | CSS transform 定位，GPU 加速，走动/点击/hover |
| Claude 状态机 | idle / walk / talk / sleep / thinking / working / blocked / happy |
| 13 个 claudepix 预设 | idle_breathe/blink/look_around, work_coding/think, dance_bounce/sway/bounce_dj/sway_dj/djmix, expression_wink/surprise/sleep |
| 三击切换形态 | 800ms 内 3 次点击循环切换，气泡显示中文名 |
| 播放器 Drawer | collapsed / expanded 两态，slide 动画 |
| 场景自动轮播 | 5 分钟自动切换，scene.locked 停止 |
| 快捷键 | Space / ←→ / ↑↓ / M / 1-3 / T / H / Esc |
| localStorage | 场景/音量/歌曲/定时持久化 |

### ✅ 已完成（v0.7 Bridge 集成）

| 模块 | 说明 |
|------|------|
| BridgeClient 类 | `src/bridge/bridgeClient.js` — WebSocket lifecycle、auth、user_message、assistant_delta/tool_running/status/error |
| Bridge 状态 store | `src/stores/bridgeState.js` — connectionStatus、claudeStatus、streamingText、toolRunning、lastError、bridgeToken（localStorage 持久化） |
| ConnectionStatus 重写 | 共享 bridgeState，内联 token 输入 |
| claudeOrch bridge 感知 | 流式输出路径、bridge-aware 状态切换 |
| ClaudeChatPanel 连接提示 | 未连接时显示提示 |
| RainPlayer autoplay 修复 | 不早于 Start room 创建 AudioContext |
| App.svelte 首屏流程 | Start room → Claude disconnected 提示 |
| README 重写 | 以 Local Bridge 为主路径 |
| bridgeClient.test.js | 单元测试 |
| 构建验证 | `npm run build` 通过 |

### ✅ 已完成（v0.8 Bridge E2E + Streaming Companion）

| 模块 | 说明 |
|------|------|
| Bridge 端到端联调 | `bridge/index.js` + `bridge/server.js` + `bridge/claude.js` 已与真实 Claude CLI 流式 JSON 协议联通，auth 后拉起 Claude 子进程，支持 user_message → assistant_delta/tool_running/status |
| Bridge 生命周期完善 | Bridge 入口支持 SIGINT/SIGTERM 优雅关闭；Claude 子进程退出/错误可回传状态与错误事件 |
| assistant_delta 流式渲染 | `claudeOrch` 以增量方式追加到同一条 assistant 消息 |
| tool_running 状态展示 | 工具执行时展示 `Running <tool>`，并在下一次 assistant_delta 自动消隐 |
| 状态 → sprite 映射 | connected/thinking/delta/tool_running/done/disconnected/error 映射到 Claude mood + claudepix form（含 done 的 happy→idle 回落） |
| 中断/重连 UI | WebSocket 断开后消息标注 interrupted，聊天面板内提供 Reconnect 按钮，一键重连 |
| 验证 | `npm test` 通过，`npm run build` 通过，Bridge 本地 WebSocket E2E smoke test 通过 |

### ⏳ 未完成

| 待办 | 优先级 | 说明 |
|------|--------|------|
| **更好的 Token 输入 UI** | P2 | 当前是内联 input，无内联复制命令提示 |
| **背景贴图** | P2 | 需要用户生成像素风格 PNG 放在 `public/backgrounds/` |
| **测试覆盖** | P2 | 只有 bridgeClient.test.js 和 claudepixForms.test.js，覆盖率低 |
| 移动端适配 | P3 | 基础触屏支持但未完整测试 |
| 雨声替换 | P3 | 当前是 ffmpeg 程序生成，可用 CC0 录音替代 |

## PRD 状态

`PRD_v0.7_PRODUCT_UX_OPTIMIZATION.md` 是 Draft PRD，定义了 v0.7 的完整需求范围：
- **Milestone 1 (Product Coherence)** — 已实现（首屏流程、断开状态、README）
- **Milestone 2 (Bridge Integration)** — 已实现（bridgeClient、bridgeState、ConnectionStatus 重写）
- **Milestone 3 (Streaming Companion)** — 已实现（流式渲染、tool_running、sprite 映射、中断与重连）
- **Milestone 4 (Polish & Verification)** — 已实现（Bridge E2E smoke、`npm test`、`npm run build`）

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Svelte 5 + Vite 8 |
| 音频 | YouTube iframe API + Howler.js |
| Canvas | 原生 Canvas 2D（off-screen 缓存） |
| 字体 | Press Start 2P + IBM Plex Mono |
| 桥接 | WebSocket (Node.js) → Claude CLI |
| 颜色 | 深蓝黑 `#0a0a0f` -> `#1a1a2e`，强调色 `#d4a574` |
| Claude 身体色 | `#df805f` / `#b85f48` / `#f09a72` |

## 版本标签

```bash
git checkout v0.3   # 旧 Canvas 架构
git checkout v0.4   # ASCII + DOM Claude  
git checkout v0.6   # v0.6 完整版
git checkout master  # 当前最新（v0.8）
```

## 架构概览

```
src/
├── App.svelte                  # 主布局 + 状态编排
├── main.js                     # Svelte mount 入口
├── canvas/
│   ├── asciiRenderer.js        # ASCII 点阵渲染器
│   ├── asciiScenes.js          # 3 个场景数据定义
│   ├── ambientParticles.js     # 粒子系统（雨/星/流星）
│   ├── claudeMotion.js         # Claude 走动状态机
│   ├── claudepixForms.js       # 13 个 claudepix 预设动画帧（~700 行）
│   └── spriteFrames.js         # 原始 8 模式 sprite 系统
├── components/
│   ├── AsciiBackground.svelte  # Canvas 循环 + 场景渲染 + 转场
│   ├── ClaudeSprite.svelte     # DOM sprite + 三击切换 + 运动
│   ├── ClaudeBubble.svelte     # 语音气泡（被动/主动）
│   ├── ClaudeChatPanel.svelte  # 多轮聊天面板
│   ├── AmbientHeader.svelte    # 顶栏：logo、场景图标、timer
│   ├── MiniPlayer.svelte       # 底部迷你播放器
│   ├── ExpandedPlayer.svelte   # 展开播放器
│   ├── RainPopover.svelte      # 雨声控制
│   ├── TimerPopover.svelte     # 睡眠定时器
│   ├── ScenePopover.svelte     # 场景切换 + 锁定
│   ├── ConnectionStatus.svelte # Bridge 连接状态 + Token 输入
│   └── KeyboardHint.svelte     # 快捷键 overlay
├── stores/
│   ├── appState.js             # 所有应用状态（player/rain/scene/timer/claude/ui/uiMode）
│   └── bridgeState.js          # Bridge 连接状态 store
├── audio/
│   ├── YouTubePlayer.js        # YouTube iframe API 封装
│   └── RainPlayer.js           # Howler.js 雨声播放
├── bridge/
│   └── bridgeClient.js         # WebSocket Bridge 客户端
├── ai/
│   └── ClaudeChat.js           # 前端 Anthropic API 直连（备用路径）
├── utils/
│   ├── claudeOrch.js           # Claude 编排器（bubble/panel 状态机、bridge 流式）
│   ├── audioInit.js            # 延迟音频初始化
│   ├── session.js              # 1s 间隔控制器（timer/idle/scene rotation）
│   └── keyboard.js             # 全局快捷键
bridge/
├── index.js                    # Bridge 入口
├── server.js                   # WebSocket 服务器
├── config.js                   # 配置（端口、token）
├── token.js                    # Token 管理
├── protocol.js                 # 消息协议定义
└── package.json                # 依赖（ws）
```

## Bridge 协议

```
Client → Server:  { type: "auth", token: "..." }
Client → Server:  { type: "user_message", text: "..." }
Server → Client:  { type: "status", value: "connecting|connected|thinking|talking|working|blocked|done|disconnected" }
Server → Client:  { type: "assistant_delta", text: "..." }
Server → Client:  { type: "tool_running", name: "npm run build" }
Server → Client:  { type: "error", message: "..." }
```

## 当前已知问题

1. Token 输入与连接反馈仍可进一步 UX 打磨（目前功能完整，体验可优化）
2. 测试覆盖率仍偏低（当前主要覆盖 bridge client 与 form helpers）
3. package.json 中 version 仍是 `0.0.0`，未与产品版本号同步

## 开发工作流

- Codex 在右侧 tmux pane
- 发送命令后必须补充 Enter 触发
- 新脚本首次运行需批准权限（`p` + `Enter`）
- 频繁 429 限流时切换 CC-switch 节点
- Codex 负责编码实现，Claude 负责分析、PRD、方案审查

## 运行

```bash
cd /Users/lieliot/Documents/eliot-codex/loficlaude
npm run dev            # Web 前端 :5173
node bridge/index.js   # Local Bridge :9120
npm test               # 运行测试
npm run build          # 生产构建
```
