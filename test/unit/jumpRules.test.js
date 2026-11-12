import test from 'node:test';
import assert from 'node:assert/strict';
import { createJumpRules, resetJumpRules, updateJumpRules } from '../../src/core/jumpRules.js';

const COYOTE_MS = 100;
const BUFFER_MS = 120;

test('coyote time accepts a jump at the boundary and rejects it outside the window', () => {
  const accepted = createJumpRules();
  updateJumpRules(accepted, 0, true, false, COYOTE_MS, BUFFER_MS);
  assert.equal(updateJumpRules(accepted, 100, false, true, COYOTE_MS, BUFFER_MS), true);

  const rejected = createJumpRules();
  updateJumpRules(rejected, 0, true, false, COYOTE_MS, BUFFER_MS);
  assert.equal(updateJumpRules(rejected, 101, false, true, COYOTE_MS, BUFFER_MS), false);
});

test('jump buffer accepts a landing inside its window and expires outside it', () => {
  const accepted = createJumpRules();
  assert.equal(updateJumpRules(accepted, 0, false, true, COYOTE_MS, BUFFER_MS), false);
  assert.equal(updateJumpRules(accepted, 120, true, false, COYOTE_MS, BUFFER_MS), true);

  const rejected = createJumpRules();
  updateJumpRules(rejected, 0, false, true, COYOTE_MS, BUFFER_MS);
  assert.equal(updateJumpRules(rejected, 121, true, false, COYOTE_MS, BUFFER_MS), false);
});

test('a held or stale grounded state cannot double jump before real airborne and landing contacts', () => {
  const rules = createJumpRules();
  assert.equal(updateJumpRules(rules, 0, true, true, COYOTE_MS, BUFFER_MS), true);
  assert.equal(updateJumpRules(rules, 16, true, false, COYOTE_MS, BUFFER_MS), false);
  assert.equal(updateJumpRules(rules, 32, true, false, COYOTE_MS, BUFFER_MS), false);
  assert.equal(updateJumpRules(rules, 48, false, false, COYOTE_MS, BUFFER_MS), false);
  assert.equal(updateJumpRules(rules, 64, true, false, COYOTE_MS, BUFFER_MS), false);
  assert.equal(updateJumpRules(rules, 80, true, true, COYOTE_MS, BUFFER_MS), true);
});

test('reset clears buffered presses and coyote timestamps', () => {
  const rules = createJumpRules();
  updateJumpRules(rules, 0, true, false, COYOTE_MS, BUFFER_MS);
  updateJumpRules(rules, 10, false, true, COYOTE_MS, BUFFER_MS);
  resetJumpRules(rules);
  assert.equal(rules.lastGroundedAt, null);
  assert.equal(rules.jumpPressedAt, null);
  assert.equal(rules.jumpPending, false);
  assert.equal(updateJumpRules(rules, 11, false, false, COYOTE_MS, BUFFER_MS), false);
});
