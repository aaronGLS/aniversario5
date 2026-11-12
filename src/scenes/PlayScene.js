import Phaser from 'phaser';
import { getAaronDebugSnapshot } from '../game/aaron.js';
import { config, levels, texts } from '../config.js';
import {
  activateCheckpoint,
  beginRespawn,
  completeSequence,
  requestLevelAdvance,
  restartStep as resetSessionStep,
  setFacing,
} from '../core/flow.js';
import { createJumpRules, getJumpEligibility, resetJumpRules, updateJumpRules } from '../core/jumpRules.js';
import { createLevelContent, getRespawnPoint, overlapsGoal } from '../game/level.js';
import { createPlayer, resetPlayerAnimation, updatePlayerAnimation } from '../game/player.js';

const PRE_UPDATE = Phaser.Scenes.Events.PRE_UPDATE;
const SHUTDOWN = Phaser.Scenes.Events.SHUTDOWN;

export class PlayScene extends Phaser.Scene {
  /** @param {object} app */
  constructor(app) {
    super({ key: 'PlayScene' });
    this.app = app;
    this.session = app.session;
    this.ui = app.ui;
  }

  /** @param {{token?: number}} [data] */
  init(data = {}) {
    this.startToken = data.token ?? null;
    this.level = levels[this.session.levelIndex];
    this.mapLevelIndex = this.session.levelIndex;
    this.jumpRules = createJumpRules();
    this.grounded = false;
    this.supportId = null;
    this.world = null;
    this.player = null;
    this.levelContent = null;
    this.sequenceTimers = new Set();
    this.uiTimers = new Set();
    this.uiGeneration = 0;
    this.initialHelpShown = false;
  }

  create() {
    this.events.once(Phaser.Scenes.Events.CREATE, () => {
      if (!this.isCurrentStart() || this.app.activeSceneKey !== 'PlayScene') {
        this.game.scene.stop('PlayScene');
        return;
      }
      if (this.session.mode === 'PAUSED') this.scene.pause();
    });
    if (!this.isCurrentStart()) {
      return;
    }
    this.world = this.physics.world;
    this.world.useTree = false;
    this.world.resume();
    this.player = createPlayer(this);
    this.player.setDepth(config.environment.depth.player);
    this.configureMap(this.session.levelIndex, this.session.checkpointId);
    this.preUpdateHandler = this.handlePreUpdate.bind(this);
    this.worldStepHandler = this.handleWorldStep.bind(this);
    this.events.on(PRE_UPDATE, this.preUpdateHandler);
    this.world.on('worldstep', this.worldStepHandler);
    this.events.once(SHUTDOWN, this.cleanup, this);
    this.showLevelUI(true);
    if (this.session.mode !== 'PAUSED') this.ui.focusGame();
  }

  isCurrentStart() {
    const sessionIsPlaying = this.session.mode === 'PLAYING' || (this.session.mode === 'PAUSED' && this.session.resumeMode === 'PLAYING');
    return this.startToken !== null && this.session.sequenceToken === this.startToken && sessionIsPlaying;
  }

  /** @param {number} levelIndex @param {number} checkpointId */
  configureMap(levelIndex, checkpointId) {
    this.levelContent?.destroy();
    this.level = levels[levelIndex];
    this.mapLevelIndex = levelIndex;
    this.world.setBounds(0, 0, this.level.width, this.level.height, true, true, false, false);
    this.cameras.main.setBackgroundColor(this.level.palette.sky);
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
    this.levelContent = createLevelContent(this, this.level, this.player, checkpointId, this.app.preferences.reducedEffects);
    this.surfaceEntries = this.levelContent.entries;
    const spawn = getRespawnPoint(this.level, checkpointId);
    this.player.body.enable = true;
    this.player.body.reset(spawn.x, spawn.feetY);
    this.player.body.setVelocity(0, 0);
    this.player.lastFacing = 'right';
    this.player.setFlipX(false);
    resetPlayerAnimation(this.player);
    resetJumpRules(this.jumpRules);
    this.grounded = false;
    this.supportId = null;
    this.cameras.main.resetFX();
    this.cameras.main.scrollX = Phaser.Math.Clamp(
      Math.round(this.player.body.center.x - config.viewport.cameraLead),
      0,
      this.level.width - config.viewport.width,
    );
    this.cameras.main.scrollY = config.viewport.cameraY;
    this.levelContent.environment.setCameraScroll(this.cameras.main.scrollX);
  }

