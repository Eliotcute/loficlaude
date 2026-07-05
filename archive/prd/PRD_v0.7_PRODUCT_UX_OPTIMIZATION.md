# LoFiClaude v0.7 — 产品与用户体验优化 PRD

> 状态：Draft PRD  
> 基于：v0.6 Roadmap、本地代码审查、产品/UX 审查  
> 本轮目标：把 LoFiClaude 从“氛围播放器 + 分离连接控件”推进为“本地 Claude 编码伴侣”的完整闭环  
> 设计原则：**One room, one Claude, one obvious next action.**

---

## 1. Summary

LoFiClaude v0.7 要解决当前核心体验断点：用户看到的是一个有氛围的 lofi 房间，但真正的“本地 Claude 编码伴侣”闭环还没有连上。

本版本会统一首屏、Bridge 连接、聊天输入、Claude 状态和流式输出。用户打开页面后，应能清楚知道下一步该做什么，并能完成一次“连接本地 Claude → 发送任务 → 看到 Claude 工作状态 → 看到回答”的完整体验。

---

## 2. Contacts

| Name | Role | Comment |
|---|---|---|
| Eliot | Product Owner | 定义产品方向、体验标准、发布取舍 |
| Codex | Product / UX / Engineering reviewer | 产出 PRD、拆解需求、辅助实现 |
| Future implementation agent | Engineer | 按本 PRD 拆任务并实现 |

---

## 3. Background

### 3.1 当前产品状态

LoFiClaude 已经具备强风格基础：

- ASCII / 像素氛围房间
- lofi 播放和雨声
- Claude sprite 角色
- 点击 Claude 后出现气泡和聊天面板
- 本地 Bridge 服务雏形
- Bridge WebSocket 协议雏形

但当前用户体验存在明显断点：

| 断点 | 当前表现 | 用户感受 |
|---|---|---|
| 首屏目标不一致 | 文案说 Connect Claude，按钮说 Click to start music | 不知道先启动音乐还是连接 Claude |
| Bridge 和聊天分离 | `ConnectionStatus` 能连 Bridge，但聊天仍走前端 Anthropic key / fallback | 连接成功后不知道有什么用 |
| 流式输出未进入 UI | Bridge 发 `assistant_delta`，前端不消费 | Claude 没有“正在工作”的真实感 |
| 状态同步不完整 | 状态可改变 sprite，但缺少任务上下文 | 小人像装饰，不像本地代理 |
| README 定位冲突 | 仍强调 Pexels / 前端 API key | 新用户无法理解主路径 |

### 3.2 Why now

v0.6 的产品定位已经从 lofi room 升级为 local coding companion。继续加视觉细节的收益会降低；当前最重要的是把“本地 Claude 可用闭环”做扎实。

如果不先补齐闭环，用户会把产品理解为普通 lofi 播放器，而不是有差异化的编码伴侣。

---

## 4. Objective

### 4.1 Objective

让首次用户在 2 分钟内完成一次有效的本地 Claude 伴侣体验。

有效体验定义：

1. 用户知道如何启动房间。
2. 用户知道如何连接本地 Bridge。
3. 用户能发送一条任务给本地 Claude。
4. 用户能看到 Claude 的状态变化。
5. 用户能在聊天面板里看到 Claude 的输出。

### 4.2 Key Results

| KR | Target |
|---|---|
| KR1 | 首屏只有一个主 CTA，用户无需猜测下一步 |
| KR2 | Bridge 连接成功后，聊天输入默认发送到本地 Bridge |
| KR3 | `assistant_delta` 可以流式显示在聊天面板 |
| KR4 | `status` / `tool_running` 可以驱动 Claude sprite 和状态文案 |
| KR5 | 无 Bridge 时仍可使用 lofi / rain，但 Claude 聊天明确显示未连接 |
| KR6 | README 覆盖前端和 Bridge 的完整启动路径 |
| KR7 | `npm run build` 通过；如仍无测试脚本，明确记录缺口 |

---

## 5. Market Segments

### 5.1 Primary Segment: 本地 AI 编码用户

这类用户已经在使用 Claude Code、Codex CLI 或类似终端代理。他们的问题不是“缺少聊天窗口”，而是长期编码时缺少一个低干扰、可感知、可陪伴的代理状态层。

他们需要：

- 不打断工作的状态反馈
- 可放在旁边的氛围界面
- 快速知道代理是否在思考、执行、阻塞或完成
- 比普通终端输出更有情绪和可读性

### 5.2 Secondary Segment: lofi 专注用户

这类用户可能先把 LoFiClaude 当作 lofi room 使用。他们的需求是好看、安静、易控制。Claude 功能不能破坏这个基础体验。

他们需要：

