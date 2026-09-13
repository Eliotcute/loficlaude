# LoFiClaude Handoff

## Goal
全面体检后的 P0/P1/P2 工程优化与本轮自动验收完成（2026-09-06）。真实第三方听音/会话和跨浏览器人工验收单列，不视为已通过。以下状态优先于历史对话和旧审计评分。

## Decisions
- Claude session 继续使用 `--permission-mode dontAsk --tools ""`。
- Bridge 只执行固定音乐白名单，不执行模型生成的任意命令。
- 当前实现为 Bridge 固定规则预解析，用户原文同时进入 Claude 文本会话；不是 Claude tool calling。此边界不应在文档中混称。
- 搜索有多个歌单时等待选择，单个结果时调用该歌单；选择状态属于浏览器连接，重连需要重新搜索。
- 凭证只留在本机 ncm-cli 配置，浏览器只接收状态。

## Progress And Evidence
- P0 完成（2026-09-06）：候选与意图事件只发请求连接、不重放；新搜索/取消/断开会使旧异步结果与状态失效；终端保持文本会话，不执行浏览器音乐意图；CLI 假成功与错误 JSON 被拒绝。26 项 bridgeServer/musicIntent/musicController 专项测试通过，独立规格复核通过。
- P0 本地提交：`288d8f4`。
- 场景目录统一在 asciiScenes.js；Header/选择器/持久化/粒子共用。controller 校验业务失败、未播放、非法参数和损坏 JSON。
- P1 完成（2026-09-06）：音乐反馈/候选独立于 Claude 回复，5 个候选可见且等高，取消/新搜索/断线清空；music_error 不走 Claude 错误通道。本机录音状态不再冒充 Rainy Mood。13 项 client/feedback 专项测试通过；Chromium 1440x900、768x1024、375x812 交互和雨点像素检查通过，截图在 output/playwright（已忽略）。最近歌单恢复的基础代码随前端契约一同提交，P2 再做行为验收。
- P1 本地提交：`0d4b503`。
- P2 完成：确认播放后仅保存歌单 ID/名称，刷新不自动播放，点击恢复；Clawd 音乐动作不打断回复；旧启动提示计时器不能关闭新回复；YouTube 延迟回调不能覆盖网易云状态。
- P2 渲染：静态背景只在尺寸变化/换景时重绘，雨点层独立。Chromium 检查 11 场景有实际像素、13 形态选项可见、切换形态改变像素、自主巡游及拖拽下落正常；稳定场景采样窗口内静态重绘 0 次。
- 可重复浏览器检查：`npm run qa:browser`（需已有 Playwright，见 README）。音乐使用测试 Bridge，不调用真实 Claude/ncm-cli。四档对话视口：1440x900、768x1024、375x812、375x667；5 候选等高、无横向溢出、无 pageerror。截图与 JSON 位于忽略的 `output/playwright/`。

## Acceptance
- `npm test`：152 通过、0 失败、0 跳过；含本机 Socket 与 pairing 测试（经允许在沙箱外运行）。
- `npm run build`、`npm run verify:build`、`git diff --check`：通过。
- 不新增运行时依赖，不迁移 p5.js/Three.js，不改 Claude 工具权限，不使用远端 CI。

## Remaining Manual Acceptance
- 用户验收真实 ncm-cli 搜索/播放/暂停/切歌、音频听感和 Claude 终端/浏览器续聊。本轮只验证 adapter/协议和测试替身，不伪造真实服务结果。
- Safari、Firefox、真机与长期温度/功耗检查由用户完成；短时像素与绘制预算不等于全天性能保证。
- 公开发布前确认本机雨声录音及可选远端音源授权。

## Next
1. 按上方人工验收清单使用产品，发现问题后开具体修复项。
2. 周统计、语义场景仍为后续产品路线图，不计入本轮 Goal。
3. 只以本文件与 TODO.md 继续；SESSION_LOG/archive 保留为历史，不重新执行旧方案。
