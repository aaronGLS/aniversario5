import Phaser from 'phaser';
import { config, levels } from '../config.js';
import { createEnvironment } from '../game/environment.js';
import { completeSequence } from '../core/flow.js';
import { PLAYER_IDLE_ANIMATION_KEY, PLAYER_IDLE_TEXTURE_KEY, PLAYER_RUN_ANIMATION_KEY, PLAYER_RUN_TEXTURE_KEY } from '../game/player.js';
import { createAaron, getAaronDebugSnapshot } from '../game/aaron.js';

const PRE_UPDATE = Phaser.Scenes.Events.PRE_UPDATE;
const SHUTDOWN = Phaser.Scenes.Events.SHUTDOWN;
const CREATE = Phaser.Scenes.Events.CREATE;
const RESUME = Phaser.Scenes.Events.RESUME;
const HALO_TEXTURE_KEY = 'ending-halo';
const HEART_TEXTURE_KEY = 'heart-8';
const ENDING_PHASES = [
  ['walk', 'walkMs'],
  ['settle', 'settleMs'],
  ['light', 'lightMs'],
  ['heart', 'heartMs'],
  ['dedication', 'dedicationMs'],
];

function getEndingDurationMs() {
  return ENDING_PHASES.reduce((total, [, durationKey]) => total + config.ending[durationKey], 0);
}

/** @param {Phaser.Scene} scene */
function createEndingTextures(scene) {
  const { halo, heart } = config.ending;
  if (!scene.textures.exists(HALO_TEXTURE_KEY)) {
    const texture = scene.textures.createCanvas(HALO_TEXTURE_KEY, halo.width, halo.height);
    const context = texture.context;
    const color = config.palette.focus;
    const channels = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
    context.imageSmoothingEnabled = false;
    for (let y = 0; y < halo.height; y += halo.pixelSize) {
      for (let x = 0; x < halo.width; x += halo.pixelSize) {
        const dx = (x + halo.pixelSize / 2 - halo.width / 2) / (halo.width / 2);
        const dy = (y + halo.pixelSize / 2 - halo.height / 2) / (halo.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance >= 1) continue;
        const alpha = (1 - distance) ** 2;
        context.fillStyle = `rgba(${channels.join(',')},${alpha})`;
        context.fillRect(x, y, halo.pixelSize, halo.pixelSize);
      }
    }
    texture.refresh();
  }

  if (!scene.textures.exists(HEART_TEXTURE_KEY)) {
    const texture = scene.textures.createCanvas(HEART_TEXTURE_KEY, heart.width, heart.height);
    const context = texture.context;
    const color = config.palette.accent;
    const channels = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
    const pixels = [
      '01100110',
      '11111111',
      '11111111',
      '11111111',
      '01111110',
      '00111100',
      '00011000',
      '00000000',
    ];
    context.imageSmoothingEnabled = false;
    context.fillStyle = `rgb(${channels.join(',')})`;
    pixels.forEach((row, y) => {
      [...row].forEach((pixel, x) => {
        if (pixel === '1') context.fillRect(x * heart.width / 8, y * heart.height / 8, heart.width / 8, heart.height / 8);
      });
    });
    texture.refresh();
  }
}

export class EndingScene extends Phaser.Scene {
  /** @param {object} app */
  constructor(app) {
    super({ key: 'EndingScene' });
    this.app = app;
    this.session = app.session;
    this.ui = app.ui;
  }

  /** @param {{token: number, reducedAtStart?: boolean}} data */
  init(data) {
    this.token = data.token;
    this.reducedAtStart = this.reducedAtStart === true || data.reducedAtStart === true;
    this.pendingReducedFinish = false;
    this.auriana = null;
    this.aaron = null;
    this.veil = null;
    this.halo = null;
    this.heart = null;
  }

