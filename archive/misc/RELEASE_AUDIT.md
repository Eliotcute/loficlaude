# LoFiClaude V1.1 只读发布审计

> 历史审计：下方原始观察、测试数字、行号与评分只对应审计当时的版本，保留用于追溯，不作为当前阻塞清单。当前执行状态以 HANDOFF.md / TODO.md 为准。

## 当前产品决策（2026-09-06）

- 本机氛围播放器是核心，Clawd 陪伴和 Claude 文本会话是增强层。
- 连接 Bridge 时控制本机 ncm-cli；未连接时使用手势触发的 YouTube。CLI 错误不能伪装成播放成功。
- 默认雨声为同源真实录音 `/0.m4a`；Rainy Mood 仅为可选远端源；合成 fallback 只用于音源失败。音频授权仍需公开发布前确认。
- Claude 固定 `--permission-mode dontAsk --tools ""`。音乐由 Bridge 规则识别并执行固定白名单，不是 Claude 任意命令执行。
- Bridge token 启动打印一次已确认，自动配对只在本机进行；不得写入 URL、聊天历史或截图。
- 不使用远端 CI，本机 Git 与本地验证为当前工作流。Safari、Firefox、真机和真实听音由用户验收。
- 本轮各 Phase 的验证结果记录在 HANDOFF.md，未实测项目不能标记通过。

本轮工程验证（2026-09-06 快照）：当时 152 项自动测试全部通过。当前测试数、依赖（含 `qrcode` 与 Playwright devDependency）和挂载状态以 HANDOFF.md 为准，不要把 152 当作现在的数字。隔离 Chromium 验证 11 场景等仍是 09-06 证据。浏览器音乐使用测试替身，不代表真实网易云/Claude 或 Safari/Firefox/真机已验收。

## 原始审计记录（历史）

- 日期：2026-08-18
- 仓库：`/Users/lieliot/Documents/eliot-codex/loficlaude`
- 分支：`codex/core-reliability`
- 版本文件：`VERSION` = `1.1.0`
- 范围：只读、独立发布审计。本文件是验收记录，不是产品权威文档。权威仍按 `docs/README.md`：产品方向 → PRD → 架构 → `HANDOFF.md`。
- 结论：**当前 `dist/` 不能按生产构建发布。** 功能大体齐，发布不可信。先修 P0，再补 CI 和浏览器矩阵。

给 Codex：按本文「执行清单」改代码并复验。不要用「功能存在」代替验收通过。不要把功能完成度和发布可信度合成一个分数。

---

## 分数（必须分开）

### 两个总评

| 轴 | 分数 | 含义 |
|---|---|---|
| 功能完成度 | **8.0 / 10** | V1.1 房间、本地陪伴、Bridge 对话、历史、设置层、专注记录大多已落地，且部分已实测 |
| 生产发布可信度 | **3.8 / 10** | 生产包 Claw 形态解析失败并抛错；无 CI；无 Safari/Firefox 证据；音频卡在 loading；PRD 仍有阻塞确认项 |

### 分项

| 维度 | 分数 | 说明 |
|---|---|---|
| 功能 | 8.0 | 核心循环和 Bridge 链路存在，部分已实测 |
| UX | 6.0 | 5 秒 idle 会盖掉刚到的回复；音频长期 loading |
| UI | 5.5 | 桌面氛围成立，生产 Claw 形态崩了，触控目标过小 |
| 浏览器 | 3.5 | 只验证了 Playwright Chromium；Safari/Firefox 未跑 |
| 架构 | 7.5 | 本机 Bridge / token 轮换 / socket 所有权清楚；构建形态加载和 CLI 权限边界偏软 |
| QA | 5.0 | 单测全绿，套不住生产-only 崩溃；无 CI、无视觉回归、无浏览器矩阵 |
| 发布准备度 | 3.5 | 有 P0，PRD 门未关，不能发 |

超过 500 行的文件：`src/App.svelte` 689 行，`src/utils/claudeOrch.js` 740 行。

---

## Build / 测试 / skipped

本次在本机执行，不是 HANDOFF 里的旧数字。

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过，约 320ms。主包 `dist/assets/index-DLKuPe8s.js` 137.43 kB / gzip 48.44 kB |
| `node --test --test-reporter spec` 或 `npm test` | **105 pass / 0 fail / 0 skipped / 0 todo**，约 479ms |
| `git diff --check` | 通过 |

