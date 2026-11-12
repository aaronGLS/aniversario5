import { config } from '../config.js';
import { createEnvironment } from './environment.js';
import { createAaron } from './aaron.js';

/** @typedef {{id: string, x: number, y: number, width: number, height: number}} Surface */

/** @param {object} level @param {number} checkpointId */
export function getRespawnPoint(level, checkpointId) {
  const point = checkpointId === 1 ? level.checkpoint : level.spawn;
  return { x: point.x, feetY: point.feetY, supportId: point.supportId };
}

/** Create one invisible static body per canonical surface. */
export function createSurfaceGroup(scene, level) {
  const platforms = scene.physics.add.staticGroup();
  const entries = level.surfaces.map((surface) => {
    const sprite = scene.add.zone(surface.x + surface.width / 2, surface.y + surface.height / 2, surface.width, surface.height);
    platforms.add(sprite);
    sprite.setData('supportId', surface.id);
    return { id: surface.id, sprite };
  });
  return { platforms, entries, destroy() { platforms.destroy(true); } };
}

/** @param {{left: number, right: number, top: number, bottom: number}} body @param {object} goal */
export function overlapsGoal(body, goal) {
  const left = goal.x - goal.width / 2;
  const right = goal.x + goal.width / 2;
  const top = goal.feetY - goal.height;
  return body.right > left && body.left < right && body.bottom > top && body.top < goal.feetY;
}

/** Create the checkpoint and goal lamps. */
export function createLevelMarkers(scene, level, options = {}) {
  const settings = config.environment;
  const key = settings.atlasKey;
  const markers = [];
  const checkpoint = level.checkpoint;
  const checkpointLamp = scene.add.image(checkpoint.x, checkpoint.feetY, key, `marker.lantern.${options.checkpointActive ? 'on' : 'off'}`).setOrigin(0.5, 1).setScale(settings.lanternScale).setDepth(settings.depth.markers);
  markers.push(checkpointLamp);
  if (level.goal.kind !== 'ending') {
    const goal = level.goal;
    markers.push(scene.add.image(goal.x, goal.feetY, key, 'terrain.1').setOrigin(0.5, 1).setDepth(settings.depth.markers));
    markers.push(scene.add.image(goal.x, goal.feetY - settings.pedestalHeight, key, 'marker.lantern.on').setOrigin(0.5, 1).setScale(settings.lanternScale).setDepth(settings.depth.markers));
  }
  return { markers, setCheckpointActive(active) { checkpointLamp.setFrame(`marker.lantern.${active ? 'on' : 'off'}`); } };
}

/**
 * Own all disposable objects associated with one map, including its sole player collider.
 * @param {Phaser.Scene} scene
 * @param {object} level
 * @param {Phaser.Physics.Arcade.Sprite} player
 * @param {number} checkpointId
 * @param {boolean} reducedEffects
 */
export function createLevelContent(scene, level, player, checkpointId, reducedEffects) {
  const environment = createEnvironment(scene, level, reducedEffects);
  const surfaceGroup = createSurfaceGroup(scene, level);
  const collider = scene.physics.add.collider(player, surfaceGroup.platforms);
  const markerSet = createLevelMarkers(scene, level, { checkpointActive: checkpointId === 1 });
  const aaron = level.aaron
    ? createAaron(scene, level.aaron.x, level.aaron.feetY)
    : null;

  return {
    environment,
    aaron,
    platforms: surfaceGroup.platforms,
    entries: surfaceGroup.entries,
    setCheckpointActive: markerSet.setCheckpointActive,
    destroy() {
      collider.destroy();
      markerSet.markers.forEach((marker) => marker.destroy());
      aaron?.destroy();
      surfaceGroup.destroy();
      environment.destroy();
    },
  };
}
