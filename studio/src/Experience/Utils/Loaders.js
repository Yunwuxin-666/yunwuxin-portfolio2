import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

import * as THREE from "three/webgpu";
import { Experience } from "../Experience";

export class Loaders {
  constructor() {
    this.init();
  }

  init() {
    this.loaders = {};
    this.loaders.gltfLoader = new GLTFLoader();
    this.loaders.dracoLoader = new DRACOLoader();
    this.loaders.dracoLoader.setDecoderPath(import.meta.env.BASE_URL + "draco/");
    this.loaders.gltfLoader.setDRACOLoader(this.loaders.dracoLoader);
    this.loaders.textureLoader = new THREE.TextureLoader();

    const experience = Experience.getInstance();
    if (experience.device.isMobileDevice || experience.device.isIOS) {
      const renderer = experience.renderer.renderer;
      const formats = ["astc", "bc", "s3tc", "etc2", "pvrtc"];
      if (formats.some(format => renderer.hasFeature("texture-compression-" + format))) {
        this.loaders.ktx2Loader = new KTX2Loader()
          .setTranscoderPath(import.meta.env.BASE_URL + "basis/")
          .setWorkerLimit(2)
          .detectSupport(renderer);
      }
    }
  }
}
