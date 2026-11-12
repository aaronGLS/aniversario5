import { test, expect, start, snapshot, until, openSaved, continueSaved, approachGoal, triggerGoal, savedProgress, pauseGame, resumeGame, waitPlaying, SAVE_KEY, PREFS_KEY } from './helpers.js';
import { config, levels, texts } from '../../src/config.js';

async function triggerFinalGoal(page) {
  await page.keyboard.down('ArrowRight');
  await until(page, () => ['ENDING', 'FINISHED'].includes(window.__ACINCO_DEBUG__.snapshot().mode));
  await page.keyboard.up('ArrowRight');
}

async function startFromFinalCheckpoint(page, prefs = { version: 1, reducedEffects: false, muted: true }) {
  await openSaved(page, { version: 1, levelIndex: 4, checkpointId: 1, completed: false }, prefs);
  await continueSaved(page);
  await approachGoal(page, levels[4]);
  const playCounts = (await snapshot(page)).counts;
  await triggerFinalGoal(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().sceneKey === 'EndingScene');
  return playCounts;
}

async function waitForPhase(page, phase) {
  await until(page, expected => window.__ACINCO_DEBUG__.snapshot().sequence?.phase === expected, phase);
}

test('checkpoint five reveals the reunion once; completed save reload and replay reuse cached textures', async ({ page }, testInfo) => {
  const playCounts = await startFromFinalCheckpoint(page);
  const before = await snapshot(page);
  expect(before.mode).toBe('ENDING');
  expect(before.sequence.phase).toBe('walk');
  expect(before.counts.textures).toBe(playCounts.textures + 2);
  expect(before.aaron).toMatchObject({ x: config.ending.aaronX, feetY: config.ending.groundY, visible: true });
  expect(before.visual.x).toBeGreaterThanOrEqual(config.ending.aurianaStartX);
  expect(before.visual.x).toBeLessThanOrEqual(config.ending.aurianaEndX);
  expect(before.visual).toMatchObject({ feetY: config.ending.groundY, visible: true });

  await page.evaluate(saveKey => {
    const originalSetItem = Storage.prototype.setItem;
    window.__REUNION_COMPLETION_WRITES__ = [];
    Storage.prototype.setItem = function (key, value) {
      if (key === saveKey && JSON.parse(value).completed) window.__REUNION_COMPLETION_WRITES__.push(value);
      return originalSetItem.call(this, key, value);
    };
  }, SAVE_KEY);
  expect((await savedProgress(page)).completed).toBe(false);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');

  const ending = await snapshot(page);
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 4, checkpointId: 1, completed: true });
  expect(await page.evaluate(() => window.__REUNION_COMPLETION_WRITES__.length)).toBe(1);
  expect(ending.sequence).toMatchObject({ phase: 'message' });
  expect(ending.sequence.elapsedMs).toBeCloseTo(2100, 3);
  expect(ending.visual).toMatchObject({ state: 'ending-idle', x: config.ending.aurianaEndX, feetY: config.ending.groundY, visible: true, isPlaying: true });
  expect(ending.aaron).toMatchObject({ x: config.ending.aaronX, feetY: config.ending.groundY, visible: true, isPlaying: true });
  expect(ending.presentation).toMatchObject({
    phase: 'message',
    veilAlpha: config.ending.veilOpacity,
    haloAlpha: config.ending.halo.maxOpacity,
    heart: { y: config.ending.heart.endY, alpha: 1, visible: true },
    dedication: { visible: true, opacity: 1, inert: false, replayVisible: true, headingVisible: true, pauseVisible: false },
  });
  expect(ending.presentation.heart.x).toBeCloseTo((config.ending.aurianaEndX + config.ending.aaronX) / 2);
  expect(ending.counts.textures).toBe(before.counts.textures);
  await expect(page.getByText(texts.endingBody, { exact: true })).toBeVisible();
  await expect(page.getByText(texts.signature, { exact: true })).toBeVisible();
  if (testInfo.project.name === 'chromium') {
    await page.screenshot({ path: 'qa/reencuentro-chromium-desktop.png', fullPage: true });
    await page.locator('canvas').screenshot({ path: 'qa/reencuentro-chromium-desktop-canvas.png' });
  }

  await page.reload();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'TITLE');
  const titleTextureCount = (await snapshot(page)).counts.textures;
  await page.getByRole('button', { name: texts.viewEnding, exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  const reloadedEnding = await snapshot(page);
  expect(reloadedEnding.aaron.visible).toBe(true);
  expect(reloadedEnding.counts.textures).toBe(titleTextureCount + 2);
  await page.getByRole('button', { name: texts.replay, exact: true }).click();
  await waitPlaying(page, 0);
  expect((await snapshot(page)).counts.textures).toBe(reloadedEnding.counts.textures);
});

test('pause freezes every reunion phase and the DOM dedication opacity', async ({ page }) => {
  await startFromFinalCheckpoint(page);
  for (const phase of ['walk', 'settle', 'light', 'heart', 'dedication']) {
    await waitForPhase(page, phase);
    await pauseGame(page);
    const frozen = await snapshot(page);
    await page.waitForTimeout(120);
    const later = await snapshot(page);
    expect(later.sequence).toEqual(frozen.sequence);
    expect(later.presentation).toEqual(frozen.presentation);
    expect(later.mode).toBe('PAUSED');
    await resumeGame(page);
  }
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
});

