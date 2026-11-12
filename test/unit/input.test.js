import test from 'node:test';
import assert from 'node:assert/strict';
import { createActionState, createInputManager, createKeyboardState } from '../../src/core/input.js';

test('direction aliases combine and releasing one held key preserves the other', () => {
  const input = createKeyboardState();
  input.press('KeyA');
  input.press('ArrowLeft');
  assert.equal(input.getMoveAxis(), -1);
  input.release('KeyA');
  assert.equal(input.getMoveAxis(), -1);
  input.press('KeyD');
  assert.equal(input.getMoveAxis(), 0);
  input.release('ArrowLeft');
  assert.equal(input.getMoveAxis(), 1);
});

test('jump aliases produce one edge while held, ignore repeat, and require a fresh press after reset', () => {
  const input = createKeyboardState();
  input.press('Space');
  assert.equal(input.consumeJumpPressed(), true);
  input.press('Space', true);
  input.press('ArrowUp');
  assert.equal(input.consumeJumpPressed(), false);
  input.release('Space');
  input.release('ArrowUp');
  input.press('KeyW');
  assert.equal(input.consumeJumpPressed(), true);

  input.press('KeyA');
  input.clear();
  assert.equal(input.getMoveAxis(), 0);
  assert.equal(input.consumeJumpPressed(), false);
  input.press('Space');
  assert.equal(input.consumeJumpPressed(), true);
});

test('direction repeats after clearing input do not restore a held key', () => {
  const input = createKeyboardState();
  input.press('KeyD');
  assert.equal(input.getMoveAxis(), 1);
  input.clear();
  input.press('KeyD', true);
  assert.equal(input.getMoveAxis(), 0);
  input.press('KeyD');
  assert.equal(input.getMoveAxis(), 1);
});

test('Escape pauses only an active focused game and ignores repeated presses', () => {
  const handlers = new Map();
  const container = {
    addEventListener(name, handler) { handlers.set(`container:${name}`, handler); },
    removeEventListener(name) { handlers.delete(`container:${name}`); },
    contains(target) { return target === this; },
    focus() {},
  };
  const windowHandlers = new Map();
  const documentHandlers = new Map();
  const documentObject = {
    activeElement: container,
    visibilityState: 'visible',
    addEventListener(name, handler) { documentHandlers.set(name, handler); },
    removeEventListener(name) { documentHandlers.delete(name); },
  };
  const windowObject = {
    addEventListener(name, handler) { windowHandlers.set(name, handler); },
    removeEventListener(name) { windowHandlers.delete(name); },
    matchMedia() { return { addEventListener() {}, removeEventListener() {} }; },
  };
  let mode = 'PLAYING';
  let pauseCount = 0;
  const input = createInputManager({
    container,
    getMode: () => mode,
    onPause: () => { pauseCount += 1; mode = 'PAUSED'; },
    windowObject,
    documentObject,
  });
  input.setPlaying(true);
  let prevented = false;
  const dispatch = (repeat = false, target = container) => handlers.get('container:keydown')({
    code: 'Escape', repeat, target, preventDefault() { prevented = true; },
  });

  dispatch(true);
  assert.equal(pauseCount, 0);
  dispatch();
  assert.equal(pauseCount, 1);
  assert.equal(prevented, true);
  mode = 'PLAYING';
  dispatch(false, { closest: () => ({}) });
  assert.equal(pauseCount, 1);
  input.destroy();
  assert.equal(windowHandlers.size, 0);
  assert.equal(documentHandlers.size, 0);
});

test('blur and hidden visibility request app pause and clear held controls', () => {
  const handlers = new Map();
  const container = {
    addEventListener(name, handler) { handlers.set(`container:${name}`, handler); },
    removeEventListener(name) { handlers.delete(`container:${name}`); },
    contains(target) { return target === this; },
    focus() {},
  };
  const windowHandlers = new Map();
  const documentHandlers = new Map();
  const documentObject = {
    activeElement: container,
    visibilityState: 'visible',
    addEventListener(name, handler) { documentHandlers.set(name, handler); },
    removeEventListener(name) { documentHandlers.delete(name); },
  };
  const windowObject = {
    addEventListener(name, handler) { windowHandlers.set(name, handler); },
    removeEventListener(name) { windowHandlers.delete(name); },
    matchMedia() { return { addEventListener() {}, removeEventListener() {} }; },
  };
  let mode = 'PLAYING';
  let pauses = 0;
  const input = createInputManager({ container, getMode: () => mode, onPause: () => { pauses += 1; mode = 'PAUSED'; }, windowObject, documentObject });
  input.setPlaying(true);
  handlers.get('container:keydown')({ code: 'KeyD', target: container, repeat: false, preventDefault() {} });
  assert.equal(input.getMoveAxis(), 1);
  windowHandlers.get('blur')();
  assert.equal(input.getMoveAxis(), 0);
  assert.equal(pauses, 1);
  mode = 'PLAYING';
  documentObject.visibilityState = 'hidden';
  documentHandlers.get('visibilitychange')();
  assert.equal(pauses, 2);
  input.destroy();
});


test('sources aggregate movement and jump across pointers and keyboard', () => {
  const state = createActionState();
  state.press('key:KeyD', 'right');
  state.press('pointer:1', 'right');
  state.release('key:KeyD');
  assert.equal(state.getMoveAxis(), 1);
  state.press('pointer:2', 'left');
  assert.equal(state.getMoveAxis(), 0);
  state.release('pointer:2');
  state.press('pointer:3', 'jump');
  assert.equal(state.consumeJumpPressed(), true);
  state.press('key:Space', 'jump');
  state.release('pointer:3');
  assert.equal(state.consumeJumpPressed(), false);
  state.clear();
  assert.equal(state.getMoveAxis(), 0);
  assert.equal(state.consumeJumpPressed(), false);
});
