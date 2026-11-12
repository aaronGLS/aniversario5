import Phaser from 'phaser';
import { config, levels } from './config.js';
import {
  backToTitle as moveBackToTitle,
  confirmSkipToEnding,
  createSession,
  finishBoot,
  pauseSession,
  restoreProgress,
  resumeSession,
  startGame,
  viewEnding,
} from './core/flow.js';
import { createProgressStorage } from './core/storage.js';
import { createInputManager } from './core/input.js';
import { resetJumpRules } from './core/jumpRules.js';
import { createAudioController } from './core/audio.js';
import { BootScene } from './scenes/BootScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { createUI } from './ui/ui.js';
import { createLayoutController } from './ui/layout.js';
import './styles.css';

const isPrototype = import.meta.env.DEV || import.meta.env.MODE === 'prototype';
const ui = createUI(isPrototype);
const session = createSession();
let game = null;
let playScene = null;
let endingScene = null;
let titleProgress = null;
let pendingEndingStart = null;
const lifecycleController = new AbortController();

const app = {
  session,
  ui,
  storage: null,
  preferences: null,
  input: null,
  audio: null,
  activeSceneKey: 'BootScene',
  saveProgress() {
    return app.storage.writeProgress({
      version: config.save.version,
      levelIndex: session.completed ? 4 : session.levelIndex,
      checkpointId: session.completed ? 1 : session.checkpointId,
      completed: session.completed,
    });
  },
  launchEnding: null,
};

app.storage = createProgressStorage({
  config,
  windowObject: window,
  onUnavailable: () => ui.setStorageUnavailable(),
});
app.preferences = app.storage.readPreferences();
ui.setPreferences(app.preferences);
const layout = createLayoutController(ui.gameContainer, refreshScale);

function refreshScale() {
  if (!game) return;
  // FIT measures its parent only after the UI has revealed the game surface.
  game.scale.getParentBounds();
  game.scale.refresh();
}

function refreshTitleProgress() {
  titleProgress = app.storage.readProgress();
  restoreProgress(session, titleProgress);
  return titleProgress;
}

function stopGameScenes() {
  cancelPendingEndingStart();
  if (!game) return;
  game.scene.stop('PlayScene');
  game.scene.stop('EndingScene');
  game.scene.stop('BootScene');
}

function cancelPendingEndingStart() {
  if (!pendingEndingStart) return;
  game?.events.off(Phaser.Core.Events.PRE_STEP, pendingEndingStart);
  pendingEndingStart = null;
}

function launchPlayScene() {
  if (!game) return;
  app.activeSceneKey = 'PlayScene';
  app.input.setPlaying(true);
  ui.showGame();
  ui.setInputEnabled(true);
  layout.schedule();
  refreshScale();
  game.scene.stop('BootScene');
  game.scene.stop('EndingScene');
  game.scene.start('PlayScene', { token: session.sequenceToken });
}

function startNewGame() {
  if (!startGame(session)) return;
  app.audio?.startFromGesture({ restart: true });
  stopGameScenes();
  app.saveProgress();
  launchPlayScene();
}

function continueGame() {
  const progress = app.storage.readProgress();
  if (!progress) {
    startNewGame();
    return;
  }
  if (!startGame(session, progress)) return;
  app.audio?.startFromGesture({ restart: true });
  stopGameScenes();
  app.saveProgress();
  launchPlayScene();
}

function launchEndingScene(token) {
  if (!game || session.sequenceToken !== token) return;
  const activeEnding = session.mode === 'ENDING' || (session.mode === 'PAUSED' && session.resumeMode === 'ENDING');
  if (!activeEnding) return;
  const reducedAtStart = app.preferences.reducedEffects;
  app.input.setPlaying(true);
  app.input.clear();
  app.activeSceneKey = 'EndingScene';
  ui.showEndingSequence();
  layout.schedule();
  refreshScale();
  cancelPendingEndingStart();
  // Run outside Arcade's worldstep; validate the whole handoff before stopping anything.
  pendingEndingStart = () => {
    pendingEndingStart = null;
    const endingRequested = session.mode === 'ENDING' ||
      (session.mode === 'PAUSED' && session.resumeMode === 'ENDING');
    if (session.sequenceToken !== token || !endingRequested || app.activeSceneKey !== 'EndingScene') return;
    game.scene.stop('PlayScene');
    game.scene.stop('EndingScene');
    game.scene.start('EndingScene', { token, reducedAtStart });
  };
  game.events.once(Phaser.Core.Events.PRE_STEP, pendingEndingStart);
}

