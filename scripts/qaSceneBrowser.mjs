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
  await context.addInitScript(() => {
    window.qaStaticDraws = 0;
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (this.canvas.classList.contains('ascii-background')) window.qaStaticDraws++;
      return original.apply(this, args);
    };
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === appOrigin) return route.continue();
    if (url.port === '9121') return route.fulfill({ status: 503, body: '' });
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Start room', exact: true }).click();
  const checks = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Open scene picker', exact: true }).click();
    await page.getByRole('menu', { name: 'Scene', exact: true }).waitFor();
    await page.waitForTimeout(200);
    const bounds = await page.getByRole('menu', { name: 'Scene', exact: true }).boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, JSON.stringify(bounds));
    await page.screenshot({ path: `${output}/scenes-${viewport.width}.png` });
    await page.getByRole('menu', { name: 'Scene', exact: true }).getByRole('button', { name: /Rain Window/ }).click();
    await page.waitForTimeout(1200);
    const readPixels = () => page.locator('.ascii-particles').evaluate((canvas) => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let checksum = 0;
      let visible = 0;
      for (let i = 3; i < pixels.length; i += 4) { if (pixels[i]) visible++; checksum = (checksum + pixels[i] * i) % 2147483647; }
      return { visible, checksum, width: canvas.width, height: canvas.height };
    });
    const before = await readPixels();
    await page.waitForTimeout(180);
    const after = await readPixels();
    assert.ok(after.visible > 100);
    assert.notEqual(before.checksum, after.checksum);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/rain-${viewport.width}.png` });
    checks.push({ viewport, sceneMenu: bounds, pixels: after });
  }
  const staticDraws = await page.evaluate(() => window.qaStaticDraws);
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => window.qaStaticDraws), staticDraws, 'unchanged static background should not repaint');
  const scenes = ['Night', 'Rain', 'Stars', 'FM Studio', 'Records', 'Console', 'Coffee', 'Library', 'Rain Window', 'Night Street', 'Sunset'];
  for (const label of scenes) {
    await page.getByRole('button', { name: 'Open scene picker', exact: true }).click();
    const menu = page.getByRole('menu', { name: 'Scene', exact: true });
    await menu.getByRole('button').filter({ hasText: new RegExp(`^.* ${label}$`) }).click();
    await page.waitForTimeout(1150);
    const colors = await page.locator('.ascii-background').evaluate((canvas) => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const values = new Set();
      for (let i = 0; i < data.length; i += 16) values.add(`${data[i]},${data[i+1]},${data[i+2]}`);
      return values.size;
    });
    assert.ok(colors > 2, `${label} has no visible scene detail (${colors} sampled colors)`);
  }
  const close = page.getByRole('button', { name: 'Close Claude bubble' });
  if (await close.count()) await close.click();
  const sprite = page.getByRole('button', { name: 'Claude', exact: true });
  const patrolStart = await sprite.boundingBox();
  await page.waitForFunction((initialX) => {
    const sprite = document.querySelector('.claude-sprite');
    return sprite && Math.abs(sprite.getBoundingClientRect().x - initialX) > 4;
  }, patrolStart.x, { timeout: 10000 });
  const start = await sprite.boundingBox();
  await page.mouse.move(start.x + 48, start.y + 48);
  await page.mouse.down();
  await page.mouse.move(start.x + 48, start.y - 150, { steps: 8 });
  const dragged = await sprite.boundingBox();
  assert.ok(dragged.y < start.y - 50);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  assert.ok((await sprite.boundingBox()).y > dragged.y + 50, 'Clawd must fall after release');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const beforeForm = await sprite.locator('canvas').evaluate((c) => c.toDataURL());
  await sprite.click({ button: 'right' });
  const formItems = page.getByRole('menu', { name: 'Claude forms' }).getByRole('menuitem');
  const formCount = await formItems.count();
  assert.ok(formCount > 10);
  await formItems.last().click();
  await page.waitForTimeout(200);
  const afterForm = await sprite.locator('canvas').evaluate((c) => c.toDataURL());
  assert.notEqual(beforeForm, afterForm, 'selected form must change actual pixels');
  await page.screenshot({ path: `${output}/companion-form.png` });
  assert.deepEqual(errors, []);
  await writeFile(`${output}/scene-qa.json`, JSON.stringify({ checks, errors, scenes: scenes.length, formCount, patrol: true, dragFall: true, staticRepaintsWhileUnchanged: 0 }, null, 2));
  console.log(JSON.stringify({ checks, errors, scenes: scenes.length, formCount, patrol: true, dragFall: true, staticRepaintsWhileUnchanged: 0 }));
} finally {
  await browser.close();
}
