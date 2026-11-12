import { test, expect, start, snapshot, pauseGame, resumeGame } from './helpers.js';
import { config, levels, texts } from '../../src/config.js';

test('local pixel art, font and themed shell load with bounded resources', async ({ page }, testInfo) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('./');
  await expect(page.getByRole('button', { name: texts.start, exact: true })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Pixelify Sans"', 'Auriana, corazón, ¿seguimos?'))).toBe(true);
  await page.screenshot({ path: `qa/phase4-environment-${testInfo.project.name}-title.png`, fullPage: true });
  await page.getByRole('button', { name: texts.start, exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  // Require painted pixels as well as a ready physics body before capturing.
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('2d');
    const points = [[0, 0], [canvas.width / 2, canvas.height / 2], [canvas.width / 2, canvas.height - 8]];
    return new Set(points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data].join(','))).size > 1;
  }, undefined, { timeout: 7_000 });
  const state = await snapshot(page);
  expect(state.timing.rendererType).toBe(1);
  expect(await page.locator('#prototype-label').evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  expect(state.environment.id).toBe('level-1');
  expect(state.environment.terrainChunks).toBe(3);
  expect(state.environment.decorations).toBe(levels[0].decorations.length);
  expect(state.environment.textureBytes).toBeLessThanOrEqual(config.environment.maxTextureBytes);
  expect(state.counts.displayObjects).toBeLessThanOrEqual(config.environment.maxDisplayObjects);
  expect(state.counts.staticBodies).toBe(levels[0].surfaces.length);
  expect(state.counts.colliders).toBe(1);
  expect(requests.some((url) => url.endsWith('/environment/environment.png'))).toBe(true);
  expect(requests.some((url) => url.endsWith('/environment/environment.json'))).toBe(true);
  expect(requests.some((url) => url.endsWith('/fonts/pixelify-sans.ttf'))).toBe(true);
  expect(requests.some((url) => url.endsWith('/sprites/aaron-idle-left.png'))).toBe(true);
  expect(requests.some((url) => url.includes('/vendor/') || url.includes('camino.mp3'))).toBe(false);
  await page.screenshot({ path: `qa/phase4-environment-${testInfo.project.name}-first-play.png`, fullPage: true });
});

test('reduced effects freeze and restore parallax without rebuilding terrain', async ({ page }) => {
  await start(page);
  const original = await snapshot(page);
  expect([...new Set(original.environment.backgroundScrollFactors)]).toEqual([0, 0.1, 0.25]);
  await pauseGame(page);
  await page.locator('#reduce-effects').check();
  const reduced = await snapshot(page);
  expect(reduced.environment.backgroundScrollFactors.every((factor) => factor === 0)).toBe(true);
  expect(reduced.counts).toEqual(original.counts);
  await resumeGame(page);
  await pauseGame(page);
  await page.locator('#reduce-effects').uncheck();
  const restored = await snapshot(page);
  expect(restored.environment).toEqual(original.environment);
  expect(restored.counts).toEqual(original.counts);
});
