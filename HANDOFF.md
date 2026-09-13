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
