# LoFiClaude 文档索引

## 权威层级

1. `LoFiClaude_PRODUCT_DIRECTION.md`：产品定位、目标用户和长期取舍。
2. `LoFiClaude_PRD_V1.1.0.md`：当前版本的实施范围、验收标准和发布决策。手机配对补充契约见 `LoFiClaude_PRD_MOBILE_PAIRING.md`（目标规格，完成状态仍以 HANDOFF 为准）。
3. `ARCHITECTURE.md`：与当前代码一致的产品和系统架构。配对实现草图见 `MOBILE_PAIRING_TECHNICAL_PLAN.md`。
4. 根目录 `HANDOFF.md`：当前工作状态、验证结果和下一步。

`MOBILE_PAIRING_PROBLEM.md` 是扫码失败的问题分析（公网是否必须、与 ZCode 的差别）。不是规格，不能覆盖上面的 PRD / 技术方案 / HANDOFF。

产品方向决定长期取舍；PRD 决定产品契约；`PRODUCT_PLAN_V1.2.md` 定义本轮 Phase 范围。实际完成状态、验证证据和待办以根目录 `HANDOFF.md` / `TODO.md` 为准，历史文档不能覆盖当前已确认决策。

## 归档

- `src/canvas/claudepix_presets/`：当前运行时使用的像素 Claude 动画预设，不属于历史归档。
- 本地 `archive/`：已被替代的 PRD、任务记录和原型，仅供本机追溯，不纳入 Git 版本控制。

归档文档不作为当前实现依据，除非当前 PRD 明确引用。
