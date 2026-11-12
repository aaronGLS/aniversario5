import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assets, config } from '../../src/config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function pngInfo(file) {
  const bytes = readFileSync(file);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  };
}

test('integrated character exports match configured dimensions and source counts', () => {
  const expectedCounts = {
    'auriana.idle': config.animation.idleFrames,
    'auriana.run': config.animation.runFrames,
    'auriana.air': config.animation.airFrames,
    'aaron.idle': config.aaron.idleFrames,
  };
  const characterAssets = assets.assets.filter((asset) => asset.key in expectedCounts);

  assert.equal(characterAssets.length, 4);
  for (const asset of characterAssets) {
    const frameCount = asset.type === 'spritesheet' ? asset.frames : 1;
    const expectedWidth = asset.type === 'spritesheet' ? asset.sheetWidth : asset.width;
    const expectedHeight = asset.type === 'spritesheet' ? asset.sheetHeight : asset.height;
    const file = path.join(root, 'public', assets.runtimeBase, asset.path);
    const info = pngInfo(file);

    assert.equal(asset.ready, true);
    assert.equal(asset.status, 'integrated-imported');
    assert.equal(frameCount, expectedCounts[asset.key]);
    assert.equal(asset.sourceFrames.length, frameCount);
    assert.ok(asset.sourceFrames.every((source) => existsSync(path.join(root, source))));
    assert.deepEqual([info.width, info.height], [expectedWidth, expectedHeight]);
    assert.equal(info.bitDepth, 8);
    assert.equal(info.colorType, 6);
  }

  const run = characterAssets.find((asset) => asset.key === 'auriana.run');
  assert.equal(run.frames, 8);
  assert.equal(run.sheetWidth, run.frames * run.frameWidth);
});

test('previous Auriana animations remain available at their original paths', () => {
  const previous = JSON.parse(readFileSync(path.join(root, 'assets/auriana/animaciones-anteriores.json'), 'utf8'));
  assert.deepEqual(previous.assets.map(asset => asset.frames ?? 1), [6, 4, 1]);
  for (const asset of previous.assets) {
    assert.ok(!assets.assets.some(current => current.path === asset.path));
    const info = pngInfo(path.join(root, 'public', assets.runtimeBase, asset.path));
    assert.deepEqual([info.width, info.height], [asset.sheetWidth ?? asset.width, asset.sheetHeight ?? asset.height]);
    assert.ok(asset.sourceFrames.every(source => existsSync(path.join(root, source))));
  }
});

test('reunion scene textures are runtime generated and no hug PNG is a release asset', () => {
  assert.equal(assets.assets.some(asset => asset.key === 'couple.hug'), false);
  assert.equal(assets.generatedAtRuntime.includes('ending-halo'), true);
  assert.equal(assets.generatedAtRuntime.includes('heart-8'), true);
});

test('music resource matches its user-source manifest and web derivative hash', () => {
  const music = assets.assets.find((asset) => asset.key === 'music.main');
  const sourceManifest = JSON.parse(readFileSync(path.join(root, 'assets/audio/sources.json'), 'utf8'));
  const source = sourceManifest.assets.find((asset) => asset.key === 'music.main');
  const file = path.join(root, 'public', assets.runtimeBase, music.path);
  const bytes = readFileSync(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');

  assert.equal(music.ready, true);
  assert.equal(music.status, 'integrated-imported');
  assert.equal(music.sourceManifest, 'assets/audio/sources.json');
  assert.equal(music.maxBytes, 3_000_000);
  assert.equal(bytes.length, source.derived.bytes);
  assert.ok(bytes.length <= music.maxBytes);
  assert.equal(sha256, source.derived.sha256);
  assert.equal(source.source.providedBy, 'user');
  assert.equal(source.source.retained, false);
  assert.equal(source.source.authorship, 'not confirmed');
  assert.equal(source.source.license, 'not confirmed');
});
