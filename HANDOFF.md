# LoFiClaude 当前 Handoff

> 最后更新：2026-08-18
> 目标版本：V1.1.0
> 分支：`codex/core-reliability`

## 当前目标

在不新增依赖、不扩大产品范围的前提下关闭 V1.1 发布门。功能已足够进入发布硬化阶段，但当前仍不可发布。

## 核心约束

- 产品保持低打扰陪伴房间定位；Bridge 只作为可选本地增强层。
- 不新增依赖、不接入分析服务；雨声默认使用现有 Rainy Mood 音频并保留本地 fallback。
- Bridge token 不得进入源码、URL、日志、测试快照或文档。
- 保留用户拥有的 `output/` 与未跟踪的 `RELEASE_AUDIT.md`；未经明确批准不得暂存或删除。
- 只有决策、公开契约或发布门发生变化时才更新文档。

## 已确认决策

- Bridge 不可用时，浏览器使用本地陪伴文案，不发送 Anthropic API key。
- Bridge 仅本地监听、每进程轮换 token、校验 Origin；浏览器 token 仅存于 SessionStorage。
- V1.1 默认使用 Rainy Mood 真实雨声音频；远端音频失败时切换本地 Web Audio fallback，公开发布前确认音频授权。
- 当前生产验收必须运行构建后的 preview，不能只依赖 Node import 或单元测试。

## 已完成

- 房间、音乐、本地雨声、场景、专注计时、陪伴气泡/历史和 Bridge 设置已实现。
- Bridge 会话恢复、事件回放、消息串行、Unix Socket 所有权、token 管理和本地边界已实现。
- 雨声 fallback、播放器重试/换台、reduced-motion、专注持久化和本地历史过期/清空已实现。
- 已在本地修复生产 Claw preset 加载：Vite 8 通过 `query: '?raw'` 与 `import: 'default'` 内联 preset HTML。
- Claw 动画已增加空帧保护，并在浏览器缩放时保持相对横向位置。
- 背景与 Claw 的 `requestAnimationFrame` 循环在页面隐藏时暂停，回到前台后恢复，避免后台持续占用主线程。
- 生产 preview 已确认 Claw canvas 有绘制像素、无 `.grid` 应用异常，且在 `390x844` 与 `1440x900` 无横向溢出并保持可见。
- 已增加生产 bundle 的 Claw preset 内联检查；发布验证只使用本机 Git 与 `npm run ci`，不接入远端 CI。

## 当前验证

- 当前本地 `npm run build`：通过。
- 当前本地 `npm test`：109 tests、0 fail；本次 CI 沙箱运行 98 pass、11 skipped（Unix Socket `EPERM`），同一套件在可用 Unix Socket 的运行中为 109 pass、0 skipped。
- 当前本地 `npm run ci`：通过，串联测试、构建、Claw bundle 检查和 `git diff --check`。
- 独立的 2026-08-18 审计环境：105 pass、0 fail、0 skipped；真实 Bridge + Claude + Unix Socket 往返通过。
- 本地验证已覆盖构建、单元测试、生产 bundle 检查与 diff 检查；仍没有浏览器 E2E、视觉回归或完整跨浏览器矩阵。

## 开发计划

### P0：发布门

1. 本机发布验证：执行 `npm run ci`，由本地 Git 管理版本；远端 CI 不在范围内。
   - 状态：已完成。
   - 验收：本地测试、构建、bundle 检查和 `git diff --check` 通过。
2. Bridge token 启动展示策略：本机终端允许 stdout 显示一次，前端只手动输入掩码值。
   - 状态：已确认并同步 PRD、README 与实现。
3. 为生产 Claw 修复保留发布回归验证。
   - 状态：已完成并接入 `npm run verify:build`。
   - 验收：`npm run build` 加 preview 中存在 preset 帧数据，且不出现 Claw `.grid` 异常。

### P1：用户可靠性与安全

1. YouTube 失败或超时后结束永久 `loading audio...`，进入确定的错误/重试状态，且不阻塞本地雨声。**已完成**。
2. 防止五秒 idle 用 resting 文案覆盖当前 Claude 回复。**已完成**。
3. 将 Claw 气泡关闭、自定义台、Bridge 设置和场景控件等点击目标提升到约 `44x44px`。**已完成**。
4. 将隐藏 YouTube 控件和 Bridge token 值移出无障碍树，并验证键盘流和焦点行为。**已完成**：外层隔离容器、动态 iframe 观察器、生产 Chromium 快照已验证。
5. 明确并记录 Claude CLI permission mode、allowed tools 与本地工作区信任边界。**已完成**：Bridge 固定为 `--permission-mode dontAsk --tools ""`，仅文本对话。
6. Safari/WebKit、Firefox 与真机移动端验收由用户执行；本地已完成的 Bridge 恢复/工具/慢客户端场景继续由 `npm run ci` 覆盖。

### P2：可维护性与文档

1. 统一 `package.json`、`VERSION`、Bridge 版本与过期的 `aria-label` 文案。**已完成**。
2. 仅在 P0 决策完成后更新发布文档；保留 `RELEASE_AUDIT.md` 作为审计证据，不作为当前状态来源。
3. 在改动持久化语义前补充字节预算和专注时间边界测试。
4. 在 P0/P1 覆盖提升后，规划行为不变地拆分 `src/App.svelte`（689 行）和 `src/utils/claudeOrch.js`（740 行）。

## 参考

- 产品方向：`docs/LoFiClaude_PRODUCT_DIRECTION.md`
- V1.1 验收标准：`docs/LoFiClaude_PRD_V1.1.0.md`
- 系统边界：`docs/ARCHITECTURE.md`
- 独立发布审计证据：`RELEASE_AUDIT.md`

## 已废弃上下文

- 2026-07-29 的旧 handoff 及其“仅剩 token 展示确认”的结论已被本文件取代。
- Socket skip 数量依赖执行环境，必须报告当前运行结果，不再引用旧固定数字。
- 不得用历史功能完成度百分比作为发布证据；功能完成度与发布可信度必须分别报告。
