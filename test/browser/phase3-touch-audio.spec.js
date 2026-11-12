import { test, expect, until } from './helpers.js';
import { texts } from '../../src/config.js';

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  const orientation = viewport.width < viewport.height ? 'portrait' : 'landscape';
  test(`touch audio can mute and resume in ${orientation} without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await until(page, () => window.__ACINCO_DEBUG__?.snapshot().mode === 'TITLE');
    await page.getByRole('button', { name: texts.start, exact: true }).tap();
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PLAYING' && window.__ACINCO_DEBUG__.snapshot().audio.playing);
    await page.locator('#pause-button').tap();
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
    await page.screenshot({ path: `qa/music-touch-${orientation}-pause.png`, fullPage: true });
    await page.getByRole('button', { name: texts.mute, exact: true }).tap();
    expect((await page.evaluate(() => window.__ACINCO_DEBUG__.snapshot().audio)).muted).toBe(true);
    await page.getByRole('button', { name: texts.resume, exact: true }).tap();
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PLAYING');
    expect((await page.evaluate(() => window.__ACINCO_DEBUG__.snapshot().audio)).playing).toBe(false);

    await page.locator('#pause-button').tap();
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
    await page.getByRole('button', { name: texts.unmute, exact: true }).tap();
    await page.getByRole('button', { name: texts.resume, exact: true }).tap();
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PLAYING' && window.__ACINCO_DEBUG__.snapshot().audio.playing);
    const bounds = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      audioButtonVisible: document.querySelector('#sound-button').hidden === false,
    }));
    expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewportWidth + 1);
    expect(bounds.audioButtonVisible).toBe(true);
  });
}
