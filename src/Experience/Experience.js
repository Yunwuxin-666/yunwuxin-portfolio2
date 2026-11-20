import * as THREE from "three/webgpu";
import GUI from "lil-gui";
import { Time } from "./Utils/Time";
import { Sizes } from "./Utils/Sizes";
import { Camera } from "./Camera";
import { Renderer } from "./Renderer";
import { World } from "./World/World";
import { Resources } from "./Utils/Resources";
import { Controls } from "./Controls";
import { Mouse } from "./Mouse";
import { Raycaster } from "./Raycaster";
import { Device } from "./Utils/Device";
import { Preloader } from "./Preloader";
import { Outline } from "./Outline";

export class Experience {
  static getInstance() {
    return Experience.instance;
  }

  constructor() {
    if (Experience.instance) return Experience.instance;

    Experience.instance = this;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.init().catch(() => this.showUnavailable());
  }

  motionDuration(seconds) {
    return this.reducedMotion.matches ? 0 : seconds;
  }

  showUnavailable() {
    if (this.unavailable) return;
    this.unavailable = true;
    const overlay = document.querySelector(".preloader");
    overlay.hidden = false;
    overlay.style.opacity = 1;
    overlay.querySelectorAll(".preloader__progress-wrapper, .preloader__percent")
      .forEach((element) => { element.style.display = "none"; });
    document.getElementById("load-status").textContent = "The 3D room could not load.";
    document.getElementById("load-error").hidden = false;
    this.canvasElement.closest("main").inert = true;
    document.querySelector(".top-right-controls").inert = true;
    document.getElementById("retry-btn").focus();
  }

  async init() {
    this.canvasElement = document.getElementById("experience-canvas");
    document.getElementById("retry-btn").addEventListener("click", () => window.location.reload());

    this.scene = new THREE.Scene();
    this.debug = window.location.hash === "#debug";
    this.gui = new GUI({ title: "Controls" });
    if (!this.debug) this.gui.hide();
    this.time = new Time();
    this.device = new Device();
    this.sizes = new Sizes();
    this.camera = new Camera();
    this.renderer = new Renderer();
    this.mouse = new Mouse();
    // this.controls = new Controls();
    this.raycaster = new Raycaster();
    await this.renderer.init();

    this.resources = new Resources();
    this.resources.on("asseterror", () => this.showUnavailable());
    this.preloader = new Preloader();
    this.preloader.on("preloaderfinished", () => {
      this.raycaster.enabled = true;
      this.canvasElement.closest("main").inert = false;
      document.querySelector(".top-right-controls").inert = false;
      this.canvasElement.focus({ preventScroll: true });
    });
    this.outline = new Outline();

    this.world = new World();

    this.outline.apply(this.scene);

    this.time.on("update", () => {
      this.update();
    });
    this.sizes.on("resize", () => {
      this.resize();
    });
  }

  resize() {
    this.camera.resize();
    this.renderer.resize();
    this.world?.raycaster?.syncFraming();
    this.world?.projectDesk?.resize();
  }

  update() {
    if (this.unavailable) return;
    this.world.update();
    this.renderer.update();
    this.camera.update();
    this.raycaster.update();
    // this.controls.update();
  }
}
