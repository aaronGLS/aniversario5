import { test, expect, start, snapshot, until, rightTo, jump, openSaved, continueSaved, waitPlaying, savedProgress, pauseGame, resumeGame, prepareSequence, PREFS_KEY } from './helpers.js';

test('pause during a jump freezes physics, animation and active time; keyboard resume carries no held controls', async ({ page }, testInfo) => {
  await start(page);
  await page.keyboard.down('ArrowRight');
  await jump(page);
  await pauseGame(page);
  const frozen = await snapshot(page);
  await expect(page.getByRole('button', { name: 'Seguir jugando', exact: true })).toBeFocused();
  await page.waitForTimeout(450);
  const later = await snapshot(page);
  expect(later.body).toEqual(frozen.body);
  expect(later.visual).toEqual(frozen.visual);
  expect(later.activeMs).toBe(frozen.activeMs);
  expect(later.resumeMode).toBe('PLAYING');
  await page.screenshot({ path: 'qa/phase4-environment-' + testInfo.project.name + '-pause.png', fullPage: true });
  await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog').evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
  await page.getByRole('button', { name: 'Seguir jugando', exact: true }).focus();
  await page.keyboard.press('Space');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PLAYING');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().body.grounded);
  const resumed = await snapshot(page);
  expect(resumed.body.feetX).toBeCloseTo(frozen.body.feetX, 1);
  expect(resumed.body.vx).toBe(0);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).body.grounded).toBe(true);
  await page.keyboard.up('ArrowRight');
  await jump(page);
  expect((await snapshot(page)).body.vy).toBeLessThan(0);
});

