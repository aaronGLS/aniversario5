import { test, expect, start, snapshot, until, jump, pauseGame, resumeGame } from './helpers.js';

const idleTexture = 'auriana.idle';
const runTexture = 'auriana.run';
const airTexture = 'auriana.air';

function checkGeometry(visual) {
  expect(visual.displayWidth).toBe(64);
  expect(visual.displayHeight).toBe(64);
  expect(visual.originX).toBe(.5);
  expect(visual.originY).toBe(62 / 64);
  expect(visual.bodyWidth).toBe(18);
  expect(visual.bodyHeight).toBe(36);
  expect(visual.bodyOffsetX).toBe(23);
  expect(visual.bodyOffsetY).toBe(26);
}

async function recordFrames(page, durationMs) {
  return page.evaluate(async duration => {
    const changes = [];
    const started = performance.now();
    let previous = '';
    await new Promise(resolve => {
      const sample = now => {
        const s = window.__ACINCO_DEBUG__.snapshot();
        const marker = s.visual.state + ':' + s.visual.texture + ':' + s.visual.frame;
        if (marker !== previous) {
          changes.push({ elapsed: now - started, visual: s.visual, feetY: s.body.feetY });
          previous = marker;
        }
        if (now - started >= duration) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return changes;
  }, durationMs);
}

test('Auriana loads the three imported resources and plays all four idle frames', async ({ page }, testInfo) => {
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/assets/sprites/')) requests.push(new URL(request.url()).pathname.split('/').at(-1));
  });
  await start(page);
  const initial = await snapshot(page);
  expect(initial.visual.state).toBe('idle');
  expect(initial.visual.texture).toBe(idleTexture);
  expect(initial.counts.animationDefinitions).toBe(4);
  checkGeometry(initial.visual);
  expect(initial.body.feetY).toBeCloseTo(224, 1);
  expect(requests.sort()).toEqual([
    'aaron-idle-left.png',
    'auriana-zip-air-right.png',
    'auriana-zip-idle-right.png',
    'auriana-zip-run-right.png',
  ]);
  const sequence = await recordFrames(page, 1_800);
  expect([...new Set(sequence.map(s => Number(s.visual.frame)))].sort()).toEqual([0, 1, 2, 3]);
  for (const item of sequence) {
    checkGeometry(item.visual);
    expect(item.visual.texture).toBe(idleTexture);
    expect(item.feetY).toBeCloseTo(224, 1);
  }
  await page.screenshot({ path: 'qa/auriana-zip-' + testInfo.project.name + '-idle.png', fullPage: true });
});

test('Auriana cycles all eight running frames including 8 to 1 and mirrors her right profile', async ({ page }, testInfo) => {
  await start(page);
  await page.keyboard.down('ArrowRight');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().visual.state === 'run');
  const sequence = await recordFrames(page, 900);
  const frames = sequence.map(s => Number(s.visual.frame));
  expect([...new Set(frames)].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(frames.some((frame, i) => frame === 3 && frames[i + 1] === 4)).toBe(true);
  expect(frames.some((frame, i) => frame === 7 && frames[i + 1] === 0)).toBe(true);
  for (let i = 1; i < frames.length; i++) expect(frames[i]).toBe((frames[i - 1] + 1) % 8);
  for (const item of sequence) {
    expect(item.visual.state).toBe('run');
    expect(item.visual.texture).toBe(runTexture);
    expect(item.visual.flipX).toBe(false);
    checkGeometry(item.visual);
  }
  await page.screenshot({ path: 'qa/auriana-zip-' + testInfo.project.name + '-run-right.png', fullPage: true });
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await until(page, () => {
    const s = window.__ACINCO_DEBUG__.snapshot();
    return s.visual.state === 'run' && s.visual.flipX && s.body.vx < 0;
  });
  const reflected = await snapshot(page);
  expect(reflected.visual.texture).toBe(runTexture);
  checkGeometry(reflected.visual);
  await page.screenshot({ path: 'qa/auriana-zip-' + testInfo.project.name + '-run-left.png', fullPage: true });
  await page.keyboard.up('ArrowLeft');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().visual.state === 'idle');
  expect((await snapshot(page)).visual.flipX).toBe(true);
});

test('Auriana preserves frame size and body through takeoff, flight and landing', async ({ page }, testInfo) => {
  await start(page);
  await jump(page);
  const rising = await snapshot(page);
  expect(rising.visual.state).toBe('air');
  expect(rising.visual.texture).toBe(airTexture);
  checkGeometry(rising.visual);
  await page.screenshot({ path: 'qa/auriana-zip-' + testInfo.project.name + '-air.png', fullPage: true });
  await until(page, () => {
    const s = window.__ACINCO_DEBUG__.snapshot();
    return !s.body.grounded && s.body.vy > 0;
  });
  const falling = await snapshot(page);
  expect(falling.visual.texture).toBe(airTexture);
  expect(falling.visual.state).toBe('air');
  checkGeometry(falling.visual);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  const landed = await snapshot(page);
  expect(landed.visual.texture).toBe(idleTexture);
  expect(landed.visual.state).toBe('idle');
  checkGeometry(landed.visual);
  expect(landed.body.feetY).toBeCloseTo(224, 1);
});

test('the nine-frame jump plays once, pauses and restarts on a fresh jump', async ({ page }) => {
  await start(page);
  const firstJumpFrames = recordFrames(page, 1_000);
  await jump(page);
  const sequence = await firstJumpFrames;
  const airborne = sequence.filter(item => item.visual.state === 'air');
  expect(airborne.map(item => Number(item.visual.frame))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  airborne.forEach(item => checkGeometry(item.visual));
  expect((await snapshot(page)).visual.state).toBe('idle');

  // Observe before input: a browser round trip after keyup may take >85 ms.
  const secondJumpFrames = recordFrames(page, 1_500);
  await jump(page);
  await pauseGame(page);
  const paused = await snapshot(page);
  await page.waitForTimeout(250);
  const stillPaused = await snapshot(page);
  expect(stillPaused.visual.frame).toBe(paused.visual.frame);
  expect(stillPaused.body.feetY).toBe(paused.body.feetY);
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  checkGeometry((await snapshot(page)).visual);
  const restarted = (await secondJumpFrames).filter(item => item.visual.state === 'air');
  expect(Number(restarted[0].visual.frame)).toBe(0);
});
