# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build
- `npm test` or `npm run test` — Run tests with Node's built-in test runner (node:test, no assertion library needed)
- `npm run bridge` or `loficlaude bridge` — Start local Claude bridge (`ws://localhost:9120`, loopback pairing/management `http://127.0.0.1:9121`)
- `loficlaude chat` — Join the Bridge's shared Claude session from a terminal via the private Unix socket

## Architecture

LoFiClaude is an immersive pixel-art lofi ambient room app. **Svelte 5 SPA**, no router.

**Stack:** Svelte 5 (`mount()` API) + Vite + Canvas 2D + Web Audio API + YouTube iframe API

Current document authority is `docs/LoFiClaude_PRODUCT_DIRECTION.md` -> `docs/LoFiClaude_PRD_V1.1.0.md` -> `docs/ARCHITECTURE.md` -> root `HANDOFF.md`. Files under `archive/` are historical.

### State management

`src/stores/appState.js` — All app state lives in Svelte writable stores, grouped:
- `player` — YouTube playback (isPlaying, currentTrackIndex, isLoading, error)
- `rain` — Rain sound (volume 0-100, type: light/medium/heavy, muted)
- `scene` — Canvas scene (keys from `asciiScenes.js`, locked, transitionProgress)
- `timer` — Sleep timer (active, minutes, remainingSeconds)
- `claude` — Companion state (mood, bubble visibility, position, direction, bubbleAnchor)
- `ui` — Object of writables (popover open states, idleSince, shortcutVisible). Not itself a store; never `$ui.xxx` in templates.
- `uiMode` — derived from idle detection: default/focus/interactive/companion/sleep
- `claudeForm` — Current claudepix form index (0-12)

Room, rain, scene, focus, and bounded chat history persist to LocalStorage. The Bridge token persists only for the current browser session in SessionStorage.

### Canvas rendering (src/canvas/)

Two separate Canvas systems that layer together:

1. **`asciiRenderer.js` + `asciiScenes.js`** — Background scene. Renders dot-matrix objects (windows, desks, planets, city skylines, clouds, lamps) using seeded pseudo-random placement. Scenes are a single catalog in `asciiScenes.js` (key, label, icon, objects, particles). 5-layer architecture: base fill → far sky → skyline → particles → foreground. One-second crossfade between scenes.

2. **`ambientParticles.js`** — Particle systems per scene (rain for softRain, stars for lofiNight, stars+meteors for starDrift). Updated in the animation loop.

3. **`spriteFrames.js`** — Original 8-mode sprite system (idle/walk/talk/sleep/thinking/working/blocked/happy). 24×24 grid, 4x pixel scale. Each mode has 2 animation frames. Used for walk animation and fallback rendering.

4. **`claudepixForms.js`** — Enhanced expressive form system, 13 presets with multi-frame animation. Each form has a base grid + timed frame sequence + optional custom palette. Used when Claude is not walking. `src/canvas/claudepixForms.js` contains the raw preset data.

5. **`claudeMotion.js`** — Walk behavior controller. Claude navigates within walk bounds, alternating between idle (5-12s) and walk-to-random-target states. Speed 34px/s.

### DOM Claude sprite (`src/components/ClaudeSprite.svelte`)

Renders a 24×24 canvas element positioned absolutely via `translate3d`. Uses `claudeMotion.js` for walk logic and either `spriteFrames.js` (walking) or `claudepixForms.js` (stationary) for frame rendering. Supports triple-click to cycle forms. Dispatches `activate` (single/double click) and `formchange` (triple click) events.

### Audio system (`src/audio/`)

- **`YouTubePlayer.js`** — Wraps YouTube iframe API. 5-track base playlist plus local custom tracks, auto-skips on error/end. `loadYouTubeApi()` does the global script injection + Promise-based init.
- **`RainPlayer.js`** — Streams the bundled `/0.m4a` rain recording with light/medium/heavy gain/filter presets; Web Audio pink noise is the fallback when the file fails. `fadeOut(ms)` suspends output after timer end and can resume the existing source.

### AI companion (`src/ai/ClaudeChat.js`)

Provides local ambient fallback replies only. Browser code never sends conversation text or credentials directly to the Anthropic API; real Claude responses flow through the authenticated local Bridge.

### Orchestration (`src/utils/`)

- **`claudeOrch.js`** — Claude chat orchestrator. Manages bubble/panel state, Bridge status, seven companion states, ambient comments, and 7-day/50-entry local history with a public clear action.
- **`session.js`** — 1-second interval controller. Tick: decrements timer, detects idle (5s threshold), rotates scene every 5 min.
- **`audioInit.js`** — Lazy initializes YouTubePlayer + RainPlayer, returns getPlayers().
- **`keyboard.js`** — Global keydown listener, skips when typing in input/textarea.

### Local bridge (`bridge/`)

Node.js WebSocket bridge that connects local Claude Code CLI to the browser companion.

- `bridge/index.js` bootstraps token auth, the private Unix Socket, persisted session state, loopback pairing HTTP, and lifecycle handling.
- `bridge/server.js` manages socket auth, bounded event replay, shared browser/terminal routing, and `status/assistant_delta/tool_running/error` events.
- `bridge/claude.js` runs one serialized Claude CLI session in `--input-format stream-json --output-format stream-json` mode, streaming assistant deltas and tool activity back to the UI.
- `bridge/sessionState.js` persists only the Claude session id in `~/.config/loficlaude/` (0700) so restarts and reboots resume the same conversation; a legacy temp-dir file is migrated once. Model defaults to the `sonnet` alias, override with `LOFICLAUDE_MODEL`.
- `room_state` snapshots are sent live via `broadcastTransient` and never enter the replay history; music state is deduplicated and background polling stops while `ncm-cli` is missing. The Bridge token rotates per server process; set `LOFICLAUDE_RESET_SESSION=1` for an explicit conversation reset.

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
| `ConnectionStatus.svelte` | Local bridge connection indicator and opt-in phone pairing QR |

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
