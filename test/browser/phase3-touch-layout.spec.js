import { test, expect, start, snapshot, until, waitPlaying, pauseGame, resumeGame } from './helpers.js';
import { assertMobileLayout, createTouchDriver, recordPointers, noHeldFeedback } from './touch-helpers.js';
import { texts } from '../../src/config.js';
import fs from 'node:fs/promises';

test('landscape mode changes preserve focused controls without carrying held input', async ({ page }) => {
  await page.setViewportSize({ width: 559, height: 320 });
  await start(page);
  await page.locator('#pause-button').focus();
  await page.setViewportSize({ width: 560, height: 320 });
  await expect(page.locator('#game-panel')).toHaveClass(/landscape-touch/);
  await expect(page.locator('#pause-button')).toBeFocused();
  expect((await snapshot(page)).mode).toBe('PLAYING');
  await page.keyboard.press('Enter');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await resumeGame(page);
  await page.locator('#jump-button').focus();
  await page.keyboard.down('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < -100);
  await page.setViewportSize({ width: 559, height: 320 });
  await expect(page.locator('#jump-button')).toBeFocused();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await page.keyboard.down('Space');
  await page.waitForTimeout(200);
  expect((await snapshot(page)).body.grounded).toBe(true);
  await page.keyboard.up('Space');
  await page.keyboard.press('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < -100);
});

test('touch reference viewports and genuine safe-area environment overrides fit all controls', async ({ page }, testInfo) => {
  await start(page);
  const cdp = await page.context().newCDPSession(page);
  const metrics = [];
  for (const [width,height] of [[390,844], [844,390], [360,640], [640,360], [568,320], [320,568], [1366,768], [1920,1080]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    if ((await snapshot(page)).mode === 'PAUSED') await resumeGame(page);
    metrics.push({ width, height, layout: await assertMobileLayout(page) });
    await expect(page.locator('.game-control')).toHaveCount(3);
    await expect(page.locator('canvas')).toHaveCount(1);
    if (['844x390','640x360','568x320'].includes(width+'x'+height)) {
      await page.screenshot({ path: 'qa/phase4-environment-landscape-' + width + 'x' + height + '.png', fullPage: true });
    }
    const rotate = page.locator('#rotate-hint');
    if (width < height) await expect(rotate).toBeVisible(); else await expect(rotate).toBeHidden();
  }
  for (const item of [
    { viewport: { width: 390, height: 844 }, insets: { top: 44, bottom: 34, left: 0, right: 0 } },
    { viewport: { width: 844, height: 390 }, insets: { top: 0, bottom: 0, left: 44, right: 44 } },
    { viewport: { width: 320, height: 568 }, insets: { top: 0, bottom: 0, left: 44, right: 0 } },
    { viewport: { width: 320, height: 568 }, insets: { top: 0, bottom: 0, left: 0, right: 44 } },
    { viewport: { width: 640, height: 360 }, insets: { top: 60, bottom: 0, left: 0, right: 0 } },
  ]) {
    await page.setViewportSize(item.viewport);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: item.insets });
    await page.waitForTimeout(100);
    if ((await snapshot(page)).mode === 'PAUSED') await resumeGame(page);
    const padding = await page.locator('#app').evaluate(element => {
      const s = getComputedStyle(element); return [s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft].map(parseFloat);
    });
    expect(padding).toEqual([Math.max(12,item.insets.top),Math.max(12,item.insets.right),Math.max(12,item.insets.bottom),Math.max(12,item.insets.left)]);
    const safeLayout = await assertMobileLayout(page);
    metrics.push({ ...item, padding, layout: safeLayout });
    await pauseGame(page);
    const dialog = await page.locator('#pause-dialog').boundingBox();
    expect(dialog.x).toBeGreaterThanOrEqual(padding[3] - 1);
    expect(dialog.y).toBeGreaterThanOrEqual(padding[0] - 1);
    expect(dialog.x + dialog.width).toBeLessThanOrEqual(item.viewport.width - padding[1] + 1);
    expect(dialog.y + dialog.height).toBeLessThanOrEqual(item.viewport.height - padding[2] + 1);
    await page.locator('#reduce-effects').scrollIntoViewIfNeeded();
    await expect(page.locator('#reduce-effects')).toBeInViewport();
    if (item.insets.left !== item.insets.right || item.insets.top === 60) {
      await page.screenshot({ path: 'qa/phase4-environment-safe-dialog-' + item.insets.left + '-' + item.insets.right + '-' + item.insets.top + '.png', fullPage: true });
    }
    await resumeGame(page);
    await page.waitForTimeout(100);
    const afterDialog = await page.locator('canvas').boundingBox();
    expect(afterDialog.width).toBeCloseTo(safeLayout.canvas.width, 0);
    expect(afterDialog.height).toBeCloseTo(safeLayout.canvas.height, 0);
  }
  await testInfo.attach('viewport-and-safe-area-metrics', { body: JSON.stringify(metrics), contentType: 'application/json' });
  await fs.writeFile('qa/phase4-environment-layout-metrics.json', JSON.stringify(metrics,null,2)+'\n');
  await cdp.detach();
});

test('200 percent reflow emulation preserves controls, dialog and replay at DPR two', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 683, height: 384 }, deviceScaleFactor: 2, baseURL: 'http://127.0.0.1:4173/regalo/' });
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.status() + ' ' + response.url()); });
  await start(page);
  await assertMobileLayout(page);
  await pauseGame(page);
  await page.locator('#reduce-effects').scrollIntoViewIfNeeded();
  await page.locator('#reduce-effects').check();
  await page.locator('#skip-button').click();
  await page.locator('#confirm-button').click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  await page.locator('#replay-button').scrollIntoViewIfNeeded();
  await expect(page.locator('#replay-button')).toBeInViewport();
  await page.screenshot({ path: 'qa/phase4-environment-touch-reflow-200.png', fullPage: true });
  await testInfo.attach('zoom-method', { body: JSON.stringify({ method: 'layout viewport halved and DPR doubled', reference: { width: 1366, height: 768, dpr: 1 }, emulation: { width: 683, height: 384, dpr: 2 }, nativeBrowserZoom: false }), contentType: 'application/json' });
  expect(failures).toEqual([]);
  await context.close();
});

