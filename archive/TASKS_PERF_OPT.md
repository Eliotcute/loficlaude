# 任务：性能优化 — 轻量渲染架构

将现有 5 层 Canvas 引擎改为极轻量架构。

## 新架构（3 层）

### Layer 1：CSS 静态背景（零 CPU）

`src/components/StaticBackground.svelte`

- 用户提供的像素贴图（放在 `public/backgrounds/`）
- 用 CSS `background-image: url(...)` 实现，零 CPU 占用
- 三种场景对应三张贴图：
  - `lofiNight` → `public/backgrounds/lofi-night.png`
  - `softRain` → `public/backgrounds/soft-rain.png`
  - `starDrift` → `public/backgrounds/star-drift.png`
- 上层叠加深色遮罩 `radial-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.5))`
- 场景切换使用 CSS transition 1s fade

背景贴图由用户自行生成，代码只需正确引用文件路径。

### Layer 2：Canvas Overlay（极轻量）

保留 Canvas 但只渲染动态粒子（雨滴 + 星星），不做全量 5 层场景。

- Canvas 尺寸可以缩小（如 320×180，CSS `width: 100%` 放大）
- 只渲染：
  - 雨滴：8-18px 线段，密度与 rain volume 联动（最多 40 条）
  - 星星：1-2px 小点，缓慢闪烁（最多 30 颗）
- 帧率：15fps 足矣
- `pointer-events: none` 不阻挡点击

### Layer 3：Claude Sprite（不变）

保持现有 `ClaudeSprite.js` 实现，独立绘制在 Canvas overlay 之上或分离 Canvas。

## 修改范围

1. 创建 `src/components/StaticBackground.svelte`
2. 修改 `CanvasEngine.svelte` — 移除 5 层场景绘制，只保留粒子渲染
3. 删除或归档 3 个笨重的场景文件（`LofiNightScene.js`, `SoftRainScene.js`, `StarDriftScene.js`）或精简为粒子模块
4. 在 `App.svelte` 中用 StaticBackground 替换 Canvas 的主背景职责

## 验证

- [ ] 页面背景显示 CSS 图片（或 fallback 深色渐变）
- [ ] 雨滴粒子在背景上飘落
- [ ] 星星闪烁
- [ ] Claude 角色在角落动画
- [ ] 三种场景切换正常
- [ ] 场景切换有过渡效果
- [ ] npm run build 通过
