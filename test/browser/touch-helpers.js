import { expect } from './helpers.js';

/** Trusted Chromium touch contacts through the browser protocol, not DOM dispatch. */
export async function createTouchDriver(page) {
  const cdp = await page.context().newCDPSession(page);
  const points = new Map();
  let nextId = 1;
  const selectors = { left: '#left-button', right: '#right-button', jump: '#jump-button' };
  async function send(type) {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...points.values()] });
  }
  async function down(action, source = action) {
    if (points.has(source)) return;
    const button = page.locator(selectors[action]);
    // Read a current target without actionability/stability waits while another finger moves.
    const box = await button.evaluate(element => {
      if (element.disabled) throw new Error('Disabled touch control');
      const rect = element.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > innerHeight + 1) throw new Error('Touch control outside viewport');
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    points.set(source, { x: box.x + box.width / 2, y: box.y + box.height / 2, id: nextId++, radiusX: 3, radiusY: 3, force: 1 });
    await send('touchStart');
  }
  async function up(source) {
    const released = points.get(source);
    if (!released) return;
    points.delete(source);
    // For partial release Chromium expects the contact being ended, not those held.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [released] });
  }
  async function downTogether(actions) {
    const boxes = await page.evaluate((targets) => targets.map(({ action, selector }) => {
      const button = document.querySelector(selector);
      if (button.disabled) throw new Error('Disabled touch control');
      const rect = button.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > innerHeight + 1) throw new Error('Touch control outside viewport');
      return { action, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }), actions.filter((action) => !points.has(action)).map((action) => ({ action, selector: selectors[action] })));
    for (const box of boxes) points.set(box.action, { x: box.x, y: box.y, id: nextId++, radiusX: 3, radiusY: 3, force: 1 });
    if (boxes.length) await send('touchStart');
  }
  return {
    kind: 'touch',
    down, up, downTogether,
    async move(source, x, y) {
      const point = points.get(source);
      if (!point) throw new Error('No held touch: ' + source);
      point.x = x; point.y = y;
      await send('touchMove');
    },
    async cancel() {
      points.clear();
      await send('touchCancel');
    },
    async destroy() {
      if (points.size) { points.clear(); await send('touchCancel'); }
      await cdp.detach();
    },
  };
}

export async function recordPointers(page) {
  await page.evaluate(() => {
    window.__PHASE3_POINTERS__ = [];
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture']) {
      document.addEventListener(type, event => {
        if (!event.target.closest?.('.game-control')) return;
        window.__PHASE3_POINTERS__.push({
          type, pointerId: event.pointerId, pointerType: event.pointerType,
          trusted: event.isTrusted, target: event.target.closest('button')?.id,
          time: event.timeStamp, mode: window.__ACINCO_DEBUG__?.snapshot().mode,
          feetX: window.__ACINCO_DEBUG__?.snapshot().body.feetX,
        });
      }, true);
    }
  });
}

export async function noHeldFeedback(page) {
  await expect(page.locator('.game-control[data-pressed="true"]')).toHaveCount(0);
}

export async function assertMobileLayout(page) {
  const layout = await page.evaluate(() => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
    };
    const canvas = document.querySelector('canvas');
    const buttons = ['left','right','jump'].map(action => document.querySelector('#'+action+'-button')).map(button => ({ ...rect(button), font: parseFloat(getComputedStyle(button).fontSize), disabled: button.disabled }));
    const panel = document.querySelector('#game-panel');
    const panelStyle = getComputedStyle(panel);
    const frameStyle = getComputedStyle(document.querySelector('#game-container'));
    return {
      width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      canvas: { ...rect(canvas), internalWidth: canvas.width, internalHeight: canvas.height },
      controls: rect(document.querySelector('#touch-controls')), buttons,
      hud: rect(document.querySelector('.game-hud')),
      compact: panel.classList.contains('landscape-touch'),
      panelWidth: panel.clientWidth - parseFloat(panelStyle.paddingLeft) - parseFloat(panelStyle.paddingRight),
      status: rect(document.querySelector('.status-band')),
      rotateHint: rect(document.querySelector('#rotate-hint')),
      focusExtent: parseFloat(frameStyle.outlineWidth) + parseFloat(frameStyle.outlineOffset),
      defaultSafeArea: ['paddingTop','paddingRight','paddingBottom','paddingLeft'].every(key => parseFloat(getComputedStyle(document.querySelector('#app'))[key]) === 12),
    };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
  expect(layout.canvas.internalWidth).toBe(480);
  expect(layout.canvas.internalHeight).toBe(270);
  expect(layout.canvas.width).toBeGreaterThan(0);
  expect(layout.canvas.width / layout.canvas.height).toBeCloseTo(16 / 9, 2);
  expect(layout.canvas.width).toBeLessThanOrEqual(961);
  if (layout.compact) {
    for (const button of layout.buttons) {
      const outside = button.right <= layout.canvas.x - 1 || button.x >= layout.canvas.right + 1;
      expect(outside, 'touch controls remain beside the stage').toBe(true);
    }
    expect(layout.status.y - layout.canvas.bottom).toBeGreaterThanOrEqual(layout.focusExtent);
    const controlArea = layout.buttons.reduce((sum,b) => sum+b.width*b.height,0);
    expect(layout.canvas.width * layout.canvas.height).toBeGreaterThan(controlArea * 2);
    if (layout.defaultSafeArea && ['844x390','640x360','568x320','683x384'].includes(layout.width+'x'+layout.height)) {
      expect(layout.canvas.width).toBeGreaterThanOrEqual(layout.width * .6 - 1);
      expect(layout.canvas.height).toBeGreaterThanOrEqual(layout.height * .6 - 1);
    }
  } else {
    expect(layout.canvas.bottom).toBeLessThanOrEqual(layout.controls.y + 1);
    expect(layout.hud.bottom).toBeLessThanOrEqual(layout.canvas.y + 1);
    expect(layout.canvas.y - Math.max(layout.status.bottom,layout.rotateHint.bottom)).toBeGreaterThanOrEqual(layout.focusExtent);
  }
  for (const [index, button] of layout.buttons.entries()) {
    expect(button.width).toBeGreaterThanOrEqual(index === 2 ? 87.9 : 55.9);
    expect(button.height).toBeGreaterThanOrEqual(55.9);
    expect(button.font).toBeGreaterThanOrEqual(16);
    expect(button.right).toBeLessThanOrEqual(layout.width + 1);
    expect(button.x).toBeGreaterThanOrEqual(0);
  }
  return layout;
}

