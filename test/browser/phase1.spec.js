import { levels } from '../../src/config.js';
import { test, expect, start, snapshot, until, rightTo, jump, walkTo, approachGoal, finishFirst, fallAndRespawn } from './helpers.js';

test('keyboard start, aliases, opposing directions and horizontal bounds', async ({ page }) => {
  await start(page, true);
  expect((await snapshot(page)).body.feetY).toBeCloseTo(224, 1);
  await page.keyboard.down('ArrowLeft');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.feetX <= 10);
  await page.keyboard.up('ArrowLeft');
  expect((await snapshot(page)).body.feetX).toBeGreaterThanOrEqual(9);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('ArrowRight');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.feetX >= 60);
  await page.keyboard.up('KeyD');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.feetX >= 100);
  await page.keyboard.down('ArrowLeft');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx === 0);
  const stopped = (await snapshot(page)).body.feetX;
  await page.waitForTimeout(150);
  expect((await snapshot(page)).body.feetX).toBeCloseTo(stopped, 1);
  await page.keyboard.up('ArrowLeft');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx > 0);
  await page.keyboard.up('ArrowRight');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx === 0);
  const canvas = await page.locator('canvas').evaluate(node => ({ width: node.width, height: node.height }));
  expect(canvas).toEqual({ width: 480, height: 270 });
});

test('solid step, airborne goal, single advance and held direction cleared', async ({ page }, testInfo) => {
  await start(page);
  await page.screenshot({ path: 'qa/phase4-environment-' + testInfo.project.name + '-step1.png', fullPage: true });
  const level = levels[0];
  const edge = level.surfaces[0].width;
  await page.keyboard.down('ArrowRight');
  await until(page, x => window.__ACINCO_DEBUG__.snapshot().body.feetX >= x - 12, edge);
  await page.waitForTimeout(200);
  const wall = await snapshot(page);
  expect(wall.body.feetX).toBeLessThanOrEqual(edge - 8.99);
  expect(wall.body.grounded).toBe(true);
  expect(wall.body.vx).toBe(0);
  await jump(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await page.keyboard.up('ArrowRight');
  await approachGoal(page, level);
  await rightTo(page, level.goal.x - 56);
  await page.keyboard.down('ArrowRight');
  await jump(page);
  await until(page, x => window.__ACINCO_DEBUG__.snapshot().body.feetX >= x - 10, level.goal.x);
  await page.keyboard.down('ArrowLeft');
  const aboveGoal = await snapshot(page);
  expect(aboveGoal.levelIndex).toBe(0);
  expect(aboveGoal.body.grounded).toBe(false);
  expect(aboveGoal.body.feetY).toBeLessThan(224);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().levelIndex === 1);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowRight'); // Playwright sets repeat=true for the still-held key.
  await page.waitForTimeout(250);
  await until(page, () => {
    const s = window.__ACINCO_DEBUG__.snapshot();
    return s.mode === 'PLAYING' && s.body.grounded;
  });
  await page.waitForTimeout(150);
  const next = await snapshot(page);
  expect(next.body.feetX).toBeCloseTo(64, 1);
  expect(next.body.vx).toBe(0);
  expect(next.checkpointId).toBe(0);
  await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: 'qa/phase4-environment-' + testInfo.project.name + '-step2.png', fullPage: true });
});

test('holding jump never repeats and landing buffer fires once', async ({ page }) => {
  await start(page);
  await page.keyboard.down('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < -100 && !window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).body.feetY).toBeCloseTo(224, 1);
  await page.keyboard.up('Space');
  await jump(page);
  await until(page, () => {
    const b = window.__ACINCO_DEBUG__.snapshot().body;
    return b.vy > 0 && b.feetY > 210 && b.feetY < 224;
  });
  await page.keyboard.down('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < -100 && !window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).body.feetY).toBeCloseTo(224, 1);
  await page.keyboard.up('Space');
});

test('coyote jump after leaving actual support', async ({ page }) => {
  await start(page);
  await finishFirst(page);
  await page.keyboard.down('ArrowRight');
  await until(page, edge => {
    const b = window.__ACINCO_DEBUG__.snapshot().body;
    return b.feetX > edge + 10 && !b.grounded;
  }, levels[1].surfaces[0].width);
  await page.keyboard.down('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < -100 && !window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  expect((await snapshot(page)).levelIndex).toBe(1);
});

test('fall before checkpoint restores spawn and a fresh jump works', async ({ page }) => {
  await start(page);
  await finishFirst(page);
  await fallAndRespawn(page);
  const restored = await snapshot(page);
  expect(restored.levelIndex).toBe(1);
  expect(restored.checkpointId).toBe(0);
  expect(restored.body.feetX).toBeCloseTo(64, 1);
  expect(restored.body.feetY).toBeCloseTo(224, 1);
  expect(restored.body.vx).toBe(0);
  await jump(page);
  expect((await snapshot(page)).body.feetY).toBeLessThan(224);
});

test('airborne checkpoint rejected until landing, then fall restores checkpoint', async ({ page }) => {
  await start(page);
  await finishFirst(page);
  const checkpoint = levels[1].checkpoint;
  await walkTo(page, levels[1], checkpoint.x - 56);
  await page.keyboard.down('ArrowRight');
  await jump(page);
  await until(page, x => window.__ACINCO_DEBUG__.snapshot().body.feetX >= x + 10, checkpoint.x);
  await page.keyboard.up('ArrowRight');
  const flying = await snapshot(page);
  expect(flying.body.grounded).toBe(false);
  expect(flying.checkpointId).toBe(0);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().checkpointId === 1);
  await fallAndRespawn(page);
  const restored = await snapshot(page);
  expect(restored.levelIndex).toBe(1);
  expect(restored.checkpointId).toBe(1);
  expect(restored.body.feetX).toBeCloseTo(checkpoint.x, 1);
  expect(restored.body.feetY).toBeCloseTo(224, 1);
  expect(restored.body.vx).toBe(0);
  await jump(page);
  expect((await snapshot(page)).body.feetY).toBeLessThan(224);
});
