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

In a second terminal:

```bash
cd bridge
npm install
npm start
```

The bridge listens on `ws://localhost:9120`. It keeps one Claude CLI conversation across browser reconnects and Bridge restarts, while generating a new Bridge token for every server process. Start it with `LOFICLAUDE_RESET_SESSION=1 npm start` when you intentionally want a new Claude conversation.

## Connect

1. Start the room.
2. Start the bridge server.
3. Open the bridge settings button in the header.
4. Enter the bridge token.
5. Click `Connect`.

When connected, Claude streams responses through the bridge. Without the bridge, the room and local companion chat remain available.

## Shortcuts

- `Space`: play or pause
- `←` / `→`: previous or next track
- `↑` / `↓`: rain volume
- `M`: mute rain
- `1` / `2` / `3`: switch scene
- `T`: timer
- `H`: shortcut hint
- `Esc`: close transient UI

## Audio

The room initializes YouTube lofi playback and local Web Audio rain only after a user gesture. `Start room` is the intended first gesture.

Local generated rain is the V1.1 default because authorization for the remote source is not confirmed. `RainPlayer` retains an explicit remote mode with automatic local fallback for testing and future authorized use. Rain intensity changes the effective gain and filter shape.

## Troubleshooting

- Header shows `bridge disconnected`:
  start `bridge/` with `npm start`, then reconnect.
- Token rejected:
  verify the token expected by the bridge server.
- Bridge chat unavailable:
  local companion chat still works; start `bridge/` and reconnect for Claude CLI streaming.
- No rain audio:
  set rain volume above 0, then retry Start room; the local Web Audio source requires a user gesture.
- Bridge is not running:
  ambient fallback text still works without browser API credentials; the Bridge remains an optional enhancement for Claude CLI streaming.
