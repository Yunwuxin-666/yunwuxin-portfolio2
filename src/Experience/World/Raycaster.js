import * as THREE from "three/webgpu";
import { Experience } from "../Experience";
import gsap from "gsap";
import { Howl } from "howler";
import { Modal } from "../Modal";
import { studioEntries, undatedProjects } from "./StudioSchedule";
import { houseShiftX } from "./HouseShadow";

const PHOTOS_POS = { x: -11.18, y: 8.656318, z: -10.226414 };
const CALENDAR_POS = { x: 15.47, y: 4.04, z: -20.65 };
const CHARACTERS_POS = { x: -6.885733, y: -7.250762, z: -16.617651 };
const CHARACTERS_ROT = { x: 1.328431 - Math.PI / 2, y: 0, z: 0 };
const HOUSE_POS = { x: -1.271494 + houseShiftX, y: 3.436944, z: -13.345522 };
const HOUSE_ROT = { x: -0.264897, y: 0, z: 0 };
const HOUSE_DRAG_LIMIT = 7;
const HOUSE_DRAG_SENSITIVITY = 0.02;
const MESSAGES_POS = { x: 7.869, y: 8.3452, z: -23.766 };
const MESSAGES_ROT = { x: -Math.PI / 2, y: 0, z: -0.2426 };

const CHARACTER_DATA = {
  Fourth_Carl_Raycaster: {
    title: studioEntries[0].title,
    text: "11 月 " + studioEntries[0].day + " 日 · " + studioEntries[0].note,
  },
  Fourth_Russell_Raycaster: {
    title: studioEntries[1].title,
    text: "11 月 " + studioEntries[1].day + " 日 · " + studioEntries[1].note,
  },
  Fourth_Dug_Raycaster: {
    title: "待排期项目",
    text: undatedProjects.join(" · "),
  },
};
const ROOM_LABELS = {
  Photos_Raycaster_Hitbox: "相框",
  Calendar_Raycaster_Hitbox: "工作室月历",
  Characters_Raycaster_Hitbox: "项目日程",
  House_Raycaster_Hitbox: "模型工作台",
  Music_Raycaster_Hitbox: "音乐",
};

let dragHintDismissed = false;

export class Raycaster {
  constructor() {
    this.experience = Experience.getInstance();
    this.cameraObj = this.experience.camera;
    this.camera = this.experience.camera.instance;
    this.canvas = this.experience.canvasElement;
    this.mouse = this.experience.mouse;

    this.raycaster = new THREE.Raycaster();
    this.meshes = [];
    this.inFocus = false;
    this.musicPlaying = false;

    this._houseDragOffset = 0;
    this._houseDragTargetX = HOUSE_POS.x;
    this._isDragging = false;
    this._inHouseMode = false;
    this._inMessagesMode = false;
    this._inCharactersMode = false;
    this._characterMeshes = [];
    this._mouseRaw = { x: 0, y: 0 };
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._dragStartOffset = 0;
    this._attachmentMeshes = [];
    this._attachmentFlipState = {};
    this._wasDrag = false;
    this._hoveredAttachmentMesh = null;
    this._flipProxies = new Map();
    this._flipIndices = new Map();
    this._textsMesh = null;
    this._savedHouseDragX = null;
    this._markersVisible = false;
    this._markerData = null;
    this._markersContainer = null;

    this.backBtn = document.getElementById("back-btn");
    this._createDragHint();
    this._createHoverLabel();
    this._createCursorTooltip();
    this._createMessagesBackBtn();
    this._currentHoveredName = null;
    this.modal = new Modal();

    this.music = new Howl({
      src: [import.meta.env.BASE_URL + "audio/music/Married_Life.mp3"],
      html5: true,
      preload: false,
      loop: true,
      volume: 0,
    });

    this.loadHitboxes();
    this._createHitboxMarkers();
    this.init();
  }