  /** @param {boolean} includeInitialHelp */
  showLevelUI(includeInitialHelp = false) {
    this.clearUiTimers();
    const generation = ++this.uiGeneration;
    const name = texts.levelNames[this.session.levelIndex];
    this.ui.updateStep(this.session.levelIndex + 1);
    this.ui.showLevelTitle(name);
    const showHelp = this.session.levelIndex === 0 && includeInitialHelp && !this.initialHelpShown;
    if (showHelp) this.initialHelpShown = true;

    this.addUiTimer(config.timing.levelTitleMs, generation, () => {
      if (showHelp) this.ui.showKeyboardHelp();
      else this.ui.clearStatus();
    });
    if (showHelp) {
      this.addUiTimer(config.timing.hintMs, generation, () => this.ui.clearStatus());
    }
  }

  /** @param {number} delay @param {number} generation @param {() => void} callback */
  addUiTimer(delay, generation, callback) {
    const event = this.time.delayedCall(delay, () => {
      this.uiTimers.delete(event);
      if (generation === this.uiGeneration) callback();
    });
    this.uiTimers.add(event);
  }

  clearUiTimers() {
    this.uiGeneration += 1;
    for (const timer of this.uiTimers) timer.remove(false);
    this.uiTimers.clear();
  }

  /** @param {number} _time @param {number} delta */
  handlePreUpdate(_time, delta) {
    if (Number.isFinite(delta) && delta > 0) {
      if (this.session.mode === 'PLAYING') this.session.activeMs += delta;
      if (this.session.sequence && this.session.mode !== 'PAUSED') {
        this.session.sequence.elapsedMs = (this.session.sequence.elapsedMs ?? 0) + delta;
        this.session.sequence.phaseElapsedMs = (this.session.sequence.phaseElapsedMs ?? 0) + delta;
      }
    }
    if (this.session.mode !== 'PLAYING') return;

    const axis = this.app.input.getMoveAxis();
    this.player.body.setVelocityX(axis * config.physics.speed);
    const jumpPressed = this.app.input.consumeJumpPressed();
    if (updateJumpRules(
      this.jumpRules,
      this.session.activeMs,
      this.grounded,
      jumpPressed,
      config.physics.coyoteMs,
      config.physics.jumpBufferMs,
    )) {
      this.player.body.setVelocityY(config.physics.jumpVelocity);
    }

    this.cameras.main.scrollX = Phaser.Math.Clamp(
      Math.round(this.player.body.center.x - config.viewport.cameraLead),
      0,
      this.level.width - config.viewport.width,
    );
    this.cameras.main.scrollY = config.viewport.cameraY;
    this.levelContent.environment.setCameraScroll(this.cameras.main.scrollX);
  }

  handleWorldStep() {
    if (!this.player?.body || !this.levelContent) return;
    const body = this.player.body;
    this.grounded = false;
    this.supportId = null;

    if (body.enable && body.touching.down) {
      for (const entry of this.surfaceEntries) {
        const supportBody = entry.sprite.body;
        if (Math.abs(body.bottom - supportBody.top) <= 1.25 && body.right > supportBody.left && body.left < supportBody.right) {
          this.grounded = true;
          this.supportId = entry.id;
          break;
        }
      }
    }

    if (this.session.mode !== 'PLAYING') return;
    if (body.bottom > config.physics.killFeetY) {
      this.beginRespawn();
      return;
    }
    updatePlayerAnimation(this.player, this.grounded);
    setFacing(this.session, this.player.lastFacing);

    if (
      this.session.checkpointId === 0 &&
      this.grounded &&
      this.supportId === this.level.checkpoint.supportId &&
      body.center.x >= this.level.checkpoint.x &&
      activateCheckpoint(this.session, this.mapLevelIndex)
    ) {
      this.levelContent.setCheckpointActive(true);
      this.app.saveProgress();
      this.ui.announce(texts.checkpoint);
    }

    if (
      this.grounded &&
      this.supportId === this.level.goal.supportId &&
      overlapsGoal(body, this.level.goal) &&
      requestLevelAdvance(this.session, this.mapLevelIndex)
    ) {
      const token = this.session.sequenceToken;
      if (this.session.mode === 'TRANSITION') {
        this.app.saveProgress();
        this.beginTransition(token);
      } else if (this.session.mode === 'ENDING') {
        this.app.input.clear();
        this.player.body.setVelocity(0, 0);
        this.world.pause();
        this.player.anims.pause();
        this.app.launchEnding(token);
      }
    }
  }

  /** @param {number} token */
  beginTransition(token) {
    this.app.input.clear();
    this.ui.setInputEnabled(false);
    resetJumpRules(this.jumpRules);
    this.player.body.setVelocity(0, 0);
    this.world.pause();
    this.player.anims.pause();
    this.session.sequence.elapsedMs = 0;
    this.setSequencePhase(token, 'TRANSITION', 'out');

    const fadeOut = this.app.preferences.reducedEffects ? 0 : config.timing.levelFadeOutMs;
    const fadeIn = this.app.preferences.reducedEffects ? 0 : config.timing.levelFadeInMs;
    if (fadeOut === 0 && fadeIn === 0) {
      this.setSequencePhase(token, 'TRANSITION', 'hold');
      this.replaceWithLogicalLevel();
      this.finishTransition(token);
      return;
    }

    this.cameras.main.fadeOut(fadeOut, 0, 0, 0);
    this.addSequenceTimer(fadeOut, token, 'TRANSITION', () => {
      this.setSequencePhase(token, 'TRANSITION', 'hold');
      this.replaceWithLogicalLevel();
      this.setSequencePhase(token, 'TRANSITION', 'in');
      this.cameras.main.fadeIn(fadeIn, 0, 0, 0);
      this.addSequenceTimer(fadeIn, token, 'TRANSITION', () => this.finishTransition(token));
    });
  }

