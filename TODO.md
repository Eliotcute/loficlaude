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
- [ ] Complete server and frontend integration coverage (existing tests do not prove this).
- [ ] Make music feedback/candidates visible independently of stale Claude reply text.
- [ ] Reconcile README, PRD, release audit and architecture documentation.
- [ ] Verify scene picker and music choices visually in desktop/mobile layouts.

## P2: Continuity And Handoff
- [ ] Persist the user's last selected playlist locally without credentials.
- [ ] Verify scene/companion behavior without expanding renderer dependencies.
- [ ] Mark historical logs as non-authoritative; keep current status in HANDOFF/TODO.
- [ ] Final test/build/verify:build/diff checks and phase completion record.
