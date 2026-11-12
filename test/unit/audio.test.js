import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioController } from '../../src/core/audio.js';
import { config } from '../../src/config.js';

class FakeEmitter {
  listeners = new Map();
  on(event, callback) {
    const callbacks = this.listeners.get(event) ?? new Set();
    callbacks.add(callback);
    this.listeners.set(event, callbacks);
  }
  off(event, callback) { this.listeners.get(event)?.delete(callback); }
  emit(event, ...args) { for (const callback of this.listeners.get(event) ?? []) callback(...args); }
}

class FakeTag {
  paused = true;
  currentTime = 0;
  dataset = { used: 'false' };
  listeners = new Map();
  addEventListener(event, callback) {
    const callbacks = this.listeners.get(event) ?? new Set();
    callbacks.add(callback);
    this.listeners.set(event, callbacks);
  }
  removeEventListener(event, callback) { this.listeners.get(event)?.delete(callback); }
  dispatch(event) { for (const callback of this.listeners.get(event) ?? []) callback(); }
  pause() { this.paused = true; }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function createHarness({ mode = 'TITLE', context = null, locked = false, hasCache = true, muted = false } = {}) {
  let currentMode = mode;
  const tag = new FakeTag();
  const sound = Object.assign(new FakeEmitter(), {
    key: 'music.main', isPlaying: false, isPaused: false, seek: 12, totalDuration: 164.821,
    duration: 164.821, volume: config.audio.musicGain, loop: true, tags: context ? [] : [tag], audio: null,
    playCalls: 0, resumeCalls: 0, pauseCalls: 0, stopCalls: 0, destroyed: false,
    play(options = {}) {
      this.playCalls += 1;
      this.isPlaying = true;
      this.isPaused = false;
      this.loop = options.loop ?? this.loop;
      this.volume = options.volume ?? this.volume;
      if (options.seek !== undefined) this.seek = options.seek;
      tag.dataset.used = 'true';
      tag.paused = false;
      this.audio = context ? null : tag;
      this.emit('play');
      return true;
    },
    resume() {
      this.resumeCalls += 1;
      this.isPlaying = true;
      this.isPaused = false;
      tag.currentTime = this.seek;
      tag.dataset.used = 'true';
      tag.paused = false;
      this.audio = context ? null : tag;
      this.emit('resume');
      return true;
    },
    pause() {
      this.pauseCalls += 1;
      if (this.audio) {
        this.seek = this.audio.currentTime;
        this.audio.pause();
        this.audio.dataset.used = 'false';
        this.audio = null;
      }
      this.isPlaying = false;
      this.isPaused = true;
      this.emit('pause');
      return true;
    },
    stop() {
      this.stopCalls += 1;
      this.audio?.pause();
      if (this.audio) this.audio.dataset.used = 'false';
      this.audio = null;
      this.isPlaying = false;
      this.isPaused = false;
      this.seek = 0;
      this.emit('stop');
      return true;
    },
    setSeek(value) { this.seek = value; tag.currentTime = value; },
    setVolume(value) { this.volume = value; },
    destroy() { this.destroyed = true; },
  });
  const manager = Object.assign(new FakeEmitter(), {
    context,
    locked,
    pauseOnBlur: true,
    muted: false,
    sounds: [],
    additions: 0,
    setMute(value) { this.muted = value; },
    add(key, options) {
      this.additions += 1;
      sound.key = key;
      sound.loop = options.loop;
      sound.volume = options.volume;
      this.sounds.push(sound);
      return sound;
    },
  });
  const controller = createAudioController({
    soundManager: manager,
    cache: { exists: () => hasCache },
    config,
    getMode: () => currentMode,
    muted,
  });
  return {
    controller, manager, sound, tag,
    setMode(value) { currentMode = value; },
  };
}

test('title stays silent and starts one looping sound only after an accepted start gesture', () => {
  const h = createHarness();
  h.controller.initialize();
  assert.equal(h.sound.playCalls, 0);
  h.setMode('PLAYING');
  assert.equal(h.controller.startFromGesture({ restart: true }), true);
  assert.equal(h.sound.playCalls, 1);
  assert.equal(h.sound.loop, true);
  h.controller.startFromGesture({ restart: true });
  assert.equal(h.manager.additions, 1);
  assert.equal(h.manager.sounds.length, 1);
  assert.equal(h.sound.playCalls, 2);
  h.controller.destroy();
});

test('pause preserves the seek and explicit resume reuses the sound', () => {
  const h = createHarness({ mode: 'PLAYING' });
  h.controller.initialize();
  h.controller.startFromGesture({ restart: true });
  h.sound.seek = 47.5;
  h.tag.currentTime = 47.5;
  h.controller.pause();
  assert.equal(h.controller.snapshot().seek, 47.5);
  assert.equal(h.controller.snapshot().paused, true);
  h.setMode('PLAYING');
  h.controller.resumeFromGesture();
  assert.equal(h.sound.resumeCalls, 1);
  assert.equal(h.controller.snapshot().seek, 47.5);
  assert.equal(h.manager.additions, 1);
  h.controller.destroy();
});

test('mute persists through manager state and a new game after mute restarts at zero', () => {
  const h = createHarness({ mode: 'FINISHED', muted: true });
  h.controller.initialize();
  assert.equal(h.manager.muted, true);
  h.sound.seek = 88;
  h.controller.startFromGesture({ restart: true });
  h.controller.setMuted(false);
  assert.equal(h.manager.muted, false);
  assert.equal(h.sound.seek, 0);
  assert.equal(h.sound.playCalls, 1);
  h.controller.destroy();
});

test('mute changes in a paused session do not resume until the resume gesture', () => {
  const h = createHarness({ mode: 'PLAYING' });
  h.controller.initialize();
  h.controller.startFromGesture({ restart: true });
  h.setMode('PAUSED');
  h.controller.pause();
  h.controller.setMuted(true);
  h.controller.setMuted(false);
  assert.equal(h.sound.playCalls, 1);
  assert.equal(h.sound.resumeCalls, 0);
  h.setMode('PLAYING');
  h.controller.resumeFromGesture();
  assert.equal(h.sound.resumeCalls, 1);
  h.controller.destroy();
});

test('pending context resumes cannot play after stop, pause, or destroy', async () => {
  for (const cancel of ['stop', 'pause', 'destroy']) {
    const pending = deferred();
    const context = new FakeEmitter();
    context.state = 'suspended';
    context.resume = () => pending.promise;
    context.addEventListener = (event, callback) => context.on(event, callback);
    context.removeEventListener = (event, callback) => context.off(event, callback);
    const h = createHarness({ mode: 'PLAYING', context });
    h.controller.initialize();
    h.controller.startFromGesture({ restart: true });
    if (cancel === 'stop') h.controller.stop();
    else if (cancel === 'pause') h.controller.pause();
    else h.controller.destroy();
    context.state = 'running';
    pending.resolve();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(h.sound.playCalls, 0, `${cancel} must invalidate pending resume`);
    if (cancel !== 'destroy') h.controller.destroy();
  }
});

test('a rejected context resume reports blocked and a later gesture retries', async () => {
  const first = deferred();
  const retry = deferred();
  const context = new FakeEmitter();
  context.state = 'suspended';
  context.resume = () => context.calls++ === 0 ? first.promise : retry.promise;
  context.calls = 0;
  context.addEventListener = (event, callback) => context.on(event, callback);
  context.removeEventListener = (event, callback) => context.off(event, callback);
  const h = createHarness({ mode: 'PLAYING', context });
  h.controller.initialize();
  h.controller.startFromGesture({ restart: true });
  first.reject(new Error('blocked'));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.controller.snapshot().status, 'blocked');
  assert.equal(h.sound.playCalls, 0);
  h.controller.activateFromGesture();
  context.state = 'running';
  retry.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.sound.playCalls, 1);
  assert.equal(h.controller.snapshot().status, 'ready');
  h.controller.destroy();
});

