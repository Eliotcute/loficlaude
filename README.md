# LoFiClaude

LoFiClaude is a local ambient room with a pixel Claude companion, lofi playback, rain audio, and a WebSocket bridge to a local Claude CLI session.

Current product and implementation documents are indexed in [`docs/README.md`](docs/README.md). The system diagram is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What

- Svelte 5 + Vite single-screen room
- Local bridge in `bridge/` for authenticated Claude CLI streaming
- Streaming text replies with local companion states
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

Configure the optional local NetEase provider with one command:

```bash
loficlaude music setup
```

This forwards to the official `ncm-cli configure` wizard. Credentials remain in the CLI's local configuration and are never bundled into the browser.

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

YouTube lofi playback is enabled after a user gesture when using browser playback. Music and rain report independent states; a music failure never blocks rain startup.

Browser audio starts only after a user gesture. `Start room` is the intended first gesture.

The bundled `public/0.m4a` is the default rain source. Rainy Mood remains an optional remote source when configured. If the selected audio fails, `RainPlayer` keeps the room usable with its local fallback path. Rain intensity changes the effective gain and filter shape.

When the local Bridge is connected, the player controls the local NetEase Music `mpv` session. Configure and log into `ncm-cli` first. A CLI failure is reported, not silently replaced with YouTube playback. Without a Bridge connection, the controls use YouTube.

The Bridge lazily starts `ncm-cli tui` behind a hidden macOS `script` pseudo-terminal before the first NetEase playback command. This keeps the CLI's required player service alive without asking users to open a second terminal. The service is stopped with the Bridge; Linux and other platforms report an explicit local-player-unavailable state instead of pretending playback started.

### Conversation and music

Music requests are parsed by conservative Bridge rules, not Claude tool calling. Claude receives the original text for conversation continuity but has no command execution tools. Only fixed, validated music actions reach `ncm-cli`.

Search with `播放 lofi`. Multiple matches require a numbered selection (`播放第 2 个`); one match can start directly. Candidate lists belong to the requesting browser connection and expire on reconnect. The actual local player is shared, so playback changes are visible to every connected browser.

The bubble keeps music feedback separate from Claude replies. Confirmed playlists are remembered locally using only their IDs and name; refresh restores a recent-playlist button but never starts playback. With an empty local player, the play button restores the recent playlist or searches for `lofi`. Browser audio is not initialized before the first gesture, and a connected local provider does not create a competing YouTube player.

Current execution evidence and remaining checks live in `HANDOFF.md` and `TODO.md`. Older audit text and session logs are historical, not an active backlog. Local validation is `npm test`, `npm run build`, and `npm run verify:build`; remote CI is outside this product's current scope.

`npm run qa:browser` runs the scene and music UI checks sequentially in isolated Chromium browsers, saving screenshots in ignored `output/playwright/`. Start the local room first. This optional check uses an existing Playwright installation: set `PLAYWRIGHT_MODULE` to its module entry when it is supplied by your tooling, and `QA_BASE_URL` if the room uses another port. No Playwright dependency is added to the product. The music check uses a test Bridge and never invokes real Claude or ncm-cli; it is not a substitute for real listening and session acceptance.

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
