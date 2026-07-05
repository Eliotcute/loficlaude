# LoFiClaude v1.0 — Terminal Companion Implementation

Read PRD_v1.0_Terminal_Companion.md for full context.

## Build Order

### 1. bridge/socketServer.js (NEW)
- Unix socket server using `net.createServer`
- `Set<net.Socket>` client tracking
- `broadcast(text)` — write to all connected clients
- `socketPath` from config
- Clean up old socket file on start, chmod 0600
- Line-buffered input: split on '\n', emit complete lines via `onClientData`

### 2. bridge/index.js (MODIFY)
- Create socketServer after bridge startup
- Wire `onDelta` callback → `socketServer.broadcast(text)` (plain text output)
- Wire `onStatus` → `socketServer.broadcast('[Thinking...]\n')` etc
- Wire `onTool` → `socketServer.broadcast('[Tool: xxx]\n')`
- Wire `onError` → `socketServer.broadcast('[Error: xxx]\n')`
- `onClientData` → wrap as stream-json user message → claude stdin
- On claude close → broadcast '[Claude exited]' → server.close()
- On process exit → fs.unlinkSync(socketPath)

### 3. bridge/loficlaude-cli (NEW)
- Shell script: check socat, check socket exists, connect
- chmod +x

### 4. bridge/config.js (MODIFY)
- Add `socketPath: '/tmp/loficlaude-claude.sock'`

### 5. test/socketServer.test.js (NEW)
- 6 unit tests: create server, connect client, broadcast, receive data, multi-client, cleanup

## Verification
```bash
npm test        # 5 existing + 6 new = 11 tests
npm run build   # clean
node bridge/index.js  # should show socket path + token
```

## Constraints
- Zero new npm dependencies
- Do NOT touch frontend code (src/)
- Commit: "v1.0 Terminal Companion: Unix socket server for real-time terminal access"