  replaceWithLogicalLevel() {
    this.configureMap(this.session.levelIndex, this.session.checkpointId);
    this.player.body.setVelocity(0, 0);
    this.player.anims.pause();
    this.app.input.clear();
  }

  /** @param {number} token */
  finishTransition(token) {
    if (!completeSequence(this.session, token, 'TRANSITION', 'PLAYING')) return;
    this.world.resume();
    this.player.anims.resume();
    this.app.input.clear();
    this.ui.setInputEnabled(true);
    this.ui.clearStatus();
    this.showLevelUI(false);
  }

  beginRespawn() {
    const token = beginRespawn(this.session);
    if (token === null) return;
    this.app.input.clear();
    this.ui.setInputEnabled(false);
    this.player.anims.pause();
    this.player.body.setVelocity(0, 0);
    this.player.body.enable = false;
    this.world.pause();
    this.grounded = false;
    this.supportId = null;
    this.ui.announce(texts.fall);
    this.session.sequence.elapsedMs = 0;
    this.setSequencePhase(token, 'RESPAWNING', 'out');

    if (this.app.preferences.reducedEffects) {
      this.placeAtCheckpoint();
      this.finishRespawn(token);
      return;
    }

    this.cameras.main.fadeOut(config.timing.respawnFadeOutMs, 0, 0, 0);
    this.addSequenceTimer(config.timing.respawnFadeOutMs, token, 'RESPAWNING', () => {
      this.setSequencePhase(token, 'RESPAWNING', 'hold');
      this.addSequenceTimer(config.timing.respawnHoldMs, token, 'RESPAWNING', () => {
        this.placeAtCheckpoint();
        this.setSequencePhase(token, 'RESPAWNING', 'in');
        this.cameras.main.fadeIn(config.timing.respawnFadeInMs, 0, 0, 0);
        this.addSequenceTimer(config.timing.respawnFadeInMs, token, 'RESPAWNING', () => this.finishRespawn(token));
      });
    });
  }

  placeAtCheckpoint() {
    const point = getRespawnPoint(this.level, this.session.checkpointId);
    this.player.body.reset(point.x, point.feetY);
    this.player.body.setVelocity(0, 0);
    this.grounded = false;
    this.supportId = null;
    resetJumpRules(this.jumpRules);
    this.cameras.main.scrollX = Phaser.Math.Clamp(
      Math.round(this.player.body.center.x - config.viewport.cameraLead),
      0,
      this.level.width - config.viewport.width,
    );
    this.cameras.main.scrollY = config.viewport.cameraY;
    this.levelContent.environment.setCameraScroll(this.cameras.main.scrollX);
  }

  /** @param {number} token */
  finishRespawn(token) {
    if (!completeSequence(this.session, token, 'RESPAWNING', 'PLAYING')) return;
    this.player.body.enable = true;
    this.world.resume();
    this.ui.setInputEnabled(true);
    resetPlayerAnimation(this.player);
    this.app.input.clear();
    this.ui.focusGame();
  }

  /** @param {number} delay @param {number} token @param {'TRANSITION'|'RESPAWNING'} expectedMode @param {() => void} callback */
  addSequenceTimer(delay, token, expectedMode, callback) {
    const event = this.time.delayedCall(delay, () => {
      this.sequenceTimers.delete(event);
      if (this.matchesSequence(token, expectedMode)) callback();
    });
    this.sequenceTimers.add(event);
  }

  /** @param {number} token @param {'TRANSITION'|'RESPAWNING'} expectedMode @param {string} phase */
  setSequencePhase(token, expectedMode, phase) {
    if (!this.matchesSequence(token, expectedMode)) return false;
    this.session.sequence.phase = phase;
    this.session.sequence.phaseElapsedMs = 0;
    return true;
  }

  /** @param {number} token @param {'TRANSITION'|'RESPAWNING'} expectedMode */
  matchesSequence(token, expectedMode) {
    return this.session.sequenceToken === token && this.session.mode === expectedMode && this.session.sequence?.token === token;
  }