### Skipped 说明

本次 **0 项 skip**。

`test/socketServer.test.js:35-38` 在 `EPERM` / `EACCES` / `ENOTSUP` 时会 `context.skip(...)`。HANDOFF 写的「11 项 Unix Socket 因沙箱 EPERM 跳过」是旧环境，不是这次结果。

`RainPlayer initializes Rainy Mood as the primary audio source` 测的是 `RainPlayer` 默认 `preferLocal: false`，不是应用默认。应用默认是 `src/utils/audioInit.js:50` 的 `preferLocal: true`。

---

## 问题

### P0 — 阻塞发布

#### P0-1 生产构建 Claw 形态未解析，动画崩溃

| 项 | 内容 |
|---|---|
| 文件 | `src/canvas/claudepixForms.js:128-132`、`154-168`；`src/components/ClaudeSprite.svelte:133-135` |
| 现象 | 生产预览每次加载都抛 `TypeError: Cannot read properties of undefined (reading 'grid')` |
| 已验证 | 生产包里没有 `window.PRESET` / `idle blink`，只有 `claudepix_presets/idle_blink` 路径；`dist/archive/misc/claudepix_presets/*.html` 被当成静态资源打出 |
| 已验证 | Node 直接 import 源码时 13 个形态都能解析（如 `idle_blink` 16 帧、`work_coding` 23 帧） |
| 推断 | Vite 8 没有按 `import.meta.glob(..., { eager: true, as: 'raw' })` 内联 HTML。浏览器拿到 URL 字符串，`evaluatePresetSource()` 抽不出 script，`frames = []`，随后 `currentFrame` 为 `undefined` |
| 注意 | Node 单测走文件系统，105 全绿套不住这个问题。部分形态 `frame: null` 导致 `grid === null` 再回退 `baseGrid`，这在 Node 里不炸；生产包是空数组才炸 |

验收：`npm run preview` 打开后控制台不再有 `.grid` TypeError；生产包能搜到 `window.PRESET` 或等价内联帧数据；Claw 静止形态能画出格子。

### P1 — 发布前应处理

#### P1-1 无 CI

仓库没有 `.github/workflows`，也没有 e2e / 视觉回归目录。发布没有自动门。

验收：至少对 `npm test` 和 `npm run build` 有 CI。

#### P1-2 5 秒 idle 覆盖刚完成的 Bridge 回复

| 文件 | 作用 |
|---|---|
| `src/utils/session.js:2`、`52-54` | `IDLE_THRESHOLD_MS = 5000` |
| `src/App.svelte:97-100` | idle 时 `markResting()` |
| `src/utils/claudeOrch.js:311-315` | 把 `bubbleMessage` 写成 resting 文案 |
| `src/utils/rituals.js:20` | `'我先安静陪着。'` |

已验证：浏览器发送 `say hi in one word` 后状态是 `Claude working` / `我想一下。`；约 6 秒后气泡变成 `我先安静陪着。`。回复 `hi` 只留在历史里。

验收：回复仍在展示时，idle 不得用 resting 文案盖掉当前回复。

#### P1-3 音频初始化卡住

| 文件 | 作用 |
|---|---|
| `src/utils/audioInit.js:81` | `audioReady = youtubeReady && rainReady` |
| `src/components/MiniPlayer.svelte:123-124` | `isLoading` 时只显示 `loading audio...` |

已验证：房间启动后该文案一直在。网络里有 YouTube iframe、`googleads.g.doubleclick.net`、多次换台。没有 `rainymood.com` 请求。雨声可能已经本地响起，UI 仍显示 loading。

验收：YouTube 失败或超时时，loading 必须结束，并给出可重试的确定状态；雨声单独成功时不要假装整段音频都没就绪。

#### P1-4 隐藏 YouTube iframe 泄漏到无障碍树，并拉广告

- `src/App.svelte:616`、`619-628`：`aria-hidden` + 移出视口
- `src/audio/YouTubePlayer.js:96-99`、`207-218`

