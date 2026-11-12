const MUSIC_KEY = 'music.main';
const ACTIVE_MODES = new Set(['PLAYING', 'RESPAWNING', 'TRANSITION', 'ENDING', 'FINISHED']);

/** @param {unknown} value */
function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Owns the single music sound for the lifetime of the Phaser game.
 * @param {{soundManager: any, cache: any, config: any, getMode: () => string, muted: boolean, onStateChange?: (state: object) => void}} options
 */
export function createAudioController({ soundManager, cache, config, getMode, muted, onStateChange = () => {} }) {
  let sound = null;
  let state = 'loading';
  let available = false;
  let isMuted = Boolean(muted);
  let intent = false;
  let restartOnPlay = false;
  let paused = false;
  let destroyed = false;
  let generation = 0;
  let ending = false;
  let targetGain = config.audio.musicGain;
  let endingTween = null;
  let endingTweenManager = null;
  let warned = false;
  const listeners = [];
  const context = soundManager?.context ?? null;

  function publish() {
    onStateChange(snapshot());
  }

  function warnUnavailable(reason) {
    if (warned) return;
    warned = true;
    console.warn('La música no está disponible; puedes seguir jugando.', reason);
  }

  function setUnavailable(reason) {
    available = false;
    state = 'unavailable';
    intent = false;
    generation += 1;
    warnUnavailable(reason);
    publish();
  }

  function modeCanPlay() {
    return ACTIVE_MODES.has(getMode());
  }

  function currentToken(token) {
    return !destroyed && token === generation && intent && !isMuted && !paused && modeCanPlay();
  }

  function managerLocked() {
    return Boolean(soundManager?.locked);
  }

  function setVolume(value) {
    if (!sound || managerLocked()) return;
    if (typeof sound.setVolume === 'function') sound.setVolume(value);
    else sound.volume = value;
  }

  function setManagerMute(value) {
    soundManager?.setMute?.(value);
  }

  function stopEndingFade() {
    if (!endingTween) return;
    const tween = endingTween;
    endingTween = null;
    tween.stop?.();
    endingTweenManager?.remove?.(tween);
    endingTweenManager = null;
  }

  function nativeTag() {
    return sound?.audio ?? sound?.tags?.find((tag) => tag.dataset?.used === 'true') ?? null;
  }

  function soundIsPlaying() {
    if (!sound?.isPlaying || sound.isPaused) return false;
    if (context && context.state !== 'running') return false;
    const tag = context ? null : nativeTag();
    return !tag || !tag.paused;
  }

  function playIfCurrent(token) {
    if (!currentToken(token) || !available || !sound) return false;
    if (managerLocked()) {
      state = 'blocked';
      publish();
      return false;
    }
    if (context?.state === 'closed') {
      setUnavailable('AudioContext closed');
      return false;
    }
    if (context && context.state !== 'running') {
      state = 'blocked';
      publish();
      return false;
    }

    try {
      setVolume(targetGain);
      if (restartOnPlay) {
        if (sound.isPlaying || sound.isPaused) sound.stop();
        if (typeof sound.setSeek === 'function') sound.setSeek(0);
        else if ('seek' in sound) sound.seek = 0;
        if (sound.play({ loop: true, volume: targetGain, seek: 0 }) === false) throw new Error('Sound play was rejected');
        restartOnPlay = false;
      } else if (sound.isPaused) {
        if (sound.resume() === false) throw new Error('Sound resume was rejected');
      } else if (!sound.isPlaying || (!context && nativeTag()?.paused)) {
        if (sound.play({ loop: true, volume: targetGain }) === false) throw new Error('Sound play was rejected');
      }
      if (!context && nativeTag()?.paused) throw new Error('HTML audio did not start');
      paused = false;
      state = 'ready';
      publish();
      if (!context) {
        const tag = nativeTag();
        Promise.resolve().then(() => {
          if (currentToken(token) && sound?.isPlaying && tag?.paused) {
            state = 'blocked';
            publish();
          }
        });
      }
      return true;
    } catch (error) {
      state = 'blocked';
      publish();
      return false;
    }
  }

  function resumeContext(token) {
    if (!currentToken(token)) return;
    if (!context || context.state === 'running') {
      playIfCurrent(token);
      return;
    }
    if (context.state === 'closed') {
      setUnavailable('AudioContext closed');
      return;
    }

    let result;
    try {
      // Called synchronously from the initiating user gesture.
      result = context.resume();
    } catch {
      state = 'blocked';
      publish();
      return;
    }
    state = 'blocked';
    publish();
    Promise.resolve(result).then(() => {
      if (!currentToken(token)) return;
      if (context.state === 'running') playIfCurrent(token);
      else if (context.state === 'closed') setUnavailable('AudioContext closed');
      else {
        state = 'blocked';
        publish();
      }
    }, () => {
      if (!currentToken(token)) return;
      state = 'blocked';
      publish();
    });
  }

  function onUnlocked() {
    if (!intent || isMuted || paused || !modeCanPlay()) return;
    if (context && context.state !== 'running') {
      resumeContext(generation);
      return;
    }
    playIfCurrent(generation);
  }

  function listen(emitter, event, callback) {
    if (!emitter?.on) return;
    emitter.on(event, callback);
    listeners.push(() => emitter.off?.(event, callback));
  }

  function initialize() {
    if (destroyed || sound || state !== 'loading') return snapshot();
    if (!soundManager || typeof soundManager.add !== 'function' || !cache?.exists?.(MUSIC_KEY)) {
      setUnavailable('Music cache entry missing');
      return snapshot();
    }

    try {
      soundManager.pauseOnBlur = false;
      sound = soundManager.add(MUSIC_KEY, { loop: true, volume: targetGain });
      if (!sound) throw new Error('Sound manager did not create a sound');
      setManagerMute(isMuted);
      available = true;
      state = 'ready';
      listen(soundManager, 'unlocked', onUnlocked);
      if (context?.addEventListener) {
        context.addEventListener('statechange', onContextStateChange);
        listeners.push(() => context.removeEventListener?.('statechange', onContextStateChange));
      }
      listen(sound, 'play', publish);
      listen(sound, 'resume', publish);
      listen(sound, 'pause', publish);
      listen(sound, 'stop', publish);
      for (const tag of sound.tags ?? []) {
        const onPlaying = () => {
          if (!intent || isMuted || paused || !modeCanPlay()) {
            tag.pause?.();
            return;
          }
          state = 'ready';
          publish();
        };
        const onNativePause = () => {
          if (intent && !isMuted && !paused && sound?.isPlaying && tag.paused) {
            state = 'blocked';
            publish();
          }
        };
        const onError = () => setUnavailable('HTML audio playback error');
        tag.addEventListener?.('playing', onPlaying);
        tag.addEventListener?.('pause', onNativePause);
        tag.addEventListener?.('error', onError);
        listeners.push(() => tag.removeEventListener?.('playing', onPlaying));
        listeners.push(() => tag.removeEventListener?.('pause', onNativePause));
        listeners.push(() => tag.removeEventListener?.('error', onError));
      }
      publish();
    } catch (error) {
      setUnavailable(error);
    }
    return snapshot();
  }

  function onContextStateChange() {
    if (context?.state === 'closed') {
      setUnavailable('AudioContext closed');
      return;
    }
    if (context?.state === 'running') {
      if (intent && !isMuted && !paused && modeCanPlay()) playIfCurrent(generation);
      else publish();
      return;
    }
    if (sound?.isPlaying && intent) {
      generation += 1;
      intent = false;
      paused = true;
      stopEndingFade();
      sound.pause?.();
      state = 'blocked';
    }
    publish();
  }

  function requestPlayback(restart) {
    if (!available || !sound || isMuted || !modeCanPlay()) return false;
    generation += 1;
    intent = true;
    paused = false;
    restartOnPlay = restartOnPlay || restart;
    resumeContext(generation);
    return true;
  }

  function startFromGesture({ restart = true } = {}) {
    ending = false;
    targetGain = config.audio.musicGain;
    restartOnPlay = restart;
    stopEndingFade();
    return requestPlayback(restart);
  }

  function resumeFromGesture() {
    return requestPlayback(false);
  }

  function activateFromGesture() {
    return requestPlayback(false);
  }

  function pauseSound() {
    if (!sound) return;
    if (ending) setVolume(targetGain);
    if (!context && managerLocked()) {
      nativeTag()?.pause();
      return;
    }
    sound.pause?.();
  }

  function pause() {
    generation += 1;
    intent = false;
    paused = true;
    stopEndingFade();
    pauseSound();
    publish();
  }

  function stop() {
    generation += 1;
    intent = false;
    paused = false;
    restartOnPlay = true;
    ending = false;
    targetGain = config.audio.musicGain;
    stopEndingFade();
    if (sound) {
      if (!context && managerLocked()) nativeTag()?.pause();
      else sound.stop?.();
    }
    if (available) state = 'ready';
    publish();
  }

  function setMuted(value) {
    if (typeof value !== 'boolean' || value === isMuted) return false;
    isMuted = value;
    setManagerMute(value);
    if (value) pause();
    else if (modeCanPlay() && getMode() !== 'PAUSED') requestPlayback(false);
    else publish();
    return true;
  }

  function enterFinished(tweenManager) {
    ending = true;
    targetGain = config.audio.endingMusicGain;
    stopEndingFade();
    if (!sound || isMuted || !soundIsPlaying() || !tweenManager?.add) {
      setVolume(targetGain);
      publish();
      return;
    }
    const gain = { value: numberOrNull(sound.volume) ?? config.audio.musicGain };
    endingTweenManager = tweenManager;
    endingTween = tweenManager.add({
      targets: gain,
      value: targetGain,
      duration: config.audio.fadeMs,
      ease: 'Linear',
      onUpdate: () => setVolume(gain.value),
      onComplete: () => {
        endingTween = null;
        endingTweenManager = null;
        setVolume(targetGain);
        publish();
      },
    });
    publish();
  }

  function snapshot() {
    const tag = nativeTag();
    const rawSeek = context ? sound?.seek : (tag?.currentTime ?? sound?.seek);
    return {
      status: state,
      muted: isMuted,
      playing: soundIsPlaying() && !isMuted,
      paused: paused || Boolean(sound?.isPaused) || Boolean(tag?.paused && sound?.isPlaying),
      seek: numberOrNull(rawSeek) ?? 0,
      duration: numberOrNull(sound?.totalDuration) ?? numberOrNull(sound?.duration) ?? 0,
      volume: numberOrNull(sound?.volume) ?? targetGain,
      loop: sound ? Boolean(sound.loop) : true,
      instances: soundManager?.sounds?.filter?.((item) => item.key === MUSIC_KEY).length ?? (sound ? 1 : 0),
      backend: context ? 'webaudio' : 'html5',
      contextState: context?.state ?? null,
      available,
      needsActivation: (state === 'blocked' && getMode() !== 'TITLE' && getMode() !== 'PAUSED') ||
        (getMode() === 'FINISHED' && paused && !isMuted),
    };
  }

  function destroy() {
    if (destroyed) return;
    generation += 1;
    intent = false;
    destroyed = true;
    stopEndingFade();
    pauseSound();
    for (const remove of listeners.splice(0)) remove();
    sound?.destroy?.();
    sound = null;
    available = false;
  }

  return { initialize, startFromGesture, resumeFromGesture, pause, stop, setMuted, activateFromGesture, enterFinished, snapshot, destroy };
}
