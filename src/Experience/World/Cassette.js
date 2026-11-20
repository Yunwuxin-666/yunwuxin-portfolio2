import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cameraPosition, color as pigment, mix, mx_noise_float, normalWorld, positionWorld, vec3 } from "three/tsl";
import { printedTexture } from "./BookPaper";
import { sun, lamp } from "./HouseShadow";

function rectangle(x,y,w,h,r,Type=THREE.Shape) {
  const p=new Type();
  p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);
  p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);
  p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);p.closePath();
  return p;
}
function bore(x,y,r) {
  const path=new THREE.Path();
  path.absarc(x,y,r,0,Math.PI*2,true);
  return path;
}

export function addCassette(desk) {
  const shell=new THREE.Group();
  shell.name="Studio cassette";
  shell.position.set(-3.75,0.016,0.09);
  shell.rotation.y=0.22;
  desk.group.add(shell);
  const parts=new Map();
  const mode=desk.experience.world.room.uDayNight;
  const key=mix(vec3(sun),vec3(lamp).sub(positionWorld).normalize(),mode).normalize();
  const halfAngle=cameraPosition.sub(positionWorld).normalize().add(key).normalize();
  const grain=mx_noise_float(positionWorld.mul(215)).mul(0.006);
  // Model in face-on XY coordinates. Z measures height above the mat.
  function part(geometry,color,x=0,y=0,z=0,angle=0) {
    geometry.rotateZ(angle);geometry.translate(x,y,z);geometry.rotateX(-Math.PI/2);
    if(!parts.has(color)) parts.set(color,[]);
    parts.get(color).push(geometry.index?geometry.toNonIndexed():geometry);
  }
  function plate(shape,depth,bevel,color,z) {
    const geo=new THREE.ExtrudeGeometry(shape,{
      depth,bevelEnabled:bevel>0,bevelSegments:2,bevelSize:bevel,bevelThickness:bevel,curveSegments:28,
    });
    part(geo,color,0,0,z);
  }
  const base=rectangle(-0.85,-0.53,1.7,1.06,0.048);
  const guides=[-0.409,-0.255,0.255,0.409];
  const guideRadius=x=>Math.abs(x)>0.3?0.038:0.024;
  for(const x of guides) base.holes.push(bore(x,-0.436,guideRadius(x)));
  for(const x of [-0.363,0.363]) base.holes.push(bore(x,0.038,0.091));
  plate(base,0.042,0.008,"#313330",0.008);
  const middle=base.clone();
  plate(middle,0.013,0.002,"#191c1b",0.055);
  const lid=rectangle(-0.85,-0.53,1.7,1.06,0.048);
  for(const x of guides) lid.holes.push(bore(x,-0.436,guideRadius(x)));
  const chamber=()=>rectangle(-0.526,-0.120,1.052,0.316,0.148,THREE.Path);
  lid.holes.push(chamber());
  const screws=[[-0.769,0.447],[0.769,0.447],[-0.769,-0.444],[0.769,-0.444]];
  for(const [x,y] of screws) lid.holes.push(bore(x,y,0.041));
  plate(lid,0.084,0.009,"#494942",0.069);
  const label=rectangle(-0.702,-0.238,1.404,0.641,0.047);
  label.holes.push(chamber());
  plate(label,0.001,0.001,"#dfb55d",0.164);
  function washer(x,y,r,inner,z,depth,color) {
    const ring=new THREE.Shape();
    ring.absarc(x,y,r,0,Math.PI*2,false);
    ring.holes.push(bore(x,y,inner));
    plate(ring,depth,0.001,color,z);
  }
  for(const [n,x] of [-0.363,0.363].entries()) {
    washer(x,0.038,n?0.166:0.222,0.094,0.073,0.027,"#694132");
    const turns=n?3:7;
    for(let j=0;j<turns;j++) {
      const radius=0.143+j*0.012;
      washer(x,0.038,radius,radius-0.003,0.102,0.001,"#835f49");
    }
    washer(x,0.038,0.135,0.092,0.097,0.012,"#ad9d82");
    washer(x,0.038,0.126,0.088,0.108,0.018,"#e0d4b4");
    for(let i=0;i<6;i++){
      const a=(i+(n?0.25:0.05))*Math.PI/3;
      part(new THREE.BoxGeometry(0.032,0.038,0.020),"#ded1ac",x+0.084*Math.cos(a),0.038+0.084*Math.sin(a),0.115,a);
    }
  }
  part(new THREE.BoxGeometry(0.34,0.013,0.025),"#91614a",0,-0.077,0.092);
  for(let n=-3;n<=3;n++)
    part(new THREE.BoxGeometry(0.008,n%3?0.023:0.042,0.002),"#bbaa83",n*0.05,0.139,0.123);
  for(const [x,y] of screws) {
    washer(x,y,0.037,0.012,0.117,0.018,"#9d9786");
    for(const a of [0.64,2.21]) part(new THREE.BoxGeometry(0.042,0.007,0.002),"#403e39",x,y,0.138,a);
  }
  const head=new THREE.Shape();
  head.moveTo(-0.573,-0.514);head.lineTo(-0.485,-0.311);head.lineTo(0.485,-0.311);
  head.lineTo(0.573,-0.514);head.closePath();
  for(const x of guides) head.holes.push(bore(x,-0.436,guideRadius(x)));
  plate(head,0.012,0.007,"#3a3b35",0.164);
  for(const x of [-0.78,0.78]) for(let i=0;i<13;i++)
    part(new THREE.BoxGeometry(0.086,0.009,0.004),"#55554b",x,-0.24+i*0.036,0.158);
  const cast=[];
  for(const [color,geometries] of parts) {
    const metal=color==="#9d9786";
    const material=new THREE.MeshBasicNodeMaterial();
    const glint=normalWorld.dot(halfAngle).max(0).pow(metal?35:14).mul(metal?0.53:0.07);
    // Room post-processing crushes unlit dark plastic. Preserve the broad reflected
    // skylight on its face, while the bevel and screw surfaces catch the key light.
    const sky=normalWorld.y.max(0).mul(0.029).add(0.064);
    material.colorNode=pigment(color).add(sky).add(glint).add(grain).mul(desk.surfaceLight);
    const mesh=new THREE.Mesh(mergeGeometries(geometries),material);
    shell.add(mesh);
    geometries.forEach(g=>g.dispose());
    if(color==="#494942" || color==="#313330") cast.push(mesh);
  }
  const ink=printedTexture(870,105,ctx=>{
    ctx.fillStyle="#b55638";ctx.fillRect(0,6,870,7);ctx.fillRect(0,21,870,3);
    ctx.fillStyle="#433b2d";ctx.font="bold 59px Georgia";ctx.fillText("A",7,89);
    ctx.font="italic 48px Georgia";ctx.fillText("Studio mix",90,83);
    ctx.font="26px monospace";ctx.fillText("YUNWUXIN   /   01",504,80);
  });
  const imprint=new THREE.Mesh(new THREE.PlaneGeometry(1.31,0.156),desk.printMaterial({map:ink,transparent:true,depthWrite:false}));
  imprint.rotation.x=-Math.PI/2;imprint.position.set(0,0.167,-0.308);shell.add(imprint);
  const specs=printedTexture(960,65,ctx=>{
    ctx.fillStyle="#b85436";ctx.fillRect(0,51,960,6);ctx.fillRect(0,62,960,2);
    ctx.fillStyle="#514631";ctx.font="25px monospace";
    ctx.fillText("STEREO",9,35);ctx.fillText("NORMAL BIAS   I",375,35);ctx.fillText("C  60",860,35);
  });
  const legend=new THREE.Mesh(new THREE.PlaneGeometry(1.32,0.089),desk.printMaterial({map:specs,transparent:true,depthWrite:false}));
  legend.rotation.x=-Math.PI/2;legend.position.set(0,0.167,0.179);shell.add(legend);
  return cast;
}
