import * as THREE from "three/webgpu";
import {
  texture,
  uv,
  positionWorld,
  normalWorld,
  vec2,
  vec3,
  vec4,
  select,
  uniform,
  time,
  mx_noise_float,
  mix,
} from "three/tsl";
import gsap from "gsap";
import { Experience } from "../Experience";
import { scheduleCover, schedulePrint } from "./StudioSchedule";
import { deskDraft } from "./DeskDraft";
import { CuttingMat, matBounds } from "./CuttingMat";
import { houseShadow, houseShiftX } from "./HouseShadow";
import {
  spotProjectionMatrixUniform,
  spotProjectionMatrixUniform2,
  spotProjectionMatrixUniform3,
} from "./Environment";

function configureAtlas(map) {
  map.flipY = false;
  map.generateMipmaps = !map.isCompressedTexture;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.anisotropy = 16;
}

export class Room {
  constructor() {
    this.experience = Experience.getInstance();
    this.model = this.experience.resources.items.room.scene;
    const houseAtlas = this.model.getObjectByName("First_House_Baked");
    const positions = houseAtlas.geometry.getAttribute("position");
    const houseVertices=new Uint8Array(positions.count);
    const point = new THREE.Vector3();
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).add(houseAtlas.position);
      if (point.x > -3.5 && point.x < 1.1 && point.z > -28.2 && point.z < -24.1 && point.y > -1.5) {
        houseVertices[index]=1;
        positions.setX(index, positions.getX(index) + houseShiftX);
      } else if (point.x > 2 && point.z > -28 && point.z < -25.5 && point.y > -1.5 && point.y < -0.9) {
        positions.setXYZ(index, positions.getX(index)-6, positions.getY(index), positions.getZ(index)-0.85);
      }
    }
    positions.needsUpdate = true;
    const indices = houseAtlas.geometry.index.array;
    const retained = [];
    for (let triangle = 0; triangle < indices.length; triangle += 3) {
      point.fromBufferAttribute(positions, indices[triangle]).add(houseAtlas.position);
      const oldSignature = point.z < -30.4 && point.x > -9.8 && point.x < -5.5
        && point.y > 1.7 && point.y < 4.3;
      if (!oldSignature) retained.push(indices[triangle], indices[triangle+1], indices[triangle+2]);
    }
    houseAtlas.geometry.setIndex(retained);
    houseAtlas.geometry.computeBoundingSphere();
    for (const card of ["Ninth_Attachment_Patricia", "Ninth_Attachment_John"]) {
      this.model.getObjectByName(card)?.removeFromParent();
    }
    this.goboTex = this.experience.resources.items.goboTexture;
    this.goboTex.colorSpace = THREE.NoColorSpace;
    this.goboTex.generateMipmaps = true;
    this.goboTex.minFilter = THREE.LinearMipmapLinearFilter;
    this.goboTex.anisotropy = 16;
    this.goboTex.needsUpdate = true;
    this.init(houseAtlas,houseVertices);
  }

  init(houseMesh,houseVertices) {
    this.uGoboStrength = uniform(0.5);
    const uGoboStrength = this.uGoboStrength;
    const uSwayAmount = uniform(0.008);
    const uSwaySpeed = uniform(this.experience.reducedMotion.matches ? 0 : 0.2);
    const uGoboBlur = uniform(0.0);
    this.uDayNight = uniform(0.0);
    this.isNight = false;

    const items = this.experience.resources.items;
    const ordinalTextureMap = {
      First: items.firstTexture,
      Second: items.secondTexture,
      Third: items.thirdTexture,
      Fourth: items.fourthTexture,
      Fifth: items.fifthTexture,
      Sixth: items.sixthTexture,
      Seventh: items.seventhTexture,
      Eighth: items.eighthTexture,
    };
    this.nightSamplers = {};
    for (const [ordinal, day] of Object.entries(ordinalTextureMap)) {
      configureAtlas(day);
      // A distinct binding per atlas lets night maps arrive without rebuilding shaders.
      const pixel = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
      pixel.colorSpace = THREE.SRGBColorSpace;
      configureAtlas(pixel);
      pixel.needsUpdate = true;
      this.nightSamplers[ordinal] = texture(pixel);
    }

    const blurGobo = (centerUV) => {
      const r = uGoboBlur;
      const rn = uGoboBlur.mul(-1.0);
      // 3x3 Gaussian kernel: corners=1/16, edges=2/16, center=4/16
      return texture(this.goboTex, centerUV.add(vec2(rn, rn)))
        .rgb.mul(0.0625)
        .add(texture(this.goboTex, centerUV.add(vec2(0.0, rn))).rgb.mul(0.125))
        .add(texture(this.goboTex, centerUV.add(vec2(r, rn))).rgb.mul(0.0625))
        .add(texture(this.goboTex, centerUV.add(vec2(rn, 0.0))).rgb.mul(0.125))
        .add(texture(this.goboTex, centerUV).rgb.mul(0.25))
        .add(texture(this.goboTex, centerUV.add(vec2(r, 0.0))).rgb.mul(0.125))
        .add(texture(this.goboTex, centerUV.add(vec2(rn, r))).rgb.mul(0.0625))
        .add(texture(this.goboTex, centerUV.add(vec2(0.0, r))).rgb.mul(0.125))
        .add(texture(this.goboTex, centerUV.add(vec2(r, r))).rgb.mul(0.0625));
    };

    const t = time.mul(uSwaySpeed);

    const clipPos = spotProjectionMatrixUniform.mul(vec4(positionWorld, 1.0));
    const projUV = clipPos.xy.div(clipPos.w).mul(0.5).add(0.5);
    const inFrustum = clipPos.w
      .greaterThan(0.0)
      .and(projUV.x.greaterThanEqual(0.0))
      .and(projUV.x.lessThanEqual(1.0))
      .and(projUV.y.greaterThanEqual(0.0))
      .and(projUV.y.lessThanEqual(1.0));
    const offsetX = mx_noise_float(
      vec3(projUV.x.mul(2.0), projUV.y.mul(2.0), t),
    );
    const offsetY = mx_noise_float(
      vec3(
        projUV.x.mul(2.0).add(5.2),
        projUV.y.mul(2.0).add(1.3),
        t.add(2.7),
      ),
    );
    const areaVariation = mx_noise_float(vec3(projUV.x, projUV.y, 0.0))
      .abs()
      .mul(1.5)
      .add(0.3);
    const distortedUV = projUV.add(
      vec2(offsetX, offsetY).mul(uSwayAmount).mul(areaVariation),
    );
    const goboSample = select(inFrustum, blurGobo(distortedUV), vec3(1.0));
    const softGobo = goboSample.oneMinus().mul(uGoboStrength).oneMinus();

    const clipPos2 = spotProjectionMatrixUniform2.mul(
      vec4(positionWorld, 1.0),
    );
    const projUV2 = clipPos2.xy.div(clipPos2.w).mul(0.5).add(0.5);
    const inFrustum2 = clipPos2.w
      .greaterThan(0.0)
      .and(projUV2.x.greaterThanEqual(0.0))
      .and(projUV2.x.lessThanEqual(1.0))
      .and(projUV2.y.greaterThanEqual(0.0))
      .and(projUV2.y.lessThanEqual(1.0));
    const offsetX2 = mx_noise_float(
      vec3(projUV2.x.mul(2.0).add(9.1), projUV2.y.mul(2.0).add(4.7), t),
    );
    const offsetY2 = mx_noise_float(
      vec3(
        projUV2.x.mul(2.0).add(14.3),
        projUV2.y.mul(2.0).add(5.9),
        t.add(2.7),
      ),
    );
    const areaVariation2 = mx_noise_float(
      vec3(projUV2.x.add(7.3), projUV2.y.add(3.1), 0.0),
    )
      .abs()
      .mul(1.5)
      .add(0.3);
    const distortedUV2 = projUV2.add(
      vec2(offsetX2, offsetY2).mul(uSwayAmount).mul(areaVariation2),
    );
    const goboSample2 = select(inFrustum2, blurGobo(distortedUV2), vec3(1.0));
    const softGobo2 = goboSample2.oneMinus().mul(uGoboStrength).oneMinus();

    const clipPos3 = spotProjectionMatrixUniform3.mul(
      vec4(positionWorld, 1.0),
    );
    const projUV3 = clipPos3.xy.div(clipPos3.w).mul(0.5).add(0.5);
    const inFrustum3 = clipPos3.w
      .greaterThan(0.0)
      .and(projUV3.x.greaterThanEqual(0.0))
      .and(projUV3.x.lessThanEqual(1.0))
      .and(projUV3.y.greaterThanEqual(0.0))
      .and(projUV3.y.lessThanEqual(1.0));
    const offsetX3 = mx_noise_float(
      vec3(projUV3.x.mul(2.0).add(17.5), projUV3.y.mul(2.0).add(8.3), t),
    );
    const offsetY3 = mx_noise_float(
      vec3(
        projUV3.x.mul(2.0).add(22.1),
        projUV3.y.mul(2.0).add(11.7),
        t.add(2.7),
      ),
    );
    const areaVariation3 = mx_noise_float(
      vec3(projUV3.x.add(13.9), projUV3.y.add(6.4), 0.0),
    )
      .abs()
      .mul(1.5)
      .add(0.3);
    const distortedUV3 = projUV3.add(
      vec2(offsetX3, offsetY3).mul(uSwayAmount).mul(areaVariation3),
    );
    const goboSample3 = select(inFrustum3, blurGobo(distortedUV3), vec3(1.0));
    const softGobo3 = goboSample3.oneMinus().mul(uGoboStrength).oneMinus();
    this.projectedShade = softGobo.min(softGobo2).min(softGobo3);
    const wallCalendar = schedulePrint();
    const draft = deskDraft(items.studioPrints.image);
    const paperLight = mix(vec3(0.92,0.86,0.75),vec3(0.19,0.13,0.08),this.uDayNight);
    this.cuttingMat = new CuttingMat();
    this.houseShade=houseShadow(houseMesh,houseVertices,this.uDayNight);

    this.model.traverse((obj) => {
      if (!obj.isMesh) return;

      const old = obj.material;
      const mat = new THREE.MeshBasicNodeMaterial();

      const ordinal = obj.name.split("_")[0];
      const ordinalTex = ordinalTextureMap[ordinal];
      const night = this.nightSamplers[ordinal];
      const alphaTest = ordinal === "Fourth" ? 0.5 : 0.2;
      if (obj.name === "Ninth_Attachment_Texts") {
        const pageUV = vec2(uv().y.sub(0.2599).div(0.7382), uv().x.sub(0.002).div(0.7381));
        const sheet = texture(draft, pageUV);
        mat.colorNode = sheet.rgb.mul(paperLight).mul(this.projectedShade);
        mat.opacityNode = sheet.a;
        mat.transparent = true;
        mat.alphaTest = 0.015;
      } else if (ordinalTex) {
        const daySample = texture(ordinalTex, uv());
        const nightSample = night.sample(uv());
        let blended = mix(daySample, nightSample, this.uDayNight);
        if (obj.name === "Second_Photos_Baked") {
          const pageUV = vec2(positionWorld.x.sub(13.1918).div(4.5587),positionWorld.y.sub(1.6207).div(5.0484));
          const onPaper = positionWorld.z.add(30.6463).abs().lessThan(0.008)
            .and(pageUV.x.greaterThan(-0.001)).and(pageUV.x.lessThan(1.001))
            .and(pageUV.y.greaterThan(-0.001)).and(pageUV.y.lessThan(1.001));
          blended = select(onPaper,vec4(texture(wallCalendar,pageUV).rgb.mul(paperLight),1),blended);
          // The cover photo occupies its own chart beside the calendar sheet.
          const coverUV = vec2(uv().x.sub(0.3211).div(0.2931),uv().y.sub(0.7661).div(0.2318));
          const onCover = coverUV.x.greaterThan(-0.0005).and(coverUV.x.lessThan(1.0005))
            .and(coverUV.y.greaterThan(-0.0005)).and(coverUV.y.lessThan(1.0005));
          const salonPrint=texture(items.studioPrints,vec2(coverUV.x.mul(0.329).add(0.335),coverUV.y.mul(-0.39).add(0.935)));
          const printTone=salonPrint.rgb.dot(vec3(0.213,0.715,0.072));
          const printInk=mix(printTone.mul(vec3(1.10,0.93,0.70)),salonPrint.rgb,0.52).add(vec3(0.07,0.055,0.042));
          blended = select(onCover,vec4(printInk.mul(paperLight),1),blended);
        }
        if (obj.name === "Eighth_Decor_Baked") {
          const bookUV=vec2(uv().y.sub(0.78473).div(0.21333),uv().x.sub(0.00195).div(0.32206));
          const cover=bookUV.x.greaterThan(-0.0005).and(bookUV.x.lessThan(1.0005))
            .and(bookUV.y.greaterThan(-0.0005)).and(bookUV.y.lessThan(1.0005));
          blended=select(cover,vec4(texture(scheduleCover(),bookUV).rgb.mul(paperLight),1),blended);
        }
        if (obj.name === "First_House_Baked") {
          const {left,right,top,back,front}=matBounds;
          const matUV=vec2(positionWorld.x.sub(left).div(right-left),positionWorld.z.negate().add(front).div(front-back));
          const onMat=positionWorld.y.sub(top).abs().lessThan(0.002)
            .and(normalWorld.y.greaterThan(0.90))
            .and(matUV.x.greaterThan(-0.001)).and(matUV.x.lessThan(1.001))
            .and(matUV.y.greaterThan(-0.001)).and(matUV.y.lessThan(1.001));
          const [day,night]=this.cuttingMat.maps;
          const matColor=mix(texture(day,matUV).rgb,texture(night,matUV).rgb.mul(vec3(0.27,0.19,0.13)),this.uDayNight);
          blended=select(onMat,vec4(matColor.mul(this.houseShade.onDesk),1),blended);
        }
        if (obj.name === "Third_Desk_Baked") {
          // Restore the grain underneath the original baked shadow.
          const inStrip=u=>u.greaterThan(0.188).and(u.lessThan(0.337))
            .and(uv().y.greaterThan(0.719)).and(uv().y.lessThan(0.774))
            .and(positionWorld.y.add(1.426).abs().lessThan(0.004));
          const donorUV=vec2(uv().x.sub(0.258).mul(0.52).add(0.409),uv().y);
          const grain=mix(texture(ordinalTex,donorUV),night.sample(donorUV),this.uDayNight);
          const restored=select(inStrip(uv().x),grain,blended);
          blended=select(positionWorld.y.add(1.426).abs().lessThan(0.004),vec4(restored.rgb.mul(this.houseShade.onDesk),restored.a),restored);
        }
        if (ordinal === "Fifth") {
          // Remove the old silhouette from both UV islands before applying the
          // model-derived projection in world coordinates.
          const oldWallRegion = (u) => u.mul(1280).greaterThan(575).and(u.mul(1280).lessThan(634))
            .and(uv().y.mul(1280).greaterThan(332)).and(uv().y.mul(1280).lessThan(360))
            .and(positionWorld.z.add(30.6772).abs().lessThan(0.02));
          const cleanDayWall = (u) => texture(ordinalTex,vec2(u.mul(-0.24).add(710/1280),uv().y));
          const repaired = select(oldWallRegion(uv().x),cleanDayWall(uv().x),daySample);
          const restored = mix(repaired,nightSample,this.uDayNight);
          blended = select(positionWorld.z.add(30.6772).abs().lessThan(0.02),vec4(restored.rgb.mul(this.houseShade.onWall),restored.a),restored);
          const coord = uv().mul(4096);
          const left = 2005, right = 2160, top = 1168, bottom = 1258;
          const horizontal = coord.x.sub(left).div(right-left);
          const vertical = coord.y.sub(top).div(bottom-top);
          const within = horizontal.greaterThanEqual(0).and(horizontal.lessThanEqual(1))
            .and(vertical.greaterThanEqual(0)).and(vertical.lessThanEqual(1));
          const wallColor = (map) => mix(
            map.sample(vec2(left/4096, uv().y)),
            map.sample(vec2(right/4096, uv().y)),
            horizontal.clamp(0,1),
          );
          const wall = mix(wallColor(daySample), wallColor(night), this.uDayNight);
          const script = texture(items.portfolioLettering, vec2(horizontal.oneMinus(), vertical).clamp(0,1));
          const ink = script.rgb.mul(this.uDayNight.mul(-0.85).add(1));
          blended = select(within, vec4(mix(wall.rgb, ink, script.a), wall.a), blended);
        }
        mat.colorNode = blended.rgb.mul(this.projectedShade);
        mat.opacityNode = blended.a;
        mat.transparent = true;
        mat.alphaTest = alphaTest;
      } else if (old.map) {
        mat.colorNode = texture(old.map, uv()).mul(this.projectedShade);
      } else {
        mat.color.copy(old.color);
      }

      old.dispose();
      obj.material = mat;
    });

    this.experience.scene.add(this.model);

    const folder = this.experience.gui.addFolder("Room Gobo Projection");
    folder
      .add({ strength: 0.5 }, "strength", 0, 1, 0.01)
      .name("Shadow Strength")
      .onChange((v) => {
        uGoboStrength.value = v;
      });
    folder
      .add({ swayAmount: 0.008 }, "swayAmount", 0, 0.03, 0.001)
      .name("Sway Amount")
      .onChange((v) => {
        uSwayAmount.value = v;
      });
    folder
      .add({ swaySpeed: 0.2 }, "swaySpeed", 0, 1, 0.01)
      .name("Sway Speed")
      .onChange((v) => {
        uSwaySpeed.value = v;
      });
    folder
      .add({ softness: 0.0 }, "softness", 0, 0.002, 0.0001)
      .name("Shadow Softness")
      .onChange((v) => {
        uGoboBlur.value = v;
      });
    folder
      .add({ blend: 0.0 }, "blend", 0, 1, 0.01)
      .name("Day/Night Blend")
      .onChange(async (v) => {
        await this.prepareNight();
        this.uDayNight.value = v;
      });
  }

  async prepareNight() {
    if (this.nightReady) return;
    const resources = this.experience.resources;
    await resources.loadNight();
    if (this.nightReady) return;
    for (const [ordinal, sampler] of Object.entries(this.nightSamplers)) {
      const map = resources.items[ordinal.toLowerCase() + "NightTexture"];
      configureAtlas(map);
      sampler.value.dispose();
      sampler.value = map;
    }
    this.nightReady = true;
  }

  toggleDayNight() {
    this.isNight = !this.isNight;
    gsap.to(this.uDayNight, {
      value: this.isNight ? 1 : 0,
      duration: this.experience.motionDuration(1.5),
      ease: "power2.inOut",
    });
    gsap.to(this.experience.renderer.uContrast, {
      value: this.isNight ? 1.0 : 1.2,
      duration: this.experience.motionDuration(1.5),
      ease: "power2.inOut",
    });
    gsap.to(this.uGoboStrength, {
      value: this.isNight ? 0 : 0.5,
      duration: this.experience.motionDuration(1.5),
      ease: "power2.inOut",
    });
    this.experience.world.butterflies?.forEach((b) => {
      gsap.to(b.uOpacity, {
        value: this.isNight ? 0 : 1,
        duration: this.experience.motionDuration(1.5),
        ease: "power2.inOut",
      });
    });
    const fireflies = this.experience.world.fireflies;
    if (fireflies) {
      gsap.to(fireflies.uOpacity, {
        value: this.isNight ? 1 : 0,
        duration: this.experience.motionDuration(1.5),
        ease: "power2.inOut",
      });
    }
  }

  resize() {}
  update() {}
  destroy() {}
}