  create() {
    this.events.once(CREATE, () => {
      if (!this.isCurrentStart() || this.app.activeSceneKey !== 'EndingScene') {
        this.game.scene.stop('EndingScene');
        return;
      }
      if (this.session.mode === 'PAUSED') this.scene.pause();
    });
    if (!this.isCurrentStart() || this.app.activeSceneKey !== 'EndingScene') return;

    const level = levels[4];
    this.cameras.main.resetFX();
    this.cameras.main.setBackgroundColor(level.palette.sky);
    this.cameras.main.setBounds(0, 0, config.viewport.width, config.viewport.height);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;
    this.environment = createEnvironment(this, {
      ...level,
      width: config.viewport.width,
      surfaces: [{ x: 0, y: config.ending.groundY, width: config.viewport.width, height: level.height - config.ending.groundY }],
      decorations: [],
    }, this.app.preferences.reducedEffects);
    createEndingTextures(this);
    this.createPresentation();
    this.ui.showEndingSequence();
    this.session.sequence.elapsedMs = 0;
    this.session.sequence.phaseElapsedMs = 0;

    this.preUpdateHandler = (_time, delta) => {
      if (this.matchesSequence() && Number.isFinite(delta) && delta > 0) this.advanceTimeline(delta);
    };
    this.events.on(PRE_UPDATE, this.preUpdateHandler);
    this.events.once(SHUTDOWN, this.cleanup, this);
    this.resumeHandler = () => {
      if (!this.pendingReducedFinish || !this.matchesSequence()) return;
      this.pendingReducedFinish = false;
      this.finishReducedPresentation();
    };
    this.events.on(RESUME, this.resumeHandler);

    if (this.reducedAtStart || this.app.preferences.reducedEffects) {
      this.reducedAtStart = true;
      this.setStaticActorPositions();
      this.applyCompleteLighting();
      if (this.session.mode === 'PAUSED') this.pendingReducedFinish = true;
      else this.finishReducedPresentation();
    } else {
      this.createApproach();
      this.updatePresentation();
    }
  }

  createPresentation() {
    const { halo } = config.ending;
    const depth = config.environment.depth.markers;
    this.veil = this.add.rectangle(
      config.viewport.width / 2,
      config.viewport.height / 2,
      config.viewport.width,
      config.viewport.height,
      Number.parseInt(config.palette.page.slice(1), 16),
      1,
    ).setAlpha(0).setDepth(depth + 0.25);
    this.halo = this.add.image(halo.x, halo.y, HALO_TEXTURE_KEY).setAlpha(0).setDepth(depth + 0.5);
    this.heart = this.add.image(0, config.ending.heart.startY, HEART_TEXTURE_KEY)
      .setScale(config.ending.heart.scale)
      .setAlpha(0)
      .setVisible(false)
      .setDepth(depth + 2);
    this.auriana = this.add.sprite(config.ending.aurianaStartX, config.ending.groundY, PLAYER_IDLE_TEXTURE_KEY, 0)
      .setDepth(config.environment.depth.player)
      .setOrigin(config.player.originX, config.player.originY)
      .setScale(config.player.displayScale)
      .setFlipX(false)
      .play(PLAYER_RUN_ANIMATION_KEY);
    this.aaron = createAaron(this, config.ending.aaronX, config.ending.groundY);
  }

  createApproach() {
    this.auriana.setPosition(config.ending.aurianaStartX, config.ending.groundY);
    this.auriana.play(PLAYER_RUN_ANIMATION_KEY);
  }

  setStaticActorPositions() {
    this.auriana.setPosition(config.ending.aurianaEndX, config.ending.groundY).setVisible(true).setAlpha(1);
    this.auriana.anims.stop();
    this.auriana.setTexture(PLAYER_IDLE_TEXTURE_KEY, 0);
    this.aaron.setPosition(config.ending.aaronX, config.ending.groundY).setVisible(true).setAlpha(1);
    this.aaron.anims.stop();
    this.aaron.setTexture('aaron.idle', 0);
  }

  applyCompleteLighting() {
    this.veil.setAlpha(config.ending.veilOpacity);
    this.halo.setAlpha(config.ending.halo.maxOpacity);
    this.heart
      .setPosition((config.ending.aurianaEndX + config.ending.aaronX) / 2, config.ending.heart.endY)
      .setAlpha(1)
      .setVisible(true);
  }

  /** @param {boolean} reduced */
  setReducedEffects(reduced) {
    if (reduced) this.reducedAtStart = true;
  }

  finishReducedSequence() {
    if ((!this.reducedAtStart && !this.app.preferences.reducedEffects) || !this.matchesSequence()) return;
    this.reducedAtStart = true;
    this.pendingReducedFinish = false;
    this.finishReducedPresentation();
  }

