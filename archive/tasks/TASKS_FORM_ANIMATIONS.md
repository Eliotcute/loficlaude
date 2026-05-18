# 任务：提取 claudepix 预设动画并接入三击切换

## 目标
三击 Claude 切换形态时，不仅改变索引，还要播放对应预设的完整动画帧序列。

## 实现方案

### 1. 创建 src/canvas/claudepixForms.js

读取 13 个 claudepix HTML 预设，提取每个预设的：
- `PRESET.name` — 预设名称
- `PRESET.frames` — 帧数组（含 hold 毫秒和 frame 20×20 网格）
- 每个预设的独特 `BASE` 场景矩阵

数据格式（直接写死在 js 里，不需要运行时读 HTML）：
```js
export const FORMS = [
  {
    id: 'idle_breathe',
    name: '呼吸',
    frames: [
      { hold: 500, grid: null },  // null = 使用预设的默认 BASE
      { hold: 200, grid: [...] },  // 20×20 数组
      ...
    ]
  },
  // ... 其余 12 个
];
```

### 2. 修改 ClaudeSprite.svelte

原有的 `getFrame(mode, frameIndex)` 调用改为：
- idle/breathe/blink 等状态 → 使用 `FORMS[$claudeForm].frames[index]`
- 按顺序播放帧序列，每帧停留 `hold` 毫秒
- 播完循环

### 3. 改造 drawFrame

每个预设的 `grid` 是 20×20，需要绘制到 24×24 的 canvas 上：
- 偏移 (2,2) 居中
- 颜色映射：
  ```
  work_coding/high-quality: 0=透明, 1=#CD7F6A(橙), 2=#111(黑), 3=#d4dde2(耳机白), ...
  其他预设: 0=透明, 1=#CD7F6A(橙), 2=#0f0f0f(眼)
  ```
- 统一用 `PAL[value]` 映射

### 4. 帧播放器

```js
let frameIndex = 0;
let frameTimer = 0;

function tick(dt) {
  const form = FORMS[$claudeForm];
  const currentFrame = form.frames[frameIndex];
  
  frameTimer += dt * 1000;
  if (frameTimer >= currentFrame.hold) {
    frameIndex = (frameIndex + 1) % form.frames.length;
    frameTimer = 0;
  }
  
  const grid = currentFrame.grid || form.baseGrid;
  drawGrid(grid);
}
```

### 5. 性能注意
- 所有预设的帧数据在初始化时加载，运行时只切换索引
- 帧序列播放不影响走动动画（走动用 claudeMotion 独立控制）
- 预设播放时 Claude 不走路（保持谈话/idle 状态）

## 验收
- [ ] 三击切换到 work_coding 时，Claude 显示打字动画（有电脑桌）
- [ ] 三击切换到 dance_bounce 时，Claude 弹跳
- [ ] 三击切换到 expression_sleep 时，Claude 闭眼 + Zzz
- [ ] 形态切换有气泡提示当前名称
- [ ] npm run build 通过
