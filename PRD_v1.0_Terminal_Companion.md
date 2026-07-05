# LoFiClaude v1.0 — Terminal Companion PRD

> 状态：Ready for Implementation（经 office-hours 设计 + plan-eng-review 审查）
> 设计文档：`~/.gstack/projects/loficlaude/lieliot-master-design-20260522-003812.md`
> 目标：终端 ↔ 浏览器实时双向 Claude 会话
> 设计原则：**One Claude, two windows.**

---

## 版本历史

| 版本 | 日期 | 内容 |
|------|------|------|
| v0.3 | 2026-05-17 | Canvas 架构 MVP |
| v0.4 | 2026-05-17 | ASCII + DOM Claude |
| v0.6 | 2026-05-18 | ASCII 场景 + Bridge + Claude companion |
| v0.7 | 2026-05-18 | Bridge 集成 + UX 一致性 |
| v0.8 | 2026-05-21 | Bridge E2E + Streaming Companion |
| v0.9 | 2026-05-21 | Chat UX + Music + Forms + Hotfix |
| v1.0 | 2026-05-22 | Terminal Companion (Unix Socket) |

---

## v0.9 已完成功能（基线）

### Chat UX
- 气泡→面板渐进式对话（第一轮气泡，第二轮自动打开面板）
- 用户消息和 Claude 回复均可见（双边聊天）
- localStorage 对话持久化（最多 50 条，跨刷新保留）
- 断连发送保护（红色脉冲 + 提示）
- Claude 对话时停止走动（15s 状态触发）
- 打字机效果（2px 琥珀色像素块光标，不规则闪烁）
- z-index 层级：ChatPanel(20) > Bubble(19) > MiniPlayer(5)

### Music
- 8 个 YouTube lofi 频道 + genre 色点
- 播放失败自动 skip failover
- 自定义 YouTube URL 输入

### Forms
- 13→8 独特形态（移除重复度高的 5 个 DJ/表情 form）
- 新增 nap（趴桌）、journal（写字）

### Bridge
- 直接 spawn Claude CLI（`--output-format stream-json`）
- WebSocket 流式事件转发（assistant_delta / tool_running / status / error）
- 中断/重连 UI

---

## v1.0: Terminal Companion

### 问题

Bridge 完全接管了 Claude 的 stdin/stdout 做 WebSocket 转发。用户在终端侧看不到 Claude 进程，无法进入、无法查看、无法交互。对话被锁在浏览器里。

### 方案：Unix Domain Socket Server

**核心思路：** Bridge 创建一个 Unix domain socket。Claude 的输出（解析后的纯文本）广播到 WebSocket 和 socket 客户端。终端和浏览器的输入汇集写入 Claude stdin。终端和浏览器是同一个 Claude 进程的两个窗口。

```
┌──────────────────────────────────────────────────────┐
│                     Bridge                            │
│                                                       │
│   Terminal (socat) ──→ socket.on('data') ──┐          │
│   Browser (WS)     ──→ ws.on('message') ──┤          │
│                                            ▼          │
│                                   claude.stdin.write  │
│                                          │            │
│                                    Claude (spawn)     │
│                                          │            │
│                                   stdout.on('data')   │
│                                          │            │
│                              claude.js parse JSON     │
│                               │          │            │
│                          onDelta()    onStatus()      │
│                          onTool()     onError()       │
│                            │                          │
│                     ┌──────┴──────┐                   │
│                     ▼              ▼                   │
│              WebSocket        Unix Socket              │
│           (structured JSON)  (plain text)             │
│              browser          terminal (socat)         │
└──────────────────────────────────────────────────────┘
```

**数据流说明：**
- **Claude → 浏览器：** 结构化 JSON（`{ type: "assistant_delta", text: "..." }`）
- **Claude → 终端：** 解析后纯文本（`onDelta` text 直接输出，含 `[Tool: xxx]` 和状态行）
- **终端 → Claude：** 原始文本（逐行读取，直接写 Claude stdin）
- **浏览器 → Claude：** WebSocket JSON（`{ type: "user_message", text: "..." }`）

### 实现路径

**1. 新增 `bridge/socketServer.js`**

