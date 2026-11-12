import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../../src/config.js';
import { createProgressStorage } from '../../src/core/storage.js';

function fakeWindow(reducedEffects = false) {
  return { matchMedia: () => ({ matches: reducedEffects }) };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

test('progress schema rejects corruption and normalizes completed saves without retaining extra fields', () => {
  const storage = memoryStorage();
  const service = createProgressStorage({ config, provider: () => storage, windowObject: fakeWindow() });
  storage.setItem(config.save.key, JSON.stringify({ version: 1, levelIndex: 2, checkpointId: 1, completed: false, extra: 'ignored' }));
  assert.deepEqual(service.readProgress(), { version: 1, levelIndex: 2, checkpointId: 1, completed: false });

  for (const invalid of [
    '{bad json',
    JSON.stringify({ version: 2, levelIndex: 0, checkpointId: 0, completed: false }),
    JSON.stringify({ version: 1, levelIndex: '1', checkpointId: 0, completed: false }),
    JSON.stringify({ version: 1, levelIndex: 5, checkpointId: 0, completed: false }),
    JSON.stringify({ version: 1, levelIndex: 0, checkpointId: 2, completed: false }),
    JSON.stringify({ version: 1, levelIndex: 0, checkpointId: 0, completed: 1 }),
  ]) {
    storage.setItem(config.save.key, invalid);
    const freshService = createProgressStorage({ config, provider: () => storage, windowObject: fakeWindow() });
    assert.equal(freshService.readProgress(), null);
  }

  storage.setItem(config.save.key, JSON.stringify({ version: 1, levelIndex: 1, checkpointId: 0, completed: true, extra: true }));
  const completedService = createProgressStorage({ config, provider: () => storage, windowObject: fakeWindow() });
  assert.deepEqual(completedService.readProgress(), { version: 1, levelIndex: 4, checkpointId: 1, completed: true });
});

test('localStorage getter, read, and write errors fall back to memory and notify once', () => {
  let notices = 0;
  const getterFailure = createProgressStorage({
    config,
    provider: () => { throw new Error('denied getter'); },
    windowObject: fakeWindow(),
    onUnavailable: () => { notices += 1; },
  });
  assert.equal(getterFailure.readProgress(), null);
  assert.equal(getterFailure.writeProgress({ version: 1, levelIndex: 2, checkpointId: 1, completed: false }), false);
  assert.deepEqual(getterFailure.readProgress(), { version: 1, levelIndex: 2, checkpointId: 1, completed: false });
  assert.equal(notices, 1);
  assert.deepEqual(getterFailure.status, { available: false, noticeShown: true });

  let readNotices = 0;
  const readFailure = createProgressStorage({
    config,
    provider: () => ({ getItem() { throw new Error('denied read'); }, setItem() {} }),
    windowObject: fakeWindow(),
    onUnavailable: () => { readNotices += 1; },
  });
  assert.equal(readFailure.readProgress(), null);
  assert.equal(readFailure.writeProgress({ version: 1, levelIndex: 1, checkpointId: 0, completed: false }), false);
  assert.equal(readFailure.readProgress().levelIndex, 1);
  assert.equal(readNotices, 1);

  let writeNotices = 0;
  const writeFailure = createProgressStorage({
    config,
    provider: () => ({ getItem() { return null; }, setItem() { throw new Error('quota'); } }),
    windowObject: fakeWindow(),
    onUnavailable: () => { writeNotices += 1; },
  });
  assert.equal(writeFailure.writeProgress({ version: 1, levelIndex: 3, checkpointId: 0, completed: false }), false);
  assert.equal(writeFailure.readProgress().levelIndex, 3);
  assert.equal(writeFailure.writeProgress({ version: 1, levelIndex: 4, checkpointId: 1, completed: true }), false);
  assert.equal(writeNotices, 1);
});

test('storage property getters are guarded and unavailable persistence stays disabled', () => {
  let accesses = 0;
  const windowObject = Object.defineProperty({ matchMedia: () => ({ matches: false }) }, 'localStorage', {
    get() { accesses += 1; throw new Error('blocked getter'); },
  });
  let notices = 0;
  const service = createProgressStorage({ config, windowObject, onUnavailable: () => { notices += 1; } });
  service.readProgress();
  service.readPreferences();
  service.writePreferences({ muted: true, reducedEffects: true });
  assert.equal(accesses, 1);
  assert.equal(notices, 1);
  assert.deepEqual(service.readPreferences(), { version: 1, muted: true, reducedEffects: true });
});

test('preferences use valid stored values, otherwise system motion preference, and progress writes preserve them', () => {
  const storage = memoryStorage();
  const service = createProgressStorage({ config, provider: () => storage, windowObject: fakeWindow(true) });
  assert.deepEqual(service.readPreferences(), { version: 1, muted: false, reducedEffects: true });
  storage.setItem(config.save.prefsKey, JSON.stringify({ version: 1, muted: true, reducedEffects: false, extra: 'ignored' }));
  const second = createProgressStorage({ config, provider: () => storage, windowObject: fakeWindow(true) });
  assert.deepEqual(second.readPreferences(), { version: 1, muted: true, reducedEffects: false });
  second.writeProgress({ version: 1, levelIndex: 1, checkpointId: 1, completed: false });
  assert.equal(storage.getItem(config.save.prefsKey), JSON.stringify({ version: 1, muted: true, reducedEffects: false, extra: 'ignored' }));
});

test('corrupt preferences use system defaults without disabling progress persistence', () => {
  const storage = memoryStorage({
    [config.save.key]: JSON.stringify({ version: 1, levelIndex: 3, checkpointId: 1, completed: false }),
    [config.save.prefsKey]: '{bad json',
  });
  const service = createProgressStorage({ config, provider: () => storage, windowObject: fakeWindow(true) });
  assert.deepEqual(service.readPreferences(), { version: 1, muted: false, reducedEffects: true });
  assert.deepEqual(service.status, { available: true, noticeShown: false });
  assert.deepEqual(service.readProgress(), { version: 1, levelIndex: 3, checkpointId: 1, completed: false });

  storage.getItem = () => { throw new Error('later backend failure'); };
  service.readPreferences();
  assert.deepEqual(service.readProgress(), { version: 1, levelIndex: 3, checkpointId: 1, completed: false });
  assert.deepEqual(service.status, { available: false, noticeShown: true });
});
