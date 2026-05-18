# LoFiClaude v0.5 PRD — Local Claude Companion

> 状态：Product / Architecture Proposal  
> 基础版本：v0.4 ASCII 动态背景 + Claude Motion  
> 核心升级：把 Web Claude 小人从“可点击角色”升级为“本地 Claude 会话的陪伴式可视化前端”  
> 设计原则：Web 是舞台，Claude 小人是身体，本地 Claude 是大脑，Local Bridge 是神经系统。

---

## 1. Summary

LoFiClaude v0.5 要解决的问题是：用户虽然在本地终端里使用 Claude / Codex 工作，但 Web 里的 Claude 小人还只是一个孤立的角色，缺少真实陪伴感和工作状态同步。

本版本目标是建立一个“本地 Claude 连接体验”：Web 小人可以和本地终端 Claude 对话，显示 Claude 的工作状态，并通过 lo-fi 场景、雨声、灯光和角色动画把编码过程变成一个有氛围的工作空间。

---

## 2. Contacts

| Name | Role | Comment |
|---|---|---|
| Product Owner | 产品决策 | 定义 LoFiClaude 是否主打本地 Claude 陪伴式编码 |
| Designer | 体验设计 | 负责角色状态、微交互、氛围层级 |
| Frontend Engineer | Web 实现 | 负责场景、聊天 UI、WebSocket 客户端 |
| Runtime Engineer | 本地连接 | 负责 Local Bridge、终端会话、事件协议 |
| Security Reviewer | 安全 | 负责本地权限、命令执行边界、token 策略 |

---

## 3. Background

### 3.1 当前产品状态

LoFiClaude 已经具备：

- lo-fi 黑底 ASCII / 点阵背景
- 雨声、音乐、timer
- 底部播放器抽屉
- Claude pixel 小人
- 点击 Claude 后出现对话气泡
- 基础聊天能力

但当前体验仍有几个明显缺口：

| 问题 | 现状 | 用户感受 |
|---|---|---|
| Web Claude 和终端 Claude 割裂 | Web 气泡像另一个聊天入口 | 不像“本地 Claude 住进来了” |
| 氛围感不够强 | 背景、音乐、角色、编码状态联动少 | 更像播放器，不像工作空间 |
| 小人状态少 | idle / talk 等状态较基础 | 角色不够“活” |
| 对话层次不清 | 气泡和聊天面板边界还不明确 | 容易变成普通 chat app |
| 产品差异化不够 | lo-fi + AI 组合还没有形成强记忆点 | 和普通 AI chat / lofi app 拉不开距离 |

### 3.2 为什么现在做

本地 AI 编码工具越来越强，但终端体验仍然偏冷。用户需要知道 Claude 当前在想什么、在跑什么、是否卡住、是否需要确认。终端能完成工作，但不擅长表达陪伴感。

LoFiClaude 的机会是把“本地编码 agent”转译成一个可见、可交互、有情绪状态的角色，让用户在专注工作时获得轻量反馈，而不是频繁盯着终端。

---

## 4. Objective

### 4.1 Product Objective

让 LoFiClaude 从“lo-fi 播放器 + Claude 小人”升级为：

**一个可以连接本地 Claude，会用角色、气泡和场景反馈编码状态的 lo-fi 工作空间。**

### 4.2 User Benefit

用户可以：

- 在 Web 小人里向本地 Claude 提问
- 在终端 Claude 工作时，通过小人状态知道进度
- 在不打开大聊天窗口的情况下获得轻量反馈
- 保持音乐、雨声、夜景和编码节奏的一致氛围

### 4.3 Business / Product Benefit

LoFiClaude 不再只是一个视觉 demo，而是拥有清晰差异化：

| 普通 lo-fi 产品 | 普通 AI chat | LoFiClaude |
|---|---|---|
| 提供氛围 | 提供回答 | 提供有氛围的本地 AI 工作陪伴 |
| 用户听音乐 | 用户问问题 | 用户和本地 Claude 一起工作 |
| 背景是主角 | 文本是主角 | Claude 小人和工作状态是主角 |