  loadHitboxes() {
    const model = this.experience.resources.items.hitboxes;
    this.experience.scene.add(model.scene);
    model.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name === "House_Raycaster_Hitbox") child.position.x += houseShiftX;
        child.material = child.material.clone();
        child.material.visible = false;
        this.meshes.push(child);
      }
    });
  }

  init() {
    let lastTouchEnd = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchWasDrag = false;
    const DRAG_THRESHOLD = 8;

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchWasDrag = false;
        } else {
          touchWasDrag = true;
        }
      },
      { passive: true },
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        if (touchWasDrag || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) touchWasDrag = true;
      },
      { passive: true },
    );

    const handleInteraction = (e) => {
      if (this.inFocus || this.experience.world.projectDesk?.active) return;

      if (e.type === "touchend") {
        lastTouchEnd = Date.now();
        if (touchWasDrag) return;
        const touch = e.changedTouches[0];
        this.mouse.instance.x = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouse.instance.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      } else if (e.type === "click" && Date.now() - lastTouchEnd < 500) {
        return;
      }

      this.raycaster.setFromCamera(this.mouse.instance, this.camera);
      const intersects = this.raycaster.intersectObjects(this.meshes);
      if (!intersects.length) return;

      const name = intersects[0].object.name;

      this._currentHoveredName = null;
      this._hideHoverLabel();

      if (name === "Photos_Raycaster_Hitbox") this.goToPhotos();
      if (name === "Calendar_Raycaster_Hitbox") this.goToCalendar();
      if (name === "Characters_Raycaster_Hitbox") this.goToCharacters();
      if (name === "House_Raycaster_Hitbox") this.goToHouse();
      if (name === "Music_Raycaster_Hitbox") this.toggleMusic();
    };

    this.canvas.addEventListener("click", handleInteraction);
    this.canvas.addEventListener("touchend", handleInteraction);
    this.backBtn.addEventListener("click", () => {
      this.canvas.focus({ preventScroll: true });
      this.goHome();
    });
    this.canvas.addEventListener("keydown", (event) => this.handleShortcut(event));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || Modal.anyOpen || !this.inFocus || this.cameraObj.locked) return;
      this.canvas.focus({ preventScroll: true });
      if (this._inMessagesMode) this.goBackToHouse();
      else this.goHome();
    });
  }

  handleShortcut(event) {
    if (this.cameraObj.locked || Modal.anyOpen || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const { key } = event;
    if (!this.inFocus) {
      const actions = [this.goToPhotos, this.goToCalendar, this.goToCharacters, this.goToHouse, this.toggleMusic];
      if (/^[1-5]$/.test(key)) actions[Number(key) - 1].call(this);
    } else if (this._inCharactersMode && /^[1-3]$/.test(key)) {
      const character = Object.values(CHARACTER_DATA)[Number(key) - 1];
      this.modal.open(character.title, character.text);
    } else if (this._inHouseMode && /^[12]$/.test(key)) {
      const name = key === "1" ? "Ninth_Attachment_John" : "Ninth_Attachment_Patricia";
      const attachment = this._attachmentMeshes.find((mesh) => mesh.name === name);
      if (attachment) this._toggleAttachmentFlip(attachment);
    } else if (this._inHouseMode && key === "3") {
      this.goToMessages();
    } else if (this._inHouseMode && (key === "ArrowLeft" || key === "ArrowRight")) {
      event.preventDefault();
      this._houseDragTargetX = THREE.MathUtils.clamp(
        this._houseDragTargetX + (key === "ArrowLeft" ? -1 : 1),
        HOUSE_POS.x - HOUSE_DRAG_LIMIT,
        HOUSE_POS.x + HOUSE_DRAG_LIMIT,
      );
    }
  }

  // Widths are measured across the subject in world units. Extra distance is
  // applied along the viewing axis so a tall display keeps the same focal point.
  focusPosition(view) {
    const shots = {
      photos: [PHOTOS_POS, 20.4, 11.65],
      calendar: [CALENDAR_POS, 10, 5.35],
      characters: [CHARACTERS_POS, 12, 7.2],
      house: [HOUSE_POS, 12, 5.6],
      draft: [MESSAGES_POS, 9.765, 4.15],
    };
    const [anchor, distance, width] = shots[view];
    const required = width / (2 * Math.tan(Math.PI / 9) * this.camera.aspect);
    const rotation = this.focusRotation(view);
    const back = new THREE.Vector3(0, 0, 1).applyEuler(rotation);
    const position = new THREE.Vector3(anchor.x, anchor.y, anchor.z);
    if (view === "house") position.x = this._houseDragTargetX;
    return position.addScaledVector(back, Math.max(0, required - distance));
  }

  focusRotation(view) {
    const rotation = {characters: CHARACTERS_ROT, house: HOUSE_ROT, draft: MESSAGES_ROT}[view];
    return rotation ? new THREE.Euler(rotation.x, rotation.y, rotation.z) : new THREE.Euler();
  }

  syncFraming() {
    if (!this.focusView) return;
    this.cameraObj.basePosition.copy(this.focusPosition(this.focusView));
    this.cameraObj.baseRotation.copy(this.focusRotation(this.focusView));
  }

  focusOn(view, onArrival) {
    this.inFocus = true;
    this.focusView = view;
    const rig = this.cameraObj;
    rig.locked = true;
    rig.transitionFov(40);
    const rot = this.focusRotation(view);
    const dest = rig.zoomedDestination(this.focusPosition(view), rot.x, rot.y, rot.z);
    const duration = this.experience.motionDuration(2);
    gsap.to(this.camera.position, { ...dest, duration, ease: "power2.inOut" });
    gsap.to(this.camera.rotation, {
      x: rot.x, y: rot.y, z: rot.z, duration, ease: "power2.inOut",
      onComplete: () => {
        this.syncFraming();
        rig.mousePositionStrength = 0;
        rig.mouseRotationStrength = 0;
        rig.locked = false;
        this.backBtn.classList.toggle("back-btn--visible", view !== "draft");
        this._messagesBackBtn.classList.toggle("back-btn--visible", view === "draft");
        if (view !== "house" && view !== "draft") {
          gsap.to(rig, {mousePositionStrength: 0.5, mouseRotationStrength: 0.01,
            duration: this.experience.motionDuration(0.6), ease: "power2.out"});
        }
        onArrival?.();
      },
    });
  }

  goToPhotos() { this.focusOn("photos"); }
  goToCalendar() { this.focusOn("calendar"); }
  goToCharacters() { this.focusOn("characters", () => this.enableCharacterInteraction()); }

  enableCharacterInteraction() {
    this._inCharactersMode = true;
    this._characterMeshes = [];

    const roomScene = this.experience.world.room?.model;
    if (roomScene) {
      roomScene.traverse((child) => {
        if (child.isMesh && CHARACTER_DATA[child.name]) {
          this._characterMeshes.push(child);
        }
      });
    }

    this._onCharacterClick = (e) => {
      if (Modal.anyOpen) return;
      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
      this.raycaster.setFromCamera(mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this._characterMeshes);
      if (!hits.length) return;
      const data = CHARACTER_DATA[hits[0].object.name];
      if (data) this.modal.open(data.title, data.text);
    };

    this.canvas.addEventListener("click", this._onCharacterClick);
  }

  disableCharacterInteraction() {
    this._inCharactersMode = false;
    this._characterMeshes = [];
    this._currentHoveredName = null;
    this._tooltipDrifting = false;
    this._hideCursorTooltip();
    if (this._onCharacterClick) {
      this.canvas.removeEventListener("click", this._onCharacterClick);
      this._onCharacterClick = null;
    }
    this.modal.close();
  }

  goToHouse() { this.focusOn("house", () => this.enableHouseDrag()); }

  _createDragHint() {
    const style = document.createElement("style");
    style.textContent = `
      #house-drag-hint {
        position: fixed;
        bottom: 48px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 14px;
        color: rgba(255, 255, 255, 0.85);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.5s ease;
        user-select: none;
      }
      #house-drag-hint.visible { opacity: 1; }
      #house-drag-hint .hint-arrow {
        font-size: 18px;
        opacity: 0.6;
      }
      #house-drag-hint .hint-icon {
        display: block;
        animation: hintSlide 1.6s ease-in-out infinite;
      }
      @keyframes hintSlide {
        0%, 100% { transform: translateX(-10px); }
        50%       { transform: translateX(10px); }
      }
    `;
    document.head.appendChild(style);

    this._dragHint = document.createElement("div");
    this._dragHint.id = "house-drag-hint";
    this._dragHint.innerHTML = `
      <span class="hint-arrow">←</span>
      <span class="hint-icon"><svg width="22" height="26" viewBox="0 0 550 650" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="display:block"><path d="M349.738 0C239.875 0 149.738 90.1367 149.738 200V265.625C106.672 240.43 50.7148 248.926 20.0507 289.844C-12.9571 333.789 -4.3633 396.777 39.582 429.688V430.469H40.3632L174.738 528.906V650H524.738V517.969C525.227 516.992 525.715 516.113 526.301 514.844C529.133 509.18 532.16 501.172 535.676 490.625C542.707 469.629 549.738 439.258 549.738 400V200C549.738 90.1367 459.602 0 349.738 0ZM349.738 50C432.355 50 499.738 117.383 499.738 200V400C499.738 433.594 494.27 458.594 488.801 475C486.066 483.203 482.844 489.16 480.988 492.969C480.012 494.824 479.914 496.094 479.426 496.875C479.23 497.266 478.742 497.559 478.645 497.656L482.551 500H220.832L214.582 495.312L70.0507 389.844C47.6875 373.145 43.1953 342.578 59.8945 320.312C76.6914 297.949 107.16 293.457 129.426 310.156H130.207L160.676 331.25L199.738 358.594V200C199.738 117.383 267.121 50 349.738 50ZM224.738 550H474.738V600H224.738V550Z"/></svg></span>
      <span class="hint-arrow">→</span>
    `;
    document.body.appendChild(this._dragHint);
  }

  _createHoverLabel() {
    const style = document.createElement("style");
    style.textContent = `
      #hover-label {
        position: fixed;
        bottom: 32px;
        left: 50%;
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        font-family: inherit;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
        text-align: center;
      }
    `;
    document.head.appendChild(style);

    this._hoverLabel = document.createElement("div");
    this._hoverLabel.id = "hover-label";
    document.body.appendChild(this._hoverLabel);
    gsap.set(this._hoverLabel, { xPercent: -50, y: 12, opacity: 0 });
  }

  _createCursorTooltip() {
    this._cursorTooltip = document.createElement("div");
    this._cursorTooltip.className = "cursor-tooltip";
    document.body.appendChild(this._cursorTooltip);
    gsap.set(this._cursorTooltip, { opacity: 0 });

    this._tooltipVel = { x: 0, y: 0 };
    this._tooltipDrifting = false;

    window.addEventListener("mousemove", (e) => {
      const dx = e.clientX - this._mouseRaw.x;
      const dy = e.clientY - this._mouseRaw.y;
      // Smooth velocity with an EMA so the drift feels natural
      this._tooltipVel.x = 0.35 * dx + 0.65 * this._tooltipVel.x;
      this._tooltipVel.y = 0.35 * dy + 0.65 * this._tooltipVel.y;
      this._mouseRaw.x = e.clientX;
      this._mouseRaw.y = e.clientY;

      if (!this._inCharactersMode || this.modal?.isOpen) return;

      if (this._tooltipDrifting) {
        // Cursor re-entered while drifting — cancel drift, restore if still hovering
        this._tooltipDrifting = false;
        gsap.killTweensOf(this._cursorTooltip);
        if (this._currentHoveredName) {
          gsap.to(this._cursorTooltip, {
            opacity: 1,
            duration: this.experience.motionDuration(0.15),
            ease: "power2.out",
          });
        }
      }

      // Always track cursor position — even while fading out after leaving a mesh
      this._cursorTooltip.style.left = e.clientX + 18 + "px";
      this._cursorTooltip.style.top = e.clientY + 18 + "px";
    });

    document.addEventListener("mouseleave", () => {
      if (!this._inCharactersMode || !this._currentHoveredName) return;
      this._tooltipDrifting = true;
      const fromLeft = parseFloat(this._cursorTooltip.style.left) || 0;
      const fromTop = parseFloat(this._cursorTooltip.style.top) || 0;
      gsap.killTweensOf(this._cursorTooltip);
      gsap.to(this._cursorTooltip, {
        left: fromLeft + this._tooltipVel.x * 40,
        top: fromTop + this._tooltipVel.y * 40,
        opacity: 0,
        duration: this.experience.motionDuration(0.45),
        ease: "power2.out",
        onComplete: () => {
          this._tooltipDrifting = false;
        },
      });
    });
  }

  _showCursorTooltip(text) {
    this._tooltipDrifting = false;
    this._cursorTooltip.textContent = text;
    this._cursorTooltip.style.left = this._mouseRaw.x + 18 + "px";
    this._cursorTooltip.style.top = this._mouseRaw.y + 18 + "px";
    gsap.killTweensOf(this._cursorTooltip);
    gsap.to(this._cursorTooltip, {
      opacity: 1,
      duration: this.experience.motionDuration(0.2),
      ease: "power2.out",
    });
  }

  _hideCursorTooltip() {
    this._tooltipDrifting = false;
    gsap.killTweensOf(this._cursorTooltip);
    gsap.to(this._cursorTooltip, {
      opacity: 0,
      duration: this.experience.motionDuration(0.15),
      ease: "power2.in",
    });
  }

  _createMessagesBackBtn() {
    this._messagesBackBtn = document.createElement("button");
    this._messagesBackBtn.className = "back-btn";
    this._messagesBackBtn.innerHTML = "&#8592; Back";
    document.body.appendChild(this._messagesBackBtn);
    this._messagesBackBtn.addEventListener("click", () => {
      this.canvas.focus({ preventScroll: true });
      this.goBackToHouse();
    });
  }

  _showHoverLabel(text) {
    this._hoverLabel.textContent = text;
    gsap.killTweensOf(this._hoverLabel);
    gsap.to(this._hoverLabel, {
      opacity: 1,
      y: 0,
      duration: this.experience.motionDuration(0.3),
      ease: "power2.out",
    });
  }

  _hideHoverLabel() {
    gsap.killTweensOf(this._hoverLabel);
    gsap.to(this._hoverLabel, {
      opacity: 0,
      y: 12,
      duration: this.experience.motionDuration(0.2),
      ease: "power2.in",
    });
  }

  enableHouseDrag() {
    this._inHouseMode = true;
    this._houseDragOffset = 0;
    this._wasDrag = false;

    this._attachmentMeshes = [];
    this._hoveredAttachmentMesh = null;
    this._flipProxies = new Map();
    this._flipIndices = new Map();
    const roomScene = this.experience.world.room?.model;
    if (roomScene) {
      roomScene.traverse((child) => {
        if (
          child.isMesh &&
          (child.name === "Ninth_Attachment_John" ||
            child.name === "Ninth_Attachment_Patricia")
        ) {
          this._attachmentMeshes.push(child);
          const flipIdx = child.morphTargetDictionary?.["Flip"];
          const isFlipped = this._attachmentFlipState[child.name] ?? false;
          if (!(child.name in this._attachmentFlipState)) {
            this._attachmentFlipState[child.name] = false;
          }
          const startValue = isFlipped ? 1.0 : 0;
          const proxy = { value: startValue };
          this._flipProxies.set(child, proxy);
          this._flipIndices.set(child, flipIdx);
          if (flipIdx !== undefined) child.morphTargetInfluences[flipIdx] = startValue;
        }
        if (child.isMesh && child.name === "Ninth_Attachment_Texts") {
          this._textsMesh = child;
        }
      });
    }

    if (!dragHintDismissed) this._dragHint.classList.add("visible");

    this._onDragStart = (e) => {
      if (this.experience.world.projectDesk?.active) return;
      if (!dragHintDismissed) {
        dragHintDismissed = true;
        this._dragHint.classList.remove("visible");
      }
      this._wasDrag = false;
      this._isDragging = true;
      this._dragStartX = e.clientX;
      this._dragStartY = e.clientY;
      this._dragStartOffset = this.cameraObj.basePosition.x;
      this.canvas.setPointerCapture(e.pointerId);
    };

    this._onDragMove = (e) => {
      if (!this._isDragging) return;
      const delta = (e.clientX - this._dragStartX) * HOUSE_DRAG_SENSITIVITY;
      this._houseDragTargetX = Math.max(
        HOUSE_POS.x - HOUSE_DRAG_LIMIT,
        Math.min(HOUSE_POS.x + HOUSE_DRAG_LIMIT, this._dragStartOffset - delta),
      );
    };

    this._onDragEnd = (e) => {
      const dx = e.clientX - this._dragStartX;
      const dy = e.clientY - this._dragStartY;
      this._wasDrag = Math.sqrt(dx * dx + dy * dy) > 8;
      this._isDragging = false;
    };

    this._onDragCancel = () => {
      this._wasDrag = true;
      this._isDragging = false;
    };

    this._onHouseClick = (e) => {
      if (this.experience.world.projectDesk?.active) return;
      if (this._wasDrag || this._inMessagesMode) return;
      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
      this.raycaster.setFromCamera(mouse, this.camera);
      if (this._textsMesh) {
        const textsHit = this.raycaster.intersectObject(this._textsMesh);
        if (textsHit.length) {
          this.goToMessages();
          return;
        }
      }
      if (!this._attachmentMeshes.length) return;
      const hits = this.raycaster.intersectObjects(this._attachmentMeshes);
      if (hits.length) this._toggleAttachmentFlip(hits[0].object);
    };

    this.canvas.addEventListener("pointerdown", this._onDragStart);
    this.canvas.addEventListener("pointermove", this._onDragMove);
    this.canvas.addEventListener("pointerup", this._onDragEnd);
    this.canvas.addEventListener("pointercancel", this._onDragCancel);
    this.canvas.addEventListener("click", this._onHouseClick);
  }

  _toggleAttachmentFlip(mesh) {
    const isFlipped = this._attachmentFlipState[mesh.name];
    this._attachmentFlipState[mesh.name] = !isFlipped;
    const targetValue = isFlipped
      ? this._hoveredAttachmentMesh === mesh
        ? 0.1
        : 0
      : 1.0;
    this._animateFlip(mesh, targetValue);
  }

  _animateFlip(mesh, targetValue) {
    const proxy = this._flipProxies.get(mesh);
    const flipIdx = this._flipIndices.get(mesh);
    if (!proxy || flipIdx === undefined) return;
    gsap.killTweensOf(proxy);
    gsap.to(proxy, {
      value: targetValue,
      duration: this.experience.motionDuration(0.4),
      ease: "power2.inOut",
      onUpdate: () => {
        mesh.morphTargetInfluences[flipIdx] = proxy.value;
      },
    });
  }

  disableHouseDrag() {
    this.canvas.removeEventListener("pointerdown", this._onDragStart);
    this.canvas.removeEventListener("pointermove", this._onDragMove);
    this.canvas.removeEventListener("pointerup", this._onDragEnd);
    this.canvas.removeEventListener("pointercancel", this._onDragCancel);
    this.canvas.removeEventListener("click", this._onHouseClick);
    this._isDragging = false;
    this._inHouseMode = false;
    this._houseDragTargetX = HOUSE_POS.x;
    this._dragHint.classList.remove("visible");
    this._attachmentMeshes = [];
    this._hoveredAttachmentMesh = null;
    this._flipProxies = new Map();
    this._flipIndices = new Map();
    this._textsMesh = null;
  }

  goToMessages() {
    this._savedHouseDragX = this._houseDragTargetX;
    this._inHouseMode = false;
    this._inMessagesMode = true;
    this._dragHint.classList.remove("visible");
    this.focusOn("draft");
  }

  goBackToHouse() {
    this._inMessagesMode = false;
    this._messagesBackBtn.classList.remove("back-btn--visible");
    this._houseDragTargetX = this._savedHouseDragX ?? HOUSE_POS.x;
    this.focusOn("house", () => {
      this._inHouseMode = true;
      if (!dragHintDismissed) this._dragHint.classList.add("visible");
    });
  }

  goHome() {
    this.focusView = null;
    if (this._inMessagesMode) {
      this._inMessagesMode = false;
      this._messagesBackBtn.classList.remove("back-btn--visible");
    }
    if (this._inCharactersMode) this.disableCharacterInteraction();
    this.disableHouseDrag();
    this.cameraObj.locked = true;
    this.backBtn.classList.remove("back-btn--visible");

    const home = this.cameraObj.homePosition;
    const rotation = this.cameraObj.homeRotation;
    this.cameraObj.transitionFov(this.cameraObj.homeFov);

    const dest = this.cameraObj.zoomedDestination(home, rotation.x, rotation.y, rotation.z);
    gsap.to(this.cameraObj.instance.position, {
      x: dest.x,
      y: dest.y,
      z: dest.z,
      duration: this.experience.motionDuration(2),
      ease: "power2.inOut",
    });
    gsap.to(this.cameraObj.instance.rotation, {
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
      duration: this.experience.motionDuration(2),
      ease: "power2.inOut",
      onComplete: () => {
        this.camera.fov = this.cameraObj.homeFov;
        this.camera.updateProjectionMatrix();
        this.cameraObj.basePosition.copy(home);
        this.cameraObj.baseRotation.copy(rotation);
        this.cameraObj.mousePositionStrength = 0;
        this.cameraObj.mouseRotationStrength = 0;
        this.cameraObj.locked = false;
        this.inFocus = false;
        gsap.to(this.cameraObj, {
          mousePositionStrength: 3,
          mouseRotationStrength: 0.05,
          duration: this.experience.motionDuration(0.6),
          ease: "power2.out",
        });
      },
    });
  }

  _createHitboxMarkers() {

    const Y_OFFSETS = {
      Characters_Raycaster_Hitbox: -65,
    };

    this._markersContainer = document.createElement("div");
    this._markersContainer.id = "hitbox-markers";
    document.body.appendChild(this._markersContainer);
    gsap.set(this._markersContainer, { opacity: 0 });

    this._markerData = [];

    this.meshes.forEach((mesh) => {
      const label = ROOM_LABELS[mesh.name];
      if (!label) return;

      mesh.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const el = document.createElement("div");
      const labelAbove = mesh.name === "Characters_Raycaster_Hitbox";
      el.className = "hitbox-marker" + (labelAbove ? " hitbox-marker--label-above" : "");
      el.innerHTML = `<div class="hitbox-marker__diamond"></div><span class="hitbox-marker__label">${label}</span>`;
      this._markersContainer.appendChild(el);

      const yOffset = Y_OFFSETS[mesh.name] ?? 0;
      this._markerData.push({ center, el, yOffset });
    });
  }

  showHitboxMarkers() {
    if (!this._markerData?.length || this.inFocus) return;
    this._markersVisible = true;
    gsap.killTweensOf(this._markersContainer);
    gsap.to(this._markersContainer, {
      opacity: 1,
      duration: this.experience.motionDuration(0.3),
      ease: "power2.out",
    });
  }

  hideHitboxMarkers() {
    if (!this._markersContainer) return;
    this._markersVisible = false;
    gsap.killTweensOf(this._markersContainer);
    gsap.to(this._markersContainer, {
      opacity: 0,
      duration: this.experience.motionDuration(0.2),
      ease: "power2.in",
    });
  }

  _updateMarkerPositions() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const vec = new THREE.Vector3();

    this._markerData.forEach(({ center, el, yOffset }) => {
      vec.copy(center).project(this.camera);
      if (vec.z > 1) {
        el.style.visibility = "hidden";
        return;
      }
      el.style.visibility = "visible";
      el.style.left = `${(vec.x * 0.5 + 0.5) * width}px`;
      el.style.top = `${(-vec.y * 0.5 + 0.5) * height + yOffset}px`;
    });
  }

  toggleMusic() {
    const isNight = this.experience.world.room?.isNight ?? false;
    const targetVolume = isNight ? 0.25 : 1;

    if (this.musicPlaying) {
      this.musicPlaying = false;
      this.music.fade(this.music.volume(), 0, 1500);
      this.music.once("fade", () => {
        if (!this.musicPlaying) this.music.pause();
      });
    } else {
      this.musicPlaying = true;
      if (!this.music.playing()) {
        if (this.music.state() === "unloaded") this.music.load();
        this.music.volume(0);
        this.music.play();
      }
      this.music.fade(this.music.volume(), targetVolume, 1500);
    }
  }

  setDayNightVolume(isNight) {
    if (!this.musicPlaying) return;
    const targetVolume = isNight ? 0.25 : 1;
    this.music.fade(this.music.volume(), targetVolume, 1500);
  }

  update() {
    if (this.experience.world.projectDesk?.active) return;
    if (this._inHouseMode) {
      this.cameraObj.basePosition.x = THREE.MathUtils.lerp(
        this.cameraObj.basePosition.x,
        this._houseDragTargetX,
        0.08,
      );
    }

    if (this.inFocus) {
      if (this._inCharactersMode) {
        if (!Modal.anyOpen) {
          this.raycaster.setFromCamera(this.mouse.instance, this.camera);
          const hits = this.raycaster.intersectObjects(this._characterMeshes);
          document.body.style.cursor = hits.length ? "pointer" : "default";
          const hoverName = hits.length ? hits[0].object.name : null;
          if (hoverName !== this._currentHoveredName) {
            this._currentHoveredName = hoverName;
            const data = hoverName ? CHARACTER_DATA[hoverName] : null;
            if (data) this._showCursorTooltip(data.title);
            else this._hideCursorTooltip();
          }
        } else {
          if (this._currentHoveredName !== null) {
            this._currentHoveredName = null;
            this._hideCursorTooltip();
          }
          document.body.style.cursor = "default";
        }
        return;
      }

      if (this._inHouseMode) {
        this.raycaster.setFromCamera(this.mouse.instance, this.camera);
        const attachHits = this.raycaster.intersectObjects(
          this._attachmentMeshes,
        );
        const hovered = attachHits.length ? attachHits[0].object : null;

        if (hovered !== this._hoveredAttachmentMesh) {
          if (
            this._hoveredAttachmentMesh &&
            !this._attachmentFlipState[this._hoveredAttachmentMesh.name]
          ) {
            this._animateFlip(this._hoveredAttachmentMesh, 0);
          }
          if (hovered && !this._attachmentFlipState[hovered.name]) {
            this._animateFlip(hovered, 0.1);
          }
          this._hoveredAttachmentMesh = hovered;
        }

        let hoveredTexts = false;
        if (this._textsMesh) {
          const textsHit = this.raycaster.intersectObject(this._textsMesh);
          hoveredTexts = textsHit.length > 0;
        }

        document.body.style.cursor = Modal.anyOpen
          ? "default"
          : hovered || hoveredTexts
            ? "pointer"
            : this._isDragging
              ? "grabbing"
              : "grab";
      } else {
        document.body.style.cursor = "default";
      }
      return;
    }

    if (Modal.anyOpen) {
      document.body.style.cursor = "default";
      if (this._currentHoveredName !== null) {
        this._currentHoveredName = null;
        this._hideHoverLabel();
      }
      return;
    }

    this.raycaster.setFromCamera(this.mouse.instance, this.camera);
    const intersects = this.raycaster.intersectObjects(this.meshes);

    document.body.style.cursor = intersects.length ? "pointer" : "default";

    const hoverName = intersects.length ? intersects[0].object.name : null;
    if (hoverName !== this._currentHoveredName) {
      this._currentHoveredName = hoverName;
      const text = ROOM_LABELS[hoverName];
      if (text) this._showHoverLabel(text);
      else this._hideHoverLabel();
    }

    if (this._markersVisible) this._updateMarkerPositions();
  }
}
