import { test as baseTest, expect } from './helpers.js';
import {
  fallAndRespawn,
  finishFirst,
  approachGoal,
  triggerGoal,
  pauseGame,
  snapshot,
  until,
  waitPlaying,
  continueSaved,
  PREFS_KEY,
  SAVE_KEY,
} from './helpers.js';
import { config, levels, texts } from '../../src/config.js';

const test = baseTest;

function isMusicUrl(url) {
  try { return new URL(url).pathname.endsWith('/assets/audio/camino.mp3'); }
  catch { return false; }
}

const negativeAudioTest = baseTest.extend({
  audit: [async ({ page }, use, testInfo) => {
    const failures = [];
    const allow404 = testInfo.title.includes('audio 404');
    const allowDecodeError = testInfo.title.includes('audio decode failure');
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const expectedDecode = allowDecodeError && /Error decoding audio: music\.main|Failed to decode audio|Failed to process file: %s "%s" audio music\.main|Failed to process file: audio "music\.main"/i.test(message.text());
      const expected404 = allow404 && isMusicUrl(message.location().url) && /404/.test(message.text());
      if (!expectedDecode && !expected404) failures.push(message.text());
    });
    page.on('requestfailed', (request) => {
      if (!(allow404 && isMusicUrl(request.url()))) failures.push(`${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on('response', (response) => {
      const expected404 = allow404 && response.status() === 404 && isMusicUrl(response.url());
      if (response.status() >= 400 && !expected404) failures.push(`${response.status()} ${response.url()}`);
      const url = new URL(response.url());
      const localImageBlob = url.protocol === 'blob:' && url.origin === 'http://127.0.0.1:4173';
      if (!localImageBlob && !response.url().startsWith('http://127.0.0.1:4173/regalo/')) failures.push(`Unexpected origin/path: ${response.url()}`);
    });
    await use();
    expect(failures, 'only the requested audio failure may be filtered').toEqual([]);
  }, { auto: true }],
});

async function seedPage(page, progress, preferences = { version: 1, muted: false, reducedEffects: false }) {
  await page.addInitScript(({ saveKey, prefsKey, progress, preferences }) => {
    localStorage.setItem(saveKey, JSON.stringify(progress));
    localStorage.setItem(prefsKey, JSON.stringify(preferences));
  }, { saveKey: SAVE_KEY, prefsKey: PREFS_KEY, progress, preferences });
  await page.goto('./');
  await until(page, () => window.__ACINCO_DEBUG__?.snapshot().mode === 'TITLE');
}

test('Chromium title is silent; gesture plays real audio, mute persists through pause and blur never resumes itself', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.addInitScript(() => {
    const nativeConnect = AudioNode.prototype.connect;
    let captured = false;
    window.__ACINCO_AUDIO_ANALYSER__ = null;
    AudioNode.prototype.connect = function (destination, ...args) {
      if (!captured && destination === this.context.destination) {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 512;
        nativeConnect.call(this, analyser);
        nativeConnect.call(analyser, destination);
        captured = true;
        window.__ACINCO_AUDIO_ANALYSER__ = analyser;
        return analyser;
      }
      return nativeConnect.call(this, destination, ...args);
    };
  });
  await page.goto('./');
  await until(page, () => window.__ACINCO_DEBUG__?.snapshot().mode === 'TITLE');
  const readRms = () => page.evaluate(() => {
    const analyser = window.__ACINCO_AUDIO_ANALYSER__;
    if (!analyser) return 0;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    return Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
  });
  expect(await readRms()).toBeLessThan(0.0001);

  await page.getByRole('button', { name: texts.start, exact: true }).click();
  await waitPlaying(page, 0);
  await expect.poll(readRms, { timeout: 5000 }).toBeGreaterThan(0.0001);
  await expect.poll(async () => (await snapshot(page)).audio.playing).toBe(true);

  await page.waitForTimeout(250);
  await page.locator('#pause-button').click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  const pausedSeek = (await snapshot(page)).audio.seek;
  await page.screenshot({ path: 'qa/music-desktop-pause.png', fullPage: true });
  await page.getByRole('button', { name: texts.mute, exact: true }).click();
  expect((await snapshot(page)).audio.muted).toBe(true);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).muted, PREFS_KEY)).toBe(true);
  await page.getByRole('button', { name: texts.resume, exact: true }).click();
  await waitPlaying(page, 0);
  expect((await snapshot(page)).audio.playing).toBe(false);

  await page.locator('#pause-button').click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await page.getByRole('button', { name: texts.unmute, exact: true }).click();
  expect((await snapshot(page)).audio.playing).toBe(false);
  await page.getByRole('button', { name: texts.resume, exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PLAYING' && window.__ACINCO_DEBUG__.snapshot().audio.playing);
  expect((await snapshot(page)).audio.seek).toBeGreaterThanOrEqual(pausedSeek);

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(150);
  expect((await snapshot(page)).audio.playing).toBe(false);
  expect((await snapshot(page)).mode).toBe('PAUSED');
  await page.getByRole('button', { name: texts.resume, exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().audio.playing);
});

test('Chromium keeps one track moving across checkpoint-one transition, respawn, and level restart', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await seedPage(page, { version: 1, levelIndex: 0, checkpointId: 1, completed: false });
  await continueSaved(page);
  await waitPlaying(page, 0);
  await page.waitForTimeout(250);
  const before = (await snapshot(page)).audio;
  expect(before.playing).toBe(true);
  expect(before.instances).toBe(1);
  await finishFirst(page);
  const afterTransition = (await snapshot(page)).audio;
  expect(afterTransition.playing).toBe(true);
  expect(afterTransition.instances).toBe(1);
  expect(afterTransition.seek).toBeGreaterThan(before.seek);

  await fallAndRespawn(page);
  const afterFall = (await snapshot(page)).audio;
  expect(afterFall.playing).toBe(true);
  expect(afterFall.instances).toBe(1);
  expect(afterFall.seek).toBeGreaterThan(afterTransition.seek);

  await pauseGame(page);
  await page.getByRole('button', { name: texts.restartLevel, exact: true }).click();
  await waitPlaying(page, 1);
  const afterRestart = (await snapshot(page)).audio;
  expect(afterRestart.playing).toBe(true);
  expect(afterRestart.instances).toBe(1);
  expect(afterRestart.seek).toBeGreaterThan(afterFall.seek);
});

test('Chromium ending fades music, explicit activation resumes, and replay restarts the same track', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await seedPage(page, { version: 1, levelIndex: 4, checkpointId: 1, completed: false });
  await continueSaved(page);
  await waitPlaying(page, 4);
  await approachGoal(page, levels[4]);
  await triggerGoal(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  await expect.poll(async () => (await snapshot(page)).audio.volume).toBeCloseTo(config.audio.endingMusicGain, 2);
  const finished = (await snapshot(page)).audio;
  expect(finished.instances).toBe(1);
  expect(finished.loop).toBe(true);

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(150);
  const hidden = await snapshot(page);
  expect(hidden.mode).toBe('FINISHED');
  expect(hidden.audio.playing).toBe(false);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(150);
  expect((await snapshot(page)).audio.playing).toBe(false);
  await page.getByRole('button', { name: texts.unmute, exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().audio.playing);
  expect((await snapshot(page)).audio.volume).toBeCloseTo(config.audio.endingMusicGain, 2);

  await page.getByRole('button', { name: texts.replay, exact: true }).click();
  await waitPlaying(page, 0);
  const replay = (await snapshot(page)).audio;
  expect(replay.instances).toBe(1);
  expect(replay.playing).toBe(true);
  expect(replay.seek).toBeLessThan(1);
  expect(replay.seek).toBeLessThan(finished.seek);
  expect(replay.volume).toBeCloseTo(config.audio.musicGain, 2);
});

test('Chromium cancels a delayed resume after returning to title', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.addInitScript(() => {
    window.__ACINCO_PENDING_RESUMES__ = [];
    AudioContext.prototype.resume = function () {
      return new Promise((resolve) => window.__ACINCO_PENDING_RESUMES__.push(resolve));
    };
  });
  await page.goto('./');
  await until(page, () => window.__ACINCO_DEBUG__?.snapshot().mode === 'TITLE');
  await page.getByRole('button', { name: texts.start, exact: true }).click();
  await waitPlaying(page, 0);
  await page.locator('#pause-button').click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await page.getByRole('button', { name: texts.backToTitle, exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'TITLE');
  await page.evaluate(() => window.__ACINCO_PENDING_RESUMES__.forEach((resolve) => resolve()));
  await page.waitForTimeout(100);
  const state = await snapshot(page);
  expect(state.mode).toBe('TITLE');
  expect(state.audio.playing).toBe(false);
  expect(state.audio.instances).toBe(1);
});

for (const failure of ['404', 'decode failure']) {
  negativeAudioTest(`audio ${failure} leaves the final playable and is not retried`, async ({ page }) => {
    const progress = { version: 1, levelIndex: 4, checkpointId: 1, completed: false };
    await page.addInitScript(({ saveKey, progress }) => localStorage.setItem(saveKey, JSON.stringify(progress)), { saveKey: SAVE_KEY, progress });
    const requests = [];
    page.on('request', (request) => { if (isMusicUrl(request.url())) requests.push(request.url()); });
    await page.route('**/regalo/assets/audio/camino.mp3', (route) => failure === '404'
      ? route.fulfill({ status: 404, body: 'missing audio' })
      : route.fulfill({ status: 200, contentType: 'audio/mpeg', body: 'not an MP3 file' }));
    await page.goto('./');
    await until(page, () => window.__ACINCO_DEBUG__?.snapshot().mode === 'TITLE');
    await expect(page.locator('#sound-button')).toBeHidden();
    await expect(page.locator('#sound-notice')).toContainText(texts.soundUnavailable);
    await continueSaved(page);
    await waitPlaying(page, 4);
    await approachGoal(page, levels[4]);
    await triggerGoal(page);
    await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
    expect((await snapshot(page)).audio.status).toBe('unavailable');
    expect(requests).toHaveLength(1);
  });
}

test('Firefox audio start, pause, and resume smoke', async ({ page, browserName }) => {
  test.skip(browserName !== 'firefox');
  await page.goto('./');
  await until(page, () => window.__ACINCO_DEBUG__?.snapshot().mode === 'TITLE');
  await page.getByRole('button', { name: texts.start, exact: true }).click();
  await waitPlaying(page, 0);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().audio.playing);
  await page.locator('#pause-button').click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  expect((await snapshot(page)).audio.playing).toBe(false);
  await page.getByRole('button', { name: texts.resume, exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().audio.playing);
  expect((await snapshot(page)).audio.instances).toBe(1);
});
