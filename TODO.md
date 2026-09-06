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
- [ ] Persist the user's last selected playlist locally without credentials.
- [ ] Verify scene/companion behavior without expanding renderer dependencies.
- [ ] Mark historical logs as non-authoritative; keep current status in HANDOFF/TODO.
- [ ] Final test/build/verify:build/diff checks and phase completion record.
