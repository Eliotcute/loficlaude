const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { WebSocketServer } = require('ws');

function isIpv4(item) {
  return item.family === 'IPv4' || item.family === 4;
}

function isPrivateIpv4(address) {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address);
}

function getLanAddress(networkInterfaces = os.networkInterfaces()) {
  const preferred = new Set(['en0', 'en1', 'wlan0']);
  const skip = /^(utun|awdl|llw|bridge|anpi|ap\d|vmnet|vboxnet|docker|veth)/i;
  const candidates = [];
  for (const [name, entries] of Object.entries(networkInterfaces)) {
    for (const item of entries || []) {
      if (!isIpv4(item) || item.internal || !isPrivateIpv4(item.address)) continue;
      candidates.push({ name, address: item.address, preferred: preferred.has(name), skip: skip.test(name) });
    }
  }
  const usable = candidates.filter((item) => !item.skip);
  const pool = usable.length ? usable : candidates;
  return (pool.find((item) => item.preferred) || pool[0])?.address || '127.0.0.1';
}

function lanUpgradeAllowed(request, address, port) {
  let pathname = '';
  try {
    pathname = new URL(request.url, 'http://localhost').pathname;
  } catch {
    return false;
  }
  if (pathname !== '/ws') return false;
  const expectedHost = `${address}:${port}`;
  const host = request.headers.host;
  if (host !== expectedHost && host !== address) return false;
  const origin = request.headers.origin;
  if (!origin || origin === 'null') return true;
  try {
    const parsed = new URL(origin);
    const portMatch = parsed.port === String(port) || (parsed.port === '' && Number(port) === 80);
    return parsed.protocol === 'http:' && parsed.hostname === address && portMatch;
  } catch {
    return false;
  }
}

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

function createPairingServer({ host = '127.0.0.1', port, tokenManager, pairingManager = null, onMobileConnection = () => {} }) {
  let lanServer = null;
  let lanSockets = null;
  let expiryTimer = null;
  let opening = null;
  async function disableLan() {
    clearTimeout(expiryTimer);
    pairingManager?.revoke();
    for (const socket of lanSockets?.clients || []) socket.terminate();
    lanSockets?.close();
    lanSockets = null;
    const previous = lanServer;
    lanServer = null;
    if (previous) await new Promise(resolve => { previous.close(resolve); previous.closeAllConnections(); });
  }
  async function enableLan() {
    await disableLan();
    const address = getLanAddress();
    if (address === '127.0.0.1') throw new Error('未找到局域网 IPv4，请连接 Wi-Fi 后重试');
    const httpServer = http.createServer((req, res) => {
      if (req.method !== 'GET' || new URL(req.url, 'http://localhost').pathname !== '/mobile.html') { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
      res.end(fs.readFileSync(path.join(__dirname, '..', 'public', 'mobile.html')));
    });
    const sockets = new WebSocketServer({ noServer: true, maxPayload: 65536 });
    httpServer.on('upgrade', (req, socket, head) => {
      if (!lanUpgradeAllowed(req, address, port) || sockets.clients.size >= 8) { socket.destroy(); return; }
      sockets.handleUpgrade(req, socket, head, ws => { req.mobilePairing = true; sockets.emit('connection', ws, req); });
    });
    sockets.on('connection', onMobileConnection);
    await new Promise((resolve, reject) => { httpServer.once('error', reject); httpServer.listen(port, address, resolve); });
    lanServer = httpServer; lanSockets = sockets;
    const issued = pairingManager.issue();
    expiryTimer = setTimeout(() => { if (pairingManager.getState()) disableLan(); }, Math.max(0, issued.expiresAt - Date.now()));
    expiryTimer.unref?.();
    return { ...issued, mobileUrl: `http://${address}:${port}/mobile.html?token=${issued.token}` };
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('pairing server port is required');
  }
  if (!tokenManager || typeof tokenManager.token !== 'string' || !tokenManager.token) {
    throw new Error('pairing server token manager is required');
  }

  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    const localPeer = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress);
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const headers = {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff'
    };
    if (origin && isLoopbackOrigin(origin) && localPeer) { headers['access-control-allow-origin'] = origin; headers.vary = 'Origin'; }
    // Management and the desktop credential must never be exposed to LAN peers.
    if (pathname !== '/mobile.html' && (!localPeer || !isLoopbackOrigin(origin))) {
      response.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Origin not allowed' }));
      return;
    }

    if (request.method === 'GET' && pathname === '/mobile.html') {
      const file = path.join(__dirname, '..', 'public', 'mobile.html');
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(fs.readFileSync(file));
      return;
    }
    if (request.method === 'POST' && pathname === '/pairing/start' && pairingManager) {
      try {
        if (!opening) opening = enableLan().finally(() => { opening = null; });
        const result = await opening;
        response.writeHead(200, headers); response.end(JSON.stringify(result));
      } catch (error) { response.writeHead(503, headers); response.end(JSON.stringify({ error: error.message })); }
      return;
    }
    if (request.method === 'GET' && pathname === '/token') {
      response.writeHead(200, headers);
      response.end(JSON.stringify({ token: tokenManager.token }));
      return;
    }
    if (request.method !== 'POST' || pathname !== '/pairing/revoke' || !pairingManager) {
      response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    if (opening) await opening.catch(() => {});
    await disableLan();
    response.writeHead(200, headers);
    response.end(JSON.stringify({ revoked: true }));
  });

  return {
    server,
    start(callback = () => {}) {
      server.listen(port, host, callback);
    },
    close(callback = () => {}) {
      disableLan().catch(() => {});
      if (!server.listening) {
        callback();
        return;
      }
      server.close(callback);
    }
  };
}

module.exports = { createPairingServer, isLoopbackOrigin, getLanAddress, lanUpgradeAllowed };