test('synthetic blur/visibility and a real viewport orientation change pause once without auto-resume', async ({ page }) => {
  await start(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(100);
  expect((await snapshot(page)).mode).toBe('PAUSED');
  await resumeGame(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await page.evaluate(() => {
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect((await snapshot(page)).mode).toBe('PAUSED');
  await resumeGame(page);
  await page.setViewportSize({ width: 1200, height: 760 });
  await page.waitForTimeout(100);
  expect((await snapshot(page)).mode).toBe('PLAYING');
  await page.setViewportSize({ width: 390, height: 844 });
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  expect(await page.getByRole('dialog').count()).toBe(1);
  const position = (await snapshot(page)).body;
  await page.setViewportSize({ width: 400, height: 850 });
  expect((await snapshot(page)).body).toEqual(position);
  await resumeGame(page);
  await waitPlaying(page, 0);
});

for (const kind of ['respawn', 'transition']) {
  for (const phase of ['out', 'in']) {
    test(kind + ' ' + phase + ' phase suspends and finishes once after resume', async ({ page }) => {
      await prepareSequence(page, kind);
      await until(page, expected => window.__ACINCO_DEBUG__.snapshot().sequence?.phase === expected, phase);
      await pauseGame(page);
      await page.keyboard.up('ArrowRight');
      const frozen = await snapshot(page);
      expect(frozen.resumeMode).toBe(kind === 'respawn' ? 'RESPAWNING' : 'TRANSITION');
      expect(frozen.sequence.phase).toBe(phase);
      await page.waitForTimeout(500);
      const later = await snapshot(page);
      expect(later.body).toEqual(frozen.body);
      expect(later.sequence).toEqual(frozen.sequence);
      expect(later.activeMs).toBe(frozen.activeMs);
      await resumeGame(page);
      await waitPlaying(page, 1);
      const resumed = await snapshot(page);
      expect(resumed.body.feetX).toBeCloseTo(64, 1);
      expect(resumed.checkpointId).toBe(0);
      expect(resumed.body.vx).toBe(0);
      await page.waitForTimeout(400);
      expect((await snapshot(page)).levelIndex).toBe(1);
      expect((await snapshot(page)).mode).toBe('PLAYING');
    });
  }
}

for (const action of ['restart', 'title', 'skip']) {
  test('cancel pending respawn/transition by ' + action + ' rejects stale completions', async ({ page }) => {
    test.setTimeout(60_000);
    for (const kind of ['respawn', 'transition']) {
      await page.keyboard.up('ArrowRight');
      await prepareSequence(page, kind);
      await pauseGame(page);
      await page.keyboard.up('ArrowRight');
      const previousSave = await savedProgress(page);
      if (action === 'restart') {
        await page.getByRole('button', { name: 'Reiniciar este paso', exact: true }).click();
        await waitPlaying(page, 1);
        await page.waitForTimeout(700);
        expect((await snapshot(page)).body.feetX).toBeCloseTo(64, 1);
        expect((await snapshot(page)).mode).toBe('PLAYING');
        expect((await snapshot(page)).checkpointId).toBe(0);
      } else if (action === 'title') {
        await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
        await page.waitForTimeout(700);
        expect((await snapshot(page)).mode).toBe('TITLE');
        expect(await savedProgress(page)).toEqual(previousSave);
        await continueSaved(page);
        expect((await snapshot(page)).levelIndex).toBe(1);
      } else {
        await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
        await page.keyboard.press('Escape');
        expect((await snapshot(page)).mode).toBe('PAUSED');
        await expect(page.getByRole('button', { name: 'Seguir jugando', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
        await page.getByRole('button', { name: 'Sí, vamos al encuentro', exact: true }).click();
        await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
        expect((await savedProgress(page)).completed).toBe(true);
      }
    }
  });
}

test('ending pause freezes approach; back to title preserves unfinished progress and cancels message', async ({ page }) => {
  await openSaved(page, { version: 1, levelIndex: 2, checkpointId: 1, completed: false });
  await continueSaved(page);
  await pauseGame(page);
  await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, vamos al encuentro', exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'ENDING');
  await pauseGame(page);
  const frozen = await snapshot(page);
  expect(frozen.resumeMode).toBe('ENDING');
  await expect(page.getByRole('button', { name: 'Reiniciar este paso', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Ir directamente al final', exact: true })).toBeHidden();
  await page.waitForTimeout(1800);
  expect((await snapshot(page)).sequence).toEqual(frozen.sequence);
  expect((await savedProgress(page)).completed).toBe(false);
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.waitForTimeout(1800);
  expect((await snapshot(page)).mode).toBe('TITLE');
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 2, checkpointId: 1, completed: false });
  await continueSaved(page);
  expect((await snapshot(page)).body.feetY).toBeCloseTo(192, 1);
});

test('ending resume shows dedication exactly once, completed reload offers ending instead of level six', async ({ page }) => {
  await start(page);
  await pauseGame(page);
  await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, vamos al encuentro', exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'ENDING');
  await page.waitForTimeout(750);
  await pauseGame(page);
  await page.waitForTimeout(900);
  expect((await savedProgress(page)).completed).toBe(false);
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  await expect(page.getByRole('heading', { name: 'Feliz quinto mesiversario, mi vida. Espero y sigamos cumpliendo más.', exact: true })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Volver a ver nuestro encuentro', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Volver a ver nuestro encuentro', exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  expect((await snapshot(page)).levelIndex).toBe(4);
});

test('restart step resets only its checkpoint; confirmed new game resets whole route and preserves prefs', async ({ page }) => {
  const prefs = { version: 1, muted: true, reducedEffects: false };
  await openSaved(page, { version: 1, levelIndex: 3, checkpointId: 1, completed: false }, prefs);
  await continueSaved(page);
  await pauseGame(page);
  await page.getByRole('button', { name: 'Reiniciar este paso', exact: true }).click();
  await waitPlaying(page, 3);
  expect((await snapshot(page)).body.feetX).toBeCloseTo(64, 1);
  expect((await snapshot(page)).checkpointId).toBe(0);
  await pauseGame(page);
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar desde el principio', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, empezar de nuevo', exact: true }).click();
  await waitPlaying(page, 0);
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 0, checkpointId: 0, completed: false });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PREFS_KEY)).toEqual(prefs);
});

test('reload after accepted goal resumes next map from spawn during the outgoing fade', async ({ page }) => {
  await prepareSequence(page, 'transition');
  await page.keyboard.up('ArrowRight');
  expect(await savedProgress(page)).toEqual({ version: 1, levelIndex: 1, checkpointId: 0, completed: false });
  await page.reload();
  await continueSaved(page);
  const state = await snapshot(page);
  expect(state.levelIndex).toBe(1);
  expect(state.body.feetX).toBeCloseTo(64, 1);
});

test('holding Escape cannot close a newly opened pause or cascade out of confirmation', async ({ page }) => {
  await start(page);
  await page.keyboard.down('Escape');
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await page.keyboard.down('Escape');
  await page.waitForTimeout(150);
  expect((await snapshot(page)).mode).toBe('PAUSED');
  await page.keyboard.up('Escape');
  await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
  await page.keyboard.down('Escape');
  await expect(page.getByRole('button', { name: 'Seguir jugando', exact: true })).toBeVisible();
  await page.keyboard.down('Escape');
  await page.waitForTimeout(150);
  expect((await snapshot(page)).mode).toBe('PAUSED');
  await page.keyboard.up('Escape');
  await page.keyboard.press('Escape');
  await waitPlaying(page, 0);
});

test('pause requested while ending scene start is queued remains latched through scene creation', async ({ page }) => {
  await start(page);
  await pauseGame(page);
  await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
  await page.evaluate(() => {
    const panel = document.querySelector('#ending-panel');
    const observer = new MutationObserver(() => {
      if (panel.hidden) return;
      observer.disconnect();
      window.dispatchEvent(new Event('blur'));
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  });
  await page.getByRole('button', { name: 'Sí, vamos al encuentro', exact: true }).click();
  await until(page, () => {
    const state = window.__ACINCO_DEBUG__.snapshot();
    return state.mode === 'PAUSED' && state.resumeMode === 'ENDING';
  });
  await page.waitForTimeout(1800);
  expect((await snapshot(page)).mode).toBe('PAUSED');
  expect((await savedProgress(page)).completed).toBe(false);
  await expect(page.getByRole('button', { name: 'Seguir jugando', exact: true })).toBeFocused();
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
});

test('viewing a completed ending from title supports Escape and lifecycle pause', async ({ page }) => {
  await openSaved(page, { version: 1, levelIndex: 4, checkpointId: 1, completed: true });
  await page.getByRole('button', { name: 'Volver a ver nuestro encuentro', exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'ENDING');
  await pauseGame(page);
  await page.waitForTimeout(1800);
  expect((await snapshot(page)).mode).toBe('PAUSED');
  await resumeGame(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
});

test('cancelled ending handoff cannot stop a newer game before the next engine frame', async ({ page }) => {
  await start(page);
  await pauseGame(page);
  await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
  await page.evaluate(() => {
    const panel = document.querySelector('#ending-panel');
    const observer = new MutationObserver(() => {
      if (panel.hidden) return;
      observer.disconnect();
      window.dispatchEvent(new Event('blur'));
      document.querySelector('#back-button').click();
      document.querySelector('#continue-button').click();
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  });
  await page.getByRole('button', { name: 'Sí, vamos al encuentro', exact: true }).click();
  await waitPlaying(page, 0);
  await page.waitForTimeout(200);
  const state = await snapshot(page);
  expect(state.mode).toBe('PLAYING');
  expect(state.counts.dynamicBodies).toBe(1);
  expect(state.body.grounded).toBe(true);
  await jump(page);
});

test('effects-reduced queued ending resumes with focus on its dedication heading', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await pauseGame(page);
  await page.getByRole('button', { name: 'Ir directamente al final', exact: true }).click();
  await page.evaluate(() => {
    const panel = document.querySelector('#ending-panel');
    const observer = new MutationObserver(() => {
      if (panel.hidden) return;
      observer.disconnect();
      window.dispatchEvent(new Event('blur'));
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  });
  await page.getByRole('button', { name: 'Sí, vamos al encuentro', exact: true }).click();
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'PAUSED');
  await page.waitForTimeout(150);
  await resumeGame(page);
  await until(page, () => window.__ACINCO_DEBUG__.snapshot().mode === 'FINISHED');
  await expect(page.getByRole('heading', { name: 'Feliz quinto mesiversario, mi vida. Espero y sigamos cumpliendo más.', exact: true })).toBeFocused();
});
