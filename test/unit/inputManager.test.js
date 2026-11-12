import test from 'node:test';
import assert from 'node:assert/strict';
import { createInputManager } from '../../src/core/input.js';

function harness() {
  function target() {
    const handlers = new Map();
    return {
      handlers,
      addEventListener(type, callback) { handlers.set(type, callback); },
      removeEventListener(type) { handlers.delete(type); },
      emit(type, fields = {}) { handlers.get(type)?.({ currentTarget: this, target: this, preventDefault() {}, ...fields }); },
    };
  }
  const container = { ...target(), contains(value) { return value === this; }, focus() { documentObject.activeElement = this; } };
  const windowObject = { ...target(), matchMedia() { return null; } };
  const documentObject = { ...target(), activeElement: container, visibilityState: 'visible' };
  const buttons = {};
  const pressed = {};
  for (const action of ['left', 'right', 'jump']) {
    const captures = new Set();
    buttons[action] = {
      ...target(), dataset: { action }, disabled: false,
      setPointerCapture(id) { captures.add(id); },
      hasPointerCapture(id) { return captures.has(id); },
      releasePointerCapture(id) { captures.delete(id); this.emit('lostpointercapture', { pointerId: id }); },
    };
  }
  let mode = 'PLAYING';
  const input = createInputManager({
    container, buttons, windowObject, documentObject, getMode: () => mode,
    onPressed: (action, value) => { pressed[action] = value; },
  });
  input.setPlaying(true);
  return { input, container, buttons, windowObject, documentObject, pressed, setMode(value) { mode = value; } };
}

test('manager isolates captured pointers, keyboard sources and idempotent cancellation', () => {
  const h = harness();
  h.container.emit('keydown', { code: 'KeyD', repeat: false });
  h.buttons.right.emit('pointerdown', { pointerId: 1, pointerType: 'touch' });
  h.buttons.right.emit('pointerdown', { pointerId: 2, pointerType: 'touch' });
  h.windowObject.emit('keyup', { code: 'KeyD' });
  h.buttons.right.emit('pointerup', { pointerId: 1 });
  h.buttons.right.emit('lostpointercapture', { pointerId: 1 });
  assert.equal(h.input.getMoveAxis(), 1);
  assert.equal(h.pressed.right, true);
  h.buttons.left.emit('pointerdown', { pointerId: 3, pointerType: 'touch' });
  assert.equal(h.input.getMoveAxis(), 0);
  h.buttons.left.emit('pointercancel', { pointerId: 3 });
  assert.equal(h.input.getMoveAxis(), 1);
  h.input.clear();
  assert.equal(h.input.getMoveAxis(), 0);
  assert.equal(h.pressed.right, false);
  assert.equal(h.buttons.right.hasPointerCapture(2), false);
  h.setMode('PAUSED');
  h.buttons.jump.emit('pointerdown', { pointerId: 4, pointerType: 'touch' });
  assert.equal(h.input.consumeJumpPressed(), false);
  h.input.destroy();
  for (const target of [h.container, h.windowObject, h.documentObject, ...Object.values(h.buttons)]) assert.equal(target.handlers.size, 0);
});

test('failed capture cannot hold input and focused controls support keyboard activation once', () => {
  const h = harness();
  h.buttons.right.setPointerCapture = () => { throw new Error('No active pointer'); };
  h.buttons.right.emit('pointerdown', { pointerId: 8, pointerType: 'touch' });
  assert.equal(h.input.getMoveAxis(), 0);
  h.buttons.jump.emit('keydown', { code: 'Space', repeat: false });
  assert.equal(h.input.consumeJumpPressed(), true);
  h.buttons.jump.emit('keydown', { code: 'Space', repeat: true });
  assert.equal(h.input.consumeJumpPressed(), false);
  h.windowObject.emit('keyup', { code: 'Space' });
  h.buttons.jump.emit('keydown', { code: 'Enter', repeat: false });
  assert.equal(h.input.consumeJumpPressed(), true);
  h.buttons.jump.emit('focusout');
  assert.equal(h.pressed.jump, false);
  h.buttons.right.emit('keydown', { code: 'Space', repeat: false });
  assert.equal(h.input.getMoveAxis(), 1);
  h.buttons.right.emit('focusout');
  assert.equal(h.input.getMoveAxis(), 0);
  h.input.destroy();
});

test('moving focus from a held keyboard button to its captured touch preserves the union', () => {
  const h = harness();
  h.buttons.jump.emit('keydown', { code: 'Space', repeat: false });
  assert.equal(h.input.consumeJumpPressed(), true);
  h.buttons.jump.emit('pointerdown', { pointerId: 10, pointerType: 'touch' });
  h.buttons.jump.emit('focusout', { relatedTarget: h.container });
  assert.equal(h.input.consumeJumpPressed(), false);
  h.buttons.jump.emit('pointerup', { pointerId: 10 });
  assert.equal(h.pressed.jump, true);
  h.windowObject.emit('keyup', { code: 'Space' });
  assert.equal(h.pressed.jump, false);
  h.input.destroy();
});

