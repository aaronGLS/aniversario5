const KEY_ACTIONS = new Map([
  ['ArrowLeft', 'left'],
  ['KeyA', 'left'],
  ['ArrowRight', 'right'],
  ['KeyD', 'right'],
  ['Space', 'jump'],
  ['KeyW', 'jump'],
  ['ArrowUp', 'jump'],
]);

const SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space']);
const INTERACTIVE_SELECTOR = 'button, input, select, textarea, a, [contenteditable="true"], [role="dialog"]';

/** Aggregate physical sources into held actions and one consumable jump edge. */
export function createActionState() {
  const sources = new Map();
  let jumpPressed = false;
  function held(action) {
    for (const value of sources.values()) if (value === action) return true;
    return false;
  }
  return {
    press(source, action) {
      if (sources.has(source)) return;
      const wasHeld = held(action);
      sources.set(source, action);
      if (action === 'jump' && !wasHeld) jumpPressed = true;
    },
    release(source) { sources.delete(source); },
    clear() { sources.clear(); jumpPressed = false; },
    held,
    getMoveAxis() { return Number(held('right')) - Number(held('left')); },
    consumeJumpPressed() { const result = jumpPressed; jumpPressed = false; return result; },
  };
}

export function createKeyboardState() {
  const state = createActionState();
  return {
    ...state,
    press(code, repeat = false) {
      const action = KEY_ACTIONS.get(code);
      if (!action) return false;
      if (!repeat) state.press(code, action);
      return true;
    },
  };
}

/**
 * App-owned keyboard and captured-pointer input, with native menu behavior.
 * @param {{container: HTMLElement, getMode: () => string, buttons?: Record<string, HTMLButtonElement>, onPressed?: (action: string, pressed: boolean) => void, onTouch?: () => void, onClear?: () => void, onPause?: () => void, windowObject?: Window, documentObject?: Document}} options
 */
