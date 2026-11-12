import { test, expect, openSaved, until } from './helpers.js';
import { texts } from '../../src/config.js';

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  const orientation = viewport.width < viewport.height ? 'portrait' : 'landscape';
  test(`touch final keeps the reunion and dedication readable in ${orientation}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openSaved(page, { version: 1, levelIndex: 4, checkpointId: 1, completed: true }, { version: 1, reducedEffects: false, muted: true });
    await page.getByRole('button', { name: texts.viewEnding, exact: true }).tap();
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
    await expect(page.locator('#ending-heading')).toBeFocused();
    await expect(page.getByText(texts.endingBody, { exact: true })).toBeVisible();
    await expect(page.getByText(texts.signature, { exact: true })).toBeVisible();
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      const body = document.querySelector('#ending-body').getBoundingClientRect();
      return { canvasHeight: canvas.height, bodyTop: body.top, canvasBottom: canvas.bottom, bodyLeft: body.left, bodyRight: body.right };
    });
    expect(geometry.canvasHeight).toBeLessThanOrEqual(viewport.height * .42 + 1);
    expect(geometry.bodyTop).toBeGreaterThanOrEqual(geometry.canvasBottom);
    expect(geometry.bodyLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.bodyRight).toBeLessThanOrEqual(viewport.width);
    await page.getByRole('button', { name: texts.replay, exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: texts.replay, exact: true })).toBeVisible();
    await page.screenshot({ path: `qa/reencuentro-touch-${orientation}.png`, fullPage: true });
    await page.getByRole('button', { name: texts.replay, exact: true }).tap();
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PLAYING');
    await expect(page.locator('#game-container')).toBeFocused();
    expect(await page.locator('#ending-panel').evaluate(element => ({ hidden: element.hidden, inert: element.inert }))).toEqual({ hidden: true, inert: true });
    await expect(page.locator('#replay-button')).toBeHidden();
  });
}
