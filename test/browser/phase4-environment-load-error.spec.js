import { test, expect } from '@playwright/test';
import { texts } from '../../src/config.js';

for (const extension of ['png', 'json']) {
  test(`a missing atlas ${extension} stops loading and retry preserves saved progress`, async ({ page }) => {
    const pageErrors = [];
    const failedRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    const blocked = `**/environment/environment.${extension}`;
    await page.route(blocked, (route) => route.abort());
    await page.goto('./');
    await expect(page.getByRole('button', { name: texts.retry, exact: true })).toBeEnabled();
    await expect(page.getByText(texts.loadError, { exact: true })).toBeVisible();
    await expect(page.locator('#game-panel')).toBeHidden();
    await page.evaluate(() => localStorage.setItem('acinco5.save.v1', JSON.stringify({ version: 1, levelIndex: 2, checkpointId: 1, completed: false })));
    expect(pageErrors).toEqual([]);
    expect(failedRequests.length).toBeGreaterThan(0);
    expect(failedRequests.every((url) => url.endsWith(`/environment/environment.${extension}`))).toBe(true);
    await page.unroute(blocked);
    await page.getByRole('button', { name: texts.retry, exact: true }).click();
    await expect(page.getByRole('button', { name: texts.continue, exact: true })).toBeEnabled();
    await page.getByRole('button', { name: texts.continue, exact: true }).click();
    await page.waitForFunction(() => window.__ACINCO_DEBUG__.snapshot().body.grounded);
    const restored = await page.evaluate(() => window.__ACINCO_DEBUG__.snapshot());
    expect(restored.levelIndex).toBe(2);
    expect(restored.checkpointId).toBe(1);
    expect(restored.body.feetX).toBeCloseTo(1536, 1);
    expect(pageErrors).toEqual([]);
  });
}
