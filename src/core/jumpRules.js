/** @returns {{lastGroundedAt: number|null, jumpPressedAt: number|null, jumpPending: boolean, jumpedSinceGround: boolean, airborneAfterJump: boolean, canJump: boolean}} */
export function createJumpRules() {
  return {
    lastGroundedAt: null,
    jumpPressedAt: null,
    jumpPending: false,
    jumpedSinceGround: false,
    airborneAfterJump: false,
    canJump: false,
  };
}

/** @param {ReturnType<typeof createJumpRules>} state */
export function resetJumpRules(state) {
  state.lastGroundedAt = null;
  state.jumpPressedAt = null;
  state.jumpPending = false;
  state.jumpedSinceGround = false;
  state.airborneAfterJump = false;
  state.canJump = false;
}

/**
 * Update coyote and jump-buffer state using active gameplay milliseconds.
 * Returns true exactly once when a jump should be applied to the Arcade Body.
 * @param {ReturnType<typeof createJumpRules>} state
 * @param {number} now
 * @param {boolean} grounded
 * @param {boolean} jumpPressed
 * @param {number} coyoteMs
 * @param {number} jumpBufferMs
 */
export function updateJumpRules(state, now, grounded, jumpPressed, coyoteMs, jumpBufferMs) {
  if (jumpPressed) {
    state.jumpPressedAt = now;
    state.jumpPending = true;
  }

  if (state.jumpPending && now - state.jumpPressedAt > jumpBufferMs) {
    state.jumpPending = false;
    state.jumpPressedAt = null;
  }

  if (state.jumpedSinceGround) {
    if (!grounded) {
      state.airborneAfterJump = true;
    } else if (state.airborneAfterJump) {
      state.jumpedSinceGround = false;
      state.airborneAfterJump = false;
      state.lastGroundedAt = now;
    }
  } else if (grounded) {
    state.lastGroundedAt = now;
  }

  const withinCoyote = grounded || (state.lastGroundedAt !== null && now - state.lastGroundedAt <= coyoteMs);
  state.canJump = state.jumpPending && withinCoyote && !state.jumpedSinceGround;
  if (!state.canJump) return false;

  state.jumpPending = false;
  state.jumpPressedAt = null;
  state.jumpedSinceGround = true;
  state.airborneAfterJump = false;
  state.lastGroundedAt = null;
  state.canJump = false;
  return true;
}

/** @param {ReturnType<typeof createJumpRules>} state @param {number} now @param {boolean} grounded @param {number} coyoteMs @param {number} jumpBufferMs */
export function getJumpEligibility(state, now, grounded, coyoteMs, jumpBufferMs) {
  const coyoteRemainingMs = state.lastGroundedAt === null ? 0 : Math.max(0, coyoteMs - (now - state.lastGroundedAt));
  const bufferRemainingMs = state.jumpPressedAt === null ? 0 : Math.max(0, jumpBufferMs - (now - state.jumpPressedAt));
  const withinCoyote = grounded || (state.lastGroundedAt !== null && now - state.lastGroundedAt <= coyoteMs);
  const withinBuffer = state.jumpPending && state.jumpPressedAt !== null && now - state.jumpPressedAt <= jumpBufferMs;
  return {
    canJump: !state.jumpedSinceGround && withinCoyote && withinBuffer,
    grounded,
    jumpedSinceGround: state.jumpedSinceGround,
    coyoteRemainingMs,
    bufferRemainingMs,
  };
}
