/** Test-only lifecycle observation. Never changes game state or engine methods. */
export async function observeResources(page) {
  await page.addInitScript(() => {
    const registry = new Map();
    const observers = new Map();
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    function label(target) {
      if (target === window) return 'window';
      if (target === document) return 'document';
      if (target === window.visualViewport) return 'visualViewport';
      if (target instanceof Element && ['game-container','touch-controls','left-button','right-button','jump-button','pause-dialog','reduce-effects'].includes(target.id)) return target.id;
      if (typeof MediaQueryList !== 'undefined' && target instanceof MediaQueryList) return 'media:' + target.media;
      return null;
    }
    function record(target, type, listener, options, adding) {
      const name = label(target);
      if (!name) return;
      const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
      if (!registry.has(target)) registry.set(target, { name, events: new Map() });
      const entry = registry.get(target), key = type + ':' + capture;
      if (!entry.events.has(key)) entry.events.set(key, new Set());
      if (adding) entry.events.get(key).add(listener); else entry.events.get(key).delete(listener);
    }
    EventTarget.prototype.addEventListener = function(type, listener, options) { record(this,type,listener,options,true); return add.call(this,type,listener,options); };
    EventTarget.prototype.removeEventListener = function(type, listener, options) { record(this,type,listener,options,false); return remove.call(this,type,listener,options); };
    const NativeObserver = window.ResizeObserver;
    window.__PHASE3_LAYOUT_CALLBACKS__ = 0;
    window.ResizeObserver = class extends NativeObserver {
      constructor(callback) {
        super((entries, observer) => { window.__PHASE3_LAYOUT_CALLBACKS__++; callback(entries,observer); });
        observers.set(this,new Set());
      }
      observe(target,options) { observers.get(this).add(target); return super.observe(target,options); }
      unobserve(target) { observers.get(this).delete(target); return super.unobserve(target); }
      disconnect() { observers.get(this).clear(); return super.disconnect(); }
    };
    window.__PHASE3_RESOURCES__ = () => {
      const listeners = {};
      for (const {name,events} of registry.values()) for (const [key,items] of events) listeners[name + ':' + key] = (listeners[name + ':' + key] ?? 0) + items.size;
      return { listeners, resizeObservers: [...observers.values()].filter(targets => targets.size).length, observedTargets: [...observers.values()].reduce((sum,targets) => sum + targets.size,0) };
    };
  });
}

export async function frameProfile(page) {
  return page.evaluate(async () => {
    const intervals = [], longTasks = [], engineSamples = [];
    const started = performance.now();
    const observer = PerformanceObserver.supportedEntryTypes.includes('longtask')
      ? new PerformanceObserver(list => { for (const e of list.getEntries()) if(e.startTime >= started) longTasks.push({ start: e.startTime, duration: e.duration }); }) : null;
    observer?.observe({ type: 'longtask' });
    let previous = started, lastSample = started;
    await new Promise(resolve => {
      function frame(now) {
        intervals.push(now - previous); previous = now;
        if(now - lastSample >= 1000) { engineSamples.push(window.__ACINCO_DEBUG__.snapshot().timing); lastSample=now; }
        if(now-started >= 30000) resolve(); else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    observer?.disconnect(); intervals.shift();
    const sorted = [...intervals].sort((a,b) => a-b), total = intervals.reduce((sum,n) => sum+n,0);
    const canvas = document.querySelector('canvas');
    return {
      durationMs: performance.now()-started, frames: intervals.length, meanFps: intervals.length*1000/total,
      medianFrameMs: sorted[Math.floor(sorted.length*.5)], p95FrameMs: sorted[Math.floor(sorted.length*.95)],
      maxFrameMs: sorted.at(-1), framesOver50Ms: intervals.filter(n=>n>50).length, longTasks, engineSamples,
      canvas: { width: canvas.width, height: canvas.height },
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, userAgent: navigator.userAgent,
    };
  });
}

