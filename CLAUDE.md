# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build
- `npm test` or `npm run test` — Run tests with Node's built-in test runner (node:test, no assertion library needed)
- `node bridge/index.js` — Start local Claude bridge server (port 9120, token printed at startup)

## Architecture

LoFiClaude is an immersive pixel-art lofi ambient room app. **Svelte 5 SPA**, no router.

**Stack:** Svelte 5 (`mount()` API) + Vite + Canvas 2D + Web Audio API + YouTube iframe API

Current document authority is `docs/LoFiClaude_PRODUCT_DIRECTION.md` -> `docs/LoFiClaude_PRD_V1.1.0.md` -> `docs/ARCHITECTURE.md` -> root `HANDOFF.md`. Files under `archive/` are historical.

### State management

`src/stores/appState.js` — All app state lives in Svelte writable stores, grouped:
- `player` — YouTube playback (isPlaying, currentTrackIndex, isLoading, error)
- `rain` — Rain sound (volume 0-100, type: light/medium/heavy, muted)
- `scene` — Canvas scene (current: lofiNight/softRain/starDrift, locked, transitionProgress)
- `timer` — Sleep timer (active, minutes, remainingSeconds)
- `claude` — Companion state (mood, bubble visibility, position, direction, bubbleAnchor)
- `ui` — Transient UI (popover open states, idleSince, shortcutVisible)
- `uiMode` — derived from idle detection: default/focus/interactive/companion/sleep
- `claudeForm` — Current claudepix form index (0-12)

Room, rain, scene, focus, and bounded chat history persist to LocalStorage. The Bridge token persists only for the current browser session in SessionStorage.

### Canvas rendering (src/canvas/)

Two separate Canvas systems that layer together:

1. **`asciiRenderer.js` + `asciiScenes.js`** — Background scene. Renders dot-matrix objects (windows, desks, planets, city skylines, clouds, lamps) using seeded pseudo-random placement. Three scenes defined as data in `asciiScenes.js`. 5-layer architecture: base fill → far sky → skyline → particles → foreground. One-second crossfade between scenes.

2. **`ambientParticles.js`** — Particle systems per scene (rain for softRain, stars for lofiNight, stars+meteors for starDrift). Updated in the animation loop.

3. **`spriteFrames.js`** — Original 8-mode sprite system (idle/walk/talk/sleep/thinking/working/blocked/happy). 24×24 grid, 4x pixel scale. Each mode has 2 animation frames. Used for walk animation and fallback rendering.

4. **`claudepixForms.js`** — Enhanced expressive form system, 13 presets with multi-frame animation. Each form has a base grid + timed frame sequence + optional custom palette. Used when Claude is not walking. `src/canvas/claudepixForms.js` contains the raw preset data (~700 lines).

5. **`claudeMotion.js`** — Walk behavior controller. Claude navigates within walk bounds, alternating between idle (5-12s) and walk-to-random-target states. Speed 34px/s.

### DOM Claude sprite (`src/components/ClaudeSprite.svelte`)

Renders a 24×24 canvas element positioned absolutely via `translate3d`. Uses `claudeMotion.js` for walk logic and either `spriteFrames.js` (walking) or `claudepixForms.js` (stationary) for frame rendering. Supports triple-click to cycle forms. Dispatches `activate` (single/double click) and `formchange` (triple click) events.

### Audio system (`src/audio/`)

- **`YouTubePlayer.js`** — Wraps YouTube iframe API. 5-track base playlist plus local custom tracks, auto-skips on error/end. `loadYouTubeApi()` does the global script injection + Promise-based init.
- **`RainPlayer.js`** — Web Audio pink-noise rain with light/medium/heavy filter and gain presets. The app defaults to this local source; an explicit remote mode retains automatic fallback. `fadeOut(ms)` suspends output after timer end and can resume the existing source.

### AI companion (`src/ai/ClaudeChat.js`)

Direct fetch to Anthropic API (`claude-3-5-haiku-latest`). Falls back to Chinese ambient phrases when no API key or on error. System prompt: "calm ambient companion, reply in concise Chinese." Context includes current track, scene, rain volume.

### Orchestration (`src/utils/`)

- **`claudeOrch.js`** — Claude chat orchestrator. Manages bubble/panel state, Bridge status, seven companion states, ambient comments, and 7-day/50-entry local history with a public clear action.
- **`session.js`** — 1-second interval controller. Tick: decrements timer, detects idle (5s threshold), rotates scene every 5 min.
- **`audioInit.js`** — Lazy initializes YouTubePlayer + RainPlayer, returns getPlayers().
- **`keyboard.js`** — Global keydown listener, skips when typing in input/textarea.

### Local bridge (`bridge/`)

Node.js WebSocket bridge that connects local Claude Code CLI to the browser companion.

- `bridge/index.js` bootstraps token auth and lifecycle handling.
- `bridge/server.js` manages socket auth, `user_message` routing, and `status/assistant_delta/tool_running/error` events.
- `bridge/claude.js` runs Claude in `--input-format stream-json --output-format stream-json` mode, streaming assistant deltas and tool activity back to the UI.

### Components (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `AsciiBackground.svelte` | Canvas loop, scene rendering + crossfade |
| `ClaudeSprite.svelte` | Claude pixel character + motion + form animation |
| `ClaudeBubble.svelte` | Speech bubble (passive/active) |
| `ClaudeChatPanel.svelte` | Multi-turn chat panel |
| `AmbientHeader.svelte` | Top bar: logo, scene icon, timer |
| `MiniPlayer.svelte` | Bottom music player bar |
| `ExpandedPlayer.svelte` | Expanded player on mini player click |
| `RainPopover.svelte` | Rain volume/type control |
| `TimerPopover.svelte` | Sleep timer selection |
| `ScenePopover.svelte` | Scene switcher + lock |
| `KeyboardHint.svelte` | Keyboard shortcuts overlay |
| `ConnectionStatus.svelte` | Local bridge connection indicator |

### Design constraints

- Canvas occupies ≥80% of screen
- Default visible clickable buttons ≤6
- Mini player height ≤10% of screen
- Popover max width 320px, Claude bubble max 280px
- UI opacity drops to 0.25 after 5s idle (focus mode)

### Testing

Tests use Node's built-in `node:test` and `node:assert`:
```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
```
No testing framework (Jest/Vitest) is installed. Run with `npm test`.