已验证：无障碍 snapshot 能读到完整 YouTube 播放器、endscreen 链接；网络有 DoubleClick。

验收：隐藏播放器不得进入 a11y 树；第三方请求边界写进 README/PRD 已知项，或延后到用户手势后再加载 iframe。

#### P1-5 触控目标过小

| 控件 | 文件 | 实测 |
|---|---|---|
| 气泡关闭 | `src/components/ClaudeBubble.svelte:196-205` | 约 10×16 |
| 自定义台 + | `src/components/MiniPlayer.svelte:154-164` | 29×28 |
| Bridge 设置 | `src/components/ConnectionStatus.svelte:248-256` | 38×38；关闭 30×30 |
| Header 场景钮 | `src/components/AmbientHeader.svelte:211-213`、`225-247` | 36×36；窄屏 32×32 |

验收：可点控件至少约 44×44，或有等效命中热区。

#### P1-6 Bridge token 出现在无障碍树

设置打开时，password 框的可访问文本就是明文 token。视觉上可能是圆点，读屏 / snapshot 能读到。PRD 5.1「token 不出现在截图」不能算过。

文件：`src/components/ConnectionStatus.svelte:121-122`

验收：自动化 snapshot 和读屏不得暴露完整 token；设置关闭后不可访问。

#### P1-7 Claude CLI 权限边界未收口

- `bridge/claude.js:46-68`、`348-351`：只 spawn `claude`，没有 `--permission-mode` / `--allowed-tools` / `--disallowed-tools`
- `bridge/config.js:5`、`19`：`cwd` 是仓库根
- `bridge/server.js:246-248`：一认证就 `ensureClaudeSession()`，立刻拉起 CLI

已验证：本轮纯文本来回成功。  
未验证：工具调用是默认拒绝、弹权限，还是继承用户全局 bypass。

Unix socket 是 `srw-------`，没有第二道 token，同用户进程都能写。

验收：在代码或 README 里写明 CLI 权限模式；不要默认继承不可见的全局 bypass。连接是否立刻 spawn CLI 要有明确产品决定。

#### P1-8 浏览器矩阵不足

本次只有 Playwright Chromium。本机有 Safari.app，没有 Firefox，没有 Playwright WebKit/Firefox 二进制。不能写“三浏览器支持”。

验收：至少补 Safari 或 WebKit 一次。没有 Firefox 就写进已知限制。

#### P1-9 PRD 发布门未关

`docs/LoFiClaude_PRD_V1.1.0.md:538-540` 仍待确认：终端是否允许启动时打印一次 token。  
`bridge/index.js:123` 本次确实打印了一次。

验收：产品确认后改 PRD 状态；代码与文档一致。

### P2 — 不阻塞但应记下

1. `package.json` 仍是 `phase1-init@0.0.0`，`VERSION` 是 `1.1.0`。
2. `src/App.svelte:548`：`aria-label="LoFiClaude phase four shell"`，文案过期。
3. 生产包打出 `dist/archive/misc/claudepix_presets/*.html`，是形态加载失败的副作用。
4. `index.html:7-8` 加载 Google Fonts，进房间前就有第三方连接。
5. Token 输入不在 `<form>` 里（`ConnectionStatus.svelte:121-122`），Chrome verbose 提示。
6. 10–12px 半透明字（如 `App.svelte:672-675`）对比度未用量具测。
7. `HANDOFF.md` 的 skip 计数和“发布前只剩 token 展示确认”已过时。

---

## 安全

### Bridge token

| 检查 | 判定 | 证据 |
|---|---|---|
| 只进 SessionStorage | 已验证 | `src/stores/bridgeState.js:3-14`、`56-67`；key = `loficlaude-bridge-token` |
| 不进 URL | 已验证 | `location.href` 无 token |
| 不进聊天历史 | 已验证 | `loficlaude-chat-history` 有对话，无 token |
| 不进会话状态文件 | 已验证 | 状态文件 mode `0600`，只有 `sessionId` + `initialized` |
| 每进程轮换 + timing-safe 比较 | 已验证 | `bridge/token.js:3-24`，`bridge/index.js:17` |
| 错误 token 拒绝 | 已验证 | WS `Unauthorized`，关闭码 `4003` |
| 非 loopback Origin 拒绝 | 已验证 | `https://evil.example` → `4003 Origin not allowed` |
| 终端打印一次 | 已验证 | `bridge/index.js:123`；PRD 仍待确认 |
| 设置层 a11y 暴露 | 已验证 | 见 P1-6 |

