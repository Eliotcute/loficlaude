# LoFiClaude "调用已安装 Skills" 完整分析

> 分析者：Claude (Opus 4.7)
> 日期：2026-05-18
> 类型：技术 + 产品 + 设计 + 战略四维分析
> 基于：完整源码阅读 + PRD v0.7 + HANDOFF.md

---

## 目录

1. [技术分析](#1-技术分析)
2. [产品经理分析](#2-产品经理分析)
3. [设计经理分析](#3-设计经理分析)
4. [产品战略分析](#4-产品战略分析)
5. [四维汇总](#5-四维汇总)
6. [决策建议](#6-决策建议)

---

## 1. 技术分析

### 1.1 产品架构总览

LoFiClaude 是一个三层 Svelte 5 应用：

```
┌──────────────────────────────┐
│  浏览器 (Svelte 5 SPA)        │
│  - Canvas 2D ASCII 场景       │
│  - DOM Claude Sprite (13 形态) │
│  - YouTube lofi + Howler 雨声 │
│  - 聊天面板 + 气泡对话         │
└──────────┬───────────────────┘
           │ WebSocket (ws://localhost:9120)
           │ 协议类型: auth / user_message / status / assistant_delta / tool_running / error
┌──────────▼───────────────────┐
│  Bridge (Node.js, bridge/)    │
│  - WebSocket Server           │
│  - Token 认证                 │
│  - spawn('claude', [])        │
└──────────┬───────────────────┘
           │ stdin/stdout pipe (非 PTY)
┌──────────▼───────────────────┐
│  Claude CLI 进程              │
│  - 接收用户消息文本            │
│  - 解释斜杠命令 (如 /review)   │
│  - 执行 skills                │
│  - 输出到 stdout               │
└──────────────────────────────┘
```

### 1.2 Skills 调用全路径

当用户发送包含 skill 调用的消息时（如 `/review`），完整数据流：

```
 1. ClaudeChatPanel.svelte → 用户输入 "/review"
 2. App.svelte:337 → sendClaudeMessage("/review")
 3. claudeOrch.js:198 → sendMessage("/review")
 4. claudeOrch.js:215 → bridgeClient.sendMessage("/review")
 5. bridgeClient.js:93-106 → WebSocket send { type: "user_message", text: "/review" }
 6. bridge/server.js:67 → claudeSession.sendUserMessage("/review")
 7. bridge/claude.js:78 → child.stdin.write("/review\n")
 8. Claude CLI 进程解释 /review skill 并执行
 9. stdout 输出 → bridge/claude.js:52 → parseAndEmit(chunk)
10. onDelta(text) → WebSocket { type: "assistant_delta", text: "..." }
11. 前端 bridgeClient → claudeOrch.handleBridgeDelta() → 追加聊天历史 + 更新气泡
```

**结论：Skills 能被调用。** 因为 LoFiClaude 本质上是把用户消息转发给本地 Claude CLI 进程，Claude CLI 本身支持斜杠命令调用 skills。

### 1.3 架构断点

| # | 断点 | 位置 | 影响 |
|---|------|------|------|
| 1 | **无 PTY** | `bridge/claude.js:4` — `spawn('claude', [], { stdio: ['pipe', 'pipe', 'pipe'] })` | 交互式 skills 无法使用（需要终端交互的 skill 会失败）|
| 2 | **无 Skill 协议消息** | `bridge/protocol.js` — 只有 `STATUS/ASSISTANT_DELTA/TOOL_RUNNING/ERROR` | 前端无法区分"Claude 在闲聊"和"Claude 在执行 skill" |
| 3 | **TOOL_RUNNING 靠正则** | `bridge/claude.js:40` — `/npm|pnpm|yarn|node|git/` | 不准确，漏检多，误检多 |
| 4 | **状态检测全靠文本匹配** | `bridge/claude.js:27-49` — `includes('thinking')` / `includes('```')` / `includes('done')` | "well done"会触发 DONE，代码块会触发 WORKING |
| 5 | **独立 Claude 会话** | `bridge/claude.js:4` — spawn 新的 `claude` | 和用户终端里的 Claude Code 是两个独立会话，上下文不共享 |
| 6 | **单进程** | 一个 WebSocket 连接 = 一个 Claude spawn | 不能并行执行多个 skills |
| 7 | **前端 fallback 路径** | `src/ai/ClaudeChat.js` — 直连 Anthropic API (`claude-3-5-haiku-latest`) | 未连接 Bridge 时走 API，但这个 API 路径不能调用 skills |

### 1.4 前端 Bridge 集成状态

`src/bridge/bridgeClient.js` — BridgeClient 类：
- 管理 WebSocket 生命周期（connect/disconnect/sendMessage）
- 事件回调：onStatus / onDelta / onTool / onError / onDisconnect
- 单例导出：`export const bridgeClient = new BridgeClient()`

`src/stores/bridgeState.js` — 5 个 Svelte stores：
- `connectionStatus` — WebSocket 连接状态 (disconnected/connecting/connected)
- `claudeStatus` — Claude 的工作状态 (thinking/talking/working/blocked/done...)
- `streamingText` — 流式文本累积
- `toolRunning` — 当前工具名
- `lastError` — 最近错误

`src/utils/claudeOrch.js` — 编排层：
- `attachBridge(client)` — 绑定 Bridge 事件到 store + mood 映射
- `STATUS_TO_MOOD` — 9 种状态映射到 Claude sprite 表情
- 混合模式：Bridge 连接时走 Bridge，否则走前端 Anthropic API fallback

---

## 2. 产品经理分析

### 2.1 产品身份的张力

LoFiClaude 有两个产品身份，它们正在冲突：

| | 身份 A：氛围陪伴聊天 | 身份 B：编码工作工具 |
|---|---|---|
| **Claude 系统 prompt** | "calm ambient companion, reply in concise Chinese" ✅ | |
| **场景/音乐/雨声** | 核心功能，大量代码 ✅ | |
| **fallback 文案** | "雨声和 lofi 真的很配" "要不要休息一下？☕" ✅ | |
| **PRD v0.7 定位用语** | "ambient room" ✅ | "local Claude coding companion" ❌ |
| **Bridge 架构** | | spawn Claude CLI，pipe stdin/stdout ❌ |
| **PRD v0.7 用户路径** | | "send task → Claude working → output" ❌ |
| **Tool running 检测** | | 正则匹配 npm/git 命令 ❌ |
| **HANDOFF.md 一句话** | "陪你和本地 Claude 一起编码的 lofi 空间" ⚠️ | "陪你和本地 Claude 一起编码" ⚠️ |

**PM 判断：产品在"陪伴"和"工具"之间摇摆，导致体验不统一。**

用户打开房间听到雨声，Claude 气泡说"今天想做点什么呢？"——这个氛围是陪伴。但如果 Claude 开始跑 `npm run build`，体验就塌了——像素小人在雨夜里跑构建流程，情绪上不成立。

### 2.2 用户群重新审视

PRD v0.7 定义了两个用户群：

**Primary：本地 AI 编码用户。** 已经在用 Claude Code/Codex CLI。问题不是"缺少聊天窗口"，而是长期编码时缺少低干扰的陪伴。

**Secondary：lofi 专注用户。** 把 LoFiClaude 当氛围工具使用，不一定要连 Claude。

**PM 重新判断：**
- Primary 用户调用 skills 的主场景**不应该**是在 LoFiClaude 的聊天面板里输入 `/review`
- Primary 用户在终端里用 Claude Code 工作，LoFiClaude 在另一个屏幕/窗口提供**氛围陪伴**
- Skills 在这个产品里应该是 Claude 的**隐性能力**，不是用户的功能入口

### 2.3 Skills → 产品价值的正确映射

```
❌ "来 LoFiClaude 调 skills" — 这是把产品定位成工具入口，和氛围定位冲突
❌ "在 LoFiClaude 里跑 /review /qa /ship" — 用户已经有 Claude Code 了，不需要另一个

✅ Claude 用 skills 更好地回答问题，skill 在背后静默执行
✅ 用户看到的是 Claude 在"认真帮我想事情"，不是"在执行 CLI 命令"
✅ 偶尔需要时，用户可以在聊天里自然地说"帮我看看这段代码"，Claude 自己决定是否调 skill
```

### 2.4 核心产品债务

| 优先级 | 问题 | 影响 |
|---|---|---|
| P0 | 产品身份不清晰（陪伴 vs 工具） | 新用户不知道这产品是干什么的 |
| P0 | Claude 会话是独立的（spawn 新进程） | 和用户终端里的 Claude 工作无关 |
| P1 | Bridge 协议没有 skill 生命周期消息 | 前端无法区分"闲聊"和"执行 skill" |
| P1 | 状态映射靠 stdout 文本正则 | Claude sprite 状态不准确，信任度低 |
| P2 | `tool_running` 显示原始 CLI 命令 | "running npm test" 破坏陪伴氛围 |
| P2 | PRD v0.7 产品文案和实际代码实现方向不一致 | 团队对产品方向理解可能不统一 |

---

## 3. 设计经理分析

### 3.1 设计资产盘点

设计系统已经很强：

| 资产类别 | 内容 | 质量 |
|---|---|---|
| Claude sprite 形态 | 13 种 claudepix 预设动画 (idle/think/work/dance/expression) | 高 |
| ASCII 程序化场景 | 3 个场景 (lofiNight/softRain/starDrift)，5 层渲染 | 高 |
| 音频氛围 | YouTube lofi + 3 级雨声 (Howler.js) | 高 |
| 气泡对话 | 被动气泡 (transient) + 主动对话气泡 | 中高 |
| 聊天面板 | 多轮对话面板 + 流式显示 | 中 |
| UI 控件 | MiniPlayer / RainPopover / TimerPopover / ScenePopover | 中 |
| 键盘快捷键 | Space / ←→ / ↑↓ / M / 1-3 / T / H / Esc | 中高 |
| 字体系统 | Press Start 2P + IBM Plex Mono | 高 |
| 色彩系统 | 深蓝黑 #0a0a0f → #1a1a2e，强调色 #d4a574，Claude 身体色 #df805f | 高 |

### 3.2 设计隐喻分析

LoFiClaude 的设计隐喻是 **"Claude 住在房间里"**。

这是一个罕见且有力的设计思路。大多数 AI 产品把 AI 设计成"浮在界面上的对话气泡"，LoFiClaude 把 AI 设计成了"空间里的一个存在"——有身体（像素 sprite）、有位置（走动坐标）、有情绪（13 种形态）、住在房间里的一个角色。

**Skill 调用在设计语言里的正确表达：不是"Claude 在跑命令"，而是"Claude 在认真帮我想事情"。**

### 3.3 设计断点

#### 断点 1：tool_running 显示原始命令文本，破坏氛围

`bridge/claude.js:40-42` 正则匹配到 `$ npm test` 后，直接发送原始命令文本到前端。用户在雨夜里点开 Claude，气泡可能是"要不要休息一下？☕"，下一秒变成"running npm run build"——两个世界的东西硬拼在一起。

#### 断点 2：状态驱动来自文本正则，不是结构化事件

`STATUS_TO_MOOD` 映射表（`claudeOrch.js:13-22`）把 Bridge 的 9 种状态直接映射到 mood。这是工程思维，不是设计思维：

| 当前映射 | 给用户的感受 | 是否适合陪伴场景？ |
|---|---|---|
| connecting → thinking | Claude 在思考 | ✅ 可以 |
| connected → idle | Claude 醒着 | ✅ 可以 |
| thinking → thinking | Claude 在思考 | ✅ 合适 |
| talking → talk | Claude 在说话 | ✅ 合适 |
| working → working | Claude 在工作 | ⚠️ "工作"太工具化，应该是"在认真想" |
| blocked → blocked | Claude 卡住了 | ❌ 用户为什么要在陪伴场景里知道这个？ |
| done → happy | Claude 搞定了 | ✅ 合适 |
| disconnected → sleep | Claude 睡了 | ✅ 合适 |

但上游的状态检测是完全不可靠的——`bridge/claude.js:27-49` 的 `parseAndEmit()`：

```js
if (lowered.includes('thinking')) → emitStatus(THINKING)  // 可能匹配不到
if (text.includes('```')) → emitStatus(WORKING)            // 代码块 ≠ 工作
if (lowered.includes('done')) → emitStatus(DONE)           // "well done"也会触发
```

#### 断点 3：四个系统独立运行，缺少联动

| 系统 | 随什么变化？ | 应随 skill 状态变化？ |
|---|---|---|
| Claude sprite 形态 | mood store (9 种状态) | ✅ 已联动（但不准） |
| 场景 | 5 分钟定时器轮播 / 快捷键 | ❌ 不联动 |
| 音乐 | 用户手动控制 | ❌ 不联动 |
| 雨声 | 用户手动控制 | ❌ 不联动 |
| 气泡 | 聊天内容 + 触发事件 | ⚠️ 部分联动 |

一个 unified skill-state → room-atmosphere 映射层在设计上是缺失的。

#### 断点 4：聊天面板遮盖房间

当用户打开 `ClaudeChatPanel.svelte`，面板覆盖了房间。用户从"在房间里"变成了"在聊天窗口里"。skill 输出越长，在"聊天窗口"里待得越久，房间的存在感越低。

### 3.4 设计建议

**tool_running 氛围化映射（示例）：**

```
npm run build  → "正在整理一下..."
npm test       → "检查一下有没有问题..."
git commit     → "记下来..."
eslint         → "整理一下格式..."
npm install    → "准备一下工具..."
```

**理想体验示意（以用户让 Claude 帮忙 review 代码为例）：**

```
用户在聊天框输入 "帮我看下这段代码有什么问题"

→ Claude thinking (摸下巴动画, 2-3s)
→ 气泡浮现: "让我仔细看看..."
→ Claude working (敲键盘动画)
→ 场景微调 (音乐音量略降，但不是静音)
→ 气泡: "这里有个小问题..."
→ 用户打开聊天面板看详细输出
→ 对话结束 → Claude happy (跳一下) → 气泡消失
→ 音乐和雨声恢复 → 回到氛围模式
```

---

## 4. 产品战略分析

### 4.1 生态位地图

```
高功能深度
    ↑
    │  Claude Code CLI       VS Code 插件
    │  (全功能，纯文本)       (编辑器内集成)
    │
    │  Claude.ai (Web)       LoFiClaude ★
    │  (聊天界面)             (lofi + 氛围 + 陪伴)
    │
    │  lofi.cafe             (无 AI)
    │  (只有音乐)
    │
    └────────────────────────────→
    低情绪价值                  高情绪价值
```

### 4.2 战略判断

**LoFiClaude 的壁垒不是 skills 调用能力。** 技术上 spawn Claude CLI 谁都做得到。

**LoFiClaude 的壁垒是"把 Claude 放到一个有情绪的空间里"这个体验。** 生态里没有任何其他产品在做这件事。

Skills 在这个产品里正确的战略角色：

| | 错误定位 | 正确定位 |
|---|---|---|
| **Skills 是...** | Feature（卖点："能调 skills"） | Enabler（让 Claude 更好地陪伴和回答） |
| **用户行为** | "来 LoFiClaude 调 skills" | "来 LoFiClaude 待一会儿"，Claude 自然地在聊天里帮忙 |
| **竞品对比** | "又一个调用 Claude 的工具" | "唯一的 Claude 陪伴空间" |

### 4.3 类比

在咖啡馆跟朋友聊天，朋友掏出手机帮你查了个东西，然后继续聊天。

- 你不需要看到他手机屏幕上的搜索过程 → **skill 执行不需要暴露给用户**
- 你只需要他告诉你结果 → **Claude 气泡/聊天里给结论即可**
- 咖啡馆的环境音和灯光不受影响 → **房间氛围不应因 skill 执行而破坏**
- 你不会说"我来咖啡馆是为了让朋友帮我查东西" → **skill 不是产品的核心价值主张**

### 4.4 产品方向分岔口

| | 路径 A：氛围陪伴（纯化） | 路径 B：陪伴+工具（混合，PRD v0.7 方向） |
|---|---|---|
| **一句话** | lofi 房间里有个陪你聊天的 Claude | lofi 房间里有个能帮你干活的 Claude |
| **目标用户** | 想要低干扰陪伴的所有人 | 用 Claude Code 的开发者 |
| **Skill 可见性** | 完全隐藏，Claude 内部使用 | 用户可见 skill 执行过程 |
| **tool_running** | 去掉，或转为氛围化描述 | 保留，作为功能亮点 |
| **聊天面板** | 轻量，不遮挡房间 | 全功能，支持长文输出 |
| **产品风险** | 用户群可能太窄（纯陪伴工具） | 陪伴和工具两种体验互斥，可能都不讨好 |
| **技术风险** | 低 | 中（需要结构化的 skill 事件协议） |

---

## 5. 四维汇总

### 5.1 产品维度

| 维度 | 当前状态 | 评级 |
|---|---|---|
| 定位清晰度 | 在"氛围陪伴"和"编码工具"之间摇摆 | ⚠️ P0 待决策 |
| 目标用户匹配 | 两个用户群的需求有冲突 | ⚠️ 需聚焦 |
| Skills 的产品角色 | 实现是"入口"，文案是"感知层"，不一致 | ⚠️ P1 |
| 首次体验路径 | 房间启动合理，但连接 Claude 后体验不统一 | ⚠️ P1 |

### 5.2 代码维度

| 维度 | 当前状态 | 评级 |
|---|---|---|
| 架构分层 | SPA → WebSocket → Bridge → CLI，层次清晰 | ✅ |
| Skill 调用可行性 | spawn Claude CLI + stdin pipe，技术上能调 | ✅ |
| Skill 状态协议 | 无结构化 skill 事件，全靠文本正则 | ❌ |
| 错误处理 | Bridge 断开有恢复 UI，但 skill 级别的错误不感知 | ⚠️ |
| 测试覆盖 | `npm test` 可用但覆盖率低 | ⚠️ |

### 5.3 设计维度

| 维度 | 当前状态 | 评级 |
|---|---|---|
| 设计隐喻 | "Claude 住在房间里" — 罕见且有力 | ✅ 亮点 |
| 视觉资产 | 13 形态 / 3 场景 / 色彩系统 / 字体系统 | ✅ 强 |
| 氛围—状态联动 | 场景/音乐/雨声和 Claude 状态无联动 | ❌ 缺失 |
| Skill 的视觉表达 | tool_running 显示原始命令，和氛围不搭 | ❌ 需重设计 |
| 信息层级 | 聊天面板遮盖房间，空间感被破坏 | ⚠️ |

### 5.4 战略维度

| 维度 | 当前状态 | 评级 |
|---|---|---|
| 生态位 | "AI ambient presence"蓝海，无直接竞品 | ✅ 蓝海 |
| 差异化壁垒 | 情绪体验不是技术壁垒，但竞品难复制 | ✅ |
| 技术护城河 | spawn CLI 无壁垒，但设计体验形成壁垒 | ⚠️ 中等 |
| 与 Claude Code 的关系 | 当前是替代（独立会话），理想是互补 | ⚠️ 待决策 |

---

## 6. 决策建议

### 6.1 首先要做的决策（P0）

**产品身份选哪一边？**

| 选项 | 推荐度 | 理由 |
|---|---|---|
| **A. 氛围陪伴（纯化）** | ⭐⭐⭐ 推荐 | 产品有唯一性，skill 在背后静默执行，设计上统一，技术简单 |
| B. 陪伴+工具混合 | ⭐⭐ | PRD v0.7 方向，但需要大幅重设计状态→氛围映射，有风险 |
| C. 纯工具（编码面板） | ⭐ | 放弃产品唯一性，直接和 Claude Code 竞争，不建议 |

### 6.2 短期改进（无论选 A 还是 B 都建议做）

| 优先级 | 改进项 | 工作量 |
|---|---|---|
| P0 | 产品身份决策 + 更新 README/PRD 文案 | 半天 |
| P1 | `tool_running` 文本氛围化映射（不显示原始命令） | 1-2h |
| P1 | Bridge 协议增加结构化 skill 事件（`skill_started/completed`） | 4-6h |
| P2 | 状态检测从正则升级为结构化解析 | 6-8h |
| P2 | 聊天面板不遮挡房间（侧边轻量展开） | 1-2 天 |

### 6.3 长期方向（v0.8+）

- 如果选 **A（陪伴优先）**：去掉 tool_running 暴露，让 Claude 内部使用 skills，输出保持陪伴感
- 如果选 **B（混合）**：重建设计系统，让 skill 状态驱动房间气氛变化（场景调整 + 音乐联动 + sprite 动画序列），让"工作状态"成为房间体验的一部分而非破坏者

---

## 附录：关键文件清单

| 文件 | 说明 |
|---|---|
| `bridge/claude.js` | Claude CLI spawn + stdin/stdout pipe + 文本状态解析 |
| `bridge/server.js` | WebSocket 服务 + 认证 + 消息路由 |
| `bridge/protocol.js` | 协议类型定义 (CLIENT_TYPES / SERVER_TYPES / STATUS) |
| `bridge/index.js` | Bridge 入口 |
| `src/bridge/bridgeClient.js` | 前端 WebSocket 客户端 (BridgeClient 类 + 单例) |
| `src/stores/bridgeState.js` | Bridge 相关 5 个 Svelte stores |
| `src/stores/appState.js` | 全局 app 状态 (player/rain/scene/timer/claude/ui) |
| `src/utils/claudeOrch.js` | Claude 编排层 (Bridge 事件 → store → mood 映射) |
| `src/ai/ClaudeChat.js` | Anthropic API 直连 (fallback 路径，不能调 skills) |
| `src/App.svelte` | 主布局 + 状态编排 + 所有组件的连接点 |
| `src/components/ConnectionStatus.svelte` | Bridge 连接 UI (token 输入 + 连接/断开 + 命令复制) |
| `src/components/ClaudeChatPanel.svelte` | 多轮聊天面板 |
| `src/components/ClaudeBubble.svelte` | Claude 气泡对话 |
| `src/components/ClaudeSprite.svelte` | Claude 像素角色 + 走动 + 形态动画 |
| `PRD_v0.7_PRODUCT_UX_OPTIMIZATION.md` | 当前 PRD (v0.7 编码伴侣方向) |
| `HANDOFF.md` | 项目 handoff 文档 (v0.6 状态) |
