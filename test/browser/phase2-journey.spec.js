import { test, expect, start, snapshot, until, rightTo, leftTo, jump, walkTo, fallAndRespawn, openSaved, continueSaved, savedProgress, waitPlaying, walkObstacles, approachGoal, triggerGoal, finishJourney, SAVE_KEY, PREFS_KEY } from './helpers.js';
import { levels, texts } from '../../src/config.js';
import fs from 'node:fs/promises';

test('complete keyboard journey through five canonical maps, dedication and replay', async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await start(page, true);
  const visited = [];
  await finishJourney(page, levels, visited, testInfo.project.name);
  expect(visited.map(s => s.levelIndex)).toEqual([0, 1, 2, 3, 4]);
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 4, checkpointId: 1, completed: true });
  await expect(page.getByText('Te amo.', { exact: true })).toBeVisible();
  await expect(page.getByText('— Aarón', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pausa', exact: true })).toBeHidden();
  await page.screenshot({ path: 'qa/phase4-environment-' + testInfo.project.name + '-ending.png', fullPage: true });
  await page.getByRole('button', { name: 'Volver a jugar', exact: true }).click();
  await waitPlaying(page, 0);
  expect((await snapshot(page)).checkpointId).toBe(0);
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 0, checkpointId: 0, completed: false });
  await fs.writeFile('qa/phase4-environment-' + testInfo.project.name + '-journey.json',
    JSON.stringify({ browser: testInfo.project.name, visited }, null, 2) + '\n');
});

for (const levelIndex of [2, 3]) {
  test('new map ' + (levelIndex + 1) + ' obstacles work in both directions', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await openSaved(page, { version: 1, levelIndex, checkpointId: 0, completed: false });
    await continueSaved(page);
    await approachGoal(page, levels[levelIndex]);
    await page.screenshot({ path: 'qa/phase4-environment-' + testInfo.project.name + '-step' + (levelIndex + 1) + '.png', fullPage: true });
    await walkObstacles(page, levels[levelIndex], true);
    await leftTo(page, 64);
    const returned = await snapshot(page);
    expect(returned.levelIndex).toBe(levelIndex);
    expect(returned.mode).toBe('PLAYING');
    expect(returned.body.feetY).toBeCloseTo(224, 1);
    expect(returned.counts.staticBodies).toBe(levels[levelIndex].surfaces.length);
  });
}

test('level three activates, respawns and reloads at its elevated checkpoint', async ({ page }) => {
  await openSaved(page, { version: 1, levelIndex: 2, checkpointId: 0, completed: false });
  await continueSaved(page);
  const level = levels[2];
  await walkTo(page, level, level.checkpoint.x + 10);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().checkpointId === 1);
  expect((await snapshot(page)).body.feetY).toBeCloseTo(192, 1);
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 2, checkpointId: 1, completed: false });
  await fallAndRespawn(page);
  await waitPlaying(page, 2);
  let point = await snapshot(page);
  expect(point.body.feetX).toBeCloseTo(level.checkpoint.x, 1);
  expect(point.body.feetY).toBeCloseTo(192, 1);
  await page.reload();
  await continueSaved(page);
  point = await snapshot(page);
  expect(point.body.feetX).toBeCloseTo(level.checkpoint.x, 1);
  expect(point.body.feetY).toBeCloseTo(192, 1);
  await jump(page);
  expect((await snapshot(page)).body.vy).toBeLessThan(0);
});

test('fifth goal rejects an airborne arrival and finishes only on landing', async ({ page }) => {
  await openSaved(page, { version: 1, levelIndex: 4, checkpointId: 1, completed: false });
  await continueSaved(page);
  const level = levels[4];
  await approachGoal(page, level);
  await rightTo(page, level.goal.x - 60);
  await page.keyboard.down('ArrowRight');
  await jump(page);
  await until(page, x => window.__ACINCO_DEBUG__.snapshot().body.feetX >= x - 10, level.goal.x);
  await page.keyboard.up('ArrowRight');
  const airborne = await snapshot(page);
  expect(airborne.mode).toBe('PLAYING');
  expect(airborne.levelIndex).toBe(4);
  expect(airborne.body.grounded).toBe(false);
  expect((await savedProgress(page)).completed).toBe(false);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'ENDING');
  expect((await savedProgress(page)).completed).toBe(false);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  expect((await savedProgress(page)).completed).toBe(true);
});

test('completed title can replay ending; full reset confirms and preserves preferences', async ({ page }) => {
  const prefs = { version: 1, muted: true, reducedEffects: true };
  await openSaved(page, { version: 1, levelIndex: 0, checkpointId: 0, completed: true }, prefs);
  await expect(page.getByRole('button', { name: 'Volver a ver nuestro encuentro', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Empezar desde el principio', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  expect((await snapshot(page)).mode).toBe('TITLE');
  expect((await savedProgress(page)).completed).toBe(true);
  await page.getByRole('button', { name: 'Volver a ver nuestro encuentro', exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  await page.getByRole('button', { name: 'Volver a jugar', exact: true }).click();
  await waitPlaying(page, 0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PREFS_KEY)).toEqual(prefs);
  await page.reload();
  await page.getByRole('button', { name: 'Continuar nuestro camino', exact: true }).click();
  await waitPlaying(page, 0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuar nuestro camino', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Empezar desde el principio', exact: true }).click();
  await waitPlaying(page, 0); // Fresh cp0 has no attained progress, so no confirmation.
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PREFS_KEY)).toEqual(prefs);
});

test('corrupt and out-of-range saves are discarded without blocking a new game', async ({ page }) => {
  await openSaved(page, '{bad json');
  await expect(page.getByRole('button', { name: 'Empezar nuestro camino', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Continuar nuestro camino', exact: true })).toBeHidden();
  await openSaved(page, { version: 1, levelIndex: 5, checkpointId: 0, completed: false });
  await page.getByRole('button', { name: 'Empezar nuestro camino', exact: true }).click();
  await waitPlaying(page, 0);
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 0, checkpointId: 0, completed: false });
});

test('denied localStorage still permits the complete five-map journey in memory', async ({ page }) => {
  test.setTimeout(360_000);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Denied for test', 'SecurityError'); } });
  });
  await start(page);
  await expect(page.getByText(texts.saveUnavailable, { exact: true })).toBeVisible();
  await finishJourney(page, levels);
  expect((await snapshot(page)).completed).toBe(true);
  await page.getByRole('button', { name: 'Volver a jugar', exact: true }).click();
  await waitPlaying(page, 0);
});

test('write failure falls back to in-memory continuation and effects-reduced sequences are immediate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new DOMException('Quota for test', 'QuotaExceededError'); };
  });
  await start(page);
  await expect(page.getByText(texts.saveUnavailable, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await continueSaved(page);
  expect((await snapshot(page)).levelIndex).toBe(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, vamos al encuentro', exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  await expect(page.getByRole('heading', { name: 'Feliz quinto mesiversario, mi vida. Espero y sigamos cumpliendo más.', exact: true })).toBeVisible();
});

test('invalid preferences use defaults without disabling valid progress persistence', async ({ page }) => {
  await openSaved(page, { version: 1, levelIndex: 2, checkpointId: 1, completed: false }, '{bad prefs');
  await continueSaved(page);
  expect((await snapshot(page)).levelIndex).toBe(2);
  expect((await snapshot(page)).body.feetY).toBeCloseTo(192, 1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reiniciar este paso', exact: true }).click();
  await waitPlaying(page, 2);
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 2, checkpointId: 0, completed: false });
});
