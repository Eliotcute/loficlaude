# LoFiClaude Handoff

## Goal
把 2026-09-12 审计里挡住房间启动和 CI 的问题修到可验收：桌面房间能挂载并出现 Start room；无 Bridge 时仍能走本地房间（雨声，音乐策略与开关一致）；`npm test` / `npm run ci` 变绿。真实 ncm-cli / Claude / Safari / 真机仍不计入本轮完成。

当前权威状态以本文件 + `TODO.md` + `.gstack/qa-reports/audit-2026-09-12/AUDIT.md` 为准。2026-09-06 的 P0/P1/P2 已在 git 历史中，不重新执行；不要把旧 Acceptance（152 tests）当作当前事实。

## Decisions
- Claude session 继续使用 `--permission-mode dontAsk --tools ""`。
- Bridge 只执行固定音乐白名单，不执行模型生成的任意命令。
- 当前实现为 Bridge 固定规则预解析，用户原文同时进入 Claude 文本会话；不是 Claude tool calling。此边界不应在文档中混称。
- 搜索有多个歌单时等待选择，单个结果时调用该歌单；选择状态属于浏览器连接，重连需要重新搜索。
- 凭证只留在本机 ncm-cli 配置，浏览器只接收状态。
- 默认不把配对 LAN 暴露到公网；LAN 仅在用户主动「连接手机」后开启。
- 无 Bridge 时房间必须可用（方向 PRD KR2）。YouTube 编译开关与 `player.musicProvider` 默认值必须一致，禁止再出现 `ENABLE_YOUTUBE_AUDIO=false` 但默认 provider 仍是 `youtube`。
- `ui` 是 writable 袋子，不是 store；模板禁止 `$ui.xxx`，必须先绑定内部 writable。

## Progress And Evidence
- 2026-09-06 已合入 git 的音乐隔离 / 反馈 / 场景目录工作仍然有效，见历史提交 `288d8f4`、`0d4b503`、`9cdbea9`。
- 2026-09-12 审计（Grok，只读）已由 Codex GPT-6 Astra medium 按五项修复落地。Grok 复审：`http://127.0.0.1:5173/` 能看到 Start room；点击后 overlay 消失，无 `store_invalid_shape`。Playwright `qa:browser` 仍可能被本机 Chrome SIGABRT/EPERM 挡住，与 gstack browse 能否打开不是同一条路径。
- 根因：未提交 `src/App.svelte` `paused={$ui.bridgeSettingsOpen}`。HEAD `9cdbea9` 无此行。
- YouTube 编译开关已恢复为 `true`，与默认 `youtube` provider 和无 Bridge 启动路径一致。
- `GET /token` 已收敛为 `{ token }`。测试数量以 Acceptance 为准，不要沿用 Progress 里的沙箱 skip 数字。
- `RainPlayer.stop()` 现在会 suspend fallback；回归测试覆盖 Stop 后切换 light/medium/heavy 恢复。无客户端 orphan timer 现在调用 `music.close()`。
- 手机空态 `/mobile.html` 375 无横滑、无 token 文案正确；Bridge `:9121` 本轮未开，配对 E2E 未做。

## Acceptance
当前工作区（审计时）：
- `npm test`（Grok 复审机）：161 项，161 通过，0 失败，0 跳过。Codex 沙箱曾报 148 pass / 13 skip，skip 视为环境限制，不以那次数字覆盖本机全绿。
- `npm run build`、`npm run verify:build`：Codex 报通过；本轮复审以 `npm test` + 浏览器挂载为准。
- `npm run ci`：Codex 报通过。
- 浏览器：gstack browse 已验证 Start room 可见且可点；`npm run qa:browser` 未在本轮复审重跑（Codex 侧 Chrome 启动失败）。

本轮优化完成标准（Codex 执行后必须达到）：
- 打开 `http://127.0.0.1:5173/` 能看到 Start room，控制台无 `store_invalid_shape`。
- `npm test` 全绿；`npm run ci` 全绿。
- `ENABLE_YOUTUBE_AUDIO` 与默认 `musicProvider`、无 Bridge 启动路径一致。
- `RainPlayer.stop()` 在 fallback 路径静音，Stop 后再选 light/medium/heavy 能恢复；有回归测试。
- 更新本文件的 Progress / Acceptance，使其与命令输出一致。不要把未跑的听音/Safari 写成通过。

## 2026-09-26 V1.2.1 流畅度与终端共享对话（分支 `perf/terminal-chat-and-streaming`，规格见 `SPEC.md`）
- 流式回复：LocalStorage 写入按 1 秒节流，完成/中断/pagehide/卸载立即落盘（此前每个 token 同步序列化全量历史）。
- 活动边沿：`session.markActivity` 只在 idle→active 触发，`onIdleStart` 只在 active→idle 触发一次。
- Sprite：网格/调色板未变不重绘；`idleTime` 不再驱动 100ms store 发布。
- Bridge：`music_state` 去重；`ncm-cli` 缺失后停止后台轮询、同类错误只报一次；`room_state` 走 `broadcastTransient` 不进回放历史。
- 终端对话：新增 `loficlaude chat`（Unix socket 客户端）；会话 id 迁移到 `~/.config/loficlaude/`；模型默认 `sonnet` 别名，`LOFICLAUDE_MODEL` 可覆盖。
- 测试挂起根因：`youtubePlayer.test.js` 假 `document` 缺 `addEventListener`，`onReady` 抛错使 `init()` 永远 pending；已修夹具。

