const LEVEL_COUNT = 5;
const PLAY_ORIGINS = new Set(['PLAYING', 'RESPAWNING', 'TRANSITION']);

/** Create the application-owned, Phaser-free serializable session. */
export function createSession() {
  return {
    mode: 'BOOT',
    resumeMode: null,
    levelIndex: 0,
    checkpointId: 0,
    completed: false,
    facing: 'right',
    transitionLocked: false,
    activeMs: 0,
    sequenceToken: 0,
    sequence: null,
  };
}

/** Move the loaded app from BOOT into its title screen. @param {ReturnType<typeof createSession>} session */
export function finishBoot(session) {
  if (session.mode !== 'BOOT') return false;
  session.mode = 'TITLE';
  return true;
}

/** Restore the saved snapshot while the app is at title; null means a fresh title. @param {ReturnType<typeof createSession>} session @param {{levelIndex: number, checkpointId: number, completed: boolean}|null} progress */
export function restoreProgress(session, progress) {
  if (session.mode !== 'TITLE') return false;
  session.completed = progress?.completed === true;
  session.levelIndex = session.completed ? LEVEL_COUNT - 1 : progress ? clampLevel(progress.levelIndex) : 0;
  session.checkpointId = session.completed || progress?.checkpointId === 1 ? 1 : 0;
  session.facing = 'right';
  session.transitionLocked = false;
  session.resumeMode = null;
  invalidateSequence(session);
  return true;
}

/** Invalidate all callbacks captured by the previous sequence. @param {ReturnType<typeof createSession>} session */
export function invalidateSequence(session) {
  session.sequenceToken += 1;
  session.sequence = null;
  session.transitionLocked = false;
  return session.sequenceToken;
}

/** @param {ReturnType<typeof createSession>} session @param {{levelIndex?: number, checkpointId?: number, completed?: boolean}} progress */
export function startGame(session, progress = {}) {
  if (session.mode !== 'TITLE' && session.mode !== 'FINISHED') return false;
  invalidateSequence(session);
  session.mode = 'PLAYING';
  session.resumeMode = null;
  session.completed = progress.completed === true;
  session.levelIndex = session.completed ? LEVEL_COUNT - 1 : clampLevel(progress.levelIndex ?? 0);
  session.checkpointId = session.completed || progress.checkpointId === 1 ? 1 : 0;
  session.facing = 'right';
  session.activeMs = 0;
  return true;
}

/** Start the final scene from a completed-save title action. @param {ReturnType<typeof createSession>} session */
export function viewEnding(session) {
  if (session.mode !== 'TITLE' || !session.completed) return null;
  return beginEndingSequence(session);
}

/** Begin a guarded next-map transition, or the ending from the fifth map. @param {ReturnType<typeof createSession>} session @param {number} sourceLevelIndex */
export function requestLevelAdvance(session, sourceLevelIndex) {
  if (session.mode !== 'PLAYING' || session.transitionLocked || session.levelIndex !== sourceLevelIndex || !Number.isInteger(sourceLevelIndex) || sourceLevelIndex < 0 || sourceLevelIndex >= LEVEL_COUNT) return false;
  invalidateSequence(session);
  if (sourceLevelIndex === LEVEL_COUNT - 1) {
    session.mode = 'ENDING';
    session.levelIndex = LEVEL_COUNT - 1;
    session.checkpointId = 0;
    session.sequence = { kind: 'ending', phase: 'walk', token: session.sequenceToken };
    return true;
  }
  session.transitionLocked = true;
  session.mode = 'TRANSITION';
  session.levelIndex = sourceLevelIndex + 1;
  session.checkpointId = 0;
  session.sequence = { kind: 'transition', phase: 'out', token: session.sequenceToken };
  return true;
}

/** Activate the one checkpoint only after the scene has verified support and contact. @param {ReturnType<typeof createSession>} session @param {number} sourceLevelIndex */
export function activateCheckpoint(session, sourceLevelIndex) {
  if (session.mode !== 'PLAYING' || session.transitionLocked || session.levelIndex !== sourceLevelIndex || session.checkpointId !== 0) return false;
  session.checkpointId = 1;
  return true;
}

