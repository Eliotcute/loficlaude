# LoFiClaude — Handoff

> 最后更新：2026-05-24
> 当前版本：v1.0.0
> 分支：`master`
> 项目目录：`/Users/lieliot/Documents/eliot-codex/loficlaude`

## 项目一句话

一个在 ASCII 雨夜里陪你和本地 Claude 一起编码的 lofi 空间。浏览器和终端是同一个 Claude 的两个窗口。

## 版本标签

```bash
git checkout v0.3   # Canvas MVP
git checkout v0.4   # ASCII + DOM Claude
git checkout v0.6   # ASCII 场景 + Bridge + Claude companion
git checkout v0.7   # Bridge E2E + Streaming Companion
git checkout v0.9   # Chat UX + Music + Forms
git checkout v1.0   # Terminal Companion (最新)
```

## 当前状态

### 已完成

| 模块 | 说明 |
|---|---|
| ASCII 场景 | Canvas 3 场景（`lofi-night` / `soft-rain` / `star-drift`） |
| 音乐 | 8 个 lofi 频道，带 genre 色点、自动切歌、兜底和自定义 URL |
| 雨声 | Web Audio 程序化粉红噪声，3 档强度 |
| Claude Sprite | DOM/CSS transform 定位，支持走动、点击、拖拽 |
| 形态系统 | `claudepix` 形态库 + 三击切换 |
| 播放器 | 底部 Drawer 的 collapsed / expanded 状态 |
| 对话体验 | 气泡到面板的渐进式对话，支持流式输出 |
| Bridge | WebSocket `:9120` + Unix Socket `/tmp/loficlaude-claude.sock` |
| 终端 Companion | `socat` 直连 socket，实时双向 Claude 会话 |
| 安全 | token 认证、socket 0600、无硬编码密钥 |

## 最近修复

- 修掉了黑屏启动问题：`src/canvas/claudepixForms.js` 的浏览器侧加载改为 `import.meta.glob`，不再在前端路径里误走 `node:fs/promises`。
- 修复后应用恢复渲染。
- 验证结果：`npm test` 通过，`npm run build` 通过。
- 浏览器复核结果：页面壳、Claude 按钮、头部、折叠态播放器都正常显示，控制台干净。

## 仍要盯的点

- 底部播放器折叠 / 展开时，Claude 小人要始终站在播放器上方，并随播放器升降联动。
- 这块在桌面和移动端都要再看一遍，尤其是展开播放器后的垂直定位。
- Vite 还有警告，主要围绕 `new URL('../../archive/misc/claudepix_presets/', import.meta.url)` 和 `node:fs/promises` 路径提示；目前不影响运行，但后面可以继续收敛。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Svelte 5 + Vite 8 |
| 音频 | YouTube iframe API + Web Audio API |
| Canvas | 原生 Canvas 2D |
| 桥接 | WebSocket + Unix Domain Socket |
| 字体 | Press Start 2P + IBM Plex Mono |

## 关键文件

- `src/App.svelte`
- `src/canvas/claudepixForms.js`
- `src/canvas/claudeMotion.js`
- `src/components/ClaudeSprite.svelte`
- `src/components/ExpandedPlayer.svelte`
- `src/components/ClaudeChatPanel.svelte`
- `src/bridge/bridgeClient.js`
- `src/stores/bridgeState.js`
- `bridge/server.js`
- `bridge/claude.js`
- `test/claudepixForms.test.js`

## 运行

```bash
cd /Users/lieliot/Documents/eliot-codex/loficlaude
npm run dev
node bridge/index.js
npm test
npm run build

./bridge/loficlaude-cli
# 或: socat - UNIX-CONNECT:/tmp/loficlaude-claude.sock
```

## 下一步建议

1. 把 Claude 与播放器的垂直联动再做一次桌面 / 移动端 QA。
2. 如果还要继续收尾，再清一轮 Vite 警告。
3. 保持 lofi-only 播放列表，不再往电台里加非 lofi 频道。
