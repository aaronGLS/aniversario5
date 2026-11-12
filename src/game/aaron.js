import { config } from '../config.js';

const TEXTURE_KEY = 'aaron.idle';
const ANIMATION_KEY = 'aaron-idle';

/** Register the imported left-facing idle once for both scenes. @param {Phaser.Scene} scene */
export function registerAaronAnimation(scene) {
  if (scene.anims.exists(ANIMATION_KEY)) return;
  scene.anims.create({
    key: ANIMATION_KEY,
    frames: scene.anims.generateFrameNumbers(TEXTURE_KEY, { start: 0, end: config.aaron.idleFrames - 1 }),
    frameRate: 1000 / config.aaron.idleFrameMs,
    repeat: -1,
  });
}

/** Create the waiting character without an Arcade body. @param {Phaser.Scene} scene @param {number} x @param {number} feetY */
export function createAaron(scene, x, feetY) {
  return scene.add.sprite(x, feetY, TEXTURE_KEY, 0)
    .setOrigin(config.aaron.originX, config.aaron.originY)
    .setScale(config.aaron.displayScale)
    .setDepth(config.environment.depth.player)
    .play(ANIMATION_KEY);
}

/** Read-only prototype diagnostics. @param {Phaser.GameObjects.Sprite | null | undefined} aaron */
export function getAaronDebugSnapshot(aaron) {
  return aaron ? {
    texture: aaron.texture.key,
    frame: aaron.frame.name,
    x: aaron.x,
    feetY: aaron.y,
    displayWidth: aaron.displayWidth,
    displayHeight: aaron.displayHeight,
    originX: aaron.originX,
    originY: aaron.originY,
    flipX: aaron.flipX,
    visible: aaron.visible,
    alpha: aaron.alpha,
    isPlaying: aaron.anims.isPlaying,
    hasBody: Boolean(aaron.body),
  } : null;
}