/** Enter a guarded respawn sequence. @param {ReturnType<typeof createSession>} session */
export function beginRespawn(session) {
  if (session.mode !== 'PLAYING' || session.transitionLocked) return null;
  invalidateSequence(session);
  session.mode = 'RESPAWNING';
  session.sequence = { kind: 'respawn', phase: 'out', token: session.sequenceToken };
  return session.sequenceToken;
}

/** Complete a scene sequence only if it still owns the expected mode and token. @param {ReturnType<typeof createSession>} session @param {number} token @param {'RESPAWNING'|'TRANSITION'|'ENDING'} expectedMode @param {'PLAYING'|'FINISHED'} nextMode */
export function completeSequence(session, token, expectedMode, nextMode) {
  if (session.sequenceToken !== token || session.mode !== expectedMode || session.sequence?.token !== token) return false;
  const completedSequence = nextMode === 'FINISHED' ? session.sequence : null;
  invalidateSequence(session);
  session.mode = nextMode;
  session.resumeMode = null;
  if (nextMode === 'PLAYING') session.transitionLocked = false;
  if (nextMode === 'FINISHED') {
    session.completed = true;
    session.levelIndex = LEVEL_COUNT - 1;
    session.checkpointId = 1;
    session.sequence = {
      kind: completedSequence?.kind ?? 'ending',
      phase: 'message',
      token: session.sequenceToken,
      elapsedMs: completedSequence?.elapsedMs ?? 0,
      phaseElapsedMs: 0,
    };
  }
  return true;
}

/** Pause an active game sequence without changing its captured token. @param {ReturnType<typeof createSession>} session */
export function pauseSession(session) {
  if (session.mode === 'PAUSED') return false;
  if (!PLAY_ORIGINS.has(session.mode) && session.mode !== 'ENDING') return false;
  session.resumeMode = session.mode;
  session.mode = 'PAUSED';
  return true;
}

/** Resume the state that was suspended. @param {ReturnType<typeof createSession>} session */
export function resumeSession(session) {
  if (session.mode !== 'PAUSED' || !session.resumeMode) return null;
  session.mode = session.resumeMode;
  session.resumeMode = null;
  return session.mode;
}

/** @param {ReturnType<typeof createSession>} session */
export function restartStep(session) {
  if (session.mode !== 'PAUSED' || !PLAY_ORIGINS.has(session.resumeMode)) return null;
  const levelIndex = clampLevel(session.levelIndex);
  invalidateSequence(session);
  session.mode = 'PLAYING';
  session.resumeMode = null;
  session.levelIndex = levelIndex;
  session.checkpointId = 0;
  session.completed = false;
  session.facing = 'right';
  return levelIndex;
}

/** Confirm the pause-menu shortcut into the ordinary ending sequence. @param {ReturnType<typeof createSession>} session */
export function confirmSkipToEnding(session) {
  if (session.mode !== 'PAUSED' || !PLAY_ORIGINS.has(session.resumeMode)) return null;
  return beginEndingSequence(session);
}

/** Abandon a run to title while leaving persisted progress untouched. @param {ReturnType<typeof createSession>} session */
export function backToTitle(session) {
  if (session.mode === 'BOOT' || session.mode === 'TITLE' || session.mode === 'FINISHED') return false;
  invalidateSequence(session);
  session.mode = 'TITLE';
  session.resumeMode = null;
  session.transitionLocked = false;
  return true;
}

/** @param {ReturnType<typeof createSession>} session */
export function setFacing(session, facing) {
  if (facing === 'left' || facing === 'right') session.facing = facing;
}

/** @param {ReturnType<typeof createSession>} session */
function beginEndingSequence(session) {
  invalidateSequence(session);
  session.mode = 'ENDING';
  session.resumeMode = null;
  session.transitionLocked = false;
  session.levelIndex = LEVEL_COUNT - 1;
  session.checkpointId = 0;
  session.sequence = { kind: 'ending', phase: 'walk', token: session.sequenceToken };
  return session.sequenceToken;
}

/** @param {number} value */
function clampLevel(value) {
  return Number.isInteger(value) ? Math.min(LEVEL_COUNT - 1, Math.max(0, value)) : 0;
}
