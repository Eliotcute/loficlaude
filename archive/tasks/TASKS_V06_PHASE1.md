# LoFiClaude v0.6 — Phase 1：稳定 v0.4

按顺序执行以下任务。

## 任务 1：CSS 背景视差平移

**文件**：`src/components/AsciiBackground.svelte`

给背景容器加 CSS 慢速平移动画，模拟 Claude FM 的摄像机呼吸效果：

```css
.ascii-stage {
  /* 背景图比画面宽 10% */
  background-size: 110% auto;
  animation: pan-x 25s ease-in-out infinite alternate;
}

@keyframes pan-x {
  0%   { background-position: 0% center; }
  100% { background-position: 8% center; }
}
```

移动要非常慢、非常 subtle（25 秒一个来回），不要让人注意到。

## 任务 2：新增 Claude 状态

**文件**：`src/canvas/spriteFrames.js` 和 `src/components/ClaudeSprite.svelte`

新增 4 个状态到状态机和像素矩阵：

| 状态 | 像素表现 | 触发 |
|------|---------|------|
| thinking | 低头 / 手托下巴 | Claude 在思考 |
| working | 面朝右 / 做敲键盘状 | 执行命令 |
| blocked | 面朝用户 / 摊手 | 等待确认 |
| happy | 跳一下 / 星星闪烁 | 任务完成 |

每个状态至少 2 帧。像素矩阵尺寸保持 24×24。

状态机更新：
```
idle → thinking → talking → working → blocked/happy → idle
```

## 任务 3：场景 crossfade 统一

**文件**：`src/components/AsciiBackground.svelte`

场景切换时，旧场景淡出的同时新场景淡入，1 秒交叉过渡。

## 任务 4：无连接空状态 UI

**文件**：`src/components/AsciiBackground.svelte` 或 `App.svelte`

未连接 Bridge 时：

- Claude 初始状态改为 `sleep`（蜷缩）
- 画面显示一行轻文字：`"Connect local Claude to wake me up"`
- 不需要大按钮，只需状态提示

该状态只在首次加载、无任何 Claude 连接时显示。用户点击 start 后切到正常 idle。

## 验收

- [ ] 背景有缓慢左右平移（25s 周期）
- [ ] Claude 支持 thinking / working / blocked / happy 状态
- [ ] 场景交叉淡入淡出
- [ ] 未连接时显示空状态提示
- [ ] npm run build 通过
