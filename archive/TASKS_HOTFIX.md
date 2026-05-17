# 修复：Claude 压扁 + 雨声不播

## Bug 1：Claude 被压扁

**文件**：`src/components/ClaudeSprite.svelte`

**问题**：CSS `scaleX(-1)` 翻转方向时，外层容器宽高比被破坏。

**修复**：
1. 外层 div 移除固定 `width/height`，改用 `min-width/min-height`
2. 或者 canvas 用 `display: block` 并确保容器跟随 canvas 尺寸
3. 翻转用 `scaleX(-1)` 只作用在 canvas 元素上，而不是外层 div

```svelte
<!-- 修复方案 -->
<div class="claude-sprite" style="transform: translate3d({$claudeX}px, {$claudeY}px, 0);" ...>
  <canvas style="width: 96px; height: 96px; image-rendering: pixelated; transform: scaleX({$claudeDirection === 'left' ? 1 : -1});" ... />
</div>
```

## Bug 2：雨声不播放

**文件**：`src/App.svelte` 或 `src/utils/audioInit.js`

**问题**：用户点击 start 后雨声没有自动开始。

**可能根因**：
- `RainPlayer` 初始化后 volume 默认为 0
- 或者 `startExperience` 中没有调用 `rainPlayer.play()`
- 或者 `rain.volume` store 初始值为 0

**修复**：
1. 确认 `rain.volume` store 初始值不为 0（应为 60）
2. 在 `startExperience()` 中调用 `rainPlayer.setVolume(60)` 和 `rainPlayer.play()`
3. 确认 `RainPlayer.js` 在 `loadType()` 后自动播放（`howl.play()`）

## 验收
- [ ] Claude 显示为正圆形/正常比例，不压扁
- [ ] 点击 start 后能听到雨声
- [ ] 雨声滑块可调节音量
- [ ] npm run build 通过