export function createInputManager(options) {
  const { container, getMode, onClear = () => {}, onPause = () => {} } = options;
  const windowObject = options.windowObject ?? globalThis.window;
  const documentObject = options.documentObject ?? globalThis.document;
  const state = createActionState();
  const pointers = new Map();
  const controlKeys = new Map();
  const buttons = options.buttons ?? {};
  const onPressed = options.onPressed ?? (() => {});
  const onTouch = options.onTouch ?? (() => {});
  let activeGame = false;

  function gameHasFocus() {
    const active = documentObject.activeElement;
    return active === container || container.contains(active);
  }

  function targetIsInteractive(target) {
    return typeof target?.closest === 'function' && target.closest(INTERACTIVE_SELECTOR) !== null;
  }

  function onKeyDown(event) {
    if (!activeGame || !gameHasFocus() || targetIsInteractive(event.target)) return;
    const mode = getMode();
    if (event.code === 'Escape') {
      if (event.repeat || !['PLAYING', 'RESPAWNING', 'TRANSITION', 'ENDING'].includes(mode)) return;
      event.preventDefault();
      clear();
      onPause();
      return;
    }
    if (mode !== 'PLAYING' || !KEY_ACTIONS.has(event.code)) return;
    if (SCROLL_KEYS.has(event.code)) event.preventDefault();
    if (!event.repeat) state.press(`key:${event.code}`, KEY_ACTIONS.get(event.code));
  }

  function onKeyUp(event) {
    state.release(`key:${event.code}`);
    const button = controlKeys.get(event.code);
    if (button) {
      controlKeys.delete(event.code);
      state.release(`control:${event.code}`);
      refreshPressed(button.dataset.action);
    }
  }

  function clear() {
    for (const [id, button] of pointers) {
      try { if (button.hasPointerCapture(id)) button.releasePointerCapture(id); } catch {}
    }
    pointers.clear();
    controlKeys.clear();
    state.clear();
    for (const action of Object.keys(buttons)) onPressed(action, false);
    onClear();
  }

  function onWindowBlur() {
    pauseForLifecycle();
  }

  function onVisibilityChange() {
    if (documentObject.visibilityState !== 'visible') pauseForLifecycle();
  }

  function onOrientationChange() {
    pauseForLifecycle();
  }

  function pauseForLifecycle() {
    clear();
    if (activeGame && ['PLAYING', 'RESPAWNING', 'TRANSITION', 'ENDING'].includes(getMode())) onPause();
  }

  function onFocusOut(event) {
    if (event.relatedTarget && container.contains(event.relatedTarget)) return;
    clear();
  }

  function onPointerDown(event) {
    if (event.target === container || (event.target?.tagName === 'CANVAS' && container.contains(event.target))) {
      container.focus({ preventScroll: true });
    }
  }

  function releasePointer(event) {
    const button = pointers.get(event.pointerId);
    if (!button) return;
    pointers.delete(event.pointerId);
    const action = button.dataset.action;
    state.release(`pointer:${event.pointerId}`);
    refreshPressed(action);
  }
  function refreshPressed(action) {
    for (const button of pointers.values()) {
      if (button.dataset.action === action) { onPressed(action, true); return; }
    }
    for (const button of controlKeys.values()) {
      if (button.dataset.action === action) { onPressed(action, true); return; }
    }
    onPressed(action, false);
  }
  function pressControlKey(event) {
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    if (!activeGame || getMode() !== 'PLAYING' || event.currentTarget.disabled) return;
    event.preventDefault();
    if (event.repeat || controlKeys.has(event.code)) return;
    const button = event.currentTarget;
    controlKeys.set(event.code, button);
    state.press(`control:${event.code}`, button.dataset.action);
    refreshPressed(button.dataset.action);
  }
  function releaseControlFocus(event) {
    if (event.relatedTarget === container) return;
    for (const [code, button] of controlKeys) {
      if (button !== event.currentTarget) continue;
      controlKeys.delete(code);
      state.release(`control:${code}`);
      refreshPressed(button.dataset.action);
    }
  }
  function pressPointer(event) {
    if (!activeGame || getMode() !== 'PLAYING' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const button = event.currentTarget;
    event.preventDefault();
    try { button.setPointerCapture(event.pointerId); } catch { return; }
    if (!button.hasPointerCapture(event.pointerId)) return;
    pointers.set(event.pointerId, button);
    state.press(`pointer:${event.pointerId}`, button.dataset.action);
    onPressed(button.dataset.action, true);
    container.focus({ preventScroll: true });
  }
  function detectTouch(event) { if (event.pointerType === 'touch') onTouch(); }
  for (const button of Object.values(buttons)) {
    button.addEventListener('pointerdown', pressPointer);
    button.addEventListener('keydown', pressControlKey);
    button.addEventListener('focusout', releaseControlFocus);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, releasePointer);
  }
  documentObject.addEventListener('pointerdown', detectTouch);
  windowObject.addEventListener('keyup', onKeyUp);
  container.addEventListener('keydown', onKeyDown);
  container.addEventListener('focusout', onFocusOut);
  container.addEventListener('pointerdown', onPointerDown);
  windowObject.addEventListener('blur', onWindowBlur);
  documentObject.addEventListener('visibilitychange', onVisibilityChange);
  const orientationQuery = windowObject.matchMedia?.('(orientation: portrait)');
  orientationQuery?.addEventListener?.('change', onOrientationChange);

  return {
    /** @param {boolean} value */
    setPlaying(value) {
      if (activeGame === value) return;
      activeGame = value;
      clear();
    },
    clear,
    getMoveAxis() {
      return state.getMoveAxis();
    },
    consumeJumpPressed() {
      return state.consumeJumpPressed();
    },
    destroy() {
      clear();
      container.removeEventListener('keydown', onKeyDown);
      windowObject.removeEventListener('keyup', onKeyUp);
      documentObject.removeEventListener('pointerdown', detectTouch);
      for (const button of Object.values(buttons)) {
        button.removeEventListener('pointerdown', pressPointer);
        button.removeEventListener('keydown', pressControlKey);
        button.removeEventListener('focusout', releaseControlFocus);
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.removeEventListener(name, releasePointer);
      }
      container.removeEventListener('focusout', onFocusOut);
      container.removeEventListener('pointerdown', onPointerDown);
      windowObject.removeEventListener('blur', onWindowBlur);
      documentObject.removeEventListener('visibilitychange', onVisibilityChange);
      orientationQuery?.removeEventListener?.('change', onOrientationChange);
    },
  };
}
