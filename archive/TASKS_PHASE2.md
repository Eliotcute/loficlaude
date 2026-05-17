# LoFiClaude — Phase 2：Canvas 像素引擎

> 要继续先阅读 ENGINEERING_SPEC.md 的 Canvas 章节

## 目标

全屏 Canvas 像素场景，三种场景可切换，Claude 角色动画

## 具体任务

1. 创建 `src/canvas/CanvasEngine.svelte` — 5 层渲染主循环（base → farSky → skyline → particles → foreground），30fps requestAnimationFrame
2. 创建 `src/canvas/scenes/LofiNightScene.js` — 点阵星球 + 点阵云 + 城市剪影 + 暖橙灯光
3. 创建 `src/canvas/scenes/SoftRainScene.js` — 细线雨滴 + 水面反光 + 稀疏窗光
4. 创建 `src/canvas/scenes/StarDriftScene.js` — 深蓝星空 + 点阵星星 + 流星
5. 实现场景 1 秒 alpha 淡入淡出切换
6. 创建 `src/canvas/ClaudeSprite.js` — 橙色像素小人，24×24px，6 种动画状态（idle/blink/nod/talk/sleep/jump），色板用 #df805f 等
7. 在 App.svelte 中引入 CanvasEngine，替换占位 Canvas
8. 场景切换逻辑与 ScenePopover 联动（ScenePopover 已在 Phase 1 占位，只需补充切换逻辑）

## 设计约束

- Canvas 场景分层：base(静态) → farSky(极慢漂移 0.02px/frame) → skyline(静态) → particles(动态) → foreground(静态)
- Claude 角色位置：距右 48px，距底 80-120px
- Claude 空闲时浮动 + 每 4-8 秒眨眼
- 不能覆盖 Claude 的雨滴/云/星星
- 角色不是章鱼、不是 3D、不是圆润吉祥物

## 文件结构

```
src/canvas/
├── CanvasEngine.svelte
├── ClaudeSprite.js
└── scenes/
    ├── LofiNightScene.js
    ├── SoftRainScene.js
    └── StarDriftScene.js
```

## 验收标准

- [ ] LofiNight 场景显示点阵星球 + 城市剪影 + 暖橙灯光
- [ ] SoftRain 场景雨滴细线动画流畅
- [ ] StarDrift 场景星星闪烁 + 流星偶发
- [ ] 场景切换有 1 秒淡入淡出
- [ ] Claude 角色在角落浮动 + 眨眼
