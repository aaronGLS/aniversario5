import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from '../../src/config.js';
import {
  activateCheckpoint,
  backToTitle,
  beginRespawn,
  completeSequence,
  confirmSkipToEnding,
  createSession,
  finishBoot,
  pauseSession,
  requestLevelAdvance,
  restoreProgress,
  restartStep,
  resumeSession,
  startGame,
  viewEnding,
} from '../../src/core/flow.js';
import { getRespawnPoint, overlapsGoal } from '../../src/game/level.js';

test('level and progression contracts are limited to five canonical maps', () => {
  assert.equal(levels.length, 5);
  assert.deepEqual(levels.map((level) => level.id), [1, 2, 3, 4, 5]);
  assert.equal(levels[0].goal.kind, 'next');
  assert.equal(levels[4].goal.kind, 'ending');
});

test('fall respawn selects the canonical spawn or checkpoint without changing level', () => {
  const level = levels[2];
  assert.deepEqual(getRespawnPoint(level, 0), { x: 64, feetY: 224, supportId: 'p3-s0' });
  assert.deepEqual(getRespawnPoint(level, 1), { x: 1536, feetY: 192, supportId: 'p3-s2' });
});

test('a guarded session completes all five levels and never creates level index five', () => {
  const session = createSession();
  assert.equal(session.mode, 'BOOT');
  assert.equal(finishBoot(session), true);
  assert.equal(startGame(session), true);

  for (let source = 0; source < 4; source += 1) {
    assert.equal(requestLevelAdvance(session, source), true);
    assert.equal(session.mode, 'TRANSITION');
    assert.equal(session.levelIndex, source + 1);
    const token = session.sequenceToken;
    assert.equal(requestLevelAdvance(session, source), false);
    assert.equal(completeSequence(session, token, 'TRANSITION', 'PLAYING'), true);
    assert.equal(session.mode, 'PLAYING');
  }

  assert.equal(requestLevelAdvance(session, 4), true);
  assert.equal(session.mode, 'ENDING');
  assert.equal(session.levelIndex, 4);
  const endingToken = session.sequenceToken;
  assert.equal(completeSequence(session, endingToken, 'ENDING', 'FINISHED'), true);
  assert.equal(session.mode, 'FINISHED');
  assert.equal(session.completed, true);
  assert.equal(session.checkpointId, 1);
  assert.equal(session.levelIndex, 4);
  assert.equal(session.sequence.phase, 'message');
});

test('title restore is guarded, normalizes completed progress, and reset starts at step zero', () => {
  const session = createSession();
  finishBoot(session);
  assert.equal(restoreProgress(session, { levelIndex: 2, checkpointId: 1, completed: false }), true);
  assert.equal(session.levelIndex, 2);
  assert.equal(session.checkpointId, 1);
  assert.equal(restoreProgress(session, null), true);
  assert.equal(session.levelIndex, 0);
  assert.equal(session.checkpointId, 0);
  assert.equal(session.completed, false);
  assert.equal(restoreProgress(session, { levelIndex: 1, checkpointId: 0, completed: true }), true);
  assert.equal(session.levelIndex, 4);
  assert.equal(session.checkpointId, 1);
  assert.equal(session.completed, true);
  assert.equal(restoreProgress({ ...session, mode: 'PLAYING' }, null), false);
});

test('completed version-one save can view the reunion again and replay from step zero', () => {
  const session = createSession();
  assert.equal(finishBoot(session), true);
  assert.equal(restoreProgress(session, { levelIndex: 4, checkpointId: 1, completed: true }), true);
  const token = viewEnding(session);
  assert.equal(typeof token, 'number');
  assert.equal(session.sequence.phase, 'walk');
  assert.equal(completeSequence(session, token, 'ENDING', 'FINISHED'), true);
  assert.equal(session.completed, true);
  assert.equal(session.levelIndex, 4);
  assert.equal(startGame(session), true);
  assert.equal(session.mode, 'PLAYING');
  assert.equal(session.levelIndex, 0);
  assert.equal(session.checkpointId, 0);
  assert.equal(session.completed, false);
});

test('duplicate and stale sequence completions cannot change a newer session', () => {
  const session = createSession();
  finishBoot(session);
  startGame(session);
  assert.equal(requestLevelAdvance(session, 0), true);
  const staleToken = session.sequenceToken;
  assert.equal(requestLevelAdvance(session, 0), false);
  assert.equal(pauseSession(session), true);
  assert.equal(completeSequence(session, staleToken, 'TRANSITION', 'PLAYING'), false);
  assert.equal(resumeSession(session), 'TRANSITION');
  assert.equal(completeSequence(session, staleToken, 'TRANSITION', 'PLAYING'), true);
  assert.equal(completeSequence(session, staleToken, 'TRANSITION', 'PLAYING'), false);
  assert.equal(backToTitle(session), true);
  assert.equal(startGame(session), true);
  assert.equal(completeSequence(session, staleToken, 'TRANSITION', 'PLAYING'), false);
});

test('pause preserves transition origin; restart uses the logical target and cp0', () => {
  const session = createSession();
  finishBoot(session);
  startGame(session);
  assert.equal(requestLevelAdvance(session, 0), true);
  assert.equal(pauseSession(session), true);
  assert.equal(session.resumeMode, 'TRANSITION');
  assert.equal(resumeSession(session), 'TRANSITION');
  assert.equal(pauseSession(session), true);
  assert.equal(restartStep(session), 1);
  assert.equal(session.mode, 'PLAYING');
  assert.equal(session.levelIndex, 1);
  assert.equal(session.checkpointId, 0);
  assert.equal(session.sequence, null);
});

test('respawn and checkpoint actions reject duplicate or stale sources', () => {
  const session = createSession();
  finishBoot(session);
  startGame(session);
  assert.equal(activateCheckpoint(session, 0), true);
  assert.equal(activateCheckpoint(session, 0), false);
  const token = beginRespawn(session);
  assert.equal(typeof token, 'number');
  assert.equal(beginRespawn(session), null);
  assert.equal(completeSequence(session, token, 'RESPAWNING', 'PLAYING'), true);
});

test('skip confirmation enters the normal ending and abandonment keeps completion false', () => {
  const session = createSession();
  finishBoot(session);
  startGame(session);
  pauseSession(session);
  const token = confirmSkipToEnding(session);
  assert.equal(session.mode, 'ENDING');
  assert.equal(session.sequence.phase, 'walk');
  assert.equal(backToTitle(session), true);
  assert.equal(completeSequence(session, token, 'ENDING', 'FINISHED'), false);
  assert.equal(session.completed, false);
});

test('goal overlap requires geometric overlap with the configured goal area', () => {
  const goal = levels[0].goal;
  assert.equal(overlapsGoal({ left: goal.x - 8, right: goal.x + 10, top: 188, bottom: 224 }, goal), true);
  assert.equal(overlapsGoal({ left: goal.x - 116, right: goal.x - 98, top: 188, bottom: 224 }, goal), false);
});
