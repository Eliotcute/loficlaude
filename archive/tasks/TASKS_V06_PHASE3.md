# LoFiClaude v0.6 — Phase 3：润色 + 微交互

## 任务

### 1. Hover 反应
- 鼠标 hover Claude 时：Claude 转头看鼠标方向 / 眨眼
- 鼠标离开后恢复 idle

**文件**：`src/components/ClaudeSprite.svelte`

### 2. 状态切换过渡动画
- idle → thinking：低头动画，0.3s
- thinking → talking：抬头，0.3s
- working → done：跳一下 + 暖光闪烁
- done → idle：1s 过渡
- blocked：停住 + 轻微闪烁提示

**文件**：`src/canvas/spriteFrames.js` + `src/canvas/claudeMotion.js`

### 3. 场景氛围联动
- Claude 在 working 状态时：场景灯光轻微闪烁
- task 完成时：暖光闪一下（持续 1s）
- 无操作时：城市灯光缓慢呼吸

**文件**：`src/components/AsciiBackground.svelte`

### 4. 场景细节丰富
ASCII 场景补充元素：
- 窗户框（dottedRect）
- 窗台小植物
- 墙上挂画框
- 桌面台灯

**文件**：`src/canvas/asciiScenes.js`

### 5. 播放器抽屉惯性滑动
- 上拉展开时加一点缓动（cubic-bezier）
- 收起时也有缓动

**文件**：`src/components/ExpandedPlayer.svelte`

## 验收
- [ ] hover Claude 有反馈
- [ ] 状态切换有过渡动画
- [ ] working 时灯光联动
- [ ] 场景更丰富（窗/植物/画框/台灯）
- [ ] 播放器滑动流畅
- [ ] npm run build 通过
