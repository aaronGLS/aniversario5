import { test, expect, start, snapshot, until, waitPlaying, pauseGame, resumeGame, prepareSequence, openSaved, continueSaved, savedProgress, PREFS_KEY } from './helpers.js';
import { config, texts, levels } from '../../src/config.js';
test('desktop touch detection reveals controls and remains sticky across title and continuation', async ({ page }) => {
  await start(page);
  await expect(page.locator('#touch-controls')).toBeHidden();
  // Synthetic only: branch test for a first touch on a device reporting a fine pointer.
  await page.locator('canvas').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 99 });
  await expect(page.locator('#touch-controls')).toBeVisible();
  const right = page.locator('#right-button');
  const box = await right.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await until(page,()=>window.__ACINCO_DEBUG__.snapshot().body.vx>0);
  await page.mouse.up();
  await pauseGame(page);
  await page.locator('#back-button').click();
  await continueSaved(page);
  await expect(page.locator('#touch-controls')).toBeVisible();
});

test('loading progress is driven by actual asset completion', async ({ page }) => {
  let release;
  await page.route('**/auriana-zip-run-right.png', async route => {
    await new Promise(resolve => { release = resolve; });
    await route.continue();
  });
  await page.goto('./');
  await expect(page.locator('#loading-progress')).toBeVisible();
  await expect.poll(() => page.locator('#loading-progress').evaluate(e => e.value)).toBeGreaterThan(0);
  expect(await page.locator('#loading-progress').evaluate(e => e.value)).toBeLessThan(1);
  await expect(page.locator('#start-button')).toBeDisabled();
  release();
  await expect(page.locator('#start-button')).toBeEnabled();
  await expect(page.locator('#loading-progress')).toBeHidden();
});

test('all reference viewports preserve canvas geometry, accessible menus and scroll', async ({ page }, testInfo) => {
  await start(page);
  const cases = [[1366,768], [1920,1080], [390,844], [844,390], [360,640], [640,360], [320,568]];
  for (const [width, height] of cases) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    if ((await snapshot(page)).mode === 'PAUSED') await resumeGame(page);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
      return { width: rect.width, height: rect.height, internal: [canvas.width, canvas.height] };
    });
    expect(metrics.internal).toEqual([480,270]);
    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.width).toBeLessThanOrEqual(961);
    expect(metrics.width / metrics.height).toBeCloseTo(16/9, 2);
    await expect(page.locator('#touch-controls')).toBeHidden();
    await pauseGame(page);
    await expect(page.locator('#resume-button')).toBeFocused();
    for (const button of ['resume-button', 'restart-button', 'skip-button', 'back-button']) {
      await page.locator('#' + button).scrollIntoViewIfNeeded();
      const box = await page.locator('#' + button).boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    await page.locator('#reduce-effects').scrollIntoViewIfNeeded();
    await page.keyboard.press('Tab');
    expect(await page.locator('#pause-dialog').evaluate(e => e.contains(document.activeElement))).toBe(true);
    await page.locator('#skip-button').click();
    await expect(page.locator('#cancel-button')).toBeFocused();
    await page.keyboard.press('Escape');
    expect((await snapshot(page)).mode).toBe('PAUSED');
    await resumeGame(page);
  }
  await page.screenshot({ path: 'qa/phase4-environment-' + testInfo.project.name + '-320.png', fullPage: true });
});

test('helper text changes never move the playfield at minimum width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await start(page);
  const top = await page.locator('canvas').evaluate(e => e.getBoundingClientRect().top);
  await expect(page.locator('#game-status')).toContainText(texts.keyboardHelp, { timeout: 4000 });
  expect(await page.locator('canvas').evaluate(e => e.getBoundingClientRect().top)).toBeCloseTo(top, 0);
  await expect(page.locator('#game-status')).toBeEmpty({ timeout: 6000 });
  expect(await page.locator('canvas').evaluate(e => e.getBoundingClientRect().top)).toBeCloseTo(top, 0);
});

test('motion preference writes once, preserves mute and progress, and survives reload', async ({ page }) => {
  const prefs = { version: 1, muted: true, reducedEffects: false };
  await openSaved(page, { version: 1, levelIndex: 2, checkpointId: 1, completed: false }, prefs);
  await continueSaved(page);
  const progress = await savedProgress(page);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    window.__PHASE3_PREF_WRITES__ = 0;
    Storage.prototype.setItem = function(name, value) { if (name === key) window.__PHASE3_PREF_WRITES__++; return original.call(this, name, value); };
  }, PREFS_KEY);
  await pauseGame(page);
  await expect(page.locator('#reduce-effects')).not.toBeChecked();
  await page.locator('#reduce-effects').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#reduce-effects')).toBeChecked();
  expect(await page.evaluate(() => window.__PHASE3_PREF_WRITES__)).toBe(1);
  expect(await savedProgress(page)).toEqual(progress);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PREFS_KEY)).toEqual({ ...prefs, reducedEffects: true });
  await page.locator('#skip-button').click();
  await page.locator('#cancel-button').click();
  await expect(page.locator('#reduce-effects')).toBeChecked();
  expect(await page.evaluate(() => window.__PHASE3_PREF_WRITES__)).toBe(1);
  await page.reload();
  await continueSaved(page);
  await pauseGame(page);
  await expect(page.locator('#reduce-effects')).toBeChecked();
});

