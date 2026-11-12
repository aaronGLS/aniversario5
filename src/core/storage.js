/** @typedef {{version: number, levelIndex: number, checkpointId: number, completed: boolean}} Progress */
/** @typedef {{version: number, muted: boolean, reducedEffects: boolean}} Preferences */

/**
 * Safe, injectable local progress storage. Storage failures switch this instance
 * to memory for the rest of the page lifetime.
 * @param {{config: object, provider?: () => Storage, windowObject?: Window, onUnavailable?: () => void}} options
 */
export function createProgressStorage(options) {
  const { config, onUnavailable = () => {} } = options;
  const windowObject = options.windowObject ?? globalThis.window ?? {};
  const provider = options.provider ?? (() => windowObject.localStorage);
  let progressMemory = null;
  let preferencesMemory = null;
  let persistenceDisabled = false;
  let noticeShown = false;

  function notifyUnavailable() {
    persistenceDisabled = true;
    if (!noticeShown) {
      noticeShown = true;
      onUnavailable();
    }
  }

  /** @returns {Storage|null} */
  function getStorage() {
    if (persistenceDisabled) return null;
    try {
      const storage = provider();
      if (!storage) throw new Error('Storage unavailable');
      return storage;
    } catch {
      notifyUnavailable();
      return null;
    }
  }

  /** @param {unknown} value @returns {Progress|null} */
  function parseProgress(value) {
    if (typeof value !== 'string') return null;
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      if (
        parsed.version !== config.save.version ||
        !Number.isInteger(parsed.levelIndex) || parsed.levelIndex < 0 || parsed.levelIndex > 4 ||
        !Number.isInteger(parsed.checkpointId) || (parsed.checkpointId !== 0 && parsed.checkpointId !== 1) ||
        typeof parsed.completed !== 'boolean'
      ) return null;
      if (parsed.completed) return { version: config.save.version, levelIndex: 4, checkpointId: 1, completed: true };
      return {
        version: config.save.version,
        levelIndex: parsed.levelIndex,
        checkpointId: parsed.checkpointId,
        completed: false,
      };
    } catch {
      return null;
    }
  }

  /** @returns {Progress|null} */
  function readProgress() {
    if (progressMemory) return { ...progressMemory };
    const storage = getStorage();
    if (!storage) return null;
    try {
      const parsed = parseProgress(storage.getItem(config.save.key));
      if (!parsed) return null;
      progressMemory = parsed;
      return { ...parsed };
    } catch {
      notifyUnavailable();
      return null;
    }
  }

  /** @param {Progress} progress */
  function writeProgress(progress) {
    const normalized = parseProgress(JSON.stringify(progress));
    if (!normalized) return false;
    progressMemory = normalized;
    const storage = getStorage();
    if (!storage) return false;
    try {
      storage.setItem(config.save.key, JSON.stringify(normalized));
      return true;
    } catch {
      notifyUnavailable();
      return false;
    }
  }

  /** @returns {Preferences} */
  function readPreferences() {
    if (preferencesMemory) return { ...preferencesMemory };
    const defaults = {
      version: config.save.version,
      muted: config.audio.defaultMuted,
      reducedEffects: Boolean(windowObject.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches),
    };
    const storage = getStorage();
    if (!storage) return defaults;
    let raw;
    try {
      raw = storage.getItem(config.save.prefsKey);
    } catch {
      notifyUnavailable();
      return defaults;
    }
    if (raw === null) return defaults;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return defaults;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.version !== config.save.version || typeof parsed.muted !== 'boolean' || typeof parsed.reducedEffects !== 'boolean') return defaults;
    preferencesMemory = { version: config.save.version, muted: parsed.muted, reducedEffects: parsed.reducedEffects };
    return { ...preferencesMemory };
  }

  /** @param {{muted: boolean, reducedEffects: boolean}} preferences */
  function writePreferences(preferences) {
    if (typeof preferences.muted !== 'boolean' || typeof preferences.reducedEffects !== 'boolean') return false;
    const normalized = { version: config.save.version, muted: preferences.muted, reducedEffects: preferences.reducedEffects };
    preferencesMemory = normalized;
    const storage = getStorage();
    if (!storage) return false;
    try {
      storage.setItem(config.save.prefsKey, JSON.stringify(normalized));
      return true;
    } catch {
      notifyUnavailable();
      return false;
    }
  }

  return {
    readProgress,
    writeProgress,
    readPreferences,
    writePreferences,
    get status() {
      return { available: !persistenceDisabled, noticeShown };
    },
  };
}
