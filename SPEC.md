# SPEC: V1.2.1 流畅度与终端共享对话

> 状态：执行中（分支 `perf/terminal-chat-and-streaming`）
> 权威关系：本 SPEC 只定义本轮修复范围；产品方向仍以 `docs/LoFiClaude_PRODUCT_DIRECTION.md` 为准，完成证据写入 `HANDOFF.md`。

## 1. 问题

| # | 用户感知 | 根因（代码证据） |
|---|---|---|
| P1 | Claude 回复时房间明显卡顿，回复越长越卡 | 每个 `assistant_delta` 都同步 `JSON.stringify` 全量历史并写 LocalStorage（`claudeOrch.js` `updateMessage → persistHistory`） |
| P2 | 平时移动鼠标也卡 | 每 250ms 的鼠标活动都走 `onIdleEnd → markActive → setVisualState → sync`，即使从未进入 idle；idle 后每秒重复 `onIdleStart` |
| P3 | 小人静止时仍持续耗电 | Sprite 30fps 逐像素 `fillRect` 重绘同一帧；`idleTime` 每帧变化导致 100ms 一次 store 同步 |
| P4 | 长时间运行后续聊/手机回放断档，Bridge 噪音多 | `music_state` 不去重、未安装 ncm-cli 时每 3s 广播错误；`room_state` 每秒进入 2000 条回放历史 |
| P5 | “无法和终端桥接对话” | Bridge 已有共享会话与 Unix Socket，但没有终端客户端命令；会话文件在 `os.tmpdir()`，系统清理后上下文丢失；模型 ID 写死为过期的 `claude-sonnet-4-6` |
| P6 | `npm test` / `npm run ci` 永不结束 | `youtubePlayer.test.js` 假 `document` 缺 `addEventListener`，`onReady` 抛错导致 `init()` 永远 pending |

## 2. 目标与验收标准

1. **流式不卡**：一次流式回复期间 LocalStorage 写入次数与 delta 数量无关（节流 ≤1 次/秒），回复完成、中断、清空、页面隐藏时立即落盘。刷新页面后已完成回复不丢失。
2. **活动事件边沿触发**：鼠标持续移动时不再触发 Claude 视觉状态同步；只在 idle → active、active → idle 的边沿各触发一次。
3. **Sprite 按需绘制**：帧网格和调色板未变化时不重绘；静止时不因 `idleTime` 发布 store。
4. **Bridge 静默稳定**：音乐状态未变化不广播；CLI 缺失后停止后台轮询且不重复报错（用户主动命令仍会尝试）；`room_state` 实时下发但不进入回放历史。
5. **终端共享对话**：`loficlaude chat` 连接正在运行的 Bridge，与浏览器、手机共享同一个独立 Claude 会话；浏览器消息在终端可见、终端消息在房间可见。Bridge 未启动时给出明确下一步。会话 id 存在持久目录 `~/.config/loficlaude/`，首次启动自动从旧临时路径迁移。默认模型改为 CLI 别名 `sonnet`，可用 `LOFICLAUDE_MODEL` 覆盖。
6. **测试可退出**：`npm test` 在 60 秒内结束且全部通过；`npm run build` 通过。

## 3. 非目标

- 不改 Claude 权限边界（仍为 `--permission-mode dontAsk --tools ""`）。
- 不让终端直接 `claude --resume` 同一会话（两个进程写同一 transcript 会分叉）；终端只作为 Bridge 客户端。
- 不引入新依赖，不重构大文件，不处理 `public/0.m4a` 的未提交删除（来源待用户确认）。
- 终端连接时不回放历史对话（后续可做）。

## 4. 方案

| 模块 | 改动 |
|---|---|
| `src/utils/claudeOrch.js` | `persistHistory` 拆为立即写与节流写；delta 走节流；完成/中断/新消息立即写；新增 `flushHistory()` |
| `src/utils/session.js` | 维护 `idle` 状态，`onIdleStart` / `onIdleEnd` 只在边沿触发 |
| `src/components/ClaudeSprite.svelte` | 记录上次绘制的 grid/palette，未变不重绘；`idleTime` 不参与发布判定 |
| `src/App.svelte` | `pagehide` 与卸载时调用 `claudeOrch.flushHistory()`；房间观察定时器纳入卸载清理 |
| `bridge/musicController.js` | `publish` 浅比较去重；ENOENT 后 `refresh()` 不再执行 CLI；后台刷新不重复 `onError` |
| `bridge/server.js` | 新增不入历史的 `broadcastTransient`，`room_state` 改用它 |
| `bridge/config.js` / `bridge/index.js` | 会话文件迁移到 `~/.config/loficlaude/`（0700）；模型 `LOFICLAUDE_MODEL || 'sonnet'` |
| `bin/loficlaude.js` | 新增 `chat` 子命令：readline ↔ Unix Socket |
| `test/*` | 修复 YouTube 夹具；新增节流写、边沿触发、音乐去重、transient 广播、CLI 缺失退避测试 |
| 文档 | README（终端对话）、CLAUDE.md（命令）、ARCHITECTURE（数据流）、HANDOFF / TODO |

## 5. 执行计划

1. 修 YouTube 测试夹具 → 验证：单文件测试可退出
2. 前端流式节流 + 活动边沿 + Sprite 按需绘制 → 验证：新增单测通过，原有 claudeOrch 测试不回归
3. Bridge 去重 / transient / CLI 退避 → 验证：bridgeServer、musicController 测试通过
4. 终端 chat + 持久会话 + 模型别名 → 验证：真实启动 Bridge，`loficlaude chat` 收发一轮，浏览器侧可见
5. 文档同步 → 验证：`npm test`、`npm run build`、`npm run verify:build`、`git diff --check`
