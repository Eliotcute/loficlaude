# LoFiClaude

LoFiClaude is a local ambient room with a pixel Claude companion, lofi playback, rain audio, and a WebSocket bridge to a local Claude CLI session.

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

The bridge listens on `ws://localhost:9120`.

## Connect

1. Start the room.
2. Start the bridge server.
3. Enter the bridge token in the header.
4. Click `Connect`.

When connected, chat input unlocks and Claude streams responses through the bridge.

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

Rain files must exist in `public/`:

- `rain-light.mp3`
- `rain-medium.mp3`
- `rain-heavy.mp3`

Audio and the YouTube iframe are initialized only after a user gesture. `Start room` is the intended first gesture.

## Troubleshooting

- Header shows `bridge disconnected`:
  start `bridge/` with `npm start`, then reconnect.
- Token rejected:
  verify the token expected by the bridge server.
- Chat input disabled:
  the bridge is not connected yet.
- No rain audio:
  check that the rain files exist under `public/`.
- No Claude API key:
  ambient fallback text still works, but bridge mode is the primary path.
