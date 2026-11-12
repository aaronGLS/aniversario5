import { config, texts } from '../config.js';

/** @param {HTMLElement} element @param {boolean} active */
function setActive(element, active) {
  element.hidden = !active;
  element.toggleAttribute('inert', !active);
}

/** Mount the title, game HUD, pause dialog, and ending content once. @param {boolean} showPrototypeLabel */
export function createUI(showPrototypeLabel) {
  const prototypeLabel = document.querySelector('#prototype-label');
  const intro = document.querySelector('#intro');
  const title = document.querySelector('#title');
  const subtitle = document.querySelector('#subtitle');
  const startButton = document.querySelector('#start-button');
  const continueButton = document.querySelector('#continue-button');
  const viewEndingButton = document.querySelector('#view-ending-button');
  const newGameButton = document.querySelector('#new-game-button');
  const titleActions = document.querySelector('.title-actions');
  const soundButton = document.querySelector('#sound-button');
  const soundNotice = document.querySelector('#sound-notice');
  const titleHelp = document.querySelector('#title-help');
  const gamePanel = document.querySelector('#game-panel');
  const gameContainer = document.querySelector('#game-container');
  const stepStatus = document.querySelector('#step-status');
  const stepProgress = document.querySelector('#step-progress');
  const gameHud = document.querySelector('.game-hud');
  const directions = document.querySelector('.directions');
  const leftRail = document.querySelector('#landscape-left');
  const rightRail = document.querySelector('#landscape-right');
  const pauseHelp = document.querySelector('#pause-help');
  const gameStatus = document.querySelector('#game-status');
  const pauseButton = document.querySelector('#pause-button');
  const storageNotice = document.querySelector('#storage-notice');
  const endingPanel = document.querySelector('#ending-panel');
  const endingHeading = document.querySelector('#ending-heading');
  const endingBody = document.querySelector('#ending-body');
  const endingLove = document.querySelector('#ending-love');
  const endingSignature = document.querySelector('#ending-signature');
  const replayButton = document.querySelector('#replay-button');
  const pauseDialog = document.querySelector('#pause-dialog');
  const dialogTitle = document.querySelector('#dialog-title');
  const dialogBody = document.querySelector('#dialog-body');
  const pauseMenu = document.querySelector('#pause-menu');
  const confirmationMenu = document.querySelector('#confirmation-menu');
  const resumeButton = document.querySelector('#resume-button');
  const restartButton = document.querySelector('#restart-button');
  const skipButton = document.querySelector('#skip-button');
  const backButton = document.querySelector('#back-button');
  const confirmButton = document.querySelector('#confirm-button');
  const cancelButton = document.querySelector('#cancel-button');
  const touchControls = document.querySelector('#touch-controls');
  const buttons = Object.fromEntries(['left', 'right', 'jump'].map((action) => [action, document.querySelector(`#${action}-button`)]));
  const reduceEffects = document.querySelector('#reduce-effects');
  const rotateHint = document.querySelector('#rotate-hint');
  const liveStatus = document.querySelector('#live-status');
  const dots = [...document.querySelectorAll('#step-dots i')];
  const progressBar = document.querySelector('#loading-progress');
  const coarse = window.matchMedia('(any-pointer: coarse)');
  const portrait = window.matchMedia('(orientation: portrait)');
  const landscape = window.matchMedia('(orientation: landscape) and (min-width: 560px) and (max-height: 500px)');
  let touched = false;
  let compact = false;
  let surfaceMode = 'title';
  let lastFall = -Infinity;
  const abortController = new AbortController();
  const { signal } = abortController;
  let handlers = {};
  let titleProgress = null;
  let pauseOrigin = 'PLAYING';
  let confirmationKind = null;
  let loadFailed = false;

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--page', config.palette.page);
  rootStyle.setProperty('--panel', config.palette.panel);
  rootStyle.setProperty('--text', config.palette.text);
  rootStyle.setProperty('--secondary', config.palette.secondary);
  rootStyle.setProperty('--accent', config.palette.accent);
  rootStyle.setProperty('--accent-text', config.palette.accentText);
  rootStyle.setProperty('--focus', config.palette.focus);
  rootStyle.setProperty('--corner-radius', `${config.ui.cornerRadiusPx}px`);
  rootStyle.setProperty('--safe-padding', `${config.ui.safePaddingPx}px`);
  rootStyle.setProperty('--touch-button-size', `${config.ui.touchButtonPx}px`);
  rootStyle.setProperty('--touch-footer', `${config.ui.touchFooterPx}px`);
  rootStyle.setProperty('--touch-jump-width', `${config.ui.touchJumpWidthPx}px`);
  rootStyle.setProperty('--aux-text-size', `${config.ui.minAuxTextPx}px`);
  rootStyle.setProperty('--desktop-header', `${config.ui.desktopHeaderPx}px`);
  rootStyle.setProperty('--touch-header', `${config.ui.touchHeaderPx}px`);
  rootStyle.setProperty('--hint-row', `${config.ui.hintRowPx}px`);
  rootStyle.setProperty('--ui-text-size', `${config.ui.minTextPx}px`);

  for (const action of ['left', 'right', 'jump']) {
    buttons[action].setAttribute('aria-label', texts[action]);
    buttons[action].dataset.pressed = 'false';
  }
  buttons.jump.textContent = texts.jump;
  document.querySelector('#reduce-effects-label').textContent = texts.reduceMotion;
  progressBar.setAttribute('aria-label', texts.loading);
  rotateHint.textContent = texts.rotateHint;
  title.textContent = texts.title;
  subtitle.textContent = texts.subtitle;
  startButton.textContent = texts.loading;
  titleHelp.textContent = texts.keyboardHelp;
  gameContainer.setAttribute('aria-label', texts.canvasLabel);
  document.querySelector('#game-panel').setAttribute('aria-label', texts.canvasAlternative);
  gameContainer.setAttribute('aria-describedby', 'game-hint');
  document.querySelector('#game-hint').textContent = `${texts.keyboardHelp} ${texts.escapeHelp}`;
  prototypeLabel.textContent = showPrototypeLabel ? texts.prototypeLabel : '';
  prototypeLabel.hidden = !showPrototypeLabel;
  gameContainer.style.setProperty('--game-max-width', `${config.viewport.width * config.viewport.maxDisplayScale}px`);
  continueButton.textContent = texts.continue;
  viewEndingButton.textContent = texts.viewEnding;
  newGameButton.textContent = texts.newGame;
  pauseButton.textContent = texts.pause;
  replayButton.textContent = texts.replay;
  endingHeading.textContent = texts.endingTitle;
  endingBody.textContent = texts.endingBody;
  endingLove.textContent = texts.endingLove;
  endingSignature.textContent = texts.signature;

  const pauseLabels = {
    resume: texts.resume,
    restart: texts.restartLevel,
    skip: texts.skipEnding,
    back: texts.backToTitle,
    cancel: texts.cancel,
  };
  resumeButton.textContent = pauseLabels.resume;
  restartButton.textContent = pauseLabels.restart;
  skipButton.textContent = pauseLabels.skip;
  backButton.textContent = pauseLabels.back;
  cancelButton.textContent = pauseLabels.cancel;

  function focusTitleAction() {
    if (!startButton.hidden) startButton.focus({ preventScroll: true });
    else if (!continueButton.hidden) continueButton.focus({ preventScroll: true });
    else if (!viewEndingButton.hidden) viewEndingButton.focus({ preventScroll: true });
  }

  function closeDialog() {
    if (pauseDialog.open) pauseDialog.close();
    confirmationKind = null;
  }

  function showPauseMenu(initialFocus = resumeButton) {
    confirmationKind = null;
    setActive(pauseMenu, true);
    setActive(confirmationMenu, false);
    dialogTitle.textContent = texts.pauseTitle;
    dialogBody.textContent = texts.pausedHint;
    resumeButton.hidden = false;
    pauseHelp.hidden = pauseOrigin === 'ENDING';
    restartButton.hidden = pauseOrigin === 'ENDING';
    skipButton.hidden = pauseOrigin === 'ENDING';
    setActive(backButton, true);
    if (!pauseDialog.open) pauseDialog.showModal();
    initialFocus.focus({ preventScroll: true });
  }

  function showConfirmation(kind) {
    confirmationKind = kind;
    setActive(pauseMenu, false);
    setActive(confirmationMenu, true);
    if (kind === 'skip') {
      dialogTitle.textContent = texts.skipConfirmTitle;
      dialogBody.textContent = texts.skipConfirmBody;
      confirmButton.textContent = texts.skipConfirmYes;
    } else {
      dialogTitle.textContent = texts.resetConfirmTitle;
      dialogBody.textContent = texts.resetConfirmBody;
      confirmButton.textContent = texts.resetConfirmYes;
    }
    setActive(backButton, false);
    if (!pauseDialog.open) pauseDialog.showModal();
    cancelButton.focus({ preventScroll: true });
  }

  function cancelConfirmation() {
    if (confirmationKind === 'skip') {
      showPauseMenu(resumeButton);
      return;
    }
    closeDialog();
    newGameButton.focus({ preventScroll: true });
  }

  function updateModality() {
    const show = coarse.matches || touched;
    const nextCompact = show && surfaceMode === 'game' && landscape.matches;
    let restoreFocus = null;
    if (nextCompact !== compact) {
      const focused = document.activeElement;
      if (surfaceMode === 'game' && (focused === pauseButton || Object.values(buttons).includes(focused))) restoreFocus = focused;
      handlers.layoutModeChange?.();
      compact = nextCompact;
      if (compact) {
        leftRail.append(stepProgress, directions);
        rightRail.append(pauseButton, prototypeLabel, buttons.jump);
        if (gameStatus.textContent === `${texts.touchHelp} ${texts.escapeHelp}` ||
            gameStatus.textContent === `${texts.keyboardHelp} ${texts.escapeHelp}`) gameStatus.textContent = '';
      } else {
        gameHud.append(stepProgress, pauseButton);
        touchControls.append(directions, buttons.jump);
        storageNotice.before(prototypeLabel);
      }
    }
    gamePanel.classList.toggle('touch-mode', show);
    gamePanel.classList.toggle('landscape-touch', compact);
    gameHud.hidden = compact;
    leftRail.hidden = !compact;
    rightRail.hidden = !compact;
    touchControls.hidden = !show || surfaceMode !== 'game' || compact;
    rotateHint.hidden = !show || !portrait.matches || surfaceMode !== 'game';
    titleHelp.textContent = show ? texts.touchHelp : texts.keyboardHelp;
    pauseHelp.textContent = show ? texts.touchHelp : texts.keyboardHelp;
    document.querySelector('#status-reserve').textContent = compact ? texts.fall : `${show ? texts.touchHelp : texts.keyboardHelp} ${texts.escapeHelp}`;
    document.querySelector('#game-hint').textContent = `${show ? texts.touchHelp : texts.keyboardHelp} ${texts.escapeHelp}`;
    if (restoreFocus) {
      const destination = !restoreFocus.disabled && restoreFocus.getClientRects().length ? restoreFocus : gameContainer;
      destination.focus({ preventScroll: true });
    }
    handlers.layout?.();
  }
  coarse.addEventListener('change', updateModality, { signal });
  portrait.addEventListener('change', updateModality, { signal });
  landscape.addEventListener('change', updateModality, { signal });
  updateModality();
  reduceEffects.addEventListener('change', () => handlers.reduceEffects?.(reduceEffects.checked), { signal });
  startButton.addEventListener('click', () => { if (loadFailed) window.location.reload(); else handlers.startNew?.(); }, { signal });
  continueButton.addEventListener('click', () => handlers.continue?.(), { signal });
  viewEndingButton.addEventListener('click', () => handlers.viewEnding?.(), { signal });
  newGameButton.addEventListener('click', () => {
    if (titleProgress && (titleProgress.levelIndex > 0 || titleProgress.checkpointId === 1 || titleProgress.completed)) showConfirmation('reset');
    else handlers.startNew?.();
  }, { signal });
  pauseButton.addEventListener('click', () => handlers.pause?.(), { signal });
  replayButton.addEventListener('click', () => handlers.replay?.(), { signal });
  soundButton.addEventListener('click', () => handlers.toggleSound?.(), { signal });
  resumeButton.addEventListener('click', () => {
    closeDialog();
    handlers.resume?.();
  }, { signal });
  restartButton.addEventListener('click', () => {
    closeDialog();
    handlers.restartStep?.();
  }, { signal });
  skipButton.addEventListener('click', () => showConfirmation('skip'), { signal });
  backButton.addEventListener('click', () => {
    closeDialog();
    handlers.backToTitle?.();
  }, { signal });
  confirmButton.addEventListener('click', () => {
    const kind = confirmationKind;
    closeDialog();
    if (kind === 'skip') handlers.confirmSkip?.();
    else if (kind === 'reset') handlers.startNew?.();
  }, { signal });
  cancelButton.addEventListener('click', cancelConfirmation, { signal });
  pauseDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (confirmationKind) {
      cancelConfirmation();
      return;
    }
    closeDialog();
    handlers.resume?.();
  }, { signal });
  pauseDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && event.repeat) event.preventDefault();
  }, { signal });

  return {
    gameContainer,
    buttons,
    touchControls,
    setPressed(action, pressed) { buttons[action].dataset.pressed = String(pressed); },
    noteTouch() { if (!touched) { touched = true; updateModality(); } },
    setPreferences(preferences) { reduceEffects.checked = preferences.reducedEffects; },
    setAudioState(state) {
      soundButton.hidden = !state.available;
      soundButton.disabled = !state.available;
      soundButton.textContent = state.muted || state.needsActivation ? texts.unmute : texts.mute;
      soundButton.setAttribute('aria-pressed', String(state.muted));
      soundNotice.hidden = true;
      if (state.status === 'blocked') {
        soundNotice.textContent = texts.soundBlocked;
        soundNotice.hidden = false;
      } else if (state.status === 'unavailable') {
        soundNotice.textContent = texts.soundUnavailable;
        soundNotice.hidden = false;
      }
    },
    setLoadingProgress(value) { progressBar.value = value; },
    showLoadError() {
      loadFailed = true;
      progressBar.hidden = true;
      titleHelp.textContent = texts.loadError;
      startButton.textContent = texts.retry;
      startButton.disabled = false;
    },
    setInputEnabled(enabled) { for (const button of Object.values(buttons)) button.disabled = !enabled; },
    setHandlers(nextHandlers) {
      handlers = nextHandlers;
    },
    setReady(progress) {
      this.setTitleProgress(progress);
      progressBar.hidden = true;
      startButton.disabled = false;
      continueButton.disabled = false;
      viewEndingButton.disabled = false;
      newGameButton.disabled = false;
    },
    setTitleProgress(progress) {
      titleProgress = progress ? { ...progress } : null;
      startButton.hidden = Boolean(titleProgress);
      continueButton.hidden = !titleProgress || titleProgress.completed;
      viewEndingButton.hidden = !titleProgress?.completed;
      newGameButton.hidden = !titleProgress;
      if (!titleProgress) startButton.textContent = texts.start;
      titleHelp.hidden = Boolean(titleProgress);
    },
    setStorageUnavailable() {
      storageNotice.textContent = texts.saveUnavailable;
      storageNotice.hidden = false;
    },
    showTitle(progress = titleProgress) {
      surfaceMode = 'title';
      updateModality();
      this.setTitleProgress(progress);
      titleActions.append(soundButton);
      setActive(intro, true);
      setActive(gamePanel, false);
      this.resetEndingPresentation();
      gameStatus.textContent = '';
      focusTitleAction();
    },
    showGame() {
      surfaceMode = 'game';
      pauseMenu.append(soundButton);
      this.resetEndingPresentation();
      gamePanel.classList.remove('ending-mode', 'finished');
      document.querySelector('#step-status').hidden = false;
      document.querySelector('#step-dots').hidden = false;
      updateModality();
      setActive(intro, false);
      setActive(gamePanel, true);
      endingHeading.setAttribute('tabindex', '-1');
      gameContainer.focus({ preventScroll: true });
    },
    showEndingSequence() {
      this.showGame();
      surfaceMode = 'ending';
      gamePanel.classList.add('ending-mode');
      stepStatus.hidden = true;
      document.querySelector('#step-dots').hidden = true;
      gameStatus.textContent = '';
      updateModality();
      this.resetEndingPresentation();
      setActive(endingPanel, true);
      endingPanel.setAttribute('inert', '');
    },
    prepareDedication() {
      setActive(endingPanel, true);
      endingPanel.setAttribute('inert', '');
      endingPanel.style.opacity = '0';
      endingHeading.hidden = false;
      endingBody.hidden = false;
      endingLove.hidden = false;
      endingSignature.hidden = false;
      replayButton.hidden = true;
    },
    updateDedicationProgress(progress) {
      endingPanel.style.opacity = String(Math.max(0, Math.min(1, progress)));
    },
    showDedication() {
      gamePanel.classList.add('finished');
      endingPanel.append(soundButton);
      endingPanel.style.opacity = '1';
      endingPanel.removeAttribute('inert');
      endingHeading.hidden = false;
      endingBody.hidden = false;
      endingLove.hidden = false;
      endingSignature.hidden = false;
      replayButton.hidden = false;
      pauseButton.hidden = true;
      endingHeading.focus({ preventScroll: true });
    },
    resetEndingPresentation() {
      setActive(endingPanel, false);
      endingPanel.style.removeProperty('opacity');
      endingHeading.hidden = true;
      endingBody.hidden = true;
      endingLove.hidden = true;
      endingSignature.hidden = true;
      replayButton.hidden = true;
      pauseButton.hidden = false;
      gamePanel.classList.remove('finished');
    },
    getEndingDebugSnapshot() {
      return {
        visible: !endingPanel.hidden,
        opacity: Number.parseFloat(getComputedStyle(endingPanel).opacity),
        inert: endingPanel.hasAttribute('inert'),
        replayVisible: !replayButton.hidden,
        headingVisible: !endingHeading.hidden,
        pauseVisible: !pauseButton.hidden,
      };
    },
    updateStep(current) {
      stepStatus.textContent = texts.step.replace('{current}', String(current));
      dots.forEach((dot, index) => dot.classList.toggle('current', index < current));
    },
    showLevelTitle(levelName) {
      gameStatus.textContent = levelName;
      liveStatus.textContent = levelName;
    },
    showKeyboardHelp() {
      gameStatus.textContent = compact ? '' : `${coarse.matches || touched ? texts.touchHelp : texts.keyboardHelp} ${texts.escapeHelp}`;
    },
    announce(message) {
      if (message === texts.fall) {
        const now = performance.now();
        if (now - lastFall < 3000) return;
        lastFall = now;
      }
      gameStatus.textContent = message;
      liveStatus.textContent = message;
    },
    clearStatus() {
      gameStatus.textContent = '';
    },
    openPause(origin) {
      pauseOrigin = origin;
      showPauseMenu(resumeButton);
    },
    closePause() {
      closeDialog();
    },
    focusGame() {
      gameContainer.focus({ preventScroll: true });
    },
    destroy() {
      if (compact) {
        gameHud.append(stepProgress, pauseButton);
        touchControls.append(directions, buttons.jump);
        storageNotice.before(prototypeLabel);
        gamePanel.classList.remove('landscape-touch');
        gameHud.hidden = false;
        leftRail.hidden = true;
        rightRail.hidden = true;
        touchControls.hidden = true;
        compact = false;
      }
      closeDialog();
      abortController.abort();
    },
  };
}
