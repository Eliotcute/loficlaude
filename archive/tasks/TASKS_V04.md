# LoFiClaude v0.4 — ASCII 背景 + Claude DOM Sprite + Motion

按照 `LoFiClaude_v0.4_ASCII动态背景_ClaudeMotion_PRD技术架构.md` 重构。

## 核心改动

1. **背景**：Canvas 5 层场景 → 程序化 ASCII 点阵渲染（off-screen canvas 缓存静态，粒子单独 pass）
2. **Claude**：Canvas 内 sprite → **DOM 元素**（CSS `transform: translate3d`，GPU 加速，pointer-events 免费）
3. **粒子**：Canvas 内渲染 → 可选 CSS 动画或极简 Canvas overlay
4. **气泡**：手动算坐标 → CSS 跟随 Claude DOM 节点

## 任务 1：ASCII 背景系统

### 文件
- `src/components/AsciiBackground.svelte` — 主组件，管理 Canvas + 粒子
- `src/canvas/asciiRenderer.js` — 点阵绘制函数（dot, dottedRect, dottedCircle, dottedLine, dottedCloud）
- `src/canvas/asciiScenes.js` — 3 个场景定义（lofi-night, soft-rain, star-drift）
- `src/canvas/ambientParticles.js` — 雨滴/星星/流星粒子

### 渲染架构
```js
// 静态背景 → off-screen canvas（只画一次，除非 resize）
staticCanvas = document.createElement('canvas');
staticCtx = staticCanvas.getContext('2d');
drawStaticScene(staticCtx, currentScene); // 点阵房间/窗/城市/星球

// 主循环
function loop(timestamp) {
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(staticCanvas, 0, 0);      // 缓存的静态背景
  drawParticles(ctx, dt);                  // 动态粒子
  // Claude 作为 DOM 元素，不在 Canvas 中画
  requestAnimationFrame(loop);
}
```

### 点阵函数
```js
function dot(ctx, x, y, color, size = 2) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}

// 使用 seeded random 防止闪烁
function dottedRect(ctx, x, y, w, h, options) {
  const rng = seedRandom(options.seed);
  for (let yy = y; yy < y + h; yy += options.spacing ?? 8) {
    for (let xx = x; xx < x + w; xx += options.spacing ?? 8) {
      if (rng() < (options.density ?? 0.5)) {
        dot(ctx, xx, yy, options.color ?? 'rgba(230,230,220,0.65)');
      }
    }
  }
}
```

### 场景数据（asciiScenes.js）
```js
export const SCENES = {
  'lofi-night': {
    objects: [
      { type: 'window', x: 60, y: 80, w: 260, h: 340 },
      { type: 'desk', x: 0, y: 720, w: 600, h: 160 },
      { type: 'plant', x: 160, y: 640 },
      { type: 'planet', x: 1100, y: 160, r: 80 },
      { type: 'city', baseY: 720 },
      { type: 'cloud', x: 700, y: 200 },
      { type: 'lamp', x: 240, y: 670 }
    ],
    particles: ['stars']
  },
  'soft-rain': {
    objects: [
      { type: 'city', baseY: 700 },
      { type: 'cloud', x: 600, y: 120 },
      { type: 'lamp', x: 200, y: 560 }
    ],
    particles: ['rain', 'waterRipples']
  },
  'star-drift': {
    objects: [
      { type: 'planet', x: 700, y: 220, r: 90 },
      { type: 'city', baseY: 750 },
      { type: 'cloud', x: 250, y: 480 }
    ],
    particles: ['stars', 'meteors']
  }
};
```

## 任务 2：Claude DOM Sprite + Motion

### 文件
- `src/components/ClaudeSprite.svelte` — DOM 元素，CSS transform 定位
- `src/canvas/claudeMotion.js` — 移动逻辑 + 状态机

### ClaudeSprite.svelte
```svelte
<script>
  import { claude } from '../stores/appState.js';
  import { SPRITE_MATRIX, getFrame } from './spriteFrames.js';
</script>

<div
  class="claude-sprite"
  style="transform: translate3d({$claude.x}px, {$claude.y}px, 0)"
  on:click
  role="button"
  aria-label="Claude"
>
  <!-- 程序绘制像素矩阵，不需要 sprite sheet PNG -->
  <canvas bind:this={canvas} width={24} height={24} style="image-rendering: pixelated; width: 96px; height: 96px;" />
</div>

<style>
  .claude-sprite {
    position: absolute;
    width: 96px; height: 96px;
    cursor: pointer;
    z-index: 10;
    transition: transform 0.3s ease-out;
    /* transition 让移动平滑 */
  }
</style>
```

### claudeMotion.js — 状态机 + 路径
```js
export function updateClaudeMotion(claude, ui, dt) {
  if (claude.mode === 'sleep' || claude.mode === 'talk') return;
  
  const bounds = getWalkBounds(ui);
  
  if (claude.mode === 'idle') {
    claude.idleTime -= dt * 1000;
    if (claude.idleTime <= 0) {
      if (Math.random() < 0.5) {
        claude.targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        claude.targetY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
        claude.mode = 'walk';
      } else {
        claude.idleTime = 5000 + Math.random() * 7000;
      }
    }
  }
  
  if (claude.mode === 'walk') {
    const dx = claude.targetX - claude.x;
    const dy = claude.targetY - claude.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 5) {
      claude.mode = 'idle';
      claude.idleTime = 5000 + Math.random() * 7000;
    } else {
      const speed = 30 * dt;
      claude.x += (dx / dist) * speed;
      claude.y += (dy / dist) * speed;
      claude.direction = dx > 0 ? 'right' : 'left';
    }
  }
}

function getWalkBounds(ui) {
  return {
    minX: 80,
    maxX: window.innerWidth - 160,
    minY: window.innerHeight * 0.66,
    maxY: ui.playerExpanded ? window.innerHeight - 280 : window.innerHeight * 0.84
  };
}
```

### spriteFrames.js — 像素矩阵定义
用 JavaScript 数组定义 Claude 的像素矩阵（24×24），而不是 sprite sheet PNG。
```js
export const FRAMES = {
  idle_1: [
    // 24x24 像素矩阵，0=透明，1=橙色身体，2=黑色等
  ],
  idle_2: [ /* 眨眼帧 */ ],
  walk_1: [ /* 左脚在前 */ ],
  walk_2: [ /* 右脚在前 */ ],
  talk_1: [ /* 说话嘴开 */ ],
  talk_2: [ /* 说话嘴闭 */ ],
  sleep_1: [ /* 蜷缩 */ ],
  sleep_2: [ /* Zzz */ ]
};
```

## 任务 3：App.svelte 整合

接入新架构，废弃旧 CanvasEngine 的 5 层渲染。

```svelte
<AsciiBackground scene={$scene.current} rainVolume={$rain.volume} />
<ClaudeSprite />
<AmbientHeader />
<PlayerDrawer ... />
<!-- 其他 UI 不变 -->
```

## 验收标准

- [ ] 背景显示 ASCII 点阵场景（房间/窗/城市/星球）
- [ ] 背景不闪烁（seeded random + offscreen cache）
- [ ] 粒子（雨/星星）在背景上动画
- [ ] Claude 是 DOM 元素，CSS transform 定位
- [ ] Claude 每 5-12 秒走动一次
- [ ] 点击 Claude 停止移动，弹出气泡
- [ ] 气泡跟随 Claude 位置
- [ ] 播放器展开时 Claude 避让
- [ ] 场景切换正常
- [ ] npm run build 通过
