# LoFiClaude v0.7 → v0.8 Development Task

> Assigned to: Codex
> Acceptance: Claude
> Project: /Users/lieliot/Documents/eliot-codex/loficlaude

## Context

v0.7 Bridge code is written but NEVER tested end-to-end with real Claude CLI. PRD (PRD_v0.7_PRODUCT_UX_OPTIMIZATION.md) defines 4 milestones; Milestone 1-2 are done, Milestone 3-4 are not.

Current HANDOFF.md at project root has full status.

## Phase 1: Bridge End-to-End Integration

**Goal:** bridge/index.js spawns a real Claude CLI child process and pipes messages through WebSocket.

**Steps:**
1. Read bridge/index.js, bridge/server.js, bridge/protocol.js, src/bridge/bridgeClient.js, src/stores/bridgeState.js
2. Modify bridge/index.js to:
   - On client connect + auth: spawn `claude` child process
   - On user_message: pipe text to claude stdin
   - Parse claude stdout for assistant text / tool calls
   - Send assistant_delta / tool_running / status events back via WebSocket
   - Handle claude process exit / errors
3. Test: `node bridge/index.js` starts, accepts WebSocket, passes auth, round-trips a message

**Verification:**
```bash
node bridge/index.js  # must work
# Use WebSocket client to test: connect -> auth -> user_message -> receive response
```

## Phase 2: Streaming Companion

**Goal:** Frontend consumes real bridge events and shows Claude working.

**Steps:**
1. assistant_delta streaming in claudeOrch.js — append deltas to current assistant message in chat history
2. tool_running display — short bubble/status for tool execution, auto-dismiss on next delta
3. status → sprite mapping — bridge status events drive Claude mood/form:
   - connected → idle | thinking → thinking form | delta → talking form | tool_running → working form | done → happy→idle | disconnected/error → sleep
   - Reference: src/canvas/claudepixForms.js for available forms (13 presets)
4. Disconnect/reconnect — WebSocket close: mark current message interrupted, show reconnect button, reconnect on click

**Key files:** src/utils/claudeOrch.js, src/components/ClaudeChatPanel.svelte, src/components/ClaudeBubble.svelte, src/components/ClaudeSprite.svelte, src/stores/bridgeState.js

## Phase 3: Polish

1. Update HANDOFF.md to reflect completion
2. `npm test` — fix any failures
3. `npm run build` — ensure clean build
4. Update CLAUDE.md if architecture changed

## Constraints

- NO new npm dependencies
- Do NOT change canvas rendering (src/canvas/ascii*.js) or audio system (src/audio/)
- Keep visual style consistent
- Commit after each phase with meaningful message: "v0.7 Phase N: <description>"