```js
const net = require('node:net');
const fs = require('node:fs');

function createSocketServer({ socketPath, onClientData, onClientClose }) {
  // 清理旧 socket 文件
  try { fs.unlinkSync(socketPath); } catch { /* didn't exist */ }

  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');

    // 终端输入 → 逐行发送
    let lineBuffer = '';
    socket.on('data', (chunk) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop(); // 保留不完整行
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) onClientData(trimmed);
      }
    });

    socket.on('error', () => {});
    socket.on('close', () => onClientClose(socket));
  });

  server.listen(socketPath, () => {
    fs.chmodSync(socketPath, 0o600);
  });

  // 广播函数：向所有连接的客户端发送文本
  function broadcast(text) {
    server.getConnections((_, count) => {
      if (count === 0) return;
    });
    // 遍历写入
    server._clients = server._clients || new Set();
    // 实际使用 server.getConnections + internal tracking
  }

  return { server, broadcast };
}
```

实际实现会使用一个 `Set<net.Socket>` 追踪客户端，`broadcast(text)` 向所有 client 写入。

**2. 重构 `bridge/index.js`**

在现有 `createClaudeSession` 回调中接入 socket 广播：

```
// 现有回调（bridge/server.js 传入）
onStatus: (value) => {
  // WebSocket: 发送结构化事件
  send({ type: SERVER_TYPES.STATUS, value });
  // Unix Socket: 发送状态行
  if (value === STATUS.THINKING) socketServer.broadcast('[Thinking...]\n');
  if (value === STATUS.WORKING)  socketServer.broadcast('[Working...]\n');
  if (value === STATUS.DONE)     socketServer.broadcast('[Done]\n');
},
onDelta: (text) => {
  // WebSocket: 结构化 JSON
  send({ type: SERVER_TYPES.ASSISTANT_DELTA, text });
  // Unix Socket: 纯文本
  socketServer.broadcast(text);
},
onTool: (name) => {
  send({ type: SERVER_TYPES.TOOL_RUNNING, name });
  socketServer.broadcast(`[Tool: ${name}]\n`);
},
onError: (message) => {
  send({ type: SERVER_TYPES.ERROR, message });
  socketServer.broadcast(`[Error: ${message}]\n`);
}
```

**终端输入 → Claude stdin：**
```
// bridge/index.js
socketServer = createSocketServer({
  socketPath: '/tmp/loficlaude-claude.sock',
  onClientData: (text) => {
    // 终端输入的文本直接写入 Claude stdin
    const payload = JSON.stringify({
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text }] }
    });
    claudeSession.sendRaw(payload + '\n');
  }
});
```

**3. 新增 `bridge/loficlaude-cli`**

```bash
#!/bin/bash
if ! command -v socat &>/dev/null; then
  echo "loficlaude-cli requires socat: brew install socat" >&2
  exit 1
fi
if [ ! -S /tmp/loficlaude-claude.sock ]; then
  echo "Bridge not running. Start with: node bridge/index.js" >&2
  exit 1
fi
echo "Connected to LoFiClaude. Type your message. Ctrl+C to disconnect."
exec socat - UNIX-CONNECT:/tmp/loficlaude-claude.sock
```

**4. `bridge/config.js` 新增**

```js
socketPath: '/tmp/loficlaude-claude.sock'
```

### 终端输出示例

```
$ socat - UNIX-CONNECT:/tmp/loficlaude-claude.sock
[Connected to LoFiClaude]
[Thinking...]
好的，我来帮你 review 这段代码。首先看整体结构...
这里有一个问题：第 47 行的 null check 缺失了...
[Tool: Read]
[Working...]
建议修改如下：
[Done]
```

### 终端输入格式

终端输入是**纯文本**——不需要 JSON 包装。用户直接打字：
```
能具体说说第三点吗？
```
Bridge 收到后自动包装成 stream-json 格式写入 Claude stdin：
```
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"能具体说说第三点吗？"}]}}
```

### 文件改动清单

| 文件 | 改动 | 复杂度 |
|------|------|--------|
| `bridge/socketServer.js` | **NEW** — Unix socket server（~50 行） | M |
| `bridge/index.js` | 重构：output broadcast + socket 输入路由（~40 行） | M |
| `bridge/loficlaude-cli` | **NEW** — 终端 CLI 脚本（~10 行） | XS |
| `bridge/config.js` | +1 行：socketPath | XS |
| `test/socketServer.test.js` | **NEW** — socket server 单元测试 | M |

