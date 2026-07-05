# LoFiClaude v0.9 — Implementation Task

> Read PRD_v0.9_Chat_Experience_Polish.md for full context.
> This file: ordered build list with exact files and verification.

## Milestone 1: Chat UX Fix (P0)

### 1.1 F3: Stop walking during chat
**Files:** `src/canvas/claudeMotion.js`, `src/utils/claudeOrch.js`

- Add `export let chatPaused = false; export function setChatPaused(v) { chatPaused = v; }` to claudeMotion.js
- In `updateClaudeMotion`, before idle→walk transition: `if (chatPaused || claudeState.mode !== 'idle') return;`
- In claudeOrch.js `sendMessage()`: call `setChatPaused(true)`
- In `handleBridgeStatus('done')`: `setTimeout(() => setChatPaused(false), 15000)`

Verify: Send a message, Claude stays still for 15s after reply completes.

### 1.2 F4: Chat UX — bubble → panel progression
**Files:** `src/utils/claudeOrch.js`, `src/components/ClaudeBubble.svelte`, `src/components/ClaudeChatPanel.svelte`

- `sendMessage()`: if first round (userRounds === 0), keep `bubbleVisible: true, panelOpen: false`
- Second round: `bubbleVisible: false, panelOpen: true`
- ClaudeBubble.svelte: render message list in bubble (not just single message)
- ClaudeChatPanel.svelte: remove `slice(-5)`, show full history
- Add localStorage persist/restore for chat history (key: `loficlaude-chat-history`, max 50)
- Disconnect guard: if `!bridgeConnected`, shake bubble red, show "Bridge not connected" hint

Verify: Type message → stays in bubble. Type second → panel opens. Refresh → history restored. Send without Bridge → red shake.

### 1.3 F5: Typewriter cursor
**Files:** `src/components/ClaudeChatPanel.svelte`, `src/components/ClaudeBubble.svelte`

- CSS-only: `.streaming-text::after { content:''; width:2px; height:1em; background:#d4a574; animation: pixel-blink 500ms steps(1) infinite; }`
- Apply `.streaming-text` class to the active assistant message during loading

Verify: Claude reply shows amber pixel block cursor at end. Cursor disappears when done.

## Milestone 2: Music + Terminal (P1)

### 2.1 F1+F2: Music expansion + failover
**Files:** `src/audio/YouTubePlayer.js`, `src/components/MiniPlayer.svelte`

- Expand PLAYLIST to 8 entries with genre tags
- `onError` handler: auto skipNext(), max retries = playlist length
- MiniPlayer: 4px genre color dot next to track name
- MiniPlayer bottom: "+" button → text input for custom YouTube URL
- Custom URL saved to localStorage

Verify: 8 tracks playable, failover skips dead tracks, custom URL works.

### 2.2 F7: Terminal session visibility
**Files:** `bridge/index.js`, `bridge/server.js`, `bridge/config.js`

- Check tmux available on startup
- `tmux new-window -t 0 -n loficlaude-claude`
- Send `claude -p --output-format stream-json` to that window
- 1s polling: `tmux capture-pane -t <target> -p -S -<offset>` for incremental output
- Parse lines as JSON events → forward via WebSocket
- Frontend user_message → `tmux send-keys -t <target> "<text>" C-m`
- On bridge exit: leave tmux window alive (don't kill it)
- If tmux unavailable: fallback to direct spawn (current behavior)

Verify: `node bridge/index.js` creates tmux window. Terminal input shows in browser. Browser input shows in terminal.

## Milestone 3: Forms (P2)

### 3.1 F6: Form consolidation (13 → 8)
**Files:** `src/canvas/claudepixForms.js`

- REMOVE: dance_sway, dance_bounce, dance_sway_dj, dance_bounce_dj, expression_surprise, expression_wink, idle_blink
- KEEP: idle_breathe, idle_look_around, work_coding, work_think, dance_djmix, expression_sleep
- ADD: nap (趴在桌上睡, 4+ frames), journal (写笔记本, 4+ frames)
- Update FORM_NAMES and all form index references

Verify: Triple-click cycles 8 forms. nap and journal have unique baseRows (not standard standing pose).

## Global Verification
```bash
npm test        # all passing
npm run build   # clean build
git log --oneline -3  # one commit per milestone
```
