# LoFiClaude Handoff

## Goal
通过 Clawd 对话安全切换并控制本机网易云音乐，保持 Claude CLI 无 shell/file tools。

## Decisions
- Claude session 继续使用 `--permission-mode dontAsk --tools ""`。
- Bridge 只执行固定音乐白名单，不执行模型生成的任意命令。
- 默认语义“播放 lofi”搜索网易云歌单并播放首个可用结果。
- 凭证只留在本机 ncm-cli 配置，浏览器只接收状态。

## Progress
- 已有 `musicController` 支持基础播放控制和 `music_state` 回传。
- 已加入自然语言意图解析、歌单搜索/播放和 intent 状态广播；UI 专门文案与多结果选择仍待补齐。

## Acceptance
- 对话“切换到网易云，播放 lofi”可触发本机 ncm-cli。
- 空队列时可搜索并播放默认 lofi 歌单。
- 暂停、继续、下一首、上一首、停止均有真实状态回传。
- npm test/build/verify:build 通过，工作区 clean。

## Blockers
- 网易云搜索依赖用户本机网络和 ncm-cli 登录状态。