- 一键启动音乐和雨声
- 控件低干扰
- 不连接 Claude 时也能正常使用
- 不被工程概念吓退

### 5.3 Explicit Non-Targets

- 不做完整 IDE
- 不做公网 AI Chat
- 不做多人协作
- 不做复杂项目管理面板
- 不做移动端优先设计

---

## 6. Value Propositions

### 6.1 Core Value

LoFiClaude 不是“另一个聊天窗口”。它是本地 Claude 的 ambient presence。

用户可以继续在终端和编辑器里工作，同时用 LoFiClaude 感知代理状态：它在想、在执行、卡住了、完成了，或者只是在房间里陪你听雨。

### 6.2 Pain Relievers

| Pain | LoFiClaude v0.7 Solution |
|---|---|
| 终端代理状态不易扫一眼理解 | 用 sprite 状态、短文案、颜色和气泡表达 |
| 普通 AI chat 太占注意力 | 默认隐藏长聊天，只保留低干扰状态 |
| lofi 工具和编码代理割裂 | 一个页面同时承担房间、音乐、Claude 状态 |
| 本地服务连接流程难懂 | 首屏给出明确路径和连接状态 |
| 错误信息偏工程化 | 转成用户可处理的下一步 |

### 6.3 Differentiation

| Alternative | Difference |
|---|---|
| YouTube / lofi.cafe | LoFiClaude 有本地 Claude 状态和互动 |
| Claude Code terminal | LoFiClaude 更适合环境感知和长期陪伴 |
| Web AI chat | LoFiClaude 不以聊天窗口为中心 |
| IDE assistant | LoFiClaude 不替代 IDE，只做低干扰 companion |

---

## 7. Solution

### 7.1 UX North Star

默认画面像一个正在播放音乐的 ASCII 雨夜房间。Claude 住在房间里，而不是浮在 UI 上。

用户路径应当是：

```text
Open LoFiClaude
→ Start room
→ See Claude asleep / disconnected
→ Connect local Claude
→ Claude wakes up
→ Ask a task
→ Claude thinking / working / talking
→ Output appears in panel
→ Done state fades back to ambient
```

### 7.2 Information Architecture

页面应有 4 个体验层：

| Layer | Purpose |
|---|---|
| Ambient Scene | 背景、雨、音乐、Claude sprite |
| Companion State | Claude 当前状态、短气泡、任务摘要 |
| Control Surface | 播放器、雨声、timer、场景 |
| Work Surface | 聊天面板、流式输出、错误恢复 |

关键原则：

- 播放控制不应抢 Claude 的主路径。
- Claude 连接状态不应藏在纯工程控件里。
- 长文本只在用户主动打开面板后显示。
- 状态反馈优先用短句、sprite、颜色和 motion。

### 7.3 Proposed Design Direction

#### Direction A: “Room First, Connect Second”

打开页面先进入房间，主 CTA 是 `Start room`。音乐和雨声启动后，Claude 仍显示为 sleeping / disconnected。顶部或 Claude 气泡提示 `Connect local Claude`。

优点：

- lofi 用户也能顺畅使用。
- 浏览器音频权限路径简单。
- 不强迫用户一开始理解 Bridge。

缺点：

- Claude companion 主张稍晚出现。

#### Direction B: “Claude First”

打开页面主 CTA 是 `Connect local Claude`。连接后自动进入房间，并启动 Claude 互动。

优点：

- 产品定位最清晰。
- 强化“本地 Claude 伴侣”的差异化。

缺点：

- 如果 Bridge 未启动，首屏容易失败。
- lofi 基础体验被连接流程阻塞。

#### Recommendation: Hybrid

采用混合方案：主 CTA 是 `Start room`，但首屏同时以弱提示展示 `Claude is asleep until Bridge connects`。

理由：

- 音频启动需要用户点击，`Start room` 是合理第一步。
- 不连接 Claude 也能使用 lofi。
- 一旦房间启动，下一步行动明确转为 `Connect local Claude`。

### 7.4 Core User Flows

#### Flow 1: First Launch, No Bridge

1. 用户打开页面。
2. 看见 ASCII 房间、Claude 睡觉、主 CTA `Start room`。
3. 点击后音乐/雨声启动。
4. Claude 气泡提示：`Local Claude is not connected yet. Start the bridge to wake me up.`
5. 用户仍可使用播放器、雨声、timer。

#### Flow 2: Connect Bridge

1. 用户点击 `Connect Claude`。
2. 如果 token 为空，显示内联 token 输入，不使用 `window.prompt`。
3. 连接中显示 `connecting`，Claude 进入 thinking 状态。
4. 连接成功显示 `connected`，Claude wake / idle。
5. 连接失败显示可恢复错误：`Bridge not running. Start it with: cd bridge && npm start`。