function pauseActiveGame() {
  if (!pauseSession(session)) return;
  app.audio?.pause();
  app.input.clear();
  ui.openPause(session.resumeMode);
  if (!game || !app.activeSceneKey) return;
  const activeScene = game.scene.getScene(app.activeSceneKey);
  if (activeScene?.sys.isActive()) game.scene.pause(app.activeSceneKey);
}

function resumeActiveGame() {
  const resumedMode = resumeSession(session);
  if (!resumedMode) return;
  app.audio?.resumeFromGesture();
  ui.closePause();
  app.input.clear();
  if (game && app.activeSceneKey) {
    const scene = game.scene.getScene(app.activeSceneKey);
    scene?.finishReducedSequence?.();
    game.scene.resume(app.activeSceneKey);
  }
  if (session.mode === resumedMode) ui.focusGame();
}

function restartCurrentStep() {
  if (!playScene?.restartCurrentStep()) return;
  app.audio?.resumeFromGesture();
  ui.closePause();
  app.activeSceneKey = 'PlayScene';
  ui.showGame();
  ui.setInputEnabled(true);
  layout.schedule();
  refreshScale();
  game.scene.resume('PlayScene');
  app.input.clear();
}

function skipToEnding() {
  const token = confirmSkipToEnding(session);
  if (token === null) return;
  app.audio?.resumeFromGesture();
  launchEndingScene(token);
}

function returnToTitle() {
  if (!moveBackToTitle(session)) return;
  app.audio?.stop();
  app.input.setPlaying(false);
  stopGameScenes();
  app.activeSceneKey = 'Title';
  const progress = refreshTitleProgress();
  ui.showTitle(progress);
}

function viewSavedEnding() {
  const token = viewEnding(session);
  if (token !== null) {
    app.audio?.startFromGesture({ restart: true });
    launchEndingScene(token);
  }
}

function onBootReady() {
  if (!finishBoot(session)) return;
  app.audio = createAudioController({
    soundManager: game?.sound,
    cache: game?.cache?.audio,
    config,
    getMode: () => session.mode,
    muted: app.preferences.muted,
    onStateChange: (state) => ui.setAudioState(state),
  });
  app.audio.initialize();
  ui.setAudioState(app.audio.snapshot());
  const progress = refreshTitleProgress();
  app.activeSceneKey = 'Title';
  ui.setReady(progress);
}

const bootScene = new BootScene(onBootReady, (value) => ui.setLoadingProgress(value), () => ui.showLoadError());
playScene = new PlayScene(app);
endingScene = new EndingScene(app);
app.launchEnding = launchEndingScene;
app.input = createInputManager({
  container: ui.gameContainer,
  buttons: ui.buttons,
  onPressed: (action, pressed) => ui.setPressed(action, pressed),
  onTouch: () => ui.noteTouch(),
  getMode: () => session.mode,
  onClear: () => {
    if (playScene?.jumpRules) resetJumpRules(playScene.jumpRules);
    if (playScene?.player?.body) playScene.player.body.setVelocityX(0);
  },
  onPause: pauseActiveGame,
});

ui.setHandlers({
  layout: () => layout.schedule(),
  layoutModeChange: () => app.input.clear(),
  reduceEffects: (value) => {
    app.preferences = { ...app.preferences, reducedEffects: value };
    app.storage.writePreferences(app.preferences);
    const scene = app.activeSceneKey === 'PlayScene' ? playScene : app.activeSceneKey === 'EndingScene' ? endingScene : null;
    (scene?.levelContent?.environment ?? scene?.environment)?.setReducedEffects(value);
    scene?.setReducedEffects?.(value);
  },
  toggleSound: () => {
    const state = app.audio?.snapshot();
    if (!state) return;
    if (!state.muted && session.mode === 'FINISHED' && (state.status === 'blocked' || state.paused)) {
      app.audio.activateFromGesture();
      return;
    }
    const muted = !state.muted;
    app.preferences = { ...app.preferences, muted };
    app.storage.writePreferences(app.preferences);
    app.audio.setMuted(muted);
  },
  startNew: startNewGame,
  continue: continueGame,
  viewEnding: viewSavedEnding,
  replay: startNewGame,
  pause: pauseActiveGame,
  resume: resumeActiveGame,
  restartStep: restartCurrentStep,
  confirmSkip: skipToEnding,
  backToTitle: returnToTitle,
});

