import { test as base, expect } from '@playwright/test';
import { levels, config } from '../../src/config.js';

export const test = base.extend({
  audit: [async ({ page }, use) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') failures.push(message.text());
    });
    page.on('requestfailed', request => failures.push(request.url() + ': ' + request.failure()?.errorText));
    page.on('response', response => {
      if (response.status() >= 400) failures.push(response.status() + ' ' + response.url());
      // Phaser decodes downloaded PNGs through same-origin in-memory object URLs.
      const url = new URL(response.url());
      const localImageBlob = url.protocol === 'blob:' && url.origin === 'http://127.0.0.1:4173';
      if (!localImageBlob && !response.url().startsWith('http://127.0.0.1:4173/regalo/')) failures.push('Unexpected origin/path: ' + response.url());
    });
    await use();
    expect(failures, 'console, network and subfolder routes').toEqual([]);
  }, { auto: true }],
});

export { expect };

export async function snapshot(page) {
  return page.evaluate(() => window.__ACINCO_DEBUG__.snapshot());
}

export async function until(page, predicate, argument) {
  try {
    await page.waitForFunction(predicate, argument, { timeout: 12_000 });
  } catch (error) {
    error.message += '\nGame snapshot: ' + JSON.stringify(await snapshot(page));
    const pointers = await page.evaluate(() => window.__PHASE3_POINTERS__?.slice(-20));
    if (pointers) error.message += '\nLast pointer events: ' + JSON.stringify(pointers);
    throw error;
  }
}

export async function start(page, keyboard = false) {
  await page.goto('./');
  const button = page.getByRole('button', { name: 'Empezar nuestro camino' });
  await expect(button).toBeEnabled();
  await expect(page.getByText('Vista de desarrollo: faltan recursos finales.', { exact: true })).toBeVisible();
  if (keyboard) {
    await button.focus();
    await page.keyboard.press('Space');
  } else {
    await button.click();
  }
  await until(page, () => {
    const s = window.__ACINCO_DEBUG__?.snapshot();
    return s?.mode === 'PLAYING' && s.body?.grounded;
  });
  await expect(page.locator('canvas')).toBeVisible();
}

export function keyboardDriver(page) {
  const codes = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space' };
  return { down: action => page.keyboard.down(codes[action]), up: action => page.keyboard.up(codes[action]) };
}

export async function rightTo(page, x, driver = keyboardDriver(page)) {
  await driver.down('right');
  await until(page, target => window.__ACINCO_DEBUG__.snapshot().body.feetX >= target, x);
  await driver.up('right');
}

export async function leftTo(page, x, driver = keyboardDriver(page)) {
  await driver.down('left');
  await until(page, target => window.__ACINCO_DEBUG__.snapshot().body.feetX <= target, x);
  await driver.up('left');
}

export async function jump(page, driver = keyboardDriver(page), direction) {
  const launchFeetY = driver.kind === 'touch' ? (await snapshot(page)).body.feetY : null;
  if (direction && driver.downTogether) await driver.downTogether([direction, 'jump']);
  else {
    if (direction) await driver.down(direction);
    await driver.down('jump');
  }
  await until(page, launch => {
    const s = window.__ACINCO_DEBUG__.snapshot();
    return !s.body.grounded && (launch === null ? s.body.vy < -100 : s.body.feetY < launch - 1);
  }, launchFeetY);
  await driver.up('jump');
}

export async function finishFirst(page) {
  await approachGoal(page, levels[0]);
  await page.keyboard.down('ArrowRight');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().levelIndex === 1);
  await page.keyboard.up('ArrowRight');
  await until(page, () => {
    const s = window.__ACINCO_DEBUG__.snapshot();
    return s.mode === 'PLAYING' && s.body.grounded;
  });
}

export async function fallAndRespawn(page) {
  const current = await snapshot(page);
  const level = levels[current.levelIndex];
  const from = level.surfaces.find((surface, index) =>
    level.surfaces[index + 1]?.x > surface.x + surface.width && surface.x + surface.width > current.body.feetX);
  if (!from) throw new Error('No upcoming gap available for the respawn check');
  const next = level.surfaces[level.surfaces.indexOf(from) + 1];
  await walkTo(page, level, from.x + from.width - 28);
  // Stop with the entire 18px body inside the gap rather than running onto its far lip.
  await rightTo(page, (from.x + from.width + next.x) / 2);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'RESPAWNING');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PLAYING');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
}

export function assertStableCounts(before, after, surfaceCount = before.staticBodies) {
  expect(after).toEqual(before);
  expect(after.dynamicBodies).toBe(1);
  expect(after.staticBodies).toBe(surfaceCount);
  expect(after.displayObjects).toBeGreaterThan(0);
  expect(after.colliders).toBe(1);
  expect(after.canvases).toBe(1);
}

export const SAVE_KEY = 'acinco5.save.v1';
export const PREFS_KEY = 'acinco5.prefs.v1';

export async function openSaved(page, progress, prefs) {
  await page.goto('./');
  await until(page, () => window.__ACINCO_DEBUG__?.snapshot().mode === 'TITLE');
  await page.evaluate(({ progress, prefs, saveKey, prefsKey }) => {
    localStorage.setItem(saveKey, typeof progress === 'string' ? progress : JSON.stringify(progress));
    if (prefs !== undefined) localStorage.setItem(prefsKey, typeof prefs === 'string' ? prefs : JSON.stringify(prefs));
  }, { progress, prefs, saveKey: SAVE_KEY, prefsKey: PREFS_KEY });
  await page.reload();
  await until(page, () => window.__ACINCO_DEBUG__?.snapshot().mode === 'TITLE');
}

