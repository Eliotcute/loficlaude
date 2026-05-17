# LoFiClaude v0.6 — Phase 2：Local Bridge

## 目标

建立 Web 页面 ↔ Local Bridge ↔ Claude CLI 的对话闭环。

## 架构

```
Web App (浏览器)
  ↕ WebSocket (localhost:9120)
Local Bridge (Node.js 进程)
  ↕ stdin/stdout
Claude Code CLI
```

## 文件结构

```
bridge/
├── index.js            ← 入口：启动 WebSocket 服务
├── server.js           ← WebSocket 服务器（ws 库）
├── claude.js           ← Claude CLI 子进程管理
├── protocol.js         ← 事件协议定义 + 序列化
├── token.js            ← local token 生成/校验
├── config.js           ← 端口/workspace/超时配置
└── package.json        ← bridge 依赖（ws）
```

## 实现细节

### bridge/server.js

- 启动 WebSocket 服务在 `localhost:9120`
- 校验 token：客户端必须在首次消息中发送 `{ type: "auth", token: "..." }`
- 接收用户消息 → 转发给 claude.js → 把输出推回 Web
- 发送状态事件到 Web：connecting/connected/thinking/talking/working/done/disconnected

### bridge/claude.js

- `spawn('claude', [], { stdio: ['pipe', 'pipe', 'pipe'] })`
- 把来自 Web 的用户消息写入 claude stdin
- 读取 claude stdout，每收到一段文本就通过 WebSocket 推送
- 检测 claude 状态关键词：
  - "thinking" → 发 status: thinking
  - 输出代码块 → 发 status: working
  - "I need your confirmation" → 发 status: blocked
  - 命令执行完毕 → 发 status: done

### bridge/protocol.js

```js
// Web → Bridge
{ type: "auth", token: "xxx" }
{ type: "user_message", text: "帮我看看这个" }

// Bridge → Web
{ type: "status", value: "connecting" }
{ type: "status", value: "connected" }
{ type: "assistant_delta", text: "我先看一下..." }
{ type: "tool_running", name: "npm run build" }
{ type: "status", value: "thinking" }
{ type: "status", value: "working" }
{ type: "status", value: "blocked" }
{ type: "status", value: "done" }
{ type: "error", message: "..." }
```

### bridge/token.js

- 启动时生成一次性 local token（crypto.randomUUID）
- 打印到终端：`Bridge token: xxx`
- WebSocket 连接后 5 秒内必须发 auth，否则断开

### bridge/config.js

```js
module.exports = {
  port: 9120,
  authTimeout: 5000,
  defaultModel: 'claude-sonnet-4-6',
  workspace: process.cwd()
};
```

## Web 端修改

### 连接 UI
- `src/components/ConnectionStatus.svelte` — 连/断连按钮 + 状态灯
- 放在 AmbientHeader 右侧或 Claude 附近

### 状态同步
- WebSocket 收到 status 事件 → 更新 claude.mode store → ClaudeSprite 自动切换状态

## 安装与运行

```bash
# 安装 bridge 依赖
cd bridge && npm init -y && npm install ws

# 启动（先 cd 到你项目的目录）
node bridge/index.js

# 终端会显示：
# 🔌 LoFiClaude Bridge running on ws://localhost:9120
# 🔑 Token: xxxx-xxxx-xxxx

# 然后打开 Web 页面，点击 "Connect" 输入 token
```

## 验收标准

- [ ] `node bridge/index.js` 启动无报错
- [ ] 终端打印端口和 token
- [ ] Web 页面可连接到 Bridge
- [ ] Web 输入消息 → Bridge → Claude CLI → 返回结果到 Web
- [ ] 状态同步：Claude 思考时 Web 小人显示 thinking
- [ ] 断连后 Web 显示 disconnected
- [ ] npm run build 仍然通过
