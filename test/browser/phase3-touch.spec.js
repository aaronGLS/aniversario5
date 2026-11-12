import { test, expect, snapshot, until, waitPlaying, approachGoal, triggerGoal, rightTo, jump, walkTo, captureLevelView, savedProgress, openSaved, continueSaved } from './helpers.js';
import { createTouchDriver, recordPointers, noHeldFeedback, assertMobileLayout } from './touch-helpers.js';
import { levels, texts } from '../../src/config.js';
import fs from 'node:fs/promises';
test('touch crosses the elevated third level without input actionability delays', async ({ page }) => {
  await openSaved(page, { version: 1, levelIndex: 2, checkpointId: 0, completed: false });
  await page.getByRole('button', { name: texts.continue, exact: true }).tap();
  await waitPlaying(page, 2);
  await recordPointers(page);
  const driver = await createTouchDriver(page);
  await approachGoal(page, levels[2], driver);
  expect((await snapshot(page)).checkpointId).toBe(1);
  await driver.destroy();
});

async function startTouch(page) {
  await page.goto('./');
  await expect(page.getByRole('button', { name: texts.start, exact: true })).toBeEnabled();
  await page.getByRole('button', { name: texts.start, exact: true }).tap();
  await waitPlaying(page, 0);
  await expect(page.locator('#jump-button')).toBeVisible();
}

test('two fingers hold direction and jump with trusted independent pointer releases', async ({ page }, testInfo) => {
  await startTouch(page);
  await recordPointers(page);
  const driver = await createTouchDriver(page);
  await driver.down('right');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx > 0);
  await jump(page, driver);
  await testInfo.attach('partial-touch-release', { body: JSON.stringify({ events: await page.evaluate(() => window.__PHASE3_POINTERS__), state: await snapshot(page) }), contentType: 'application/json' });
  expect((await snapshot(page)).body.vx).toBeGreaterThan(0);
  await expect(page.locator('#right-button')).toHaveAttribute('data-pressed', 'true');
  await expect(page.locator('#jump-button')).toHaveAttribute('data-pressed', 'false');
  await driver.up('right');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx === 0);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).body.grounded).toBe(true);
  const events = await page.evaluate(() => window.__PHASE3_POINTERS__);
  expect(events.filter(e => e.type === 'pointerdown')).toHaveLength(2);
  expect(events.filter(e => e.type === 'pointerup')).toHaveLength(2);
  expect(new Set(events.filter(e => e.type === 'pointerdown').map(e => e.pointerId)).size).toBe(2);
  expect(events.every(e => e.trusted && e.pointerType === 'touch')).toBe(true);
  await noHeldFeedback(page);
  await driver.destroy();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  const orientation = viewport.width < viewport.height ? 'portrait' : 'landscape';
  test('complete touch journey and replay in ' + orientation, async ({ page }, testInfo) => {
    test.setTimeout(360_000);
    await page.setViewportSize(viewport);
    await startTouch(page);
    await recordPointers(page);
    const driver = await createTouchDriver(page);
    const visited = [];
    for (let index = 0; index < levels.length; index++) {
      await waitPlaying(page, index);
      await assertMobileLayout(page);
      const state = await snapshot(page);
      expect(state.counts.dynamicBodies).toBe(1);
      expect(state.counts.staticBodies).toBe(levels[index].surfaces.length);
      visited.push(state);
      await captureLevelView(page, levels[index], 'start', 'touch-' + orientation);
      await walkTo(page, levels[index], levels[index].checkpoint.x + 10, driver);
      expect((await snapshot(page)).checkpointId).toBe(1);
      await captureLevelView(page, levels[index], 'checkpoint', 'touch-' + orientation);
      await approachGoal(page, levels[index], driver);
      await rightTo(page, levels[index].goal.x - 40, driver);
      await captureLevelView(page, levels[index], 'arrival', 'touch-' + orientation);
      const afterObstacles = await snapshot(page);
      if (afterObstacles.body.feetX < levels[index].checkpoint.x + 20) await rightTo(page, levels[index].checkpoint.x + 20, driver);
      expect((await snapshot(page)).checkpointId).toBe(1);
      if (index === 2 || index === 3) await page.screenshot({ path: 'qa/phase4-environment-touch-' + orientation + '-step' + (index + 1) + '.png', fullPage: true });
      await triggerGoal(page, driver);
    }
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
    expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 4, checkpointId: 1, completed: true });
    await expect(page.locator('#touch-controls')).toBeHidden();
    await expect(page.locator('#ending-heading')).toBeFocused();
    const ending = await page.locator('canvas').boundingBox();
    expect(ending.height).toBeLessThanOrEqual(viewport.height * .42 + 1);
    await expect(page.getByText(texts.endingBody, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: texts.replay, exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'qa/phase4-environment-touch-' + orientation + '-ending.png', fullPage: true });
    const events = await page.evaluate(() => window.__PHASE3_POINTERS__);
    expect(events.filter(e => e.type === 'pointerdown').length).toBeGreaterThan(15);
    expect(events.every(e => e.trusted && e.pointerType === 'touch')).toBe(true);
    await fs.writeFile('qa/phase4-environment-touch-' + orientation + '-journey.json', JSON.stringify({ browser: testInfo.project.name, viewport, visited, pointerEvents: events }, null, 2) + '\n');
    await page.getByRole('button', { name: texts.replay, exact: true }).tap();
    await waitPlaying(page, 0);
    expect((await snapshot(page)).body.feetX).toBeCloseTo(64, 1);
    await noHeldFeedback(page);
    await driver.destroy();
  });
}

