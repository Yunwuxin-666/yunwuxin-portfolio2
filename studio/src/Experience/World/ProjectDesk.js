import * as THREE from "three/webgpu";
import { color as inkColor, materialColor, mix, normalWorld, positionWorld, uniform, uv, vec3, vec4 } from "three/tsl";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import gsap from "gsap";
import { Modal } from "../Modal";
import { projects } from "./projects";
import { pageTexture } from "./BookPaper";
import { matBounds } from "./CuttingMat";
import { addCassette } from "./Cassette";
import { sun, lamp } from "./HouseShadow";
import "../../styles/project-desk.css";

const paperWidth = 2.68;
const paperDepth = 3.66;
const paperSurface = 0.083;

export class ProjectDesk {
  constructor(experience) {
    this.experience = experience;
    this.camera = experience.camera;
    this.canvas = experience.canvasElement;
    this.group = new THREE.Group();
    this.group.position.set(-2.35, matBounds.top-0.015, -24.80);
    this.group.rotation.y = 0.045;
    experience.scene.add(this.group);
    this.index = 0;
    this.phase = "room";
    this.pageRay = new THREE.Raycaster();
    this.shadowEdge=uniform(0);
    this.shadowWeight=uniform(0);
    const room = experience.world.room;
    const daylight = normalWorld.dot(vec3(sun)).clamp(0,1).mul(0.42).add(0.67);
    const lampDirection = vec3(lamp).sub(positionWorld).normalize();
    const lamplight = normalWorld.dot(lampDirection).clamp(0,1).mul(0.46).add(0.24);
    this.surfaceLight = mix(daylight.mul(vec3(1.03,0.98,0.89)), lamplight.mul(vec3(0.88,0.68,0.48)), room.uDayNight)
      .mul(room.projectedShade).mul(room.houseShade.onDesk);
    this.prints = experience.resources.items.studioPrints.image;
    this.modal = new Modal();
    this.modal._el.classList.add("project-letter");
    this.makeDesk();
    this.bind();
    document.fonts.load('28px "Homemade Apple"').then(() => {
      if (!this.flipping) this.setPages();
    });
  }

  solid(color, metalness = 0) {
    const material = new THREE.MeshBasicNodeMaterial();
    const highlight = normalWorld.dot(vec3(sun)).clamp(0,1).pow(14).mul(metalness*0.09);
    material.colorNode = inkColor(color).add(highlight).mul(this.surfaceLight);
    return material;
  }

  mesh(geometry, material, left, up, depth, parent = this.group) {
    const mesh = new THREE.Mesh(geometry,material);
    mesh.position.set(left,up,depth);
    parent.add(mesh);
    return mesh;
  }

  block(width,height,depth,color,left,up,front,radius = 0.025,parent = this.group) {
    return this.mesh(new RoundedBoxGeometry(width,height,depth,2,radius),this.solid(color),left,up,front,parent);
  }

  printMaterial(options) {
    const material = new THREE.MeshBasicNodeMaterial(options);
    material.colorNode = vec4(materialColor.rgb.mul(this.surfaceLight), materialColor.a);
    return material;
  }

  makeDesk() {
    const cover=this.block(5.43,0.023,3.73,"#495448",0,0.028,0,0.009);
    const paper=this.block(5.38,0.040,3.68,"#cfc3a8",0,0.060,0,0.009);
    this.block(0.10,0.009,0.38,"#883b30",0.47,0.041,1.94);
    this.pages = ["left","right"].map(side=>{
      const geometry = new THREE.PlaneGeometry(paperWidth,paperDepth,48,16);
      geometry.rotateX(-Math.PI/2);
      const points=geometry.attributes.position;
      for(let index=0;index<points.count;index++) {
        const distance=side==="left" ? 0.5-points.getX(index)/paperWidth : 0.5+points.getX(index)/paperWidth;
        const front = points.getZ(index)/paperDepth+0.5;
        const fold = 0.045*(1-Math.exp(-distance*32))*Math.exp(-distance*5);
        points.setY(index,fold+0.014*Math.sin(distance*Math.PI)+0.012*distance**5*front**3);
      }
      geometry.computeVertexNormals();
      const material=this.printMaterial({side:THREE.DoubleSide});
      const across=uv().x.add(side==="left"?-1:0);
      const distance=across.sub(this.shadowEdge).add(uv().y.sub(0.5).mul(0.12)).abs();
      const shade=distance.mul(-6).exp().mul(this.shadowWeight).oneMinus();
      material.colorNode=vec4(materialColor.rgb.mul(this.surfaceLight).mul(shade),materialColor.a);
      return this.mesh(geometry,material,side==="left"? -paperWidth/2:paperWidth/2,paperSurface,0);
    });
    const cassetteCasters=addCassette(this);
    const room=this.experience.world.room;
    room.cuttingMat.castShadows(room.model.getObjectByName("First_House_Baked"),[cover,paper,...cassetteCasters]);
  }


