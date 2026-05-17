# LoFiClaude — Phase 1：项目骨架

> 你需要完整阅读：
> 1. `/Users/lieliot/Documents/eliot-codex/loficlaude/ENGINEERING_SPEC.md` — 开发规格书
> 2. `/Users/lieliot/Documents/eliot-codex/loficlaude/LoFiClaude_v0.2_产品设计PRD.md` — 产品设计（可选）
> 3. `/Users/lieliot/Documents/eliot-codex/loficlaude/LoFiClaude_v0.2_设计风格PRD_强化约束版.md` — 设计规格

## 目标

让 Svelte + Vite 项目跑起来，看到完整的页面框架。

## 具体任务

1. 初始化 Svelte + Vite 项目
2. 安装依赖（howler 等）
3. 创建 stores/appState.js（完整状态管理）
4. 实现 App.svelte（全屏布局 + 点击开始画面）
5. 实现 AmbientHeader.svelte（顶栏：产品名 + scene icon + timer）
6. 实现 MiniPlayer.svelte（底部迷你条，默认透明度 0.8，focus 态 0.25）
7. 配置字体（index.html 中引入 Press Start 2P + IBM Plex Mono）

## 验收标准

- [ ] `npm run dev` 可以启动
- [ ] 浏览器看到全屏 Canvas 区域（黑底）+ 顶栏 + 底部 mini player
- [ ] 点击 "Click to start 🎵" 后消失
- [ ] 5 秒无操作 mini player 透明度降低
- [ ] 鼠标移动恢复透明度

## 设计约束

- Canvas 占屏 ≥ 80%
- 默认可见可点击按钮 ≤ 6 个
- Mini player 高度 48px，距底部 20px
- 顶栏 padding 24px
- 配色：背景 #0b0d0e / 主文字 #e8e0d8 / 强调色 #d4a574 / 面板 rgba(8,10,12,0.45) + backdrop-filter blur(8px)

## 文件结构

```
loficlaude/
├── src/
│   ├── App.svelte
│   ├── components/
│   │   ├── AmbientHeader.svelte
│   │   └── MiniPlayer.svelte
│   └── stores/
│       └── appState.js
```
