const crypto = require('node:crypto');

function createToken() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

function createTokenManager() {
  const token = createToken();

  return {
    token,
    verify(candidate) {
      return typeof candidate === 'string' && candidate.length > 0 && candidate === token;
    }
  };
}

module.exports = {
  createTokenManager
};