export async function continueSaved(page) {
  await page.getByRole('button', { name: 'Continuar nuestro camino', exact: true }).click();
  await waitPlaying(page);
}

export async function waitPlaying(page, levelIndex) {
  await until(page, expected => {
    const s = window.__ACINCO_DEBUG__?.snapshot();
    return s?.mode === 'PLAYING' && s.body?.grounded &&
      (expected === undefined || s.levelIndex === expected);
  }, levelIndex);
  await expect(page.locator('canvas')).toBeVisible();
}

export async function savedProgress(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
}

export async function walkObstacles(page, level, reverse = false, driver = keyboardDriver(page), targetX = reverse ? -Infinity : Infinity) {
  const surfaces = level.surfaces;
  const indices = reverse
    ? Array.from({ length: surfaces.length - 1 }, (_, i) => surfaces.length - 1 - i)
    : Array.from({ length: surfaces.length - 1 }, (_, i) => i);
  for (const index of indices) {
    const from = surfaces[index];
    const to = surfaces[index + (reverse ? -1 : 1)];
    const position = (await snapshot(page)).body.feetX;
    if ((!reverse && (position >= to.x + config.player.bodyWidth / 2 || to.x > targetX)) ||
        (reverse && (position <= to.x + to.width - config.player.bodyWidth / 2 || to.x + to.width < targetX))) continue;
    const contiguous = reverse ? to.x + to.width === from.x : from.x + from.width === to.x;
    if (contiguous && to.y >= from.y) continue;
    if (reverse) await leftTo(page, from.x + 28, driver);
    else await rightTo(page, from.x + from.width - 28, driver);
    const action = reverse ? 'left' : 'right';
    await jump(page, driver, action);
    await until(page, support => {
      const s = window.__ACINCO_DEBUG__.snapshot();
      return s.mode === 'PLAYING' && s.body.grounded && s.body.supportId === support;
    }, to.id);
    await driver.up(action);
  }
}

export async function walkTo(page, level, x, driver = keyboardDriver(page)) {
  const reverse = (await snapshot(page)).body.feetX > x;
  await walkObstacles(page, level, reverse, driver, x);
  await (reverse ? leftTo : rightTo)(page, x, driver);
}

export async function approachGoal(page, level, driver = keyboardDriver(page)) {
  await walkObstacles(page, level, false, driver);
  const last = level.surfaces.at(-1);
  await rightTo(page, Math.min(level.goal.x - 64, last.x + 80), driver);
}

export async function triggerGoal(page, driver = keyboardDriver(page)) {
  await driver.down('right');
  await until(page, () => ['TRANSITION', 'ENDING'].includes(window.__ACINCO_DEBUG__.snapshot().mode));
  await driver.up('right');
}

export async function pauseGame(page) {
  await page.keyboard.press('Escape');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await expect(page.getByRole('dialog')).toBeVisible();
}

export async function resumeGame(page) {
  await page.getByRole('button', { name: 'Seguir jugando', exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode !== 'PAUSED');
}

export async function prepareSequence(page, kind) {
  const levelIndex = kind === 'transition' ? 0 : 1;
  await openSaved(page, { version: 1, levelIndex, checkpointId: kind === 'transition' ? 1 : 0, completed: false });
  await continueSaved(page);
  if (kind === 'transition') {
    await approachGoal(page, levels[0]);
    await page.keyboard.down('ArrowRight');
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'TRANSITION');
  } else {
    const from = levels[1].surfaces[0];
    const to = levels[1].surfaces[1];
    await rightTo(page, (from.x + from.width + to.x) / 2);
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'RESPAWNING');
  }
}

export async function captureLevelView(page, level, landmark, profile) {
  const filename = `qa/phase4-environment-${profile}-level${level.id}-${landmark}`;
  await page.screenshot({ path: filename + '.png', fullPage: true });
  await page.locator('canvas').screenshot({ path: filename + '-canvas.png' });
}

export async function finishJourney(page, maps, collect, profile) {
  for (let index = 0; index < maps.length; index++) {
    await waitPlaying(page, index);
    const before = await snapshot(page);
    expect(before.counts.dynamicBodies).toBe(1);
    expect(before.counts.staticBodies).toBe(maps[index].surfaces.length);
    expect(before.counts.colliders).toBe(1);
    expect(before.counts.animationDefinitions).toBe(4);
    if (collect) collect.push(before);
    if (profile) {
      await captureLevelView(page, maps[index], 'start', profile);
      await walkTo(page, maps[index], maps[index].checkpoint.x + 10);
      expect((await snapshot(page)).checkpointId).toBe(1);
      await captureLevelView(page, maps[index], 'checkpoint', profile);
    }
    await approachGoal(page, maps[index]);
    if (profile) {
      await rightTo(page, maps[index].goal.x - 40);
      await captureLevelView(page, maps[index], 'arrival', profile);
    }
    await triggerGoal(page);
  }
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  await expect(page.getByRole('heading', { name: 'Feliz quinto mesiversario, mi vida. Espero y sigamos cumpliendo más.', exact: true })).toBeVisible();
}
