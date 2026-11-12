import test from 'node:test';
import assert from 'node:assert/strict';
import { assets, config, getReadyAssets, levels, texts, validateGameData } from '../../src/config.js';

test('canonical runtime config and supported map geometry validate', () => {
  assert.equal(validateGameData({ config, levels, texts, assets }), true);
});

test('invalid numeric config or missing surface support is rejected', () => {
  const invalidConfig = structuredClone(config);
  invalidConfig.physics.gravity = Number.NaN;
  assert.throws(() => validateGameData({ config: invalidConfig, levels, texts, assets }), /physics.gravity/);

  const invalidRenderer = structuredClone(config);
  invalidRenderer.stack.renderer = 'AUTO';
  assert.throws(() => validateGameData({ config: invalidRenderer, levels, texts, assets }), /stack\.renderer/);

  const invalidLevels = structuredClone(levels);
  invalidLevels[1].checkpoint.supportId = 'missing';
  assert.throws(() => validateGameData({ config, levels: invalidLevels, texts, assets }), /checkpoint/);
});

test('invalid Auriana animation durations or frame counts are rejected', () => {
  const invalidDuration = structuredClone(config);
  invalidDuration.animation.idleDurationsMs[0] = Number.POSITIVE_INFINITY;
  assert.throws(() => validateGameData({ config: invalidDuration, levels, texts, assets }), /animation\.idleDurationsMs/);

  const invalidRun = structuredClone(config);
  invalidRun.animation.runFrameMs = 0;
  assert.throws(() => validateGameData({ config: invalidRun, levels, texts, assets }), /animation\.runFrameMs/);

  const invalidAir = structuredClone(config);
  invalidAir.animation.airFrameMs = 0;
  assert.throws(() => validateGameData({ config: invalidAir, levels, texts, assets }), /animation\.airFrameMs/);

  const mismatchedIdle = structuredClone(config);
  mismatchedIdle.animation.idleFrames = 5;
  assert.throws(() => validateGameData({ config: mismatchedIdle, levels, texts, assets }), /animation\.idleDurationsMs/);
});

test('ending contract validates the pausable reunion timeline and generated-light geometry', () => {
  assert.deepEqual(
    [config.ending.walkMs, config.ending.settleMs, config.ending.lightMs, config.ending.heartMs, config.ending.dedicationMs],
    [700, 250, 300, 600, 250],
  );
  assert.equal(config.ending.walkMs + config.ending.settleMs + config.ending.lightMs + config.ending.heartMs + config.ending.dedicationMs, 2100);
  assert.equal(config.ending.halo.width, 160);
  assert.equal(config.ending.halo.height, 128);
  assert.equal(config.ending.heart.scale, 2);
  assert.equal(validateGameData({ config, levels, texts, assets }), true);

  const invalidTimeline = structuredClone(config);
  invalidTimeline.ending.heartMs = 0;
  assert.throws(() => validateGameData({ config: invalidTimeline, levels, texts, assets }), /ending\.heartMs/);

  const invalidHeart = structuredClone(config);
  invalidHeart.ending.heart.width = 16;
  assert.throws(() => validateGameData({ config: invalidHeart, levels, texts, assets }), /ending\.heart/);
});

test('assets marked not ready are omitted from runtime requests', () => {
  const ready = getReadyAssets({ assets: [
    { path: 'missing.png', ready: false },
    { path: 'approved.png', ready: true },
  ] });
  assert.deepEqual(ready.map((asset) => asset.path), ['approved.png']);
  assert.deepEqual(getReadyAssets().map((asset) => asset.key), ['auriana.idle', 'auriana.run', 'auriana.air', 'aaron.idle', 'music.main', 'environment.main', 'environment.title', 'font.ui']);
});

test('audio gains and fade duration stay within the mixer contract', () => {
  for (const key of ['musicGain', 'endingMusicGain', 'sfxGain']) {
    const invalidAudio = structuredClone(config);
    invalidAudio.audio[key] = 1.01;
    assert.throws(() => validateGameData({ config: invalidAudio, levels, texts, assets }), new RegExp(`audio\\.${key}`));
  }
  const invalidFade = structuredClone(config);
  invalidFade.audio.fadeMs = 0;
  assert.throws(() => validateGameData({ config: invalidFade, levels, texts, assets }), /audio\.fadeMs/);
});
