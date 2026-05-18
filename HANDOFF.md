# LoFiClaude — Handoff Document

> 生成日期：2026-05-18
> 版本：v0.6（已完成）+ 三击切换形态
> 项目目录：`/Users/lieliot/Documents/eliot-codex/loficlaude`

---

## 项目一句话

一个在 ASCII 雨夜里陪你和本地 Claude 一起编码的 lofi 空间。

## 当前状态

### ✅ 已完成

| 模块 | 说明 |
|------|------|
| ASCII 程序化点阵背景 | Canvas 3 场景（lofi-night / soft-rain / star-drift），off-screen 缓存 |
| YouTube lofi 播放 | 5 个预设流，切歌/暂停/随机 |
| 雨声叠加 | 3 种强度（light/medium/heavy），独立音量 |
| Claude DOM Sprite | CSS transform 定位，GPU 加速，走动/点击/hover |
| Claude 状态机 | idle / walk / talk / sleep / thinking / working / blocked / happy |
| 13 个 claudepix 预设 | idle_breathe/blink/look_around, work_coding/think, dance_bounce/sway/bounce_dj/sway_dj/djmix, expression_wink/surprise/sleep |
| 三击切换形态 | 800ms 内 3 次点击循环切换，气泡显示中文名 |
| 播放器 Drawer | collapsed / expanded 两态，slide 动画 |
| 场景自动轮播 | 5 分钟自动切换，scene.locked 停止 |
| Local Bridge | WebSocket :9120，token 认证，Claude CLI 适配 |
| 快捷键 | Space / ←→ / ↑↓ / M / 1-3 / T / H / Esc |
| localStorage | 场景/音量/歌曲/定时持久化 |

### ❌ 未完成

| 待办 | 优先级 | 说明 |
|------|--------|------|
| 背景贴图 | P2 | 需要用户生成像素风格 PNG 放在 `public/backgrounds/` |
| Bridge 联调 | P1 | `node bridge/index.js` 启动后需要实测 Claude CLI 连接 |
| 移动端适配 | P3 | 基础触屏支持但未完整测试 |
| 测试覆盖 | P2 | `npm test` 可用但覆盖率低 |
| 雨声替换 | P3 | 当前是 ffmpeg 程序生成，可用 CC0 录音替代 |

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Svelte 5 + Vite 8 |
| 音频 | YouTube iframe API + Howler.js |
| Canvas | 原生 Canvas 2D（off-screen 缓存） |
| 字体 | Press Start 2P + IBM Plex Mono |
| 颜色 | 深蓝黑 `#0a0a0f` -> `#1a1a2e`，强调色 `#d4a574` |
| Claude 身体色 | `#df805f` / `#b85f48` / `#f09a72` |

## 版本标签

```bash
git checkout v0.3   # 旧 Canvas 架构
git checkout v0.4   # ASCII + DOM Claude  
git checkout v0.6   # 当前最新完整版
git checkout master # 最新（含三击切换等未 tag 改动）
```

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/App.svelte` | 主布局 + 状态编排 |
| `src/canvas/AsciiBackground.svelte` | ASCII 背景渲染 |
| `src/canvas/asciiScenes.js` | 3 个场景定义 |
| `src/canvas/claudepixForms.js` | 13 个 claudepix 预设动画帧 |
| `src/components/ClaudeSprite.svelte` | DOM sprite + 三击切换 |
| `src/canvas/claudeMotion.js` | 走动状态机 |
| `bridge/` | Local WebSocket 服务 |
| `claudepix_presets/` | 13 个 claudepix HTML 预设源文件（存档参考）|
| `PRD_v0.6_ROADMAP.md` | 产品路线图 |

## 开发工作流

- Codex 在右侧 tmux pane（%15）
- 发送命令后必须补充 Enter 触发
- 新脚本首次运行需批准权限（`p` + `Enter`）
- 频繁 429 限流时切换 CC-switch 节点

## 运行

```bash
cd /Users/lieliot/Documents/eliot-codex/loficlaude
npm run dev    # Web 前端 :5173
node bridge/index.js  # Local Bridge :9120
```
