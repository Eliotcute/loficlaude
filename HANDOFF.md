# LoFiClaude Handoff

> 最后更新：2026-07-29
> 当前版本：V1.1.0
> 分支：`codex/core-reliability`

## 当前目标

以 `docs/LoFiClaude_PRODUCT_DIRECTION.md` 为产品方向，以 `docs/LoFiClaude_PRD_V1.1.0.md` 为实施和验收依据，完成 V1.1 可靠性、状态表达、隐私边界和发布 QA。

## 已完成

- 雨声 fallback、强度、静音、淡出恢复和远端错误降级已修复。
- YouTube API 可重试，频道失败会换台，全部失败后停止循环并允许手动重试。
- Claw 七状态、离线 typing 回落、实时状态文案优先级和 reduced-motion 已补齐。
- 首日 streak、跨午夜和后台/idle 专注累计已修复。
- Bridge token 改为 SessionStorage，断开和清除时删除运行时及存储 token。
- Bridge 服务端会话和回放游标已加固：浏览器重连与 Bridge 重启可恢复同一 Claude 会话；仅在 CLI 明确认定旧会话不存在时回退到新会话并重放当前 turn。
- Unix Socket 单实例所有权先于会话状态读写建立，关闭后的 Claude 输出不会覆盖后继进程状态；token 每个服务进程轮换，显式 reset 只用于新建 Claude 会话。
- 浏览器和终端消息统一串行进入 Claude；补齐消息/客户端/缓冲区上限、慢客户端隔离和 Unix Socket 所有权保护。
- 浏览器不再携带 API key 直连 Anthropic；离线陪伴完全本地，真实 Claude 对话只经过本机 Bridge。
- Bridge 设置移入设置层；Start room、移动布局和主场景层级已调整。
- 聊天历史限制为 50 条/7 天，并提供清空入口。
- V1.1 默认使用本地 Web Audio 雨声；远端模式保留为显式能力，不作为发布默认。
- V1.0 PRD 和旧 Handoff 已归档，当前文档层级见 `docs/README.md`。

## 关键决策

- 产品方向优先“可长期停留的陪伴房间”，Bridge 是增强层。
- V1.1 不新增依赖，不接入远端分析，不默认使用授权未确认的雨声热链。
- 对话历史只保存在本地；Bridge token 仅限当前浏览器 session。

## 验证状态

- 全量测试：105 项，94 通过、0 失败；11 项 Unix Socket 用例在沙箱内因 `EPERM` 跳过，且相同 Socket 实现已在沙箱外真实通过。
- 构建：`npm run build` 已通过；`git diff --check` 已通过。
- 浏览器 QA：1440x900、768x1024、390x844 均无横向滚动或 Claw/文案重叠。
- 交互 QA：Start 前设置可用、Esc 可关闭、历史可清空、token 未进入 URL、LocalStorage 或截图。
- reduced-motion：两个 Canvas 在 1.5 秒采样内均保持静止。
- Standards/Spec 双轴 review 已完成；存储降级和 summary 快照问题已修复。

## 下一步

1. 发布前确认 Bridge 终端是否继续在启动时显示一次 token。
2. 如需发布，执行对应发布流程；真实 Unix Socket 环境验收已完成。
