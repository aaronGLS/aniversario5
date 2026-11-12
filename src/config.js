import configData from '../data/config.json' with { type: 'json' };
import levelsData from '../data/levels.json' with { type: 'json' };
import textsData from '../data/texts.es.json' with { type: 'json' };
import assetsData from '../data/assets.json' with { type: 'json' };

/** @param {unknown} value */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/** @param {unknown} value */
function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

/**
 * Validate the game data consumed by the runtime.
 * @param {{config: object, levels: object[], texts: object, assets: object}} data
 */
export function validateGameData(data) {
  const { config, levels, texts, assets } = data;
  const errors = [];
  const checkNumber = (value, name, positive = false) => {
    if (!isFiniteNumber(value) || (positive && value <= 0)) errors.push(name);
  };

  if (!config || !config.viewport || !config.physics || !config.player || !config.animation || !config.aaron || !config.timing || !config.ending || !config.save || !config.audio) {
    throw new Error('Invalid game config: missing viewport, physics, player, animation, aaron, timing, ending, save, or audio.');
  }
  if (config.stack?.renderer !== 'CANVAS') errors.push('stack.renderer');

  for (const [name, value] of Object.entries({
    'viewport.width': config.viewport.width,
    'viewport.height': config.viewport.height,
    'viewport.maxDisplayScale': config.viewport.maxDisplayScale,
    'viewport.cameraLead': config.viewport.cameraLead,
    'physics.speed': config.physics.speed,
    'physics.gravity': config.physics.gravity,
    'physics.jumpVelocity': config.physics.jumpVelocity,
    'physics.fixedFps': config.physics.fixedFps,
    'physics.coyoteMs': config.physics.coyoteMs,
    'physics.jumpBufferMs': config.physics.jumpBufferMs,
    'physics.maxFallSpeed': config.physics.maxFallSpeed,
    'physics.killFeetY': config.physics.killFeetY,
    'player.frameWidth': config.player.frameWidth,
    'player.frameHeight': config.player.frameHeight,
    'player.originX': config.player.originX,
    'player.originY': config.player.originY,
    'player.anchorX': config.player.anchorX,
    'player.anchorY': config.player.anchorY,
    'player.bodyWidth': config.player.bodyWidth,
    'player.bodyHeight': config.player.bodyHeight,
    'player.bodyOffsetX': config.player.bodyOffsetX,
    'player.bodyOffsetY': config.player.bodyOffsetY,
    'player.displayScale': config.player.displayScale,
    'timing.levelFadeOutMs': config.timing.levelFadeOutMs,
    'timing.levelFadeInMs': config.timing.levelFadeInMs,
    'timing.levelTitleMs': config.timing.levelTitleMs,
    'timing.respawnFadeOutMs': config.timing.respawnFadeOutMs,
    'timing.respawnHoldMs': config.timing.respawnHoldMs,
    'timing.respawnFadeInMs': config.timing.respawnFadeInMs,
    'timing.hintMs': config.timing.hintMs,
    'timing.reducedFadeMs': config.timing.reducedFadeMs,
  })) checkNumber(value, name, name.includes('width') || name.includes('height') || name.endsWith('Scale') || name.endsWith('Fps'));

  for (const [name, value] of Object.entries(config.timing)) {
    if (!isFiniteNumber(value) || value < 0) errors.push(`timing.${name}`);
  }

  for (const [name, value] of Object.entries({
    'ending.groundY': config.ending.groundY,
    'ending.aurianaStartX': config.ending.aurianaStartX,
    'ending.aurianaEndX': config.ending.aurianaEndX,
    'ending.aaronX': config.ending.aaronX,
    'ending.walkMs': config.ending.walkMs,
    'ending.settleMs': config.ending.settleMs,
    'ending.lightMs': config.ending.lightMs,
    'ending.heartMs': config.ending.heartMs,
    'ending.dedicationMs': config.ending.dedicationMs,
    'ending.veilOpacity': config.ending.veilOpacity,
    'ending.halo.width': config.ending.halo?.width,
    'ending.halo.height': config.ending.halo?.height,
    'ending.halo.x': config.ending.halo?.x,
    'ending.halo.y': config.ending.halo?.y,
    'ending.halo.pixelSize': config.ending.halo?.pixelSize,
    'ending.halo.maxOpacity': config.ending.halo?.maxOpacity,
    'ending.heart.width': config.ending.heart?.width,
    'ending.heart.height': config.ending.heart?.height,
    'ending.heart.scale': config.ending.heart?.scale,
    'ending.heart.startY': config.ending.heart?.startY,
    'ending.heart.endY': config.ending.heart?.endY,
  })) checkNumber(value, name, name.endsWith('Ms') || /\.(width|height|scale|pixelSize)$/.test(name));
  if (!Number.isInteger(config.ending.halo?.width) || !Number.isInteger(config.ending.halo?.height) || !Number.isInteger(config.ending.halo?.pixelSize) || config.ending.halo?.pixelSize <= 0) errors.push('ending.halo');
  if (!Number.isInteger(config.ending.heart?.width) || !Number.isInteger(config.ending.heart?.height) || config.ending.heart?.width !== 8 || config.ending.heart?.height !== 8) errors.push('ending.heart');
  if (config.ending.veilOpacity < 0 || config.ending.veilOpacity > 1 || config.ending.halo?.maxOpacity < 0 || config.ending.halo?.maxOpacity > 1) errors.push('ending.opacity');
  if (typeof config.save.key !== 'string' || config.save.key.length === 0) errors.push('save.key');
  if (typeof config.save.prefsKey !== 'string' || config.save.prefsKey.length === 0) errors.push('save.prefsKey');
  if (!Number.isInteger(config.save.version) || config.save.version <= 0) errors.push('save.version');
  if (typeof config.audio.defaultMuted !== 'boolean') errors.push('audio.defaultMuted');
  for (const key of ['musicGain', 'endingMusicGain', 'sfxGain']) {
    if (!isFiniteNumber(config.audio[key]) || config.audio[key] < 0 || config.audio[key] > 1) errors.push(`audio.${key}`);
  }
  checkNumber(config.audio.fadeMs, 'audio.fadeMs', true);

  const animation = config.animation;
  for (const [name, value] of Object.entries({
    'animation.idleFrames': animation.idleFrames,
    'animation.runFrames': animation.runFrames,
    'animation.airFrames': animation.airFrames,
    'animation.runFrameMs': animation.runFrameMs,
    'animation.airFrameMs': animation.airFrameMs,
  })) checkNumber(value, name, true);
  for (const name of ['idleFrames', 'runFrames', 'airFrames']) {
    if (!Number.isInteger(animation[name])) errors.push(`animation.${name}`);
  }
  if (!Array.isArray(animation.idleDurationsMs) || animation.idleDurationsMs.length !== animation.idleFrames) {
    errors.push('animation.idleDurationsMs');
  } else {
    for (const duration of animation.idleDurationsMs) {
      checkNumber(duration, 'animation.idleDurationsMs', true);
    }
  }
  if (typeof animation.mirrorLeft !== 'boolean') errors.push('animation.mirrorLeft');

  for (const key of ['idleFrames', 'idleFrameMs', 'originX', 'originY', 'displayScale']) checkNumber(config.aaron[key], `aaron.${key}`, true);
  if (!Number.isInteger(config.aaron.idleFrames)) errors.push('aaron.idleFrames');

  if (config.physics.jumpVelocity >= 0) errors.push('physics.jumpVelocity');
  if (config.player.bodyOffsetX + config.player.bodyWidth > config.player.frameWidth) errors.push('player.bodyOffsetX');
  if (config.player.bodyOffsetY + config.player.bodyHeight !== config.player.anchorY) errors.push('player.anchorY');
  if (config.player.bodyOffsetX + config.player.bodyWidth / 2 !== config.player.anchorX) errors.push('player.anchorX');
  if (!config.palette || !Object.entries(config.palette).every(([key, color]) => key === 'page' || key === 'panel' || key === 'text' || key === 'secondary' || key === 'accent' || key === 'accentText' || key === 'focus' ? isHexColor(color) : true)) errors.push('palette');

  const environment = config.environment;
  if (!environment || typeof environment.atlasKey !== 'string' || !environment.atlasKey) {
    errors.push('environment');
  } else {
    for (const key of ['atlasSize', 'chunkWidth', 'terrainRenderHeight', 'maxDecorations', 'maxDisplayObjects', 'maxTextureBytes', 'maxPngBytes', 'lanternScale', 'pedestalHeight']) {
      if (!Number.isInteger(environment[key]) || environment[key] <= 0) errors.push(`environment.${key}`);
    }
    for (const key of ['atlasPadding', 'terrainTopY']) {
      if (!Number.isInteger(environment[key]) || environment[key] < 0) errors.push(`environment.${key}`);
    }
    if (!Array.isArray(environment.backgroundLayers) || environment.backgroundLayers.join(',') !== 'back,far,near') errors.push('environment.backgroundLayers');
    if (!Array.isArray(environment.backgroundScrollFactors) || environment.backgroundScrollFactors.length !== 3 || environment.backgroundScrollFactors.some((value) => !isFiniteNumber(value) || value < 0 || value > 1)) errors.push('environment.backgroundScrollFactors');
    if (!environment.depth || ['background', 'terrain', 'decorations', 'markers', 'player'].some((key) => !isFiniteNumber(environment.depth[key]))) errors.push('environment.depth');
    if (!Array.isArray(environment.themes) || environment.themes.length !== 5 || environment.themes.some((theme, index) => theme.id !== `level-${index + 1}` || typeof theme.family !== 'string' || !isHexColor(theme.tone) || !isFiniteNumber(theme.mix) || theme.mix < 0 || theme.mix > 1)) errors.push('environment.themes');
    if (!Array.isArray(environment.lanternCrop) || environment.lanternCrop.length !== 4 || environment.lanternCrop.some((value) => !Number.isInteger(value) || value < 0) || environment.lanternCrop[2] === 0 || environment.lanternCrop[3] === 0) errors.push('environment.lanternCrop');
    if (!isFiniteNumber(environment.inactiveLampBrightness) || environment.inactiveLampBrightness < 0 || environment.inactiveLampBrightness > 1) errors.push('environment.inactiveLampBrightness');
  }

  if (!Array.isArray(levels) || levels.length !== 5) {
    errors.push('levels.length');
  } else {
    for (let index = 0; index < levels.length; index += 1) {
      const level = levels[index];
      if (level.id !== index + 1 || !isFiniteNumber(level.width) || !isFiniteNumber(level.height) || level.width <= 0 || level.height <= 0) {
        errors.push(`levels[${index}]`);
        continue;
      }
      if (!Array.isArray(level.surfaces) || level.surfaces.length < 1) {
        errors.push(`levels[${index}].surfaces`);
        continue;
      }
      const surfaceIds = new Set();
      for (const surface of level.surfaces) {
        if (typeof surface.id !== 'string' || surfaceIds.has(surface.id)) errors.push(`levels[${index}].surfaceId`);
        surfaceIds.add(surface.id);
        for (const [field, value] of Object.entries({ x: surface.x, y: surface.y, width: surface.width, height: surface.height })) {
          checkNumber(value, `levels[${index}].surface.${field}`, field === 'width' || field === 'height');
        }
        if (surface.x < 0 || surface.y < 0 || surface.x + surface.width > level.width || surface.y + surface.height > level.height) {
          errors.push(`levels[${index}].surfaceBounds`);
        }
      }
      if (level.environmentId !== `level-${index + 1}` || !environment?.themes?.some((theme) => theme.id === level.environmentId)) errors.push(`levels[${index}].environmentId`);
      if (!Array.isArray(level.decorations) || level.decorations.length > environment?.maxDecorations) {
        errors.push(`levels[${index}].decorations`);
      } else {
        for (const decoration of level.decorations) {
          if (!['prop.tree', 'prop.bush', 'prop.rock', 'prop.shrooms', 'prop.sign'].includes(decoration.frame) || !isFiniteNumber(decoration.x) || !isFiniteNumber(decoration.feetY) || typeof decoration.flipX !== 'boolean' || decoration.x < 0 || decoration.x > level.width || decoration.feetY < 0 || decoration.feetY > level.height || !level.surfaces.some((surface) => surface.y === decoration.feetY && decoration.x >= surface.x && decoration.x <= surface.x + surface.width)) errors.push(`levels[${index}].decoration`);
        }
      }
      for (const [pointName, point] of [['spawn', level.spawn], ['checkpoint', level.checkpoint], ['goal', level.goal]]) {
        if (!point || !isFiniteNumber(point.x) || !isFiniteNumber(point.feetY) || !surfaceIds.has(point.supportId)) {
          errors.push(`levels[${index}].${pointName}`);
          continue;
        }
        const support = level.surfaces.find((surface) => surface.id === point.supportId);
        if (support.y !== point.feetY || point.x <= support.x || point.x >= support.x + support.width) errors.push(`levels[${index}].${pointName}.support`);
      }
      if (!isFiniteNumber(level.goal.width) || level.goal.width <= 0 || !isFiniteNumber(level.goal.height) || level.goal.height <= 0) errors.push(`levels[${index}].goalSize`);
      if (!level.palette || !isHexColor(level.palette.sky) || !isHexColor(level.palette.near)) errors.push(`levels[${index}].palette`);
    }
  }

  for (const key of ['desktopHeaderPx', 'touchHeaderPx', 'touchButtonPx', 'touchJumpWidthPx', 'touchFooterPx', 'minTextPx', 'safePaddingPx', 'cornerRadiusPx', 'hintRowPx', 'minAuxTextPx']) checkNumber(config.ui?.[key], `ui.${key}`, true);

  const requiredTextKeys = [
    'title', 'subtitle', 'start', 'continue', 'newGame', 'viewEnding', 'loading', 'loadError', 'retry',
    'keyboardHelp', 'escapeHelp', 'touchHelp', 'rotateHint', 'left', 'right', 'jump', 'canvasLabel', 'canvasAlternative', 'checkpoint', 'fall', 'step', 'saveUnavailable', 'pause', 'resume', 'restartLevel',
    'skipEnding', 'backToTitle', 'pauseTitle', 'pausedHint', 'skipConfirmTitle', 'skipConfirmBody',
    'skipConfirmYes', 'resetConfirmTitle', 'resetConfirmBody', 'resetConfirmYes', 'cancel', 'reduceMotion',
    'mute', 'unmute', 'soundUnavailable', 'soundBlocked',
    'endingTitle', 'endingBody', 'endingLove', 'signature', 'replay', 'prototypeLabel',
  ];
  if (!texts || requiredTextKeys.some((key) => typeof texts[key] !== 'string') || !Array.isArray(texts.levelNames) || texts.levelNames.length !== 5) {
    errors.push('texts');
  }
  if (!assets || !Array.isArray(assets.assets) || assets.assets.some((asset) => typeof asset.ready !== 'boolean' || typeof asset.path !== 'string')) {
    errors.push('assets');
  }

  if (Array.isArray(assets?.assets)) {
    const keys = new Set();
    const validPath = (path) => typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some((part) => part === '..' || part === '.' || part === '') && !/^[a-z][a-z0-9+.-]*:/i.test(path);
    for (const asset of assets.assets) {
      if (typeof asset.key !== 'string' || !asset.key || keys.has(asset.key)) errors.push('assets.key');
      keys.add(asset.key);
      if (!validPath(asset.path)) errors.push(`assets.${asset.key}.path`);
      if (asset.type === 'atlas' && !validPath(asset.dataPath)) errors.push(`assets.${asset.key}.dataPath`);
    }
    const atlas = assets.assets.find((asset) => asset.key === environment?.atlasKey);
    if (!atlas || atlas.type !== 'atlas' || !atlas.ready || atlas.width !== environment.atlasSize || atlas.height !== environment.atlasSize) errors.push('assets.environmentAtlas');
    const aaron = assets.assets.find((asset) => asset.key === 'aaron.idle');
    if (!aaron || aaron.type !== 'spritesheet' || !aaron.ready || aaron.frames !== config.aaron.idleFrames) errors.push('assets.aaronIdle');
  }

  if (errors.length > 0) throw new Error(`Invalid game data: ${errors.join(', ')}`);
  return true;
}

validateGameData({ config: configData, levels: levelsData, texts: textsData, assets: assetsData });

export const config = configData;
export const levels = levelsData;
export const texts = textsData;
export const assets = assetsData;

/** @param {{assets: Array<{ready: boolean}>}} manifest */
export function getReadyAssets(manifest = assets) {
  return manifest.assets.filter((asset) => asset.ready);
}
