import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config, levels, assets, texts, validateGameData } from '../../src/config.js';
import { buildTerrainTiles, selectTerrainFrame, isRenderVisible } from '../../src/game/environment.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const json = (name) => JSON.parse(readFileSync(path.join(root, name), 'utf8'));

test('downloaded environment originals retain all ten pinned SHA-256 digests', () => {
  const manifest = json('assets/vendor/environment/sources.json');
  assert.equal(manifest.license, 'CC0-1.0');
  assert.equal(manifest.sources.length, 10);
  for (const source of manifest.sources) {
    const bytes = readFileSync(path.join(root, 'assets/vendor/environment', source.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, source.path);
    assert.match(source.url, /raw\.githubusercontent\.com\/.+\/[a-f0-9]{40}\//);
    assert.match(source.licenseEvidence, /^https:\/\/(ansimuz\.itch\.io|opengameart\.org)\//);
  }
});

test('the runtime atlas contains every used frame within its bounded PNG', () => {
  const atlasAsset = assets.assets.find((asset) => asset.key === config.environment.atlasKey);
  const atlas = json('public/assets/' + atlasAsset.dataPath);
  const png = readFileSync(path.join(root, 'public/assets', atlasAsset.path));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20), png[24], png[25]], [1024, 1024, 8, 6]);
  assert.ok(png.length <= config.environment.maxPngBytes);
  const required = [
    ...config.environment.themes.flatMap(({ id }) => ['back', 'far', 'near'].map((layer) => `${id}.${layer}`)),
    ...Array.from({ length: 9 }, (_, index) => `terrain.${index}`),
    ...levels.flatMap((level) => level.decorations.map((item) => item.frame)),
    'marker.lantern.off', 'marker.lantern.on',
  ];
  for (const name of required) assert.ok(atlas.frames[name], name);
  assert.equal(Object.keys(atlas.frames).length, 31);
  for (const [name, { frame, rotated, trimmed, sourceSize, spriteSourceSize }] of Object.entries(atlas.frames)) {
    assert.ok(frame.x >= 2 && frame.y >= 2 && frame.w > 0 && frame.h > 0);
    assert.ok(frame.x + frame.w <= 1022 && frame.y + frame.h <= 1022);
    assert.equal(rotated, false);
    assert.ok(spriteSourceSize.y >= 0 && spriteSourceSize.y + frame.h <= sourceSize.h);
    if (name.startsWith('level-')) {
      assert.equal(sourceSize.h, config.viewport.height);
      assert.equal(sourceSize.w, frame.w);
    } else assert.equal(trimmed, false);
  }
});

test('terrain compositions match solid map occupancy at every visible pixel including chunk seams', () => {
  const settings = config.environment;
  const tile = config.viewport.tile;
  for (const level of levels) {
    for (let start = 0; start < level.width; start += settings.chunkWidth) {
      const width = Math.min(settings.chunkWidth, level.width - start);
      const height = settings.terrainRenderHeight;
      const actual = new Uint8Array(width * height);
      const expected = new Uint8Array(width * height);
      for (const cell of buildTerrainTiles(level, start, width)) {
        for (let y = Math.max(cell.y, settings.terrainTopY); y < Math.min(cell.y + tile, settings.terrainTopY + height); y++) {
          const from = Math.max(cell.x, start) - start;
          const to = Math.min(cell.x + tile, start + width) - start;
          actual.fill(1, (y - settings.terrainTopY) * width + from, (y - settings.terrainTopY) * width + to);
        }
      }
      for (const surface of level.surfaces) {
        const from = Math.max(surface.x, start) - start;
        const to = Math.min(surface.x + surface.width, start + width) - start;
        if (to <= from) continue;
        for (let y = Math.max(surface.y, settings.terrainTopY); y < settings.terrainTopY + height; y++) {
          expected.fill(1, (y - settings.terrainTopY) * width + from, (y - settings.terrainTopY) * width + to);
        }
      }
      assert.deepEqual(actual, expected, `level ${level.id}, chunk ${start}`);
    }
  }
});

test('contiguous steps expose only their actual outer faces', () => {
  const { surfaces } = levels[0];
  const [low, high, next] = surfaces;
  assert.equal(selectTerrainFrame(surfaces, high, high.x, high.y), 'terrain.0');
  assert.equal(selectTerrainFrame(surfaces, high, high.x, low.y), 'terrain.4');
  assert.equal(selectTerrainFrame(surfaces, low, low.x + low.width - 16, low.y), 'terrain.1');
  assert.equal(selectTerrainFrame(surfaces, next, next.x, next.y), 'terrain.1');
  assert.equal(selectTerrainFrame(surfaces, low, low.x, low.y), 'terrain.0');
});

