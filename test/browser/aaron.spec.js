import { test, expect, start, snapshot, openSaved, continueSaved, rightTo, until, pauseGame, resumeGame, waitPlaying } from './helpers.js';
import { config, levels, texts } from '../../src/config.js';
import { writeFile } from 'node:fs/promises';

test('imported Aaron waits, animates, pauses and appears in the final approach', async ({ page }, testInfo) => {
  const requests = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await start(page);
  expect((await snapshot(page)).aaron).toBeNull();
  await openSaved(page, { version: 1, levelIndex: 4, checkpointId: 1, completed: false }, { version: 1, reducedEffects: false, muted: true });
  await continueSaved(page);
  const before = (await snapshot(page)).counts;
  await rightTo(page, levels[4].goal.x - 40);

  const samples = await page.evaluate(async duration => {
    const changes = [];
    const started = performance.now();
    await new Promise(resolve => {
      const sample = now => {
        const actor = window.__ACINCO_DEBUG__.snapshot().aaron;
        if (changes.at(-1)?.frame !== actor.frame) changes.push(actor);
        if (now - started >= duration) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return changes;
  }, config.aaron.idleFrames * config.aaron.idleFrameMs + 250);
  expect([...new Set(samples.map(sample => Number(sample.frame)))].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(samples.some((sample, index) => Number(sample.frame) === 7 && Number(samples[index + 1]?.frame) === 0)).toBe(true);
  for (const actor of samples) {
    expect(actor).toMatchObject({ texture: 'aaron.idle', x: levels[4].aaron.x, feetY: levels[4].aaron.feetY, displayWidth: 64, displayHeight: 64, originX: .5, originY: 62 / 64, flipX: false, visible: true, hasBody: false });
  }
  await page.screenshot({ path: `qa/aaron-zip-${testInfo.project.name}-desktop.png`, fullPage: true });
  await pauseGame(page);
  const paused = (await snapshot(page)).aaron;
  await page.waitForTimeout(config.aaron.idleFrameMs * 3);
  expect((await snapshot(page)).aaron).toEqual(paused);
  await resumeGame(page);
  await until(page, frame => window.__ACINCO_DEBUG__.snapshot().aaron.frame !== frame, paused.frame);

  // Resize the real scene for visual checks; movement and touch controls are unchanged.
  for (const [name, viewport] of [
    ['portrait', { width: 390, height: 844 }],
    ['landscape', { width: 844, height: 390 }],
    ['desktop-restored', { width: 1280, height: 800 }],
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if ((await snapshot(page)).mode === 'PAUSED') await resumeGame(page);
    await expect(page.locator('canvas')).toBeVisible();
    await page.screenshot({ path: `qa/aaron-zip-${testInfo.project.name}-${name}.png`, fullPage: true });
  }

  // Observe the short approach and pause via the supported focus-loss event.
  await page.evaluate(() => {
    const observe = () => {
      const state = window.__ACINCO_DEBUG__.snapshot();
      if (state.sceneKey === 'EndingScene' && state.aaron?.visible) window.dispatchEvent(new Event('blur'));
      else requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  });
  await page.keyboard.down('ArrowRight');
  await until(page, () => {
    const state = window.__ACINCO_DEBUG__.snapshot();
    return state.mode === 'PAUSED' && state.resumeMode === 'ENDING';
  });
  await page.keyboard.up('ArrowRight');
  const endingActor = (await snapshot(page)).aaron;
  expect(endingActor).toMatchObject({ texture: 'aaron.idle', x: config.ending.aaronX, feetY: config.ending.groundY, displayWidth: 64, displayHeight: 64, visible: true, flipX: false, hasBody: false });
  await page.waitForTimeout(config.aaron.idleFrameMs * 3);
  expect((await snapshot(page)).aaron).toEqual(endingActor);
  // Save actual canvas pixels so the DOM pause dialog cannot obscure the actors.
  const approachPixels = await page.locator('canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  await writeFile(`qa/aaron-zip-${testInfo.project.name}-approach.png`, Buffer.from(approachPixels, 'base64'));
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  expect((await snapshot(page)).aaron).toMatchObject({ x: config.ending.aaronX, feetY: config.ending.groundY, visible: true, alpha: 1 });
  expect((await snapshot(page)).visual).toMatchObject({ x: config.ending.aurianaEndX, feetY: config.ending.groundY, visible: true, alpha: 1 });
  await expect(page.getByText(texts.endingBody, { exact: true })).toBeVisible();
  await page.screenshot({ path: `qa/aaron-zip-${testInfo.project.name}-final.png`, fullPage: true });
  await page.getByRole('button', { name: texts.replay, exact: true }).click();
  await waitPlaying(page, 0);
  const replay = await snapshot(page);
  expect(replay.aaron).toBeNull();
  expect(replay.counts.animationDefinitions).toBe(before.animationDefinitions);
  expect(replay.counts.dynamicBodies).toBe(1);
  expect(requests.some(path => path.endsWith('/regalo/assets/sprites/aaron-idle-left.png'))).toBe(true);
  expect(requests.some(path => path.includes('/Idle/') || path.endsWith('.zip') || path.includes('camino.mp3'))).toBe(false);
});
