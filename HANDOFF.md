# LoFiClaude Handoff

## Goal
执行全面体检后的 P0/P1/P2 Goal。当前处于 P1；整体未完成，以下状态优先于历史对话的完成声明。

## Decisions
- Claude session 继续使用 `--permission-mode dontAsk --tools ""`。
- Bridge 只执行固定音乐白名单，不执行模型生成的任意命令。
- 当前实现为 Bridge 固定规则预解析，用户原文同时进入 Claude 文本会话；不是 Claude tool calling。此边界不应在文档中混称。
- 搜索有多个歌单时等待选择，单个结果时调用该歌单；选择状态属于浏览器连接，重连需要重新搜索。
- 凭证只留在本机 ncm-cli 配置，浏览器只接收状态。

## Progress And Evidence
- P0 完成（2026-09-06）：候选与意图事件只发请求连接、不重放；新搜索/取消/断开会使旧异步结果与状态失效；终端保持文本会话，不执行浏览器音乐意图；CLI 假成功与错误 JSON 被拒绝。26 项 bridgeServer/musicIntent/musicController 专项测试通过，独立规格复核通过。
- P1 场景子项完成：asciiScenes.js 统一名称、标签、图标、顺序和粒子配置，Header/选择器/持久化共用；专项测试 14 通过。
- P1 音乐 controller 子项完成：播放业务失败、未开始播放、非法参数和损坏 JSON 均有回归测试。专项测试 8 通过（含新增 6 项）。
- 前端目前仍把音乐反馈写入 claudeBubbleMessage，需验证其与历史回复优先级、流式回复、候选列表截断的交互。
- 尚无本轮真实 ncm-cli 播放或浏览器视觉验收证据。

## Acceptance
- 对话“切换到网易云，播放 lofi”可触发本机 ncm-cli。
- 空队列时可搜索并播放默认 lofi 歌单。
- 暂停、继续、下一首、上一首、停止均有真实状态回传。
- npm test/build/verify:build 通过，工作区 clean。

## Blockers
- 网易云搜索依赖用户本机网络和 ncm-cli 登录状态。

## Next
1. 为 Bridge 注入可测试的音乐 adapter，补多连接隔离、异步乱序、失败和重连用例。
2. 修复候选事件与 Claude 回复竞争，补前端状态/候选展示测试和页面验收。
3. 统一 README/PRD/RELEASE_AUDIT/ARCHITECTURE 的当前状态；旧日志保留为历史，不删除。
4. 完成 P2 最近歌单/场景与陪伴的范围内验收，然后运行完整验证并逐 Phase 提交。
