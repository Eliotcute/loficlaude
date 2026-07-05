# UI Audit Fixes — v0.9 Hotfix

## Problem Summary

1. Chat panel covered by player drawer (z-index conflict)
2. Claude sprite keeps walking when user clicks to chat
3. Bridge streaming not delivering responses
4. UI layer hierarchy broken

## Z-Index Hierarchy Fix

```
Layer 20 — ClaudeChatPanel     (highest floating dialog)
Layer 19 — ClaudeBubble        (snaps above MiniPlayer)
Layer 5  — MiniPlayer          (player bar)
Layer 5  — ExpandedPlayer      (player drawer)
Layer 4  — AmbientHeader       (top bar)
Layer 1  — Canvas scene        (background)
```

**Files:**
- `src/components/MiniPlayer.svelte`: z-index 8 → 5
- `src/components/ExpandedPlayer.svelte`: inner z-index 8 → 5
- `src/components/ClaudeBubble.svelte`: z-index 9 → 19

## ChatPaused on Claude Click

**File:** `src/utils/claudeOrch.js`, `handleClick()`

Add `setChatPaused(true)` at the start of `handleClick()` so Claude stops walking immediately when the user initiates conversation.

## Bridge Streaming Verification

**File:** `bridge/index.js` (already fixed by Codex with async rewrite)

Verify: `node bridge/index.js` starts, connects, user_message → assistant_delta events flow back via WebSocket. If `tmuxEnabled: false` in config, direct `spawn('claude', ...)` path must work.

## Chat Panel Position Fix

**File:** `src/components/ClaudeChatPanel.svelte`

Current: `top: 80px; right: 20px` — fixed position regardless of viewport
Fix: `top: max(80px, calc(100vh - 380px)); right: 20px; max-height: calc(100vh - 120px)` — panel stays visible, scrolls internally for long conversations

## Verification
```bash
npm run build   # clean
npm test        # 5/5
```
