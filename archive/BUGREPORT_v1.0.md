# v1.0 Code Review — Bug Report

## BUG-1 [P1] broadcast() modifies Set during iteration

**File:** `bridge/socketServer.js:85-91`
**Issue:** `for (const client of clients)` loop calls `clients.delete(client)` on line 87. Modifying a Set during iteration causes skipped elements — if client 3 is destroyed and deleted, client 4 may not get the broadcast.
**Fix:** Collect destroyed clients first, delete after loop:
```js
const dead = [];
for (const client of clients) {
  if (client.destroyed) { dead.push(client); continue; }
  client.write(payload);
}
for (const c of dead) clients.delete(c);
```

## BUG-2 [P2] onClientData race: activeSession may be null

**File:** `bridge/index.js:25-32`
**Issue:** `onClientData` calls `activeSession.sendUserMessage(line)`. If a terminal client connects via socat BEFORE the browser completes WebSocket auth, `activeSession` is null. The `!activeSession` guard catches this but broadcasts `[Bridge not connected]` — the terminal user has no way to know when the bridge IS connected. They're stuck.
**Fix:** Queue terminal messages until `activeSession` is available, or broadcast a `[Connected]` message to all socket clients when `activeSession` is set.

## BUG-3 [P3] createBridgeServer throw leaks socket

**File:** `bridge/index.js:54-95`
**Issue:** `createBridgeServer()` is called synchronously after `socketServer.start()`. If `createBridgeServer` throws (e.g., port conflict), `socketServer` is never cleaned up — socket file persists at `/tmp/loficlaude-claude.sock`.
**Fix:** Wrap `createBridgeServer()` in try/catch, call `socketServer.close()` on error.

## Fix all three in this file order:
1. `bridge/socketServer.js` — BUG-1
2. `bridge/index.js` — BUG-2 + BUG-3
3. Run `npm test` + `npm run build`
4. Commit: "v1.0 hotfix: socket broadcast iteration + race condition + cleanup"