#### Flow 3: Send Task

1. 用户点击 Claude 或打开 chat panel。
2. 输入任务。
3. 前端通过 WebSocket 发送 `user_message` 到 Bridge。
4. UI 添加用户消息。
5. Claude 状态进入 thinking。
6. 收到 `assistant_delta` 时追加到当前 assistant 消息。
7. 收到 `tool_running` 时显示短状态：`running npm run build`。
8. 收到 `done` 时 Claude 进入 happy，然后回到 idle。

#### Flow 4: Disconnected During Task

1. WebSocket close。
2. Claude 进入 sleep / disconnected。
3. 当前 assistant 消息标记为 interrupted。
4. UI 显示 `Reconnect to continue`。
5. 用户可以重新连接并重新发送任务。

### 7.5 Key Features

#### Feature 1: Unified Bridge Client

新增一个前端 Bridge client，作为连接和消息的唯一状态源。

Responsibilities:

- 管理 WebSocket lifecycle
- 保存 connection status
- 发送 auth 和 user_message
- 接收 status / assistant_delta / tool_running / error
- 对外提供简单事件或 store

Acceptance criteria:

- 不再由 `ConnectionStatus.svelte` 自己持有完整 socket 私有状态。
- 聊天发送优先走 Bridge。
- Bridge 未连接时，发送按钮明确 disabled 或提示连接。

#### Feature 2: Chat Streaming

聊天面板支持流式 assistant message。

Acceptance criteria:

- `assistant_delta` 会追加到同一条 assistant 消息。
- loading 状态不再只显示 `...`。
- 长回答可滚动。
- 最近消息限制不应让当前流式输出消失。

#### Feature 3: Companion Status System

Claude 状态应从真实事件驱动，而不是只靠本地模拟。

Status mapping:

| Event | Claude state | User-facing copy |
|---|---|---|
| disconnected | sleep | Local Claude disconnected |
| connecting | thinking | Connecting... |
| connected | idle | Claude is awake |
| user_message sent | thinking | Thinking... |
| assistant_delta | talking | Answering... |
| tool_running | working | Running `{tool}` |
| blocked | blocked | Needs your input |
| done | happy then idle | Done |
| error | blocked/error | Something failed |

#### Feature 4: First-Run Guidance

首屏和未连接状态要清楚说明下一步。

Acceptance criteria:

- 首屏主 CTA 只有一个。
- 不使用互相冲突的文案。
- Bridge 未启动时给出可复制命令。
- 不把 token 输入藏在 browser prompt。

#### Feature 5: README Realignment

README 应以 Local Bridge 为主路径。

Required sections:

- What is LoFiClaude
- Run the room
- Run the bridge
- Connect from browser
- Keyboard shortcuts
- Audio assets
- Security note
- Troubleshooting

Pexels 相关内容如代码中已不使用，应移除或移到 archive。

### 7.6 Technology Notes

Recommended frontend structure:

```text
src/bridge/
  bridgeClient.js
  bridgeProtocol.js

src/stores/
  bridgeState.js
  appState.js
```

Recommended state ownership:

| State | Owner |
|---|---|
| connection status | bridgeState |
| token input value | Connection UI |
| chat history | Claude orchestrator or chat store |
| sprite mode | derived from bridge/claude state |
| music/rain/timer | existing appState |

Do not introduce new dependencies for v0.7 unless approved.

### 7.7 Error Handling

| Error | User Message | Recovery |
|---|---|---|
| Bridge unavailable | Bridge is not running | Show `cd bridge && npm start` |
| Token invalid | Token did not match | Let user edit token inline |
| WebSocket closed | Connection lost | Show reconnect button |
| Claude process missing | Claude CLI was not found | Explain install/login requirement |
| Invalid payload | Bridge sent an invalid message | Keep UI alive, log concise error |

### 7.8 Assumptions

- The product remains localhost-only.
- The primary AI runtime is Claude CLI for v0.7.
- Codex / generic PTY support can wait.
- The current ASCII room visual direction remains valid.
- Users tolerate a local token if the flow is clear.
- Mobile polish is not required for this release.

---

## 8. Release

### 8.1 v0.7 MVP Scope

Must ship:

- Unified Bridge client
- Chat sends messages to Bridge
- Streaming assistant output in chat panel
- Real status mapping to Claude sprite
- Clear first-run / disconnected UX
- README updated for Local Bridge
- Build passes

Should ship:

- Copyable bridge start command
- Better token input UI
- Tool-running short status near Claude
- Graceful reconnect UI

Not in this release:

- Multi-runtime support
- Full terminal transcript viewer
- Cloud deployment
- Mobile redesign
- New visual scene system
- New dependencies

