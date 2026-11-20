import gsap from "gsap";

export class Modal {
  static _openCount = 0;
  static get anyOpen() { return Modal._openCount > 0; }

  constructor() {
    this._overlay = document.createElement("div");
    this._overlay.className = "modal-overlay";

    this._el = document.createElement("div");
    this._el.className = "modal";
    this._el.inert = true;
    this._el.setAttribute("aria-hidden", "true");
    this._el.setAttribute("role", "dialog");
    this._el.setAttribute("aria-modal", "true");
    this._active = false;
    this._motion = matchMedia("(prefers-reduced-motion: reduce)");
    this._el.innerHTML = `
      <button class="modal__close-button" aria-label="Close dialog">&#x2715;</button>
      <h2 class="modal__title"></h2>
      <p class="modal__paragraph"></p>
    `;

    document.body.appendChild(this._overlay);
    document.body.appendChild(this._el);

    // Let GSAP own the transform so it can compose xPercent + scale cleanly
    gsap.set(this._el, { xPercent: -50, yPercent: -50 });

    this._overlay.addEventListener("click", () => this.close());
    this._closeBtn = this._el.querySelector(".modal__close-button");
    this._closeBtn.addEventListener("click", () => this.close());
    this._el.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        this.close();
      } else if (event.key === "Tab") {
        const focusable = this._el.querySelectorAll("button, a[href]");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (document.activeElement === (event.shiftKey ? first : last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    });
  }

  open(title, text) {
    this._el.querySelector(".modal__title").textContent = title;
    this._el.querySelector(".modal__paragraph").textContent = text;
    this._show();
  }

  openHTML(title, html) {
    this._el.querySelector(".modal__title").textContent = title;
    this._el.querySelector(".modal__paragraph").innerHTML = html;
    this._show();
  }

  _show() {

    gsap.killTweensOf([this._overlay, this._el]);
    this._overlay.style.pointerEvents = "auto";
    this._el.style.pointerEvents = "auto";
    if (!this._active) {
      this._restoreFocus = document.activeElement;
      this._active = true;
      Modal._openCount++;
    }
    this._el.inert = false;
    this._el.removeAttribute("aria-hidden");
    this._el.setAttribute("aria-label", this._el.querySelector(".modal__title").textContent);
    this._closeBtn.focus({ preventScroll: true });

    gsap.fromTo(this._overlay,
      { opacity: 0 },
      { opacity: 1, duration: this._motion.matches ? 0 : 0.35, ease: "power2.out" }
    );
    gsap.fromTo(this._el,
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: this._motion.matches ? 0 : 0.35, ease: "back.out(1.4)" }
    );
  }

  close() {
    if (!this._active) return;
    this._active = false;
    Modal._openCount--;
    this._restoreFocus?.focus({ preventScroll: true });
    this._el.inert = true;
    this._el.setAttribute("aria-hidden", "true");
    gsap.killTweensOf([this._overlay, this._el]);
    gsap.to(this._overlay, {
      opacity: 0,
      duration: this._motion.matches ? 0 : 0.25,
      ease: "power2.in",
      onComplete: () => {
        this._overlay.style.pointerEvents = "none";
      },
    });
    gsap.to(this._el, {
      opacity: 0,
      scale: 0.94,
      duration: this._motion.matches ? 0 : 0.25,
      ease: "power2.in",
      onComplete: () => { this._el.style.pointerEvents = "none"; },
    });
  }

  get isOpen() {
    return this._active;
  }
}
