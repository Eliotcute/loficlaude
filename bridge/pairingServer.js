const http = require('node:http');

function isLoopbackOrigin(origin) {
  if (!origin) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function createPairingServer({ host = '127.0.0.1', port, tokenManager }) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('pairing server port is required');
  }
  if (!tokenManager || typeof tokenManager.token !== 'string' || !tokenManager.token) {
    throw new Error('pairing server token manager is required');
  }

  const server = http.createServer((request, response) => {
    const origin = request.headers.origin;
    if (!isLoopbackOrigin(origin)) {
      response.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Origin not allowed' }));
      return;
    }

    if (request.method !== 'GET' || request.url !== '/token') {
      response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const headers = {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff'
    };
    if (origin) {
      headers['access-control-allow-origin'] = origin;
      headers.vary = 'Origin';
    }
    response.writeHead(200, headers);
    response.end(JSON.stringify({ token: tokenManager.token }));
  });

  return {
    server,
    start(callback = () => {}) {
      server.listen(port, host, callback);
    },
    close(callback = () => {}) {
      if (!server.listening) {
        callback();
        return;
      }
      server.close(callback);
    }
  };
}

module.exports = { createPairingServer, isLoopbackOrigin };