  finishReducedPresentation() {
    if (!this.matchesSequence()) return;
    this.setStaticActorPositions();
    this.applyCompleteLighting();
    this.ui.prepareDedication();
    this.ui.updateDedicationProgress(1);
    this.session.sequence.elapsedMs = getEndingDurationMs();
    this.session.sequence.phaseElapsedMs = 0;
    this.finishMessage();
  }

  /** @param {number} delta */
  advanceTimeline(delta) {
    let remaining = delta;
    while (remaining > 0 && this.matchesSequence()) {
      const phase = this.session.sequence.phase;
      const phaseDefinition = ENDING_PHASES.find(([name]) => name === phase);
      if (!phaseDefinition) return;
      const duration = config.ending[phaseDefinition[1]];
      const available = Math.max(0, duration - this.session.sequence.phaseElapsedMs);
      const step = Math.min(remaining, available);
      this.session.sequence.elapsedMs += step;
      this.session.sequence.phaseElapsedMs += step;
      remaining -= step;
      this.updatePresentation();
      if (this.session.sequence.phaseElapsedMs < duration) return;
      this.advancePhase(phase);
    }
  }

  /** @param {string} phase */
  advancePhase(phase) {
    const index = ENDING_PHASES.findIndex(([name]) => name === phase);
    if (index < 0) return;
    if (phase === 'walk') {
      this.auriana.setPosition(config.ending.aurianaEndX, config.ending.groundY);
      this.auriana.anims.stop();
      this.auriana.setTexture(PLAYER_IDLE_TEXTURE_KEY, 0).play(PLAYER_IDLE_ANIMATION_KEY);
    }
    if (phase === 'heart') this.heart.setVisible(true);
    if (phase === 'dedication') {
      this.finishMessage();
      return;
    }
    this.setPhase(ENDING_PHASES[index + 1][0]);
  }

  updatePresentation() {
    const phase = this.session.sequence?.phase;
    const phaseIndex = ENDING_PHASES.findIndex(([name]) => name === phase);
    const elapsed = this.session.sequence?.phaseElapsedMs ?? 0;
    const phaseName = ENDING_PHASES[phaseIndex]?.[0];
    const duration = phaseIndex >= 0 ? config.ending[ENDING_PHASES[phaseIndex][1]] : 1;
    const progress = Math.min(1, elapsed / duration);

    const walkProgress = phaseName === 'walk' ? progress : 1;
    this.auriana.x = config.ending.aurianaStartX + (config.ending.aurianaEndX - config.ending.aurianaStartX) * walkProgress;

    const lightIndex = ENDING_PHASES.findIndex(([name]) => name === 'light');
    const lightProgress = phaseIndex === lightIndex ? progress : phaseIndex > lightIndex ? 1 : 0;
    this.veil.setAlpha(config.ending.veilOpacity * lightProgress);
    this.halo.setAlpha(config.ending.halo.maxOpacity * lightProgress);

    const heartIndex = ENDING_PHASES.findIndex(([name]) => name === 'heart');
    const heartProgress = phaseIndex === heartIndex ? progress : phaseIndex > heartIndex ? 1 : 0;
    const easedHeartProgress = heartProgress * heartProgress * (3 - 2 * heartProgress);
    this.heart
      .setPosition(
        (this.auriana.x + this.aaron.x) / 2,
        config.ending.heart.startY + (config.ending.heart.endY - config.ending.heart.startY) * easedHeartProgress,
      )
      .setAlpha(easedHeartProgress)
      .setVisible(heartProgress > 0 || phaseIndex >= heartIndex);

    if (phaseName === 'dedication') this.ui.updateDedicationProgress(progress);
  }

  finishMessage() {
    if (!this.matchesSequence()) return false;
    if (!this.reducedAtStart) {
      this.auriana.setPosition(config.ending.aurianaEndX, config.ending.groundY);
      this.applyCompleteLighting();
    }
    this.ui.updateDedicationProgress(1);
    this.session.sequence.elapsedMs = Math.min(getEndingDurationMs(), this.session.sequence.elapsedMs ?? 0);
    if (!completeSequence(this.session, this.token, 'ENDING', 'FINISHED')) return false;
    this.ui.showDedication();
    this.app.audio?.enterFinished(this.tweens);
    this.app.saveProgress();
    return true;
  }