test('focused touch buttons support Space and Enter without double action after focus moves to game', async ({ page }) => {
  await start(page);
  await recordPointers(page);
  const driver = await createTouchDriver(page);
  await page.locator('#right-button').focus();
  await page.keyboard.down('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx > 0);
  await driver.down('right');
  await driver.up('right');
  expect((await snapshot(page)).body.vx).toBeGreaterThan(0);
  await page.keyboard.up('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx === 0);
  await page.locator('#jump-button').focus();
  await page.keyboard.down('Enter');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < -100);
  await driver.down('jump');
  await driver.up('jump');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).body.grounded).toBe(true);
  await page.keyboard.up('Enter');
  await noHeldFeedback(page);
  await page.locator('#jump-button').focus();
  await page.keyboard.press('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < -100);
  await driver.destroy();
});

test('touch helper and checkpoint announcements stay outside the canvas without repeated regions', async ({ page }) => {
  await start(page);
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);
  await expect(page.locator('#intro')).toHaveAttribute('inert', '');
  const before = await page.locator('canvas').boundingBox();
  await expect(page.locator('#game-status')).toContainText(texts.touchHelp, { timeout: 4000 });
  const during = await page.locator('canvas').boundingBox();
  expect(during.y).toBeCloseTo(before.y, 0);
  await expect(page.locator('#game-status')).toBeEmpty({ timeout: 6000 });
  expect((await page.locator('canvas').boundingBox()).y).toBeCloseTo(before.y, 0);
});