### 第三方脚本

本轮会出站：

- `fonts.googleapis.com` / `fonts.gstatic.com`
- `www.youtube.com/iframe_api` 及 embed / `youtubei`
- `googleads.g.doubleclick.net`、`jnn-pa.googleapis.com`

本轮没有：`media.rainymood.com`、浏览器直连 Anthropic、分析 SDK。

`src/ai/ClaudeChat.js:22-29` 只返回本地文案。`test/claudeChat.test.js` 确认 `fetch` 次数为 0。

### 本地聊天历史

`src/utils/claudeOrch.js:49-51`、`135-146`、`172-188`、`262-271`。

LocalStorage，最多 50 条、7 天，有清空。本轮历史含终端 `pong` 和浏览器 `hi`，无 token。没有把历史放到第三方请求参数里。

### Claude CLI 权限

工作区是仓库根；无工具白名单；认证即启动 CLI。非 TTY 下工具默认策略未测。若用户全局允许 bypass，拿到 token 的本机客户端可以让 Claude 在该仓库里用工具。

---

## 端到端：Bridge + Claude + Unix Socket

本次跑过真实链路，不是单测代替。

1. `node bridge/index.js` 监听 `127.0.0.1:9120`。
2. Socket 权限 `0600`。
3. WS 正确 token → `ready` + `connected`。
4. 错误 token / 外网 Origin 被拒。
5. Unix socket 发送一句话，Claude 流式回 `pong`；WS 事件为 `thinking` → `assistant_delta` → `done`。Token 未出现在事件里。
6. 浏览器连上后重放了终端回合；气泡发送 `say hi in one word`，历史里 Claude 回 `hi`。状态从 `Claude working` 回到 `Claude awake`。

未验证：工具调用、跨进程 resume、慢客户端隔离、Bridge 重启后的完整重放窗口。

复验命令提示（不要把 token 写进仓库或日志）：

```bash
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# 另开终端
cd bridge && npm start
# 用本机 token 连 WS；再用 bridge/loficlaude-cli 或 socat 写一行到 unix socket
```

---

## 布局 / 浏览器

Playwright Chromium 几何测量，不是三浏览器像素验收。HANDOFF 里旧的「1440/768/390 已 QA」不能当作本次验收。

| 视口 | 横向滚动 | 播放器居中 | Claw 与播放器重叠 |
|---|---|---|---|
| 1440×900 | 无 | 是（约 820px 宽） | 否（本次取样） |
| 768×1024 | 无 | 是 | 否；Claw 靠右 |
| 390×844 | 无 | 是（约 366px） | 否 |

| 浏览器 | 本次 |
|---|---|
| Chrome / Chromium | 已验证（Playwright Chromium） |
| Safari | 未验证。有系统 Safari，未驱动 |
| Firefox | 未验证。本机无 Firefox |

YouTube `postMessage` 源不匹配警告很多。隐藏 iframe 方案在 Chromium 里也不干净。

---

## 可访问性 / 键盘 / 视觉回归 / CI

已验证：

- 多数控件有 `aria-label`；设置层是 `role="dialog"`
- Start / 部分按钮有 `:focus-visible`
- `H` 打开快捷键条（`src/components/KeyboardHint.svelte:5-15`）
- 点 Claw 能再打开气泡
- `prefers-reduced-motion` 代码在 `AsciiBackground.svelte:159`、`ClaudeSprite.svelte:292`

已验证失败 / 不足：

- 关闭钮约 10×16，加号 29×28
- YouTube 控件进入 a11y 树
- Token 进入 password 框的可访问文本
- 5 秒 idle 改写气泡

未验证：

- 对比度量具
- Tab 顺序、焦点陷阱
- 视觉回归（无基线、无截图测试、无 CI）
- reduced-motion 下两个 canvas 是否静止

---

## 证据分层

### 已验证

