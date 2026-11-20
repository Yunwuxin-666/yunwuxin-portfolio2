import * as THREE from "three/webgpu";
import { EventEmitter } from "events";
import { Loaders } from "./Loaders";
import { roomAtlases, studioAssets } from "./assets";

export class Resources extends EventEmitter {
  constructor() {
    super();
    this.loaders = new Loaders().loaders;
    const compressed = Boolean(this.loaders.ktx2Loader);
    this.nightAssets = roomAtlases(compressed, true);
    const initial = [...studioAssets, ...roomAtlases(compressed)];
    this.items = {};
    this.loaded = 0;
    this.loadBatch(initial, () => this.emit("progress", ++this.loaded / initial.length))
      .then(() => this.emit("ready"))
      .catch(error => this.emit("asseterror", error));
  }

  async loadAsset(asset) {
    if (this.items[asset.name]) return;
    if (asset.type === "glbModel") {
      this.items[asset.name] = await this.loaders.gltfLoader.loadAsync(asset.path);
      return;
    }
    let map;
    if (asset.type === "ktx2") {
      try {
        map = await this.loaders.ktx2Loader.loadAsync(asset.path);
      } catch {
        map = await this.loaders.textureLoader.loadAsync(asset.fallback);
      }
    } else {
      map = await this.loaders.textureLoader.loadAsync(asset.path);
    }
    map.colorSpace = THREE.SRGBColorSpace;
    this.items[asset.name] = map;
  }

  async loadBatch(assets, onLoad) {
    // Bound concurrent image decodes, especially on mobile browsers.
    const queue = assets.values();
    const worker = async () => {
      for (const asset of queue) {
        await this.loadAsset(asset);
        onLoad?.();
      }
    };
    const results = await Promise.allSettled(Array.from({ length: 4 }, worker));
    const failed = results.find(result => result.status === "rejected");
    if (failed) throw failed.reason;
  }

  loadNight() {
    if (!this.nightLoad) {
      this.nightLoad = this.loadBatch(this.nightAssets).catch(error => {
        this.nightLoad = null;
        throw error;
      });
    }
    return this.nightLoad;
  }
}
