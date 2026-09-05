# LoFiClaude

LoFiClaude is a local ambient room with a pixel Claude companion, lofi playback, rain audio, and a WebSocket bridge to a local Claude CLI session.

Current product and implementation documents are indexed in [`docs/README.md`](docs/README.md). The system diagram is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What

- Svelte 5 + Vite single-screen room
- Local bridge in `bridge/` for authenticated Claude CLI streaming
- Streaming assistant deltas and tool activity in the UI
- User-gesture-gated audio startup for browser autoplay compliance

## Run room

```bash
npm install
npm run dev
```

Open the Vite URL, then click `Start room`.

## Run bridge

Install the local command once from the project directory:

```bash
npm install --prefix bridge
npm link
```

Then, from any terminal directory, start the Bridge with:

```bash
loficlaude bridge
```

The command resolves the Bridge from the installed LoFiClaude project, so the terminal's current directory and the project's absolute path do not matter. The equivalent project-local command is `npm run bridge`.

The bridge listens on `ws://localhost:9120` and exposes a loopback-only pairing endpoint on `http://127.0.0.1:9121/token`. When the room is opened on the same machine, it discovers the running Bridge and connects automatically; the token is never placed in the URL and is retained only in the current browser session. The token is also printed once to the local terminal as a manual fallback. Start it with `LOFICLAUDE_RESET_SESSION=1 loficlaude bridge` when you intentionally want a new Claude conversation.

## Connect

1. Start the room.
2. Start the bridge server.
3. The room automatically discovers the local Bridge and connects.
4. If auto-discovery is unavailable, open Bridge settings and enter the one-time token printed by the Bridge.

When connected, Claude streams responses through the bridge. Without the bridge, the room and local companion chat remain available.

### Bridge permission boundary

The Bridge starts Claude CLI in the project root with non-interactive `-p` mode, explicit `--permission-mode dontAsk`, and `--tools ""`. This is a text-only conversation boundary: Claude cannot read project files, edit files, run shell commands, or invoke built-in tools through the Bridge. Non-interactive mode skips the workspace trust prompt, but no project tool is available to use. Treat the Bridge token as a local capability and only connect from a trusted browser on the same machine.

## Shortcuts

- `Space`: play or pause
- `←` / `→`: previous or next track
- `↑` / `↓`: rain volume
- `M`: mute rain
- `1` / `2` / `3` / `4` / `5` / `6`: switch scene
- `T`: timer
- `H`: shortcut hint
- `Esc`: close transient UI

## Audio

V1.1 release decision: YouTube lofi playback is enabled after user gesture. If the station fails or times out, rain remains available independently and the player exposes a retryable music error. Rainy Mood rain and its local fallback remain available as the independent rain path.

The room initializes YouTube lofi playback and real Rainy Mood rain audio only after a user gesture. `Start room` is the intended first gesture.

Rainy Mood is the default rain source. If the remote audio fails, `RainPlayer` switches to local Web Audio fallback so the room remains usable. Rain intensity changes the effective gain and filter shape. Confirm Rainy Mood usage rights before public distribution.

## Troubleshooting

- Header shows `bridge disconnected`:
  run `loficlaude bridge`, then reconnect.
- Token rejected:
  verify the token expected by the bridge server.
- Bridge chat unavailable:
  local companion chat still works; start `loficlaude bridge` and reconnect for Claude CLI streaming.
- No rain audio:
  set rain volume above 0, then retry Start room; the local Web Audio source requires a user gesture.
- Bridge is not running:
  ambient fallback text still works without browser API credentials; the Bridge remains an optional enhancement for Claude CLI streaming.