### Acceptance（本机实测）
- `npm test`：177 项，177 通过，0 失败，约 4 秒退出。
- `npm run build`、`npm run verify:build`、`git diff --check`：通过。
- 真实 Bridge + Claude CLI：终端 `loficlaude chat` 发送“记住暗号：蓝色台灯”，随后 WebSocket 客户端（浏览器同协议）提问，回复“蓝色台灯”；终端同时看到 `[Browser]` 消息与流式回复。
- Bridge 空闲 12 秒内，已认证客户端收到 0 条事件（此前 ≥1 条/3 秒）。
- 未做：真实浏览器页面内的流式帧率量化（需 Playwright Chrome），Safari/真机。
- 工作区遗留：`public/0.m4a` 未提交删除（非本轮操作，未纳入提交），会导致默认雨声 404 并回退合成噪声，需用户确认。

## 2026-09-26 晚：运行验收与网易云排查（未修，待续）

### 运行状态
- 已启动：Bridge（`node bin/loficlaude.js bridge`，日志 `/tmp/lofi-bridge.log`）与 Vite（`http://127.0.0.1:5173/`，日志 `/tmp/lofi-vite.log`），均为后台进程。换 app 后如需停止：`pkill -f bridge/index.js; pkill -f vite`。
- 房间挂载正常，控制台只有 YouTube 自身的 CORS/postMessage 噪音。
- `public/0.m4a` 仍是未提交删除：`/0.m4a` 返回 Vite 的 HTML（`Content-Type: text/html`），雨声退回合成噪声。恢复：`git checkout -- public/0.m4a`。

### 网易云点了不切换：根因
- 本机 `@music163/ncm-cli` 0.1.7；`ncm-cli state` 正常。
- `ncm-cli search playlist --keyword lofi` 返回 `error: unknown command 'search'`。`--help` 与 `ncm-cli commands` 都不列 `search`，但 `play --help` 的示例引用了 `search all --keyword`。
- `ncm-cli login --check` → `未登录`。**假设（未验证）**：`search` 需要登录后才注册，或是这个版本没有这条命令。用户说有搜索文档，下一轮先看文档。
- Bridge 侧问题：`musicController` 把所有非 ENOENT 的错误都显示成「网易云音乐暂时不可用」，浏览器里又变成「音乐操作未完成」，真实原因（未登录 / 命令不存在）被吞掉了。修复时应把 CLI 的 `message` 或类别透传给 UI。
- 下一步：① 用户执行 `ncm-cli login`；② 重跑 `ncm-cli search playlist --keyword lofi --output json`，对照文档确认命令和输出结构（`data.records` 字段）；③ 修 `musicController.searchPlaylists` 的参数，补一个登录检查，并让错误提示可以照着操作；④ 补测试。

### 房间里的 Claude 为什么答非所问
- 房间气泡里那段「没在做事，等你的指令…工作区有未提交改动」出自 Bridge 的 Claude 会话，**不是**这个 Claude Code 会话。它启动时由 Claude CLI 注入项目 CLAUDE.md、用户全局 CLAUDE.md 和一份 git status 快照，所以会引用过时的仓库状态，语气也和开发助手一样。
- 可选改进（需用户决定）：Bridge 启动 Claude 时加 `--setting-sources` 或 `--bare`，让陪伴会话不继承开发配置和 git 快照。
- 查看对话：房间气泡右上角 `≡` 打开完整历史面板；终端执行 `loficlaude chat` 进入同一会话。

### 待办（下一轮）
1. 网易云：见上面的下一步。
2. 场景重绘：参照 loficities.com（480×270 缓冲 + 整数倍放大 + 构建时预渲染图层 + Bayer 抖动 + 240s 循环），地面线对齐现有 `getPatrolBounds().y`，不动 `claudeMotion`。先画 1 个给用户确认。
3. 确认 `public/0.m4a` 的删除是否有意。
4. 分支 `perf/terminal-chat-and-streaming` 尚未合并、未 push。

## Remaining Manual Acceptance
- 用户验收真实 ncm-cli 搜索/播放/暂停/切歌、音频听感和 Claude 终端/浏览器续聊。
- Safari、Firefox、真机与长期温度/功耗。
- 公开发布前确认本机雨声录音及可选远端音源授权。
- 手机配对真机扫码：已修 LAN WS Origin 过严、hash token 被 iOS 丢掉、二维码改 query。仍需同一 Wi-Fi 与 macOS 放行 9121。room_state 完整度和雨声控制未当完成。

## Next
Grok 复审通过五项代码修复与房间挂载。剩余：
1. 有可启动的 Playwright Chrome 时补跑 `npm run qa:browser`。
2. 原有真实 ncm-cli / Claude / Safari / 真机人工验收。
3. 注意：无浏览器客户端 3s 后现在调用 `music.close()`，会杀 ncm-cli/mpv 进程组；关标签不等于关 Bridge/Claude，但会停本机播放进程。
4. 未连 Bridge 时设置面板会周期性 `ERR_CONNECTION_REFUSED`（token 发现），不是挂载崩溃。
5. Chrome 卡死/CPU：隐藏 YouTube 直播视频解码，不是 `public/0.m4a`。雨声仍用用户提供的 `/0.m4a`（moov 在文件头，流式播放）。Start room 不创建 YouTube iframe、不自动下雨；点播放才加载 YouTube。切走标签 pauseVideo。画布 20fps、粒子按面积收敛。

禁止：回滚未知改动、新增运行时依赖、改 Claude 工具权限、远端 CI、把 SESSION_LOG/archive 当权威。