  setPages() {
    const project=projects[this.index];
    this.pages.forEach((page,index)=>{
      page.material.map?.dispose();
      page.material.map=pageTexture(project,this.index,index===0?"left":"right",this.prints);
      page.material.needsUpdate=true;
    });
    this.updateNavigation();
  }

  updateNavigation() {
    if(this.nav) {
      this.nav.querySelector("output").textContent=String(this.index+1).padStart(2,"0")+" / 05";
      this.previous.disabled=this.index===0;
      this.next.disabled=this.index===projects.length-1;
      if(this.active) this.canvas.setAttribute("aria-label",projects[this.index].title+"，按回车打开项目，左右方向键翻页");
    }
  }

  turn(direction) {
    const target=this.index+direction;
    if(this.phase!=="reading" || this.flipping || target<0 || target>=projects.length) return;
    if(this.experience.reducedMotion.matches){this.index=target;this.setPages();return;}
    this.flipping=true;
    const sourceIndex=direction>0?1:0;
    const source=this.pages[sourceIndex];
    const destination=this.pages[1-sourceIndex];
    const nextMap=side=>pageTexture(projects[target],target,side===0?"left":"right",this.prints);
    const frontMap=source.material.map;
    const landingMap=nextMap(1-sourceIndex);
    const backMap=landingMap.clone();
    backMap.repeat.x=-1;
    backMap.offset.x=1;
    const geometry=source.geometry.clone();
    const front=this.printMaterial({map:frontMap,side:THREE.FrontSide});
    const back=this.printMaterial({map:backMap,side:THREE.BackSide});
    const sheet=this.mesh(geometry,front,0,paperSurface+0.004,0);
    sheet.add(new THREE.Mesh(geometry,back));
    sheet.frustumCulled=false;
    sheet.children[0].frustumCulled=false;
    source.material.map=nextMap(sourceIndex);
    source.material.needsUpdate=true;
    this.nav.setAttribute("aria-busy","true");
    const rest=source.geometry.attributes.position;
    const vertices=geometry.attributes.position;
    const {widthSegments,heightSegments}=source.geometry.parameters;
    const segment=paperWidth/widthSegments;
    const state={progress:0};
    const curl=()=>{
      const progress=state.progress;
      const lift=Math.sin(Math.PI*progress);
      this.shadowEdge.value=direction*Math.cos(Math.PI*progress)-0.08*lift;
      this.shadowWeight.value=0.36*lift;
      for(let row=0;row<=heightSegments;row++){
        const along=row/heightSegments;
        let left=0, height=0;
        for(let column=0;column<=widthSegments;column++){
          const offset=row*(widthSegments+1)+(direction>0?column:widthSegments-column);
          if(column>0){
            const span=(column-0.5)/widthSegments;
            const lag=1.4*(span-0.42)+0.85*(along-0.45)*span;
            const angle=Math.PI*progress+lift*lag;
            left+=segment*Math.cos(angle);
            height+=segment*Math.sin(angle);
          }
          const span=column/widthSegments;
          const depth=rest.getZ(offset)-0.09*lift*span**2*(0.35+along);
          vertices.setXYZ(offset,direction*left,Math.max(0,height)+rest.getY(offset),depth);
        }
      }
      vertices.needsUpdate=true;
      geometry.computeVertexNormals();
    };
    curl();
    gsap.to(state,{
      progress:1,duration:0.92,ease:"sine.inOut",onUpdate:curl,
      onComplete:()=>{
        destination.material.map.dispose();
        destination.material.map=landingMap;
        destination.material.needsUpdate=true;
        sheet.removeFromParent();
        geometry.dispose();front.dispose();back.dispose();frontMap.dispose();backMap.dispose();
        this.index=target;
        this.flipping=false;
        this.shadowWeight.value=0;
        this.nav.removeAttribute("aria-busy");
        this.updateNavigation();
      },
    });
  }


