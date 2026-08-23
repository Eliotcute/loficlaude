import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { createPairingServer } from '../bridge/pairingServer.js';

function request(port, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, ...options }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ statusCode: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function startPairing(t, pairing) {
  const started = await new Promise((resolve, reject) => {
    pairing.server.once('listening', () => resolve(true));
    pairing.server.once('error', (error) => {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        resolve(false);
        return;
      }
      reject(error);
    });
    pairing.start();
  });
  if (!started) {
    t.skip('HTTP pairing unavailable in this environment');
  }
  return started;
}

test('pairing endpoint returns the in-memory token for loopback origins', async (t) => {
  const pairing = createPairingServer({
    port: 0,
    tokenManager: { token: 'local-token' }
  });
  if (!await startPairing(t, pairing)) {
    return;
  }
  t.after(() => pairing.close());

  const port = pairing.server.address().port;
  const response = await request(port, {
    path: '/token',
    headers: { origin: 'http://127.0.0.1:5173' }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { token: 'local-token' });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['access-control-allow-origin'], 'http://127.0.0.1:5173');
});

test('pairing endpoint rejects non-loopback browser origins', async (t) => {
  const pairing = createPairingServer({ port: 0, tokenManager: { token: 'local-token' } });
  if (!await startPairing(t, pairing)) {
    return;
  }
  t.after(() => pairing.close());

  const response = await request(pairing.server.address().port, {
    path: '/token',
    headers: { origin: 'https://example.com' }
  });

  assert.equal(response.statusCode, 403);
});
