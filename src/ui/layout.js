import { config } from '../config.js';

export function calculateScale(width, height, preferInteger = true) {
  if (!Number.isFinite(width)) return 0;
  const widthScale = Math.min(width / config.viewport.width, config.viewport.maxDisplayScale);
  if (!Number.isFinite(widthScale) || !(widthScale > 0)) return 0;
  const heightScale = Number.isFinite(height) && height > 0 ? height / config.viewport.height : widthScale;
  const scale = Math.min(widthScale, heightScale);
  const integer = Math.floor(scale);
  return preferInteger && scale >= 1 && integer / scale >= 0.8 ? integer : scale;
}

export function createLayoutController(container, refresh) {
  const shell = document.querySelector('#app');
  const panel = document.querySelector('#game-panel');
  const playLayout = document.querySelector('#play-layout');
  const leftRail = document.querySelector('#landscape-left');
  const rightRail = document.querySelector('#landscape-right');
  let frame = 0;
  let previous = '';
  function update() {
    frame = 0;
    if (panel.hidden) return;
    const style = getComputedStyle(panel);
    const compact = panel.classList.contains('landscape-touch');
    const gap = compact ? parseFloat(getComputedStyle(playLayout).columnGap) : 0;
    const width = compact
      ? playLayout.clientWidth - leftRail.getBoundingClientRect().width - rightRail.getBoundingClientRect().width - 2 * gap
      : panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    if (!(width > 0)) return;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const ending = panel.classList.contains('ending-mode');
    // Side rails share the stage row; their minimum height must not shrink it repeatedly.
    const stageRowHeight = compact ? playLayout.getBoundingClientRect().height : container.getBoundingClientRect().height;
    const chrome = shell.getBoundingClientRect().height - stageRowHeight;
    const remainingHeight = viewportHeight - chrome;
    // The dedication scrolls below the final scene; it never consumes its height.
    const availableHeight = ending ? viewportHeight * 0.42 : remainingHeight;
    const scale = calculateScale(width, availableHeight, !compact);
    const dimensions = `${config.viewport.width * scale}px,${config.viewport.height * scale}px`;
    if (dimensions !== previous) {
      previous = dimensions;
      [container.style.width, container.style.height] = dimensions.split(',');
      refresh();
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  const observer = new ResizeObserver(schedule);
  for (const element of [shell, panel, playLayout, leftRail, rightRail, document.querySelector('.game-hud'), document.querySelector('#game-status'), document.querySelector('#touch-controls'), document.querySelector('#prototype-label'), document.querySelector('#storage-notice')]) observer.observe(element);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  return { schedule, destroy() { observer.disconnect(); window.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('resize', schedule); if (frame) cancelAnimationFrame(frame); } };
}