### 4.4 Key Results

| KR | Measurement |
|---|---|
| KR1 | 用户可以在 60 秒内完成 Local Claude 连接 |
| KR2 | Web 小人能完成一次本地 Claude 问答闭环 |
| KR3 | Claude 至少支持 6 个可见状态：disconnected / idle / thinking / talking / running / blocked |
| KR4 | 80% 常见状态不需要打开完整聊天面板即可理解 |
| KR5 | 用户在 15 分钟工作 session 中至少感知到 3 次自然微交互反馈 |

---

## 5. Market Segments

### 5.1 Primary Segment: 本地 AI 编码用户

这类用户已经在使用 Claude Code、Codex、Cursor、终端 agent 或类似工具。他们的核心任务不是“聊天”，而是让 AI 帮他们写代码、跑测试、修 bug、解释错误。

Job to be Done：

> 当我在本地项目里和 Claude 一起工作时，我想用更轻、更有氛围的方式知道它在做什么，这样我不用一直盯着终端，也不会丢失工作节奏。

约束：

- 用户在本地机器上工作
- 需要访问当前 workspace 状态
- 不能让网页拥有任意命令执行权
- 对延迟和稳定性敏感

### 5.2 Secondary Segment: 专注工作 / 学习用户

这类用户未必强依赖 Claude CLI，但需要一个有音乐、雨声、timer、轻量 AI 陪伴的空间。

Job to be Done：

> 当我学习或写作时，我想有一个不打扰我的 AI 陪伴空间，在我需要时它能回应我。

### 5.3 Not For Now

v0.5 不优先服务：

- 多人协作空间
- 公网部署 AI chat 产品
- 完整 IDE 替代品
- 复杂 agent 编排平台
- 高强度游戏化养成系统

---

## 6. Value Proposition

### 6.1 Before

用户当前通常在两个世界切换：

- 终端 Claude：强大，但冷、文本密集、状态表达弱
- lo-fi 产品：有氛围，但和真实编码工作无关

结果是：用户要么沉浸听音乐，要么盯着终端处理 AI 输出，两者没有融合。

### 6.2 How

LoFiClaude 用 Local Bridge 连接本地 Claude 会话。Web 小人接收 Claude 的文本和状态事件，并把它们转成：

- 气泡短反馈
- 聊天面板长对话
- 小人动作
- 场景灯光
- 雨声 / 播放器微交互

### 6.3 After

用户获得一个更自然的编码陪伴体验：

- Claude 思考时，小人进入 thinking
- Claude 执行命令时，小人看向终端 / 敲键盘
- Claude 等确认时，小人停住并提示用户
- Claude 完成时，场景给出短暂暖色反馈
- 用户想问问题时，直接点小人

### 6.4 Competitive Difference

| Product | Strength | Gap | LoFiClaude Opportunity |
|---|---|---|---|
| Spirit City | 角色陪伴、专注、房间氛围 | 不连接真实编码 agent | 借鉴角色状态和房间氛围 |
| Lofi Room / lofi.cafe | 低干扰音乐空间 | AI 和工作状态弱 | 借鉴少控件、强沉浸 |
| I Miss My Cafe | 环境音 mixer | 无角色、无编码上下文 | 借鉴多轨环境音 |
| LifeAt | 虚拟工作空间 | AI 人格化弱 | 借鉴 workspace 和 widgets |
| Claude Code / Codex CLI | 真正能做本地工作 | 缺少氛围和可视化状态 | LoFiClaude 做它的 companion layer |

---

## 7. Solution

### 7.1 Product Principle

v0.5 必须坚持一个原则：

**不要做“双 Claude”。**

错误方向：

```text
Web 小人调用一个 Claude API
终端里又运行另一个 Claude
```

这会导致上下文割裂。用户会感觉 Web 小人只是另一个聊天机器人。