test('reduced effects starts with a static pair, fixed light and direct dedication', async ({ page }) => {
  await startFromFinalCheckpoint(page, { version: 1, reducedEffects: true, muted: true });
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  const state = await snapshot(page);
  expect(state.presentation.reducedAtStart).toBe(true);
  expect(state.sequence).toMatchObject({ phase: 'message', elapsedMs: 2100 });
  expect(state.visual).toMatchObject({ state: 'ending-idle', texture: 'auriana.idle', x: config.ending.aurianaEndX, visible: true, isPlaying: false });
  expect(Number(state.visual.frame)).toBe(0);
  expect(state.aaron).toMatchObject({ texture: 'aaron.idle', x: config.ending.aaronX, visible: true, isPlaying: false });
  expect(Number(state.aaron.frame)).toBe(0);
  expect(state.presentation).toMatchObject({
    veilAlpha: config.ending.veilOpacity,
    haloAlpha: config.ending.halo.maxOpacity,
    heart: { y: config.ending.heart.endY, alpha: 1, visible: true },
    dedication: { visible: true, opacity: 1, inert: false, replayVisible: true },
  });
});

test('reduced-effects preference latches through a pause even if disabled before resume', async ({ page }) => {
  await startFromFinalCheckpoint(page);
  await pauseGame(page);
  await page.locator('#reduce-effects').check();
  await page.locator('#reduce-effects').uncheck();
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  const state = await snapshot(page);
  expect(state.presentation.reducedAtStart).toBe(true);
  expect(state.visual.isPlaying).toBe(false);
  expect(state.aaron.isPlaying).toBe(false);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).reducedEffects, PREFS_KEY)).toBe(false);
});

test('reduced effects enabled and disabled during a queued handoff stays latched until resume', async ({ page }) => {
  await start(page);
  await pauseGame(page);
  await page.getByRole('button', { name: texts.skipEnding, exact: true }).click();
  await page.evaluate(() => {
    const panel = document.querySelector('#game-panel');
    const observer = new MutationObserver(() => {
      if (!panel.classList.contains('ending-mode')) return;
      observer.disconnect();
      window.dispatchEvent(new Event('blur'));
      const checkbox = document.querySelector('#reduce-effects');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  });
  await page.getByRole('button', { name: texts.skipConfirmYes, exact: true }).click();
  await until(page, () => {
    const state = window.__ACINCO_DEBUG__.snapshot();
    return state.mode === 'PAUSED' && state.resumeMode === 'ENDING';
  });
  await expect(page.locator('#reduce-effects')).not.toBeChecked();
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  const state = await snapshot(page);
  expect(state.presentation.reducedAtStart).toBe(true);
  expect(state.visual.isPlaying).toBe(false);
  expect(state.aaron.isPlaying).toBe(false);
});

test('cancelling an active reunion stops all future phase callbacks and completion writes', async ({ page }) => {
  await startFromFinalCheckpoint(page);
  await page.evaluate(saveKey => {
    const originalSetItem = Storage.prototype.setItem;
    window.__REUNION_COMPLETION_WRITES__ = [];
    Storage.prototype.setItem = function (key, value) {
      if (key === saveKey && JSON.parse(value).completed) window.__REUNION_COMPLETION_WRITES__.push(value);
      return originalSetItem.call(this, key, value);
    };
  }, SAVE_KEY);
  await waitForPhase(page, 'heart');
  await pauseGame(page);
  await page.getByRole('button', { name: texts.backToTitle, exact: true }).click();
  expect((await snapshot(page)).mode).toBe('TITLE');
  await page.waitForTimeout(2200);
  expect((await snapshot(page)).mode).toBe('TITLE');
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 4, checkpointId: 1, completed: false });
  expect(await page.evaluate(() => window.__REUNION_COMPLETION_WRITES__.length)).toBe(0);
});

test('pause shortcut to the final enters the same reunion and saves completion', async ({ page }) => {
  await start(page);
  await pauseGame(page);
  await page.getByRole('button', { name: texts.skipEnding, exact: true }).click();
  await page.getByRole('button', { name: texts.skipConfirmYes, exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  const state = await snapshot(page);
  expect(state.visual).toMatchObject({ x: config.ending.aurianaEndX, visible: true });
  expect(state.aaron).toMatchObject({ x: config.ending.aaronX, visible: true });
  expect((await savedProgress(page)).completed).toBe(true);
});

test('Firefox smoke: completed save can reopen the reunion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'firefox');
  await openSaved(page, { version: 1, levelIndex: 4, checkpointId: 1, completed: true }, { version: 1, reducedEffects: true, muted: true });
  await page.getByRole('button', { name: texts.viewEnding, exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  expect((await snapshot(page)).aaron.visible).toBe(true);
  await expect(page.getByText(texts.endingBody, { exact: true })).toBeVisible();
});
