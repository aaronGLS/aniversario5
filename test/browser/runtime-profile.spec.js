import { levels } from '../../src/config.js';
import { observeResources } from './runtime-helpers.js';

import { test, expect, start, snapshot, until, rightTo, leftTo, finishFirst, fallAndRespawn, assertStableCounts, openSaved, continueSaved, pauseGame, waitPlaying } from './helpers.js';
import fs from 'node:fs/promises';

test.use({ trace: 'off' });

test('ten respawns preserve bounded bodies, textures and listeners', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page);
  await finishFirst(page);
  const before = (await snapshot(page)).counts;
  const cycles = [];
  for (let index = 0; index < 10; index++) {
    await fallAndRespawn(page);
    const state = await snapshot(page);
    assertStableCounts(before, state.counts);
    expect(state.body.feetX).toBeCloseTo(64, 1);
    cycles.push({ cycle: index + 1, counts: state.counts });
  }
  await fs.writeFile('qa/phase4-environment-respawn-counts.json', JSON.stringify({ before, cycles }, null, 2) + '\n');
});

test('ten restart, title and continue cycles preserve canonical map resources', async ({ page }) => {
  test.setTimeout(180_000);
  await observeResources(page);
  await openSaved(page, { version: 1, levelIndex: 3, checkpointId: 1, completed: false });
  await continueSaved(page);
  const before = (await snapshot(page)).counts;
  const domBefore = await page.evaluate(() => window.__PHASE3_RESOURCES__?.());
  const cycles = [];
  for (let index = 0; index < 10; index++) {
    await pauseGame(page);
    await page.getByRole('button', { name: 'Reiniciar este paso', exact: true }).click();
    await waitPlaying(page, 3);
    assertStableCounts(before, (await snapshot(page)).counts, levels[3].surfaces.length);
    await pauseGame(page);
    await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
    await continueSaved(page);
    const state = await snapshot(page);
    assertStableCounts(before, state.counts, levels[3].surfaces.length);
    const domListeners = await page.evaluate(() => window.__PHASE3_RESOURCES__());
    expect(domListeners).toEqual(domBefore);
    cycles.push({ cycle: index + 1, counts: state.counts, domListeners });
  }
  await fs.writeFile('qa/phase4-environment-restart-counts.json', JSON.stringify({ before, domBefore, cycles }, null, 2) + '\n');
});

test('ten ending and replay cycles preserve gameplay and global resources', async ({ page }) => {
  test.setTimeout(90_000);
  await observeResources(page);
  await start(page);
  const before = (await snapshot(page)).counts;
  const domBefore = await page.evaluate(() => window.__PHASE3_RESOURCES__());
  const cycles = [];
  let replayCounts = null;
  let endingTextureCount = null;
  for (let index = 0; index < 10; index++) {
    await pauseGame(page);
    await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
    await page.getByRole('button', { name: 'Sí, vamos al encuentro', exact: true }).click();
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
    const endingCounts = (await snapshot(page)).counts;
    expect(endingCounts.animationDefinitions).toBe(4);
    expect(endingCounts.canvases).toBe(1);
    if (endingTextureCount === null) {
      expect(endingCounts.textures).toBe(before.textures + 2);
      endingTextureCount = endingCounts.textures;
    } else {
      expect(endingCounts.textures).toBe(endingTextureCount);
    }
    await page.getByRole('button', { name: 'Volver a jugar', exact: true }).click();
    await waitPlaying(page, 0);
    const state = await snapshot(page);
    expect(state.counts.textures).toBe(endingTextureCount);
    if (replayCounts === null) replayCounts = state.counts;
    else assertStableCounts(replayCounts, state.counts);
    const domListeners = await page.evaluate(() => window.__PHASE3_RESOURCES__());
    expect(domListeners).toEqual(domBefore);
    cycles.push({ cycle: index + 1, counts: state.counts, endingCounts, domListeners });
  }
  await fs.writeFile('qa/phase4-environment-ending-counts.json', JSON.stringify({ before, domBefore, cycles }, null, 2) + '\n');
});

for (const profileMap of [0, 3]) {
  test('thirty-second desktop movement profile map ' + (profileMap + 1), async ({ page }, testInfo) => {
    test.setTimeout(80_000);
    if (profileMap === 0) await start(page);
    else {
      await openSaved(page, { version: 1, levelIndex: profileMap, checkpointId: 1, completed: false });
      await continueSaved(page);
    }
    await page.waitForTimeout(1_000);
    const profiling = page.evaluate(async () => {
      const intervals = [];
      const engineSamples = [];
      const longTasks = [];
      const observer = typeof PerformanceObserver !== 'undefined' &&
        PerformanceObserver.supportedEntryTypes.includes('longtask')
        ? new PerformanceObserver(list => {
            for (const entry of list.getEntries()) longTasks.push({ start: entry.startTime, duration: entry.duration });
          }) : null;
      observer?.observe({ type: 'longtask' });
      const started = performance.now();
      let previous = started;
      let lastSample = started;
      await new Promise(resolve => {
        const frame = now => {
          intervals.push(now - previous);
          previous = now;
          if (now - lastSample >= 1_000) {
            engineSamples.push(window.__ACINCO_DEBUG__.snapshot().timing);
            lastSample = now;
          }
          if (now - started >= 30_000) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      observer?.disconnect();
      intervals.shift();
      const ordered = [...intervals].sort((a, b) => a - b);
      const sum = intervals.reduce((total, value) => total + value, 0);
      const canvas = document.querySelector('canvas');
      return {
        durationMs: performance.now() - started,
        frames: intervals.length,
        meanFps: intervals.length * 1_000 / sum,
        medianFrameMs: ordered[Math.floor(ordered.length * .5)],
        p95FrameMs: ordered[Math.floor(ordered.length * .95)],
        maxFrameMs: ordered.at(-1),
        framesOver50Ms: intervals.filter(value => value > 50).length,
        engineSamples,
        longTasks,
        canvas: { width: canvas.width, height: canvas.height },
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        userAgent: navigator.userAgent,
      };
    });
    const started = Date.now();
    while (Date.now() - started < 30_000) {
      await rightTo(page, profileMap === 0 ? 300 : levels[profileMap].checkpoint.x + 80);
      await leftTo(page, profileMap === 0 ? 64 : levels[profileMap].checkpoint.x - 80);
    }
    const profile = await profiling;
    profile.browser = testInfo.project.name;
    profile.levelIndex = profileMap;
    profile.finalCounts = (await snapshot(page)).counts;
    expect(profile.durationMs).toBeGreaterThanOrEqual(30_000);
    expect(profile.frames).toBeGreaterThan(0);
    expect(profile.canvas).toEqual({ width: 480, height: 270 });
    await fs.writeFile('qa/phase4-environment-performance-step' + (profileMap + 1) + '.json', JSON.stringify(profile, null, 2) + '\n');
    await testInfo.attach('frame-profile', { body: JSON.stringify(profile, null, 2), contentType: 'application/json' });
  });
}
