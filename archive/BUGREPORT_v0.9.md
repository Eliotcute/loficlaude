# v0.9 Acceptance — Bug Report

CTO review: 2026-05-21. Found during browser acceptance testing.

## BUG-1 [P0]: Bridge tmux execFileSync blocks event loop

**File:** `bridge/index.js`
**Root cause:** `execFileSync` is synchronous and blocks the Node.js event loop. The bridge polls tmux pane every 1s with `execFileSync('tmux', ['capture-pane', ...])`. Each call blocks for ~200-500ms. During that time, WebSocket messages are not processed. When `sendUserMessage` sends via `execFileSync('tmux', ['send-keys', ...])`, the entire bridge freezes.

**Symptom:** User sends message → frontend loading=true → bridge never responds → loading stays true forever → input disabled

**Fix:**
1. Replace all `execFileSync` with `execFile` (async) for capture-pane polling and send-keys
2. Use callback pattern: `execFile('tmux', args, { timeout: 5000 }, (err, stdout) => { ... })`
3. For capture-pane: store lastLineCount, diff each poll, forward new JSON lines to handlers
4. For send-keys: chain via callbacks (send payload → on success → send Enter)
5. For startup checks (list-sessions, list-windows): keep execFileSync (runs once at boot)
6. Add 60s timeout: if no response within 60s of sendUserMessage, emit error

**Workaround applied:** `config.js` tmuxEnabled set to false. Bridge falls back to direct `spawn('claude', ...)`.

**Files to fix:** `bridge/index.js`
- `runTmux()` → async (returns Promise or uses callbacks)
- `sendUserMessage()` → use async execFile with callbacks
- `pollTimer` → use async execFile with callbacks

## BUG-2 [P1]: Loading state persists across page reloads

**File:** `src/utils/claudeOrch.js`
**Symptom:** After bridge disconnect + page reload, `loading: true` persisted. Chat input disabled, send button shows "..."
**Root cause:** `loading` is in `state` (not Svelte store). If the history is restored from localStorage but `loading` isn't reset, old state carries over.
**Fix:** In `restoreHistory()` or `onMount`, always set `state.loading = false`. Loading is transient UI state, should never persist.

## BUG-3 [P2]: Claude sprite not clickable in headless browser

**File:** `src/components/ClaudeSprite.svelte`
**Symptom:** `document.querySelector('[class*="claude-sprite"]')` found element but browser snapshot tool can't interact with it.
**Likely cause:** The sprite is a `<div>` with `position: absolute` inside a `<section>` with Canvas. The "Start room" overlay intercepts pointer events.
**Fix:** Not urgent for headless testing. Manual browser testing works fine.

## Feature Verification Summary

| Feature | Status | Notes |
|---------|--------|-------|
| F1: 8 music channels | ⚠️ | Code written, can't fully test (YouTube iframe play in headless) |
| F2: Custom URL button | ✅ | "Add custom YouTube stream" button visible |
| F3: Walk pause | ⚠️ | Code written, can't test sprite interaction headless |
| F4: Chat history in panel | ✅ | User messages visible, bilateral display works |
| F4: Bubble→panel progression | ⚠️ | Can't test (BUBBLE-1 blocks sprite click) |
| F5: Typewriter cursor | ⚠️ | Can't verify (BUBBLE-1 blocks streaming test) |
| F6: 8 unique forms | ✅ | Tests confirm: 8 presets, nap+journal have unique base grids |
| F7: Tmux terminal session | ❌ | BUG-1 blocks this entirely |

## Verdict

**BLOCKED on BUG-1 and BUG-2.** M1 code is correct but can't be fully verified due to sprite click issue in headless. M2 tmux needs async rewrite. M3 forms are verified via tests.

**Recommendation:** Codex fixes BUG-1 and BUG-2, then we re-run full acceptance.