  finishReducedSequence() {
    if (!this.app.preferences.reducedEffects) return;
    const mode = this.session.mode;
    const token = this.session.sequenceToken;
    if (!['RESPAWNING', 'TRANSITION'].includes(mode) || !this.matchesSequence(token, mode)) return;
    this.cancelSequenceObjects();
    if (mode === 'RESPAWNING') {
      this.placeAtCheckpoint();
      this.finishRespawn(token);
    } else {
      if (this.mapLevelIndex !== this.session.levelIndex) this.replaceWithLogicalLevel();
      this.finishTransition(token);
    }
  }

  cancelSequenceObjects() {
    for (const timer of this.sequenceTimers) timer.remove(false);
    this.sequenceTimers.clear();
    this.cameras.main?.resetFX();
    this.world?.resume();
    if (this.player?.anims) this.player.anims.resume();
  }

  /** Cancel the current paused logical step and place the same player body at cp0. */
  restartCurrentStep() {
    const levelIndex = resetSessionStep(this.session);
    if (levelIndex === null) return false;
    this.cancelSequenceObjects();
    this.clearUiTimers();
    this.configureMap(levelIndex, 0);
    this.app.input.clear();
    this.app.saveProgress();
    this.ui.clearStatus();
    this.showLevelUI(false);
    return true;
  }

  getDebugSnapshot() {
    const body = this.player?.body ?? null;
    const world = this.world;
    const gameLoop = this.game.loop;
    const activeColliders = world?.colliders.getActive() ?? [];
    const eligibility = body
      ? getJumpEligibility(this.jumpRules, this.session.activeMs, this.grounded, config.physics.coyoteMs, config.physics.jumpBufferMs)
      : { canJump: false, grounded: false, jumpedSinceGround: false, coyoteRemainingMs: 0, bufferRemainingMs: 0 };
    const sceneKey = this.app.activeSceneKey;

    return {
      mode: this.session.mode,
      resumeMode: this.session.resumeMode,
      completed: this.session.completed,
      sceneKey,
      levelIndex: this.session.levelIndex,
      logicalLevelIndex: this.session.levelIndex,
      mapLevelIndex: this.mapLevelIndex,
      checkpointId: this.session.checkpointId,
      activeMs: this.session.activeMs,
      sequence: this.session.sequence ? { ...this.session.sequence } : null,
      body: body ? {
        x: body.x,
        y: body.y,
        feetX: body.center.x,
        feetY: body.bottom,
        vx: body.velocity.x,
        vy: body.velocity.y,
        grounded: this.grounded,
        supportId: this.supportId,
      } : { x: 0, y: 0, feetX: 0, feetY: 0, vx: 0, vy: 0, grounded: false, supportId: null },
      jumpEligibility: eligibility,
      visual: this.player ? {
        state: this.player.visualState,
        texture: this.player.texture.key,
        frame: this.player.frame.name,
        flipX: this.player.flipX,
        displayWidth: this.player.displayWidth,
        displayHeight: this.player.displayHeight,
        originX: this.player.originX,
        originY: this.player.originY,
        bodyWidth: body.width,
        bodyHeight: body.height,
        bodyOffsetX: body.offset.x,
        bodyOffsetY: body.offset.y,
        isPlaying: this.player.anims.isPlaying,
      } : null,
      environment: this.levelContent?.environment.getDebugSnapshot() ?? null,
      aaron: getAaronDebugSnapshot(this.levelContent?.aaron),
      counts: {
        dynamicBodies: world?.bodies.entries.length ?? 0,
        staticBodies: world?.staticBodies.entries.length ?? 0,
        colliders: activeColliders.length,
        textures: Object.keys(this.textures.list).length,
        animationDefinitions: this.anims.anims.size,
        idleAnimationFrames: config.animation.idleFrames,
        runAnimationFrames: config.animation.runFrames,
        worldStepListeners: world?.listenerCount('worldstep') ?? 0,
        preUpdateListeners: this.events.listenerCount(PRE_UPDATE),
        displayObjects: this.children.length,
        canvases: this.ui.gameContainer.querySelectorAll('canvas').length,
      },
      timing: {
        actualFps: Number.isFinite(gameLoop.actualFps) ? gameLoop.actualFps : null,
        delta: Number.isFinite(gameLoop.delta) ? gameLoop.delta : null,
        rawDelta: Number.isFinite(gameLoop.rawDelta) ? gameLoop.rawDelta : null,
        rendererType: this.game.config.renderType ?? this.game.renderer?.type ?? null,
      },
    };
  }

  cleanup() {
    this.cancelSequenceObjects();
    this.clearUiTimers();
    if (this.preUpdateHandler) this.events.off(PRE_UPDATE, this.preUpdateHandler);
    if (this.world && this.worldStepHandler) this.world.off('worldstep', this.worldStepHandler);
    this.levelContent?.destroy();
    this.levelContent = null;
    this.player?.destroy();
    this.player = null;
    this.world?.resume();
  }
}