  /** @param {string} phase */
  setPhase(phase) {
    if (!this.matchesSequence()) return false;
    this.session.sequence.phase = phase;
    this.session.sequence.phaseElapsedMs = 0;
    if (phase === 'dedication') this.ui.prepareDedication();
    this.updatePresentation();
    return true;
  }

  matchesSequence() {
    return this.session.sequenceToken === this.token && this.session.mode === 'ENDING' && this.session.sequence?.token === this.token;
  }

  isCurrentStart() {
    if (this.matchesSequence()) return true;
    if (this.session.mode === 'PAUSED' && this.session.resumeMode === 'ENDING') {
      return this.session.sequenceToken === this.token && this.session.sequence?.token === this.token;
    }
    return this.session.mode === 'FINISHED' &&
      this.session.completed &&
      this.session.sequenceToken === this.token + 1 &&
      this.session.sequence?.phase === 'message' &&
      this.session.sequence.token === this.session.sequenceToken;
  }

  getDebugSnapshot() {
    const loop = this.game.loop;
    const visualState = this.auriana.texture.key === PLAYER_RUN_TEXTURE_KEY && this.auriana.anims.isPlaying ? 'ending-run' : 'ending-idle';
    const dedication = this.ui.getEndingDebugSnapshot();
    return {
      mode: this.session.mode,
      resumeMode: this.session.resumeMode,
      completed: this.session.completed,
      sceneKey: this.app.activeSceneKey,
      levelIndex: this.session.levelIndex,
      logicalLevelIndex: this.session.levelIndex,
      mapLevelIndex: 4,
      checkpointId: this.session.checkpointId,
      activeMs: this.session.activeMs,
      sequence: this.session.sequence ? { ...this.session.sequence } : null,
      body: { x: 0, y: 0, feetX: 0, feetY: 0, vx: 0, vy: 0, grounded: false, supportId: null },
      visual: {
        state: visualState,
        texture: this.auriana.texture.key,
        frame: this.auriana.frame.name,
        x: this.auriana.x,
        feetY: this.auriana.y,
        alpha: this.auriana.alpha,
        visible: this.auriana.visible,
        isPlaying: this.auriana.anims.isPlaying,
        displayWidth: this.auriana.displayWidth,
        displayHeight: this.auriana.displayHeight,
        originX: this.auriana.originX,
        originY: this.auriana.originY,
      },
      presentation: {
        phase: this.session.sequence?.phase ?? 'message',
        reducedAtStart: this.reducedAtStart,
        veilAlpha: this.veil.alpha,
        haloAlpha: this.halo.alpha,
        heart: { x: this.heart.x, y: this.heart.y, alpha: this.heart.alpha, visible: this.heart.visible },
        dedication,
      },
      environment: this.environment?.getDebugSnapshot() ?? null,
      aaron: getAaronDebugSnapshot(this.aaron),
      counts: {
        dynamicBodies: this.physics.world.bodies.entries.length,
        staticBodies: this.physics.world.staticBodies.entries.length,
        colliders: this.physics.world.colliders.getActive().length,
        textures: Object.keys(this.textures.list).length,
        animationDefinitions: this.anims.anims.size,
        idleAnimationFrames: config.animation.idleFrames,
        runAnimationFrames: config.animation.runFrames,
        worldStepListeners: this.physics.world.listenerCount('worldstep'),
        preUpdateListeners: this.events.listenerCount(PRE_UPDATE),
        displayObjects: this.children.length,
        canvases: this.ui.gameContainer.querySelectorAll('canvas').length,
      },
      timing: {
        actualFps: Number.isFinite(loop.actualFps) ? loop.actualFps : null,
        delta: Number.isFinite(loop.delta) ? loop.delta : null,
        rawDelta: Number.isFinite(loop.rawDelta) ? loop.rawDelta : null,
        rendererType: this.game.config.renderType ?? this.game.renderer?.type ?? null,
      },
    };
  }

  cleanup() {
    this.environment?.destroy();
    this.environment = null;
    if (this.preUpdateHandler) this.events.off(PRE_UPDATE, this.preUpdateHandler);
    if (this.resumeHandler) this.events.off(RESUME, this.resumeHandler);
    this.ui.resetEndingPresentation();
  }
}