正确方向：

```text
Web Claude 小人
  <-> Local Bridge
  <-> 本地 Claude / Codex 终端会话
```

产品表达：

> 终端 Claude 是大脑，Web 小人是身体。

---

### 7.2 High-Level Architecture

```text
┌────────────────────────────────────┐
│ Web App                            │
│ Lo-fi room / Claude avatar / Chat   │
└───────────────┬────────────────────┘
                │ WebSocket / HTTP
┌───────────────▼────────────────────┐
│ Local Claude Bridge                 │
│ Session / Events / Security         │
└───────────────┬────────────────────┘
                │ PTY / CLI Adapter
┌───────────────▼────────────────────┐
│ Local Claude Runtime                │
│ Claude Code / Codex / terminal AI   │
└────────────────────────────────────┘
```

### 7.3 Web App Modules

```text
Web App
├─ Scene Layer
│  ├─ ASCII 夜景
│  ├─ 雨、城市灯光、粒子
│  └─ 音乐/雨量/状态联动
│
├─ Claude Avatar Layer
│  ├─ 小人状态机
│  ├─ idle / thinking / talking / running / blocked
│  └─ 点击、hover、气泡 anchor
│
├─ Chat Layer
│  ├─ 短气泡
│  ├─ 展开聊天面板
│  └─ 流式文本
│
└─ Connection Layer
   ├─ connected / disconnected
   ├─ workspace
   └─ reconnect / open terminal
```

### 7.4 Local Bridge Modules

```text
Local Claude Bridge
├─ WebSocket Server
│  ├─ 接收 Web 用户消息
│  └─ 推送 Claude 输出和状态
│
├─ Session Manager
│  ├─ 当前 workspace
│  ├─ 当前 Claude 会话
│  ├─ 会话恢复
│  └─ 多 Web 客户端连接
│
├─ Runtime Adapter
│  ├─ Claude Code Adapter
│  ├─ Codex CLI Adapter
│  └─ Generic PTY Adapter
│
├─ Event Translator
│  ├─ stdout -> assistant_delta
│  ├─ command -> tool_running
│  ├─ approval -> waiting_for_user
│  └─ exit/completion -> done/error
│
└─ Security Layer
   ├─ local token
   ├─ origin check
   ├─ workspace allowlist
   └─ command approval passthrough
```

### 7.5 First-Run UX

第一次打开页面时：

```text
Claude is sleeping
Connect local Claude to wake him up
[Connect Local Claude]
```

点击后：

```text
Start the local bridge:

loficlaude bridge

Waiting for connection...
```

连接成功：

```text
Connected to Local Claude
Workspace: /path/to/project
```

小人从 sleeping 切到 idle，并显示短气泡：

```text
我连上了。你可以在终端继续工作，也可以直接问我。
```

### 7.6 Daily UX

用户有两个入口：

| Entry | Behavior |
|---|---|
| 终端输入 | Web 小人同步状态 |
| Web 小人输入 | Bridge 转发给本地 Claude |

产品上必须表现为同一个会话：

```text
Two entrances. One Claude. One workspace.
```

### 7.7 Conversation Layers

#### Bubble Layer

用于短反馈：

- “我在看报错。”
- “测试跑起来了。”
- “这里需要你确认。”
- “完成了。”

规则：

- 默认最多 1-2 行
- 不显示长代码
- 不抢播放器和背景
- 8 秒内自动淡出，除非需要用户确认

#### Chat Panel Layer

用于长对话：

- 解释错误
- 输出方案
- 展示步骤
- 承接完整 Claude 回答

打开方式：

- 点击气泡
- 点击 Claude 小人后选择展开
- 快捷键

### 7.8 Event Protocol

Web 和 Bridge 不只传文本，还要传状态事件。

User message:

```json
{
  "type": "user_message",
  "text": "帮我分析这个构建失败"
}
```

Connection:

```json
{
  "type": "connection",
  "status": "connected",
  "workspace": "/Users/example/project"
}
```