test('stored preference overrides system default and persistence failure keeps the selection usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await pauseGame(page);
  await expect(page.locator('#reduce-effects')).toBeChecked();
  await page.locator('#reduce-effects').uncheck();
  await page.reload();
  await continueSaved(page);
  await pauseGame(page);
  await expect(page.locator('#reduce-effects')).not.toBeChecked();
  await page.evaluate(() => { Storage.prototype.setItem = function() { throw new DOMException('Test quota', 'QuotaExceededError'); }; });
  await page.locator('#reduce-effects').check();
  await expect(page.getByText(texts.saveUnavailable, { exact: true })).toBeVisible();
  await resumeGame(page);
  await pauseGame(page);
  await expect(page.locator('#reduce-effects')).toBeChecked();
  await page.locator('#restart-button').click();
  await waitPlaying(page, 0);
});

for (const kind of ['respawn', 'transition']) for (const phase of ['out', 'in']) {
  test('enabling reduced effects while paused in ' + kind + ' ' + phase + ' finishes once on resume', async ({ page }) => {
    await prepareSequence(page, kind);
    await until(page, expected => window.__ACINCO_DEBUG__.snapshot().sequence?.phase === expected, phase);
    await pauseGame(page);
    await page.keyboard.up('ArrowRight');
    const frozen = await snapshot(page);
    await page.locator('#reduce-effects').check();
    await page.waitForTimeout(450);
    expect((await snapshot(page)).body).toEqual(frozen.body);
    expect((await snapshot(page)).sequence).toEqual(frozen.sequence);
    await resumeGame(page);
    await waitPlaying(page, 1);
    const resumed = await snapshot(page);
    expect(resumed.body.feetX).toBeCloseTo(64, 1);
    expect(resumed.body.vx).toBe(0);
    expect(resumed.counts.staticBodies).toBe(levels[resumed.levelIndex].surfaces.length);
    await page.waitForTimeout(450);
    expect((await snapshot(page)).sequence).toBeNull();
    expect((await snapshot(page)).levelIndex).toBe(1);
  });
}

test('reducing an ending while paused finishes once with dedication focus and natural scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await start(page);
  await pauseGame(page);
  await page.locator('#skip-button').click();
  await page.locator('#confirm-button').click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'ENDING');
  await pauseGame(page);
  await page.locator('#reduce-effects').check();
  await page.waitForTimeout(1700);
  expect((await snapshot(page)).mode).toBe('PAUSED');
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  await expect(page.locator('#ending-heading')).toBeFocused();
  await expect(page.locator('#step-status')).toBeHidden();
  expect(await page.locator('#ending-heading').evaluate(e => getComputedStyle(e).outlineWidth)).toBe('3px');
  for (const height of [330,350,370,390,410,430,450]) {
    await page.setViewportSize({ width: 640, height });
    await page.waitForTimeout(75);
    const box = await page.locator('canvas').boundingBox();
    expect(box.height).toBeGreaterThan(height * .39);
    expect(box.height).toBeLessThanOrEqual(height * .42 + 1);
  }
  for (const viewport of [{ width: 844, height: 390 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(75);
    const textFits = await page.locator('#ending-body').evaluate(element => {
      const box = element.getBoundingClientRect();
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      return box.top >= canvas.bottom && box.left >= 0 && box.right <= window.innerWidth;
    });
    expect(textFits).toBe(true);
    await page.screenshot({ path: `qa/phase4-environment-${testInfo.project.name}-ending-${viewport.width}x${viewport.height}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 640, height: 450 });
  await page.waitForTimeout(75);
  await page.locator('#replay-button').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'qa/phase4-environment-' + testInfo.project.name + '-ending-scroll.png', fullPage: true });
});

test('queued reduced ending keeps skipped effects when preference is disabled before creation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await pauseGame(page);
  await page.locator('#skip-button').click();
  await page.evaluate(() => {
      const panel = document.querySelector('#game-panel');
    const observer = new MutationObserver(() => {
      if (!panel.classList.contains('ending-mode')) return;
      observer.disconnect();
      window.dispatchEvent(new Event('blur'));
      const checkbox = document.querySelector('#reduce-effects');
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  });
  await page.locator('#confirm-button').click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await page.waitForTimeout(100);
  await expect(page.locator('#reduce-effects')).not.toBeChecked();
  expect((await snapshot(page)).visual).toMatchObject({ x: config.ending.aurianaEndX, visible: true, displayWidth: 64, displayHeight: 64 });
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  await expect(page.locator('#ending-heading')).toBeFocused();
});

test('rendered UI contrast and focus indicator meet the specified ratios', async ({ page }, testInfo) => {
  await start(page);
  await pauseGame(page);
  const values = await page.evaluate(() => {
    function rgb(value) { return value.match(/[\d.]+/g).slice(0,3).map(Number); }
    function lum(color) { return color.map(v => v / 255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0); }
    function ratio(a,b) { const x=lum(rgb(a)),y=lum(rgb(b)); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
    const button = getComputedStyle(document.querySelector('#resume-button'));
    const dialog = getComputedStyle(document.querySelector('#pause-dialog'));
    const body = getComputedStyle(document.body);
    const helper = getComputedStyle(document.querySelector('#dialog-body'));
    return {
      body: ratio(body.color, body.backgroundColor), button: ratio(button.color, button.backgroundColor),
      helper: ratio(helper.color, dialog.backgroundColor), focus: ratio(button.outlineColor, dialog.backgroundColor),
      outline: button.outlineWidth, offset: button.outlineOffset,
    };
  });
  expect(values.body).toBeGreaterThanOrEqual(4.5);
  expect(values.button).toBeGreaterThanOrEqual(4.5);
  expect(values.helper).toBeGreaterThanOrEqual(4.5);
  expect(values.focus).toBeGreaterThanOrEqual(3);
  expect(values.outline).toBe('3px');
  expect(values.offset).toBe('3px');
  await page.screenshot({ path: 'qa/phase4-environment-' + testInfo.project.name + '-pause-focus.png', fullPage: true });
  await testInfo.attach('rendered-contrast', { body: JSON.stringify(values), contentType: 'application/json' });
});