### 8.2 Suggested Milestones

#### Milestone 1: Product Coherence

Fix copy and first-run flow. Make the product promise clear before changing architecture.

Deliverables:

- New first-run state
- Clear disconnected state
- README outline updated

#### Milestone 2: Bridge Integration

Move WebSocket logic into a reusable client and route chat through it.

Deliverables:

- Bridge state store/client
- Connection UI uses bridge client
- Chat sends `user_message`

#### Milestone 3: Streaming Companion

Make Claude feel alive during work.

Deliverables:

- `assistant_delta` streaming in chat
- `tool_running` display
- status-to-sprite mapping
- interrupted/error states

#### Milestone 4: Polish and Verification

Make the flow reliable enough for local daily use.

Deliverables:

- Build verification
- Manual flow verification
- README troubleshooting
- Known risks documented

### 8.3 Success Criteria

This release is successful when a new user can follow README instructions and complete this path without developer explanation:

```text
npm run dev
cd bridge && npm start
open LoFiClaude
start room
connect token
ask Claude a task
watch status and response
```

### 8.4 Open Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Claude CLI stdin/stdout behavior may not be stable enough | Bridge may not produce useful streaming output | Test with real CLI; document supported mode |
| Token UX may still feel technical | First-run friction | Provide inline copy and clear labels |
| Audio start and Claude connect are separate browser actions | User confusion | Keep CTA sequence explicit |
| No automated test script exists | Regression risk | At minimum keep build passing; add check/test later |
| Browser audio policy warnings appear in DevTools | Users may think the app is broken | Defer audio initialization and playback until a user gesture |
| YouTube / DoubleClick CORS errors appear in DevTools | Console looks noisy, but playback may still work | Document as external iframe telemetry noise; do not block MVP unless playback fails |

### 8.5 Screenshot Findings: Mobile DevTools Errors

The screenshots from May 17, 2026 show LoFiClaude running in Chrome device emulation with DevTools open. The app UI renders, but DevTools shows warnings and errors after the player is opened.

Observed console output:

| Type | Message | Product meaning |
|---|---|---|
| Info | `LoFiClaude mounted successfully` | App boot succeeded |
| Warning | `HTML5 Audio pool exhausted, returning potentially locked audio object` | Audio objects are being created too early or too often |
| Warning | `The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.` | Browser blocked audio because it started before a valid user gesture |
| Error | `Access to fetch at googleads.g.doubleclick.net ... blocked by CORS policy` | External YouTube / ad telemetry request was blocked |
| Error | `GET googleads.g.doubleclick.net ... net::ERR_FAILED 302` | Same external telemetry failure; not necessarily a LoFiClaude runtime failure |

Root-cause hypothesis:

- The current app calls audio initialization on page mount.
- Rain audio initialization calls playback internally.
- This can create or resume audio before the browser accepts it as user-initiated playback.
- The YouTube iframe also triggers external Google / DoubleClick network calls, which can fail under CORS or privacy controls.

Product impact:

- The app appears visually usable.
- Console noise makes the product feel unstable during QA.
- The browser audio warnings are actionable and should be fixed in v0.7.
- The DoubleClick CORS errors are likely external iframe noise; they should be documented and only treated as blocking if actual playback fails.

Required v0.7 acceptance criteria:

- Page load must not create or start playable audio before a clear user action.
- `Start room` is the first valid audio gesture.
- Rain audio must not call `play()` during non-autoplay initialization.
- Changing rain type should preserve playback only if rain was already playing.
- YouTube iframe loading should happen as late as practical, preferably after `Start room`.
- DevTools should not show local AudioContext warnings on first load.
- External YouTube / DoubleClick CORS errors may remain, but README troubleshooting must explain that they are external unless playback fails.

---

## 9. UX Copy Draft

### First screen

Primary CTA:

```text
Start room
```

Secondary state:

```text
Claude is asleep until the local bridge connects.
```

### Disconnected bubble

```text
Start the local bridge to wake me up.
```

### Bridge command hint

```text
Run this in another terminal:
cd bridge && npm start
```

### Connected bubble

```text
I’m awake. Send me a coding task.
```

### Task running

```text
Working on it...
```

### Blocked

```text
I need your input before continuing.
```

---

## 10. Product Decision Log

| Decision | Choice | Reason |
|---|---|---|
| First CTA | Start room | Browser audio needs a click; lofi mode should work without Bridge |
| Bridge UX | Inline token input | `window.prompt` feels like a prototype and breaks immersion |
| Chat path | Bridge first | Matches local companion positioning |
| API key fallback | Secondary only | Frontend API key conflicts with localhost companion story |
| Visual scope | No major redesign | Current visual direction is strong enough; core issue is product flow |