### 测试用例

| # | 测试 | 类型 |
|---|------|------|
| 1 | socket server 启动 → `/tmp/loficlaude-claude.sock` 存在 | 单元 |
| 2 | 客户端连接 → 收到 `[Connected]` 消息 | 单元 |
| 3 | `broadcast(text)` → 已连接客户端收到文本 | 单元 |
| 4 | 客户端发送文本 → `onClientData` 收到完整行 | 单元 |
| 5 | 多个客户端同时连接 → 均收到广播 | 单元 |
| 6 | 客户端断开 → 不影响其他客户端 | 单元 |
| 7 | Bridge 关闭 → socket 文件清理 | 单元 |
| 8 | 浏览器发送 → 终端看到 Claude 回复（纯文本） | E2E |
| 9 | 终端输入 → 浏览器看到 Claude 回复 | E2E |
| 10 | 两端同时输入 → 不冲突 | E2E |

### 验收标准

1. Bridge 启动后 `/tmp/loficlaude-claude.sock` 存在（权限 0600）
2. `socat - UNIX-CONNECT:/tmp/loficlaude-claude.sock` 连接成功，看到 `[Connected]`
3. 浏览器发消息 → socat 终端实时看到 Claude 回复（纯文本）
4. socat 终端输入消息 → 浏览器实时看到 Claude 回复
5. 终端输入纯文本不需要 JSON 包装
6. 两端同时输入不冲突、不死锁
7. Bridge 关闭时 socket 文件自动清理
8. `npm test` 全过（5 existing + 6 new = 11 tests）
9. `npm run build` 干净

### 终端用户旅程

```
1. LoFiClaude 浏览器 :5173 ，Start room → Connect Bridge
2. Bridge 启动输出：
   🔌 Bridge :9120
   📂 Socket: /tmp/loficlaude-claude.sock
3. 浏览器发消息: "帮我 review 代码"
4. Claude streaming 回复，浏览器看到打字机效果
5. 新终端 tab:
   $ socat - UNIX-CONNECT:/tmp/loficlaude-claude.sock
   [Connected to LoFiClaude]
   好的，我来帮你 review 这段代码...
   [Tool: Read]
   [Working...]
   建议修改如下：...
   [Done]
6. 终端打字: 能具体说说第三点吗？
7. Claude 继续回复，浏览器同步显示
8. Ctrl+C 断开 socat，socket 保留，随时重连
```

---

## 实施计划

### 单次交付（预计 30-45 分钟）

1. 新增 `bridge/socketServer.js` + 单元测试 `test/socketServer.test.js`
2. 重构 `bridge/index.js`（output broadcast + socket 输入路由）
3. 新增 `bridge/loficlaude-cli` + `chmod +x`
4. 端到端验证：浏览器 ↔ 终端双向对话
5. `npm test`（11 tests） + `npm run build`
6. 更新 HANDOFF.md → v1.0

---

## 架构审查结论（plan-eng-review）

| 维度 | 结论 |
|------|------|
| 复杂度 | 1 新文件，~100 行新代码，未触发复杂度阈值 ✅ |
| 已有代码复用 | 现有 `claude.js` onDelta/onStatus/onTool 回调已提供输出 hook ✅ |
| 输出格式 | 终端 = 解析后纯文本（`onDelta` text + `[Tool/Status]` 标签） ✅ |
| 输入格式 | 终端输入 = 纯文本，Bridge 自动包装为 stream-json ✅ |
| 线程安全 | Node.js 单线程事件循环，WritableStream write() 天然安全 ✅ |
| 生命周期 | socket server → `server.close()` + `fs.unlinkSync()` 清理 ✅ |

## 风险

| 风险 | 缓解 |
|------|------|
| socat 未安装 | `loficlaude-cli` 脚本检测并提示 `brew install socat` |
| 慢客户端拖慢广播 | `socket.write()` 返回 false 时跳过该客户端 + 记录 dropped 计数 |
| Claude 进程退出时客户端断连 | socket server 监听 `claude.on('close')` → broadcast `[Claude exited]` → `server.close()` |
| 终端输入含特殊字符 | 输入文本直接序列化为 JSON string（`JSON.stringify` 自动转义） |
| 多个 socket 客户端同时输入 | stdin.write() 排队，Claude 按到达顺序处理 |