  bind() {
    const room=this.canvas.closest("main");
    this.openButton=document.createElement("button");
    this.openButton.className="desk-entry";
    this.openButton.textContent="翻开项目册  ↗";
    room.append(this.openButton);
    this.nav=document.createElement("nav");
    this.nav.className="desk-navigation";
    this.nav.setAttribute("aria-label","项目册");
    this.nav.hidden=true;
    this.nav.innerHTML='<button aria-label="上一页">←</button><output aria-live="polite"></output><button aria-label="下一页">→</button><button aria-label="合上项目册">合上</button>';
    room.append(this.nav);
    [this.previous,this.next,this.closeButton]=this.nav.querySelectorAll("button");
    this.openButton.onclick=()=>this.open();
    this.closeButton.onclick=()=>this.close();
    this.previous.onclick=()=>this.turn(-1);
    this.next.onclick=()=>this.turn(1);
    this.roomLabel=this.canvas.getAttribute("aria-label");
    this.roomShortcuts=this.canvas.getAttribute("aria-keyshortcuts");
    this.setPages();
    let down, handledTouch=false;
    this.canvas.addEventListener("pointerdown",event=>{
      handledTouch=false;
      down=event.isPrimary?[event.clientX,event.clientY]:null;
    });
    this.canvas.addEventListener("pointercancel",()=>{down=null;});
    this.canvas.addEventListener("pointerup",event=>{
      if(!down || event.pointerType==="mouse" || Modal.anyOpen) return;
      const dx=event.clientX-down[0], dy=event.clientY-down[1];
      if(this.phase==="reading" && Math.abs(dx)>42 && Math.abs(dx)>1.5*Math.abs(dy)) {
        this.turn(dx<0?1:-1);
      } else if(Math.hypot(dx,dy)<=9 && this.hitsPage(event.clientX,event.clientY) && (this.active || this.canOpen())) {
        if(this.active) this.showProject(); else this.open();
      } else {
        return;
      }
      handledTouch=true;
      down=null;
    });
    this.canvas.addEventListener("pointermove",event=>{
      if(this.phase==="reading" && !Modal.anyOpen) {
        this.canvas.style.cursor=this.hitsPage(event.clientX,event.clientY)?"pointer":"default";
      }
    });
    this.canvas.addEventListener("click",event=>{
      if(!down || Math.hypot(event.clientX-down[0],event.clientY-down[1])>9 || Modal.anyOpen) return;
      if(!this.hitsPage(event.clientX,event.clientY)) return;
      if(!this.active && !this.canOpen()) return;
      event.stopImmediatePropagation();
      if(this.active) this.showProject(); else this.open();
    },true);
    this.canvas.addEventListener("touchend",event=>{
      if(!handledTouch) return;
      handledTouch=false;
      if(event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
    },{capture:true,passive:false});
    document.addEventListener("keydown",event=>{
      if(!this.active || Modal.anyOpen) return;
      if(event.target===this.canvas && (event.key==="Enter" || event.key===" ")) {
        event.preventDefault();event.stopImmediatePropagation();
        if(!event.repeat) this.showProject();
        return;
      }
      if(!["ArrowLeft","ArrowRight","Escape"].includes(event.key)) return;
      event.stopImmediatePropagation();event.preventDefault();
      if(event.key==="Escape") this.close(); else this.turn(event.key==="ArrowLeft"?-1:1);
    },true);
    window.addEventListener("resize",()=>{
      if(this.phase==="reading" || this.phase==="entering") this.approach(0);
    });
  }

  get active() {
    return this.phase!=="room";
  }

  hitsPage(x,y) {
    const bounds=this.canvas.getBoundingClientRect();
    const pointer=new THREE.Vector2((x-bounds.left)/bounds.width*2-1,1-(y-bounds.top)/bounds.height*2);
    this.pageRay.setFromCamera(pointer,this.camera.instance);
    return this.pageRay.intersectObjects(this.pages,false).length>0;
  }

  canOpen() {
    return !this.camera.locked;
  }

  approach(duration) {
    const camera=this.camera.instance;
    const portrait=camera.aspect<0.75;
    const width=portrait ? 6.62 : 7.15;
    const distance=Math.max(5.85,width/camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    const end=new THREE.Vector3(-2.80,distance-1,-24.65);
    const faceDown=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
    this.moveCamera(end,faceDown,duration,()=>{this.phase="reading";});
  }

  moveCamera(end,orientation,duration,finish) {
    this.cameraMove?.kill();
    const camera=this.camera.instance;
    const start=camera.position.clone(), from=camera.quaternion.clone();
    const lift=Math.min(2.4,start.distanceTo(end)*0.13);
    const book=this.group.position.clone();
    book.y+=paperSurface;
    // Track a point in the scene as the desk recedes. Simply interpolating the
    // two camera angles points at the floor halfway through a long return.
    function focalPoint(eye,rotation) {
      const forward=new THREE.Vector3(0,0,-1).applyQuaternion(rotation);
      const depth=Math.max(1,book.clone().sub(eye).dot(forward));
      return eye.clone().addScaledVector(forward,depth);
    }
    const nearFocus=focalPoint(start,from), farFocus=focalPoint(end,orientation);
    const aim=new THREE.Vector3(), forward=new THREE.Vector3(), correction=new THREE.Quaternion();
    const progress={t:0};
    const draw=()=>{
      const t=progress.t;
      camera.position.lerpVectors(start,end,t);
      camera.position.y+=4*t*(1-t)*lift;
      camera.quaternion.slerpQuaternions(from,orientation,t);
      aim.lerpVectors(nearFocus,farFocus,t*t*(3-2*t)).sub(camera.position).normalize();
      forward.set(0,0,-1).applyQuaternion(camera.quaternion);
      camera.quaternion.premultiply(correction.setFromUnitVectors(forward,aim));
    };
    if(!duration) {progress.t=1;draw();finish();return;}
    this.cameraMove=gsap.to(progress,{t:1,duration,ease:"sine.inOut",onUpdate:draw,onComplete:finish});
  }

  open() {
    if(this.active || Modal.anyOpen || !this.canOpen()) return;
    this.phase="entering";
    this.savedPosition=this.camera.instance.position.clone();
    this.savedRotation=this.camera.instance.quaternion.clone();
    this.returnFocus=document.activeElement===this.openButton?this.openButton:this.canvas;
    this.camera.locked=true;
    this.openButton.hidden=true;
    this.nav.hidden=false;
    document.body.classList.add("reading-projects");
    this.updateNavigation();
    this.canvas.setAttribute("aria-keyshortcuts","Enter Space ArrowLeft ArrowRight Escape");
    this.canvas.focus({preventScroll:true});
    this.approach(this.experience.motionDuration(1.1));
  }

  close() {
    if(!this.active || this.phase==="leaving" || Modal.anyOpen) return;
    this.phase="leaving";
    this.canvas.style.cursor="";
    this.nav.inert=true;
    this.nav.classList.add("leaving");
    this.moveCamera(this.savedPosition,this.savedRotation,this.experience.motionDuration(1.25),()=>{
      this.phase="room";
      this.nav.hidden=true;
      this.nav.inert=false;
      this.nav.classList.remove("leaving");
      this.openButton.hidden=false;
      this.canvas.setAttribute("aria-label",this.roomLabel);
      this.canvas.setAttribute("aria-keyshortcuts",this.roomShortcuts);
      document.body.classList.remove("reading-projects");
      this.camera.locked=false;
      this.returnFocus.focus({preventScroll:true});
    });
  }

  showProject() {
    if(this.phase!=="reading" || this.flipping || Modal.anyOpen) return;
    const project=projects[this.index];
    this.modal.openHTML(project.title,`<em>${project.english.replace("\n"," ")}</em><strong>${project.subtitle}</strong>${project.body}`);
  }
}
