import { config } from '../config.js';

export const PLAYER_IDLE_TEXTURE_KEY = 'auriana.idle';
export const PLAYER_RUN_TEXTURE_KEY = 'auriana.run';
export const PLAYER_AIR_TEXTURE_KEY = 'auriana.air';
export const PLAYER_IDLE_ANIMATION_KEY = 'auriana.idle.loop';
export const PLAYER_RUN_ANIMATION_KEY = 'auriana.run.loop';
export const PLAYER_AIR_ANIMATION_KEY = 'auriana.air.once';

/** Register the two loops and one-shot jump once. @param {Phaser.Scene} scene */
export function registerPlayerAnimations(scene) {
  if (!scene.anims.exists(PLAYER_IDLE_ANIMATION_KEY)) {
    const shortestIdleMs = Math.min(...config.animation.idleDurationsMs);
    scene.anims.create({
      key: PLAYER_IDLE_ANIMATION_KEY,
      frames: config.animation.idleDurationsMs.map((duration, frame) => ({
        key: PLAYER_IDLE_TEXTURE_KEY,
        frame,
        duration,
      })),
      frameRate: 1000 / shortestIdleMs,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(PLAYER_RUN_ANIMATION_KEY)) {
    scene.anims.create({
      key: PLAYER_RUN_ANIMATION_KEY,
      frames: Array.from({ length: config.animation.runFrames }, (_, frame) => ({
        key: PLAYER_RUN_TEXTURE_KEY,
        frame,
      })),
      frameRate: 1000 / config.animation.runFrameMs,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(PLAYER_AIR_ANIMATION_KEY)) {
    scene.anims.create({
      key: PLAYER_AIR_ANIMATION_KEY,
      frames: Array.from({ length: config.animation.airFrames }, (_, frame) => ({
        key: PLAYER_AIR_TEXTURE_KEY,
        frame,
      })),
      frameRate: 1000 / config.animation.airFrameMs,
      repeat: 0,
    });
  }
}

/** Create Auriana with the canonical body and anchor. @param {Phaser.Scene} scene */
export function createPlayer(scene) {
  const player = scene.physics.add.sprite(0, 0, PLAYER_IDLE_TEXTURE_KEY, 0);
  player.setOrigin(config.player.originX, config.player.originY);
  player.setScale(config.player.displayScale);
  player.body.setSize(config.player.bodyWidth, config.player.bodyHeight, false);
  player.body.setOffset(config.player.bodyOffsetX, config.player.bodyOffsetY);
  player.body.setMaxVelocity(config.physics.speed, config.physics.maxFallSpeed);
  player.setCollideWorldBounds(true);
  player.visualState = 'idle';
  player.lastFacing = config.player.defaultFacing;
  player.setFlipX(player.lastFacing === 'left' && config.animation.mirrorLeft);
  player.play(PLAYER_IDLE_ANIMATION_KEY);
  return player;
}

/** Select the visual state after Arcade resolves contacts. @param {Phaser.Physics.Arcade.Sprite} player @param {boolean} grounded */
export function updatePlayerAnimation(player, grounded) {
  const velocityX = player.body.velocity.x;
  if (velocityX !== 0) {
    const facing = velocityX < 0 ? 'left' : 'right';
    if (facing !== player.lastFacing) {
      player.lastFacing = facing;
      player.setFlipX(facing === 'left' && config.animation.mirrorLeft);
    }
  }

  const nextState = !grounded ? 'air' : velocityX !== 0 ? 'run' : 'idle';
  if (nextState === player.visualState) return;

  if (nextState === 'air') {
    player.play(PLAYER_AIR_ANIMATION_KEY);
  } else {
    player.play(nextState === 'run' ? PLAYER_RUN_ANIMATION_KEY : PLAYER_IDLE_ANIMATION_KEY, true);
  }
  player.visualState = nextState;
}

/** Return to the idle frame when a respawn completes. @param {Phaser.Physics.Arcade.Sprite} player */
export function resetPlayerAnimation(player) {
  player.anims.stop();
  player.setTexture(PLAYER_IDLE_TEXTURE_KEY, 0);
  player.play(PLAYER_IDLE_ANIMATION_KEY);
  player.visualState = 'idle';
}