window.addEventListener('blur', () => {
  if (session.mode !== 'TITLE' && session.mode !== 'PAUSED') app.audio?.pause();
}, { signal: lifecycleController.signal });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && session.mode !== 'TITLE' && session.mode !== 'PAUSED') app.audio?.pause();
}, { signal: lifecycleController.signal });

function emptySnapshot() {
  const loop = game?.loop;
  return {
    mode: session.mode,
    audio: app.audio?.snapshot() ?? null,
    resumeMode: session.resumeMode,
    completed: session.completed,
    sceneKey: app.activeSceneKey,
    levelIndex: session.levelIndex,
    logicalLevelIndex: session.levelIndex,
    mapLevelIndex: app.activeSceneKey === 'PlayScene' ? session.levelIndex : app.activeSceneKey === 'EndingScene' ? 4 : null,
    checkpointId: session.checkpointId,
    activeMs: session.activeMs,
    sequence: session.sequence ? { ...session.sequence } : null,
    body: { x: 0, y: 0, feetX: 0, feetY: 0, vx: 0, vy: 0, grounded: false, supportId: null },
    jumpEligibility: { canJump: false, grounded: false, jumpedSinceGround: false, coyoteRemainingMs: 0, bufferRemainingMs: 0 },
    visual: null,
    counts: {
      dynamicBodies: 0,
      staticBodies: 0,
      colliders: 0,
      textures: game ? Object.keys(game.textures.list).length : 0,
      animationDefinitions: game?.anims.anims.size ?? 0,
      idleAnimationFrames: config.animation.idleFrames,
      runAnimationFrames: config.animation.runFrames,
      worldStepListeners: 0,
      preUpdateListeners: 0,
      displayObjects: 0,
      canvases: ui.gameContainer.querySelectorAll('canvas').length,
    },
    timing: {
      actualFps: Number.isFinite(loop?.actualFps) ? loop.actualFps : null,
      delta: Number.isFinite(loop?.delta) ? loop.delta : null,
      rawDelta: Number.isFinite(loop?.rawDelta) ? loop.rawDelta : null,
      rendererType: game?.config.renderType ?? game?.renderer?.type ?? null,
    },
  };
}

try {
  game = new Phaser.Game({
    type: Phaser[config.stack.renderer],
    parent: ui.gameContainer,
    width: config.viewport.width,
    height: config.viewport.height,
    backgroundColor: levels[0].palette.sky,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: config.viewport.width,
      height: config.viewport.height,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: config.physics.gravity },
        fixedStep: true,
        fps: config.physics.fixedFps,
        useTree: false,
        debug: false,
      },
    },
    audio: { noAudio: false },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    scene: [bootScene, playScene, endingScene],
  });

  if (isPrototype) {
    window.__ACINCO_DEBUG__ = Object.freeze({
      snapshot() {
        const sceneKey = app.activeSceneKey;
        const scene = sceneKey === 'PlayScene' ? playScene : sceneKey === 'EndingScene' ? endingScene : null;
        const sceneReady = scene?.sys && (scene.sys.isActive() || scene.sys.isPaused());
        if (sceneReady && typeof scene.getDebugSnapshot === 'function') {
          return { ...scene.getDebugSnapshot(), audio: app.audio?.snapshot() ?? null };
        }
        return emptySnapshot();
      },
    });
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      delete window.__ACINCO_DEBUG__;
      cancelPendingEndingStart();
      lifecycleController.abort();
      app.audio?.destroy();
      app.input.destroy();
      layout.destroy();
      game?.destroy(true);
      ui.destroy();
    });
  }
} catch (error) {
  console.error('No pudimos inicializar el juego.', error);
  app.input.destroy();
  ui.showTitle(null);
}
