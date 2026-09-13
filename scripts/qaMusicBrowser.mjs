const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output = `${process.cwd()}/output/playwright`;
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:5173/';
const appOrigin = new URL(baseURL).origin;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.port === '9121') return route.fulfill({ json: { token: 'isolated-qa-fixture' }, headers: { 'access-control-allow-origin': '*' } });
    if (url.origin === appOrigin) return route.continue();
    return route.abort();
  });
  let bridge;
  const sent = [];
  const playlists = Array.from({ length: 5 }, (_, i) => ({ id: `${i + 1}`, originalId: `${i + 1}`, name: `Night Lofi ${i + 1} - quiet music for study and long evenings` }));
  await context.routeWebSocket('ws://localhost:9120', (ws) => {
    bridge = ws;
    const send = (event) => ws.send(JSON.stringify(event));
    ws.onMessage((raw) => {
      const request = JSON.parse(raw);
      if (request.type === 'auth') {
        send({ type: 'ready', instanceId: 'qa-bridge' });
        send({ type: 'status', value: 'connected' });
        send({ type: 'music_state', value: { provider: 'netease-local', status: 'idle' } });
        return;
      }
      sent.push(request);
      if (request.type === 'music_command') {
        send({ type: 'music_intent', action: request.command, status: 'started' });
        send({ type: 'music_state', value: { provider: 'netease-local', status: 'playing', title: request.playlist.name, playlistRecord: request.playlist } });
        send({ type: 'music_intent', action: request.command, status: 'completed' });
        return;
      }
      send({ type: 'status', value: 'thinking' });
      if (request.text === '播放 lofi') {
        send({ type: 'music_intent', action: 'play_playlist', status: 'started' });
        send({ type: 'music_search_results', choices: playlists });
        send({ type: 'music_intent', action: 'play_playlist', status: 'completed' });
      } else if (request.text.includes('第')) {
        send({ type: 'music_intent', action: 'select_playlist', status: 'started' });
        send({ type: 'music_state', value: { provider: 'netease-local', status: 'playing', title: playlists[1].name, playlistRecord: playlists[1] } });
        send({ type: 'music_intent', action: 'select_playlist', status: 'completed' });
      } else if (request.text === '取消') {
        send({ type: 'music_intent', action: 'cancel_selection', status: 'started' });
        send({ type: 'music_intent', action: 'cancel_selection', status: 'completed' });
      }
      send({ type: 'assistant_delta', text: 'This completed reply must remain visible.' });
      send({ type: 'status', value: 'done' });
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(baseURL);
  await page.getByText('Claude awake', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Start room', exact: true }).click();
  await page.waitForTimeout(300);
  const checks = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }, { width: 375, height: 667 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Claude', exact: true }).click();
    await page.getByRole('textbox', { name: 'Ask Claude', exact: true }).fill('播放 lofi');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await page.locator('.music-choices button').nth(4).waitFor();
    await page.waitForTimeout(250);
    const bubble = page.getByRole('dialog', { name: 'Claude bubble' });
    const bounds = await bubble.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1, JSON.stringify({ viewport, bounds }));
    const buttons = await page.locator('.music-choices button').evaluateAll((nodes) => nodes.map((el) => ({ width: el.clientWidth, height: el.clientHeight })));
    assert.equal(new Set(buttons.map((b) => b.height)).size, 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/chat-${viewport.width}x${viewport.height}.png` });
    await page.locator('.music-choices button').nth(1).click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.music-choices button').count(), 0);
    await page.locator('.recent-playlist').waitFor();
    assert.equal((await bubble.locator('.message').innerText()).trim(), 'This completed reply must remain visible.');
    checks.push({ viewport, bounds, buttons: buttons.length });
    await page.getByRole('button', { name: 'Close Claude bubble' }).click();
  }
  const beforeReload = sent.length;
  await page.reload();
  await page.getByText('Claude awake', { exact: true }).waitFor();
  assert.equal(sent.length, beforeReload, 'refresh must not autoplay music');
  await page.getByRole('button', { name: 'Claude', exact: true }).click();
  await page.locator('.recent-playlist').click();
  assert.equal(sent.at(-1).command, 'play_playlist');
  assert.deepEqual(sent.at(-1).playlist, playlists[1]);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('loficlaude-recent-playlist')));
  assert.deepEqual(Object.keys(stored), ['id', 'originalId', 'name']);
  bridge.send(JSON.stringify({ type: 'music_error', message: 'QA music error' }));
  await page.getByText('QA music error', { exact: true }).first().waitFor();
  assert.equal(await page.locator('.message').innerText(), 'This completed reply must remain visible.');
  assert.deepEqual(errors, []);
  await writeFile(`${output}/chat-qa.json`, JSON.stringify({ checks, errors, recentRestore: true, autoplayOnReload: false }, null, 2));
  console.log(JSON.stringify({ checks, errors, recentRestore: true, autoplayOnReload: false }));
} finally { await browser.close(); }
