# v1.0 UI Regression Fix

3 bugs found during live testing.

## BUG-1 [P0]: No chat dialog after bridge connect

**Symptom:** Bridge connected, Claude sprite visible, clicking Claude does nothing. No bubble appears.

**Root cause:** `claudeOrch.handleClick()` is async (calls `await showAmbientComment`). During the await, `refreshClaudeState()` hasn't been called yet so the UI doesn't update. But more importantly: if `showAmbientComment` returns empty text (ClaudeChat API key missing or Anthropic API fails), the function returns `state` without setting `bubbleVisible`. The `handleClick` then proceeds to set `bubbleVisible: true` AFTER the failed ambient comment, but the flow is:
```
closePanel() → sync(bubbleVisible=false)
→ showAmbientComment → if fails, might not re-set bubbleVisible
→ sync(bubbleVisible=true)
```

**Actual root cause (more likely):** `handleClick` first calls `closePanel()` which syncs `bubbleVisible: false`. Then it syncs `bubbleVisible: true`. But `refreshClaudeState()` is called AFTER handleClick in `handleClaudeActivate`. If the first call to `closePanel()` fires `onBubbleVisible(false)` and sets the Svelte store to false, the subsequent `sync({bubbleVisible: true})` fires `onBubbleVisible(true)` — this should work.

**Most likely root cause:** The `canvas-zone` section has `overflow: hidden` or the ClaudeSprite z-index (6) conflicts with something. Let me check: ClaudeSprite is inside `<section class="canvas-zone">` — this section might clip the bubble if it's rendered inside.

Wait, the bubble IS rendered outside the canvas-zone (in App.svelte template, after `</section>`). So it shouldn't be clipped.

**Actual actual root cause:** `claudeOrch.js` line 52: `bubbleVisible: false` is the initial state. When `handleClick()` is called, it calls `closePanel()` FIRST which syncs `bubbleVisible: false, bubblePassive: false`. Then it syncs `bubbleVisible: true`. But the Svelte store `claude.bubbleVisible` is set via `onBubbleVisible` callback. Let me check: `onBubbleVisible: (visible) => claude.bubbleVisible.set(visible)` AND `onPanelVisible: (open) => claude.chatOpen.set(open)`. The bubble uses `claudeBubbleVisible` which is a LOCAL variable set by `refreshClaudeState()`, not the store.

In App.svelte: `claudeBubbleVisible = state.bubbleVisible` — this is a local, not reactive. The template uses `{#if claudeBubbleVisible}` which is reactive through Svelte's assignment tracking. `refreshClaudeState()` reassigns `claudeBubbleVisible` which triggers reactivity. But `handleClaudeActivate` calls `await claudeOrch.handleClick()` then `refreshClaudeState()`. So the refresh should work...

**Fix:** Read the files, identify the actual break, fix it. The most probable cause from the user's screenshot is that the bubble is rendered but behind the canvas or with opacity 0. Check:
1. `ClaudeBubble` z-index is 19 — above canvas
2. `canvas-zone` doesn't have `overflow:hidden`
3. The bubble position might be off-screen

## BUG-2 [P1]: No form switch description on triple-click

**Symptom:** Triple-clicking Claude cycles forms but no bubble shows the form name.

**Root cause:** `handleClaudeFormChange` calls `claudeOrch.showTransientBubble()`. This function sets a 2000ms timer. But `refreshClaudeState()` is called right after, which reads `state.bubbleVisible` — and the transient bubble is set to `bubblePassive: true, bubbleVisible: !state.panelOpen`. If `state.panelOpen` is false (which it is, since closePanel was called), then `bubbleVisible: true`. This should work.

BUT: the transient bubble timer might be being cleared by `closePanel()` which is called at the START of handleClick. Wait, formchange doesn't call handleClick — it's a separate event. Let me check the flow more carefully.

Possible issue: `showTransientBubble` calls `clearTransientBubbleTimer()` which might clear an existing timer, but the NEW timer should fire. The bubble should appear for 2 seconds.

**Fix:** Verify the bubble anchor position is valid (claude.bubbleAnchor must be non-zero). If the Claude sprite hasn't moved yet, `claude.bubbleAnchor` might be {x:0, y:0} — which would place the bubble at the top-left corner.

## BUG-3 [P1]: Claude sprite below player drawer

**Symptom:** Claude sprite hidden behind expanded player drawer. Should always be above player.

**Root cause:** ClaudeSprite z-index is 6. The MiniPlayer was changed from 8 to 5 in hotfix. BUT the ExpandedPlayer has z-index 8 on an inner element (`.expanded-player`). When the player expands, Claude at z-index 6 is BELOW the expanded player at z-index 8.

**Fix:**
1. ClaudeSprite z-index: 6 → 15 (between MiniPlayer at 5 and Bubble at 19)
2. ExpandedPlayer inner z-index: 8 → 7 (below Claude, above everything else)

The position fix: `getPatrolBounds` already adjusts Y based on `playerExpanded`. That part works when `$uiMiniPlayerExpanded` is correctly passed. Verify by checking that `$uiMiniPlayerExpanded` is reactive in ClaudeSprite.

## Fix All Three

### 1. `src/components/ClaudeSprite.svelte`: z-index 6 → 15
### 2. `src/components/ExpandedPlayer.svelte`: inner z-index 8 → 7  
### 3. `src/components/ClaudeBubble.svelte`: verify anchor is valid before rendering
### 4. `src/utils/claudeOrch.js`: after showTransientBubble in handleClaudeFormChange path, ensure bubbleVisible is set
### 5. `src/App.svelte`: verify refreshClaudeState is called correctly

Run `npm test && npm run build` after fixes. Commit: "v1.0 hotfix: UI regressions — dialog, form switch, sprite z-index"