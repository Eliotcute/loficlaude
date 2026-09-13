const crypto = require('node:crypto');

function createPairingManager({ ttlMs = 5 * 60 * 1000, now = () => Date.now(), onRevoke = () => {} } = {}) {
  let active = null;
  const sessions = new Map();
  const digestOf = token => crypto.createHash('sha256').update(token).digest('hex');
  function createSession() {
    const token = crypto.randomBytes(32).toString('base64url');
    sessions.clear();
    sessions.set(digestOf(token), now() + 8 * 60 * 60 * 1000);
    return token;
  }
  function verifySession(token) {
    if (typeof token !== 'string' || token.length !== 43) return false;
    const digest = digestOf(token);
    const expires = sessions.get(digest);
    if (!expires || now() >= expires) { sessions.delete(digest); return false; }
    return true;
  }
  function issue() {
    const token = crypto.randomBytes(32).toString('base64url');
    active = { digest: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: now() + ttlMs };
    return { token, expiresAt: active.expiresAt };
  }
  function consume(token) {
    if (!active || typeof token !== 'string' || now() >= active.expiresAt) { active = null; return false; }
    const digest = crypto.createHash('sha256').update(token).digest('hex');
    const ok = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(active.digest));
    if (ok) active = null;
    return ok;
  }
  return { issue, consume, createSession, verifySession, revoke: () => { active = null; sessions.clear(); onRevoke(); }, getState: () => active ? { expiresAt: active.expiresAt } : null };
}

module.exports = { createPairingManager };