- build 通过；105/105 测试；0 skip
- 生产预览 Claw `.grid` TypeError
- 生产包不含 preset 源码，含 archive HTML 路径
- Node 源码路径能解析全部 13 个形态
- 三档 Chromium 视口无横向滚动，播放器居中
- 本地陪伴、设置层、SessionStorage token、历史无 token
- WS 鉴权、Origin 拒绝、错误 token 拒绝
- Unix Socket + Claude CLI + 浏览器重放 + 浏览器发送，端到端成功
- 无 CI / 无视觉回归目录
- Google Fonts + YouTube + DoubleClick 出站
- 本轮无 Rainy Mood 请求
- Token 打印在 Bridge stdout
- `H` 快捷键、历史抽屉、Clear 入口存在

### 推断

- Vite 8 未按 `as: 'raw'` 内联 HTML
- 5 秒 idle 是回复从气泡消失的直接原因
- YouTube 半死不活让 `loading audio...` 不结束
- 若用户 Claude 默认 bypass，token/socket 等于本机高权限代理

### 未验证

- Safari、Firefox 真实渲染与快捷键
- 雨声三档可听差异、4 秒淡出、远端断流 fallback 的现场音频
- reduced-motion 现场
- Claude 工具权限实际行为
- 对比度仪器值
- 视觉回归
- PRD 业务指标（10 秒可播放 ≥95% 等）
- 专注后台 2 分钟不累计（只有代码：`src/App.svelte:466-468`）

---

## 给 Codex 的执行清单

按顺序做。每步有可验证出口。不要顺手重构无关代码。不要提交 secret / token。

### 必须先做

1. **修 P0-1 生产形态加载**
   - 不要依赖 Vite `as: 'raw'` 的旧语义。改成 Vite 8 稳定写法（例如 `query: '?raw'` + `import: 'default'`），或构建期把 preset 收成 JSON，或给 `currentFrame` 做空数组保护并保证生产真有帧数据。
   - 保护性判空不能单独当作修复。必须证明生产包里有帧数据。
   - 验证：`npm test`；`npm run build`；生产预览控制台无 `.grid`；生产 JS 能搜到 preset 帧或等价数据。

2. **补 CI**
   - 对 `npm test` 和 `npm run build` 加最小 workflow。
   - 验证：workflow 文件存在，本地等价命令仍绿。

3. **修 P1-2 idle 盖回复**
   - 有未读完的当前回复时，idle 不得覆盖气泡正文。
   - 验证：发一条 Bridge 消息，等待 >5 秒，气泡仍是回复或明确“完整内容在历史”，不能只剩 `我先安静陪着。` 而把回复藏起来。

4. **修 P1-3 loading 状态**
   - YouTube 超时/失败必须落到 error 或可重试；雨声成功不能被 YouTube 拖成永久 loading。
   - 验证：阻断 YouTube 后 UI 不再永远 `loading audio...`。

### 建议同一轮做

5. 触控目标（P1-5）和气泡关闭热区。
6. YouTube iframe 的 a11y 隔离（P1-4）。
7. Token 不要进 a11y 文本（P1-6）。
8. 明确 CLI 权限模式并写进 README（P1-7）。
9. 关掉或确认终端打印 token，并改 PRD 5.2 第 3 条（P1-9）。
10. P2：`package.json` 名称/版本、过期 `aria-label`、HANDOFF 过期数字。

### 不要做

- 不要为了“完整”去建账号系统、主题市场、分享图。
- 不要默认接入 Rainy Mood。
- 不要把 token、聊天记录写进文档或测试快照。
- 不要在没证据时把 Safari/Firefox 写成已支持。

### 完成时要交回

- 改了哪些文件
- `npm test` / `npm run build` 结果
- 生产预览是否还抛 `.grid`
- 哪些条目仍是未验证
- 不要把功能完成度和发布可信度合成一个分数

---

## 发布门槛

当前构建不要发。最低门槛：

1. 生产预览不再抛 `.grid`，形态数据在生产包里。
2. `npm test` + `npm run build` 有 CI。
3. 终端打印 token 有产品结论，文档与代码一致。
4. 至少补一次 Safari 或 WebKit；没有 Firefox 就写已知限制。
5. idle 不再盖掉当前回复；YouTube 失败时 loading 会结束。

本审计不是渗透测试，也不能代替读屏和真机无障碍验收。
