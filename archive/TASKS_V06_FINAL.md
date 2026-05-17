# LoFiClaude v0.6 — 最终完成

## 1. Build 验证
```bash
npm run build
```

## 2. Bridge 依赖安装
```bash
cd bridge && npm install
```
确认 `bridge/node_modules/ws` 存在。

## 3. 验证关键文件
确认以下文件都存在且内容正确：
- `src/components/AsciiBackground.svelte`（含 parallax、crossfade、working glow）
- `src/components/ClaudeSprite.svelte`（含 hover 处理、scaleX 在 canvas 上）
- `src/components/ExpandedPlayer.svelte`（含 slide transition）
- `src/components/ConnectionStatus.svelte`
- `src/App.svelte`（含 claudeMode unwrap、AsciiBackground working 属性绑定）
- `src/canvas/claudeMotion.js`（新状态：thinking/working/blocked/happy）
- `bridge/server.js`（WebSocket on localhost:9120）
- `bridge/claude.js`（Claude CLI 子进程管理）
- `bridge/token.js`（token 生成）

## 4. 任何缺失或错误，直接修复

## 5. 最终验证
```bash
npm run build
```
必须通过。