test('touch and keyboard combine sources, opposite directions and held jump without repeats', async ({ page }) => {
  await startTouch(page);
  const driver = await createTouchDriver(page);
  await page.keyboard.down('ArrowRight');
  await driver.down('right');
  await page.keyboard.up('ArrowRight');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx > 0);
  await driver.down('left');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx === 0);
  await driver.up('left');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx > 0);
  await driver.up('right');
  await driver.down('right', 'a');
  await driver.down('right', 'b');
  await driver.up('a');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx > 0);
  await expect(page.locator('#right-button')).toHaveAttribute('data-pressed', 'true');
  await driver.up('b');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx === 0);
  await page.keyboard.down('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < -100);
  await driver.down('jump');
  await page.keyboard.up('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  await page.waitForTimeout(250);
  expect((await snapshot(page)).body.grounded).toBe(true);
  await driver.up('jump');
  await jump(page, driver);
  await driver.destroy();
});

test('captured touch remains held outside, then cancel and lost capture release safely', async ({ page }) => {
  await startTouch(page);
  await recordPointers(page);
  const driver = await createTouchDriver(page);
  await driver.down('right');
  await driver.move('right', 1, 1);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx > 0);
  await expect(page.locator('#right-button')).toHaveAttribute('data-pressed', 'true');
  await driver.up('right');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx === 0);
  await driver.down('right');
  await driver.cancel();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx === 0);
  await driver.down('right');
  const heldBox = await page.locator('#right-button').boundingBox();
  await driver.move('right', heldBox.x + heldBox.width / 2 + 1, heldBox.y + heldBox.height / 2);
  await until(page, () => {
    const current = window.__PHASE3_POINTERS__.filter(e => e.type === 'pointerdown').at(-1);
    return window.__PHASE3_POINTERS__.some(e => e.type === 'gotpointercapture' && e.pointerId === current.pointerId);
  });
  await page.evaluate(() => {
    const event = window.__PHASE3_POINTERS__.filter(e => e.type === 'pointerdown').at(-1);
    document.querySelector('#right-button').releasePointerCapture(event.pointerId);
  });
  await driver.move('right', 2, 2);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vx === 0);
  await noHeldFeedback(page);
  const events = await page.evaluate(() => window.__PHASE3_POINTERS__);
  expect(events.some(e => e.type === 'pointercancel')).toBe(true);
  expect(events.some(e => e.type === 'lostpointercapture')).toBe(true);
  await driver.destroy();
});

test('pause while fingers remain down clears all sources and requires fresh presses', async ({ page }) => {
  await startTouch(page);
  const driver = await createTouchDriver(page);
  await driver.down('right');
  await driver.down('jump');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < 0);
  await page.keyboard.press('Escape');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  const frozen = await snapshot(page);
  await page.waitForTimeout(300);
  expect((await snapshot(page)).body).toEqual(frozen.body);
  await noHeldFeedback(page);
  // Resume through keyboard while physical protocol contacts are still held.
  await page.getByRole('button', { name: texts.resume, exact: true }).focus();
  await page.keyboard.press('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PLAYING');
  await driver.move('right', 1, 1);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  expect((await snapshot(page)).body.vx).toBe(0);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).body.grounded).toBe(true);
  await driver.cancel();
  await jump(page, driver);
  await driver.destroy();
});

test('orientation during a touch jump pauses once and height-only resize preserves the game', async ({ page }) => {
  await startTouch(page);
  const driver = await createTouchDriver(page);
  await driver.down('right');
  await driver.down('jump');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.vy < 0);
  await page.setViewportSize({ width: 844, height: 390 });
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  const frozen = await snapshot(page);
  await page.setViewportSize({ width: 844, height: 370 });
  await page.waitForTimeout(200);
  expect((await snapshot(page)).body).toEqual(frozen.body);
  await driver.cancel();
  await page.getByRole('button', { name: texts.resume, exact: true }).tap();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  expect((await snapshot(page)).levelIndex).toBe(0);
  expect((await snapshot(page)).body.vx).toBe(0);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(100);
  expect((await snapshot(page)).mode).toBe('PLAYING');
  await assertMobileLayout(page);
  await driver.destroy();
});

test('touch fall restores checkpoint and transition releases held direction', async ({ page }) => {
  // The uphill gap remains a fall even if transport latency carries the finger
  // past its centre; a tiny flat gap can reattach to its far lip in Arcade.
  const levelIndex = 2;
  await openSaved(page, { version: 1, levelIndex, checkpointId: 0, completed: false });
  await page.getByRole('button', { name: texts.continue, exact: true }).tap();
  await waitPlaying(page, levelIndex);
  const driver = await createTouchDriver(page);
  await driver.down('right');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'RESPAWNING');
  await expect(page.locator('#right-button')).toBeDisabled();
  await expect(page.locator('#touch-controls')).toBeVisible();
  await waitPlaying(page, levelIndex);
  expect((await snapshot(page)).body.feetX).toBeCloseTo(64, 1);
  await driver.cancel();
  await approachGoal(page, levels[levelIndex], driver);
  await driver.down('right');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'TRANSITION');
  await expect(page.locator('#right-button')).toBeDisabled();
  await waitPlaying(page, levelIndex + 1);
  await page.waitForTimeout(150);
  expect((await snapshot(page)).body.feetX).toBeCloseTo(64, 1);
  expect((await snapshot(page)).body.vx).toBe(0);
  await driver.cancel();
  await driver.destroy();
});