test('an unexpected context suspension requires another gesture and never resumes on statechange alone', () => {
  const context = new FakeEmitter();
  context.state = 'running';
  context.resume = () => Promise.resolve();
  context.addEventListener = (event, callback) => context.on(event, callback);
  context.removeEventListener = (event, callback) => context.off(event, callback);
  const h = createHarness({ mode: 'PLAYING', context });
  h.controller.initialize();
  h.controller.startFromGesture({ restart: true });
  context.state = 'suspended';
  context.emit('statechange');
  assert.equal(h.controller.snapshot().status, 'blocked');
  assert.equal(h.sound.isPaused, true);
  context.state = 'running';
  context.emit('statechange');
  assert.equal(h.sound.playCalls, 1);
  assert.equal(h.sound.resumeCalls, 0);
  h.controller.activateFromGesture();
  assert.equal(h.sound.resumeCalls, 1);
  h.controller.destroy();
});

test('missing music is unavailable without creating a sound', () => {
  const h = createHarness({ hasCache: false });
  h.controller.initialize();
  assert.equal(h.controller.snapshot().status, 'unavailable');
  assert.equal(h.controller.snapshot().available, false);
  assert.equal(h.manager.additions, 0);
  h.controller.startFromGesture({ restart: true });
  assert.equal(h.sound.playCalls, 0);
  h.controller.destroy();
});

test('ending fade targets the configured gain and is stopped on pause', () => {
  const h = createHarness({ mode: 'FINISHED' });
  h.controller.initialize();
  h.controller.startFromGesture({ restart: true });
  const tweenManager = {
    config: null,
    removed: null,
    add(config) { this.config = config; return { stop() { this.stopped = true; } }; },
    remove(tween) { this.removed = tween; },
  };
  h.controller.enterFinished(tweenManager);
  assert.equal(tweenManager.config.duration, config.audio.fadeMs);
  assert.equal(tweenManager.config.value, config.audio.endingMusicGain);
  tweenManager.config.targets.value = config.audio.endingMusicGain;
  tweenManager.config.onUpdate();
  assert.equal(h.sound.volume, config.audio.endingMusicGain);
  h.controller.pause();
  assert.ok(tweenManager.removed);
  assert.equal(h.sound.volume, config.audio.endingMusicGain);
  h.controller.destroy();
});

test('HTML audio never queues play while locked or starts late after returning to title', () => {
  const h = createHarness({ mode: 'PLAYING', locked: true });
  h.controller.initialize();
  h.controller.startFromGesture({ restart: true });
  assert.equal(h.sound.playCalls, 0);
  assert.equal(h.controller.snapshot().status, 'blocked');
  h.controller.stop();
  h.setMode('TITLE');
  h.manager.locked = false;
  h.manager.emit('unlocked');
  assert.equal(h.sound.playCalls, 0);
  h.tag.paused = false;
  h.tag.dispatch('playing');
  assert.equal(h.tag.paused, true);
  h.controller.destroy();
});
