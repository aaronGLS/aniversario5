import Phaser from 'phaser';
import { assets, config, getReadyAssets } from '../config.js';
import { registerPlayerAnimations } from '../game/player.js';
import { registerAaronAnimation } from '../game/aaron.js';

export class BootScene extends Phaser.Scene {
  constructor(onReady, onProgress, onError) {
    super({ key: 'BootScene' });
    this.onReady = onReady;
    this.onProgress = onProgress;
    this.onError = onError;
  }

  preload() {
    this.loadFailed = false;
    this.loadErrorHandler = (file) => {
      if (file?.type === 'audio') {
        console.warn(`No se pudo cargar el audio ${file.key}; el juego continuará en silencio.`);
        return;
      }
      this.loadFailed = true;
    };
    this.load.on('progress', this.onProgress);
    this.load.on('loaderror', this.loadErrorHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.load.off('progress', this.onProgress);
      this.load.off('loaderror', this.loadErrorHandler);
    });
    for (const asset of getReadyAssets()) {
      if (asset.usage === 'dom') continue;
      const url = `${import.meta.env.BASE_URL}${assets.runtimeBase}${asset.path}`;
      if (asset.type === 'spritesheet') this.load.spritesheet(asset.key, url, { frameWidth: asset.frameWidth, frameHeight: asset.frameHeight });
      else if (asset.type === 'image') this.load.image(asset.key, url);
      else if (asset.type === 'atlas') this.load.atlas(asset.key, url, `${import.meta.env.BASE_URL}${assets.runtimeBase}${asset.dataPath}`);
      else if (asset.type === 'audio') {
        this.load.audio(asset.key, url);
        const audioFile = this.load.list.get('key', asset.key);
        if (audioFile?.config?.context) {
          audioFile.onProcess = function decodeOptionalMusic() {
            this.state = Phaser.Loader.FILE_PROCESSING;
            const context = this.config.context;
            this.config.context = null;
            Promise.resolve()
              .then(() => context.decodeAudioData(this.xhrLoader.response))
              .then((buffer) => {
                this.data = buffer;
                this.onProcessComplete();
              }, () => {
                console.warn(`No se pudo decodificar el audio ${this.key}; el juego continuará en silencio.`);
                this.onProcessError();
              });
          };
        }
      }
    }
  }

  create() {
    const required = [
      ...config.environment.themes.flatMap(({ id }) => config.environment.backgroundLayers.map((layer) => `${id}.${layer}`)),
      ...Array.from({ length: 9 }, (_, i) => `terrain.${i}`),
      ...['tree', 'bush', 'rock', 'shrooms', 'sign'].map((name) => `prop.${name}`),
      'marker.lantern.off', 'marker.lantern.on',
    ];
    const texture = this.textures.exists(config.environment.atlasKey) ? this.textures.get(config.environment.atlasKey) : null;
    if (this.loadFailed || !texture || required.some((frame) => !texture.has(frame))) {
      this.onError();
      this.scene.stop();
      return;
    }
    registerPlayerAnimations(this);
    registerAaronAnimation(this);
    this.onReady();
    this.scene.stop();
  }
}
