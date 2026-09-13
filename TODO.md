# TODO

## P0: Correctness And Isolation
- [x] Store playlist choices per browser connection.
- [x] Keep Claude text-only and record Bridge rule-based routing accurately.
- [x] Verify private candidate delivery, concurrent searches, cancellation, stale statuses and terminal text-only boundary (26 targeted tests pass).
- [x] Prevent negated/unrelated chat from triggering music commands.

## P1: Shared State And Verification
- [x] Derive scene names, icons, picker order and particles from one catalog.
- [x] Test every catalog entry through persistence and particle generation.
- [x] Validate CLI business results, playlist IDs and actual playback state; add six controller regressions.
- [x] Complete server/client callback integration and independent music feedback tests.
- [x] Make music feedback/candidates visible independently of stale Claude reply text.
- [x] Reconcile README, PRD, release audit and architecture documentation.
- [x] Verify 5 music choices and rain particles at 1440x900, 768x1024, 375x812 in isolated Chromium; no page errors or horizontal overflow.

## P2: Continuity And Handoff
- [x] Persist the last confirmed playlist metadata locally; restore only on explicit click, never autoplay on reload.
- [x] Verify 11 scenes, 13 form options, real form pixel change, patrol and drag/fall; stable background does not repaint every frame.
- [x] Protect local music state from late YouTube callbacks and new chat from stale ritual timers.
- [x] Mark historical logs as non-authoritative; keep current status in HANDOFF/TODO.
- [x] Final validation (2026-09-06 snapshot): 152 tests pass, 0 fail/skip; build, verify:build, diff checks and sequential browser QA pass. That count is historical. Current count lives in HANDOFF.md.

## 2026-09-12 Mount And CI
- [x] Bind `ui.bridgeSettingsOpen` so the room mounts (no `$ui.xxx`).
- [x] Keep `ENABLE_YOUTUBE_AUDIO` aligned with default `youtube` provider.
- [x] Shrink loopback `GET /token` to `{ token }`.
- [x] `RainPlayer.stop()` suspends Web Audio fallback; presets resume.
- [x] Last authenticated browser client starts orphan `music.close()` after 3s.
- [ ] `npm run qa:browser` on a working Playwright Chrome (environment, not a missing Start room).
- [x] Phone pairing: query token, Safari-tolerant LAN WS upgrade, prefer en0 IPv4.
- [ ] Phone pairing live scan on the same Wi-Fi as the QR IP.

## User Acceptance (Not Claimed Complete)
- [ ] Real ncm-cli listening, search and playback controls; real Claude session continuity.
- [ ] Safari, Firefox, physical devices and long-session thermal/power behavior.
- [ ] Audio usage rights before any public release.

## Later Roadmap (Outside This Goal)
- Weekly focus statistics and semantic scene mapping.