Assistant stream:

```json
{
  "type": "assistant_delta",
  "text": "我先看一下错误信息。"
}
```

Status:

```json
{
  "type": "status",
  "value": "thinking"
}
```

Tool running:

```json
{
  "type": "tool_running",
  "name": "npm run build"
}
```

Waiting for user:

```json
{
  "type": "waiting_for_user",
  "text": "需要确认是否允许安装依赖。"
}
```

Done:

```json
{
  "type": "done"
}
```

Error:

```json
{
  "type": "error",
  "message": "Local Claude disconnected."
}
```

### 7.9 Claude Avatar State Machine

```text
disconnected
  ↓ connect
sleeping
  ↓ connected
idle
  ↓ user_message
listening
  ↓ bridge accepted
thinking
  ↓ assistant_delta
talking
  ↓ tool_running
running_command
  ↓ waiting_for_user
blocked
  ↓ done
idle
```

State mapping:

| State | Avatar | Bubble | Scene |
|---|---|---|---|
| disconnected | 睡觉 / 灰色 | Connect 提示 | 背景安静 |
| idle | 看雨 / 轻微呼吸 | 隐藏 | 雨和城市慢动 |
| listening | 转头看用户 | 输入框亮起 | 轻微聚焦 |
| thinking | 眨眼 / 低头 | thinking... | 城市灯光慢闪 |
| talking | 点头 / 说话 | 逐字输出 | 气泡柔和出现 |
| running_command | 看终端 / 敲键盘 | 命令名短提示 | 播放器边框轻闪 |
| blocked | 停住 / 看用户 | 等待确认 | 暖色高亮 |
| done | 点头 | 完成提示 | 灯光轻闪一次 |
| error | 困惑 / 停顿 | 简短错误 | 雨声和灯光降低 |

### 7.10 Microinteractions

v0.5 的丰富度主要来自微交互，不来自更多按钮。

| Trigger | Microinteraction |
|---|---|
| hover Claude | Claude 转头 / 眨眼 |
| click Claude | 气泡从头顶弹出 |
| send message | 小人进入 listening -> thinking |
| assistant streaming | 气泡逐字输出，小人轻微点头 |
| command starts | 小人看向终端方向 |
| command succeeds | 暖光闪一下 |
| command fails | 小人停顿，气泡显示短错误 |
| timer starts | timer 按钮短暂 tick |
| rain volume changes | 雨线密度和速度同步变化 |
| music starts | 城市灯光轻微呼吸 |
| app idle | HUD 缓慢淡出 |

### 7.11 Visual Direction

LoFiClaude 应该更接近：

- lo-fi 夜间房间
- ASCII 城市雨景
- 小型桌面 companion
- 温暖、低干扰、可久待

不应该变成：

- dashboard
- 大聊天应用
- 游戏 UI
- 复杂 IDE
- 全屏控制台

### 7.12 Security Requirements

安全边界必须作为产品能力的一部分，而不是后补。

Rules:

- Web 端不能直接执行 shell 命令
- Web 端只能向 Bridge 发送用户消息和 UI 控制事件
- Bridge 只能绑定 localhost
- Bridge 必须使用一次性 local token
- Bridge 必须校验 origin
- workspace 需要显式显示
- 高风险动作仍由本地 Claude / CLI 的审批机制处理
- 用户可以随时 disconnect

Settings copy:

```text
Local Claude is connected to this workspace only.
Web UI can send messages to Claude, but cannot run shell commands directly.
```

### 7.13 Failure States

| Failure | User-facing State | Recovery |
|---|---|---|
| Bridge not running | Claude sleeping | Show start command |
| Token mismatch | Connection refused | Regenerate token |
| Runtime crashed | Claude disconnected | Reconnect |
| Workspace unavailable | Workspace missing | Choose workspace |
| Claude waiting approval | blocked | Show confirmation hint |
| Long no output | thinking too long | Show “still working” |
| WebSocket dropped | reconnecting | Auto retry |