test('invalid environment references, decorations and atlas paths are rejected', () => {
  for (const change of [
    (data) => { data.levels[0].environmentId = 'missing'; },
    (data) => { data.levels[0].decorations[0].frame = 'prop.enemy'; },
    (data) => { data.levels[0].decorations[0].feetY = 0; },
    (data) => { data.assets.assets.find((asset) => asset.type === 'atlas').dataPath = '../outside.json'; },
    (data) => { data.assets.assets.find((asset) => asset.type === 'atlas').key = data.assets.assets[0].key; },
  ]) {
    const data = structuredClone({ config, levels, assets, texts });
    change(data);
    assert.throws(() => validateGameData(data), /Invalid game data/);
  }
});

test('the local UI font preserves its OFL source and supports Spanish text', () => {
  const manifest = json('assets/vendor/fonts/sources.json');
  for (const source of manifest.sources) {
    const original = readFileSync(path.join(root, 'assets/vendor/fonts', source.path));
    assert.equal(createHash('sha256').update(original).digest('hex'), source.sha256);
    if (source.path !== 'METADATA.pb') assert.deepEqual(readFileSync(path.join(root, 'public/assets/fonts', source.path)), original);
  }
  const font = readFileSync(path.join(root, 'public/assets/fonts/pixelify-sans.ttf'));
  let cmap;
  for (let index = 0; index < font.readUInt16BE(4); index++) {
    const record = 12 + index * 16;
    if (font.toString('ascii', record, record + 4) === 'cmap') cmap = font.readUInt32BE(record + 8);
  }
  assert.ok(cmap);
  const hasGlyph = (code) => {
    for (let index = 0; index < font.readUInt16BE(cmap + 2); index++) {
      const offset = cmap + font.readUInt32BE(cmap + 4 + index * 8 + 4);
      if (font.readUInt16BE(offset) !== 4) continue;
      const count = font.readUInt16BE(offset + 6) / 2;
      const end = offset + 14, start = end + count * 2 + 2;
      const delta = start + count * 2, ranges = delta + count * 2;
      for (let segment = 0; segment < count; segment++) {
        const lo = font.readUInt16BE(start + segment * 2), hi = font.readUInt16BE(end + segment * 2);
        if (code < lo || code > hi) continue;
        const distance = font.readUInt16BE(ranges + segment * 2);
        const glyph = distance === 0 ? code : font.readUInt16BE(ranges + segment * 2 + distance + (code - lo) * 2);
        if (distance !== 0 && glyph === 0) return false;
        return ((glyph + font.readInt16BE(delta + segment * 2)) & 0xffff) !== 0;
      }
    }
    return false;
  };
  for (const character of 'áéíóúñÁÉÍÓÚÑ¿¡') assert.ok(hasGlyph(character.codePointAt(0)), character);
});

test('the final destination remains free of decorations around Aaron', () => {
  const level = levels[4];
  const atlas = json('public/assets/environment/environment.json');
  for (const decoration of level.decorations) {
    const halfWidth = atlas.frames[decoration.frame].sourceSize.w / 2;
    assert.ok(Math.abs(decoration.x - level.aaron.x) > halfWidth + 12);
  }
});

test('camera culling omits distant artwork while keeping every currently visible pixel', () => {
  assert.equal(isRenderVisible(0, 1024, 1536), false);
  assert.equal(isRenderVisible(1024, 1024, 1536), true);
  assert.equal(isRenderVisible(2048, 1024, 1536), false);
  for (const factor of [0, 0.1, 0.25, 1]) {
    for (let scroll = 0; scroll <= 2592; scroll += 7) {
      const bucketScroll = Math.floor(scroll / config.viewport.tile) * config.viewport.tile;
      for (const left of [0, 144, 320, 480, 1024, 1536, 2048, 3072]) {
        const width = left >= 1024 ? 1024 : 160;
        const actualLeft = left - scroll * factor;
        if (actualLeft < config.viewport.width && actualLeft + width > 0) {
          assert.equal(isRenderVisible(left, width, bucketScroll, factor), true);
        }
      }
    }
  }
});
