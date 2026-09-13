const crypto = require('node:crypto');

function createToken() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

function createTokenManager(existingToken) {
  const token = typeof existingToken === 'string' && existingToken ? existingToken : createToken();

  return {
    token,
    verify(candidate) {
      if (typeof candidate !== 'string') {
        return false;
      }

      const candidateBuffer = Buffer.from(candidate);
      const tokenBuffer = Buffer.from(token);
      return candidateBuffer.length === tokenBuffer.length && crypto.timingSafeEqual(candidateBuffer, tokenBuffer);
    }
  };
}

module.exports = {
  createTokenManager
};