---

## 8. Release

### 8.1 MVP Scope

MVP 目标：完成 Web 小人和本地 Claude 的最小对话闭环。

Included:

- Local Claude connection state
- WebSocket Bridge
- Web 输入 -> Bridge -> 本地 Claude
- 本地 Claude 输出 -> Bridge -> Web
- 流式 assistant text
- avatar 状态：disconnected / idle / thinking / talking / error
- bubble 短反馈
- chat panel 长反馈
- disconnect / reconnect

Not included:

- 多 workspace 切换
- 多 agent 同时工作
- 完整命令事件解析
- 深度 Git / build / test 可视化
- 房间装饰系统
- 云同步

### 8.2 v0.5.1

目标：让小人能表达 Claude 工作过程。

Included:

- running_command 状态
- waiting_for_user 状态
- blocked 气泡
- command name 短提示
- build/test success/fail 简单反馈
- 更完整的微交互

### 8.3 v0.6

目标：让 LoFiClaude 成为完整的 AI coding companion room。

Included:

- workspace-aware 状态
- task timeline
- build/test/git 状态可视化
- 多轨环境音 mixer
- Claude 情绪和场景联动
- 可选桌面壳，自动启动 Bridge

### 8.4 Open Questions

1. 第一版要优先支持 Claude Code、Codex CLI，还是 generic PTY？
2. 是否允许 Web 小人主动唤起一个新的 Claude 会话？
3. Bridge 是否作为独立 npm package 发布？
4. 是否需要桌面版来减少用户启动 bridge 的摩擦？
5. 对话历史由 Bridge 保存，还是只保存在 Claude runtime？
6. blocked 状态是否要提供确认按钮，还是只提示用户回到终端确认？

### 8.5 Key Assumptions

| Assumption | Risk | Validation |
|---|---|---|
| 用户愿意启动本地 Bridge | 连接门槛高 | 测试首次连接完成率 |
| 小人状态能提升陪伴感 | 可能只是装饰 | 观察用户是否减少盯终端 |
| 气泡短反馈足够有用 | 长回答仍需 chat | 记录 bubble -> panel 展开率 |
| 本地 CLI 输出可稳定解析 | 不同 runtime 差异大 | 先支持一种 runtime |
| 安全提示不会吓退用户 | 本地权限敏感 | 用清晰 copy 降低误解 |

### 8.6 Success Definition

v0.5 成功的标准不是“能聊天”，而是：

> 用户相信 Web 小人就是本地 Claude 的可视化分身，并且在编码时愿意让它常驻旁边。

---

## 9. Implementation Notes

### 9.1 Recommended Build Order

1. Define event protocol.
2. Build mock Bridge mode for frontend development.
3. Implement avatar state machine.
4. Implement WebSocket connection UI.
5. Implement real Bridge adapter for one runtime.
6. Add streaming chat.
7. Add microinteractions.
8. Add security checks.
9. Add failure states.

### 9.2 UX Priority

If engineering scope gets tight, keep these:

- connected / disconnected clarity
- one real local Claude conversation loop
- visible thinking / talking states
- blocked state
- no big default chat window

Cut these first:

- advanced room customization
- multiple runtimes
- complex command parsing
- decorative widgets
- multi-agent support

### 9.3 Product Copy

Use simple, warm, local-first wording:

```text
Connect local Claude
Claude is sleeping
Connected to this workspace
I am thinking
Running build
Waiting for your confirmation
Done
Disconnected
```

Avoid:

```text
Agent orchestration initialized
PTY bridge active
Runtime adapter selected
```

---

## 10. Final Positioning

LoFiClaude v0.5 should not be positioned as:

```text
A web chat UI for Claude
```

It should be positioned as:

```text
A lo-fi companion room for your local Claude coding session.
```

The product promise:

> 你的本地 Claude 不再只活在终端里。它会在一个雨夜房间里陪你写代码。
