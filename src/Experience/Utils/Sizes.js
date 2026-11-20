import { EventEmitter } from "events";

export class Sizes extends EventEmitter {
  constructor() {
    super();
    const viewport = document.getElementById("experience-wrapper");
    const measure = () => {
      const width = Math.max(1, viewport.clientWidth);
      const height = Math.max(1, viewport.clientHeight);
      // Limit post-processing buffer size on high-DPI and ultrawide displays.
      const pixelRatio = Math.min(window.devicePixelRatio, 2, Math.sqrt(5_000_000 / (width * height)));
      if (width === this.width && height === this.height && pixelRatio === this.pixelRatio) return;
      this.width = width;
      this.height = height;
      this.aspect = width / height;
      this.pixelRatio = pixelRatio;
      this.emit("resize");
    };
    measure();
    new ResizeObserver(measure).observe(viewport);
    window.addEventListener("resize", measure);
  }
}
