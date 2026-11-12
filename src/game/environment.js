import { config } from '../config.js';

/** Select a terrain frame using occupancy at the same height on either side. */
export function selectTerrainFrame(surfaces, surface, x, y) {
  const tile = config.viewport.tile;
  const occupied = (px) => surfaces.some((other) => px >= other.x && px < other.x + other.width && y >= other.y && y < other.y + other.height);
  const left = !occupied(x - 1);
  const right = !occupied(x + tile);
  const column = left ? 0 : right ? 2 : 1;
  return `terrain.${(y === surface.y ? 0 : 3) + column}`;
}

/** Keep the surface's tile grid continuous across chunk boundaries, including x % 16 = 8. */
export function buildTerrainTiles(level, start, width) {
  const tile = config.viewport.tile;
  const settings = config.environment;
  const tiles = [];
  for (const surface of level.surfaces) {
    const fromX = surface.x + Math.max(0, Math.floor((start - surface.x) / tile)) * tile;
    const toX = Math.min(surface.x + surface.width, start + width);
    for (let x = fromX; x < toX; x += tile) {
      for (let y = surface.y; y < Math.min(surface.y + surface.height, settings.terrainTopY + settings.terrainRenderHeight); y += tile) {
        if (y + tile <= settings.terrainTopY) continue;
        tiles.push({ x, y, frame: selectTerrainFrame(level.surfaces, surface, x, y) });
      }
    }
  }
  return tiles;
}

/** One tile of slack keeps visibility conservative between camera-bucket updates. */
export function isRenderVisible(left, width, scrollX, factor = 1) {
  const cameraLeft = scrollX * factor;
  const margin = config.viewport.tile;
  return left + width >= cameraLeft - margin && left <= cameraLeft + config.viewport.width + margin;
}

/** Own the static background, terrain chunks, and explicit decorative images. */
export function createEnvironment(scene, level, reducedEffects = false) {
  const settings = config.environment;
  const key = settings.atlasKey;
  const backgrounds = [];
  const chunks = [];
  const decorations = [];
  let cameraScroll = scene.cameras.main.scrollX;
  let cameraBucket = null;
  const texture = scene.textures.get(key);
  for (let i = 0; i < settings.backgroundLayers.length; i += 1) {
    const frame = `${level.environmentId}.${settings.backgroundLayers[i]}`;
    const width = texture.get(frame).width;
    const factor = settings.backgroundScrollFactors[i];
    const coverage = config.viewport.width + (level.width - config.viewport.width) * factor;
    for (let x = 0; x < coverage + width; x += width) {
      backgrounds.push({ image: scene.add.image(x, 0, key, frame).setOrigin(0).setDepth(settings.depth.background + i), factor });
    }
  }
  for (let start = 0; start < level.width; start += settings.chunkWidth) {
    const width = Math.min(settings.chunkWidth, level.width - start);
    const chunk = scene.add.renderTexture(start, settings.terrainTopY, width, settings.terrainRenderHeight).setOrigin(0).setDepth(settings.depth.terrain);
    chunk.beginDraw();
    for (const tile of buildTerrainTiles(level, start, width)) {
      chunk.batchDrawFrame(key, tile.frame, tile.x - start, tile.y - settings.terrainTopY);
    }
    chunk.endDraw();
    chunks.push(chunk);
  }
  for (const item of level.decorations) {
    decorations.push(scene.add.image(item.x, item.feetY, key, item.frame).setOrigin(0.5, 1).setFlipX(item.flipX).setDepth(settings.depth.decorations));
  }
  const owner = {
    setCameraScroll(scrollX, force = false) {
      cameraScroll = scrollX;
      const bucket = Math.floor(scrollX / config.viewport.tile);
      if (!force && bucket === cameraBucket) return;
      cameraBucket = bucket;
      for (const { image } of backgrounds) image.setVisible(isRenderVisible(image.x, image.displayWidth, scrollX, image.scrollFactorX));
      for (const chunk of chunks) chunk.setVisible(isRenderVisible(chunk.x, chunk.width, scrollX));
      for (const image of decorations) image.setVisible(isRenderVisible(image.x - image.displayWidth / 2, image.displayWidth, scrollX));
    },
    setReducedEffects(reduced) {
      backgrounds.forEach(({ image, factor }) => image.setScrollFactor(reduced ? 0 : factor, 0));
      owner.setCameraScroll(cameraScroll, true);
    },
    getDebugSnapshot() { return { id: level.environmentId, backgroundImageCount: backgrounds.length, visibleBackgroundImages: backgrounds.filter(({ image }) => image.visible).length, backgroundScrollFactors: backgrounds.map(({ image }) => image.scrollFactorX), terrainChunks: chunks.length, visibleTerrainChunks: chunks.filter((chunk) => chunk.visible).length, decorations: decorations.length, visibleDecorations: decorations.filter((image) => image.visible).length, textureBytes: settings.atlasSize ** 2 * 4 + chunks.reduce((sum, chunk) => sum + chunk.width * chunk.height * 4, 0) }; },
    destroy() { backgrounds.forEach(({ image }) => image.destroy()); chunks.forEach((chunk) => chunk.destroy()); decorations.forEach((item) => item.destroy()); },
  };
  owner.setReducedEffects(reducedEffects);
  return owner;
}
