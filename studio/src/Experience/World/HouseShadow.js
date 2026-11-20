import { CanvasTexture, LinearFilter, Vector3 } from "three/webgpu";
import { mix, positionWorld, select, texture, vec2, vec3, float } from "three/tsl";

export const houseShiftX=3.8;
// Both receivers meet along the back edge of the worktop, in world units.
const deskY=-1.426, wallZ=-30.6772, left=-15, spanX=22;
const deskDepth=10, wallHeight=6;
const width=1024, deskRows=448, wallRows=256, height=deskRows+wallRows;
export const sun=new Vector3(52,65,73).normalize();
export const lamp=new Vector3(11.3,3.85,-27.5);

// Clip triangles crossing the point light's plane before the perspective divide.
function inFrontOfLamp(triangle,axis) {
  const limit=lamp[axis]-0.025, output=[];
  for(let i=0;i<3;i++) {
    const a=triangle[i], b=triangle[(i+1)%3];
    if(a[axis]<=limit) output.push(a);
    if((a[axis]<=limit)!==(b[axis]<=limit)) output.push(a.clone().lerp(b,(limit-a[axis])/(b[axis]-a[axis])));
  }
  return output;
}

export function houseShadow(mesh,houseVertices,dayNight) {
  mesh.updateWorldMatrix(true,false);
  const geometry=mesh.geometry, vertices=geometry.attributes.position, indices=geometry.index.array;
  const points=Array.from(houseVertices,(used,i)=>used?new Vector3().fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld):null);
  const faces=[];
  for(let i=0;i<indices.length;i+=3) {
    const a=points[indices[i]], b=points[indices[i+1]], c=points[indices[i+2]];
    if(a && b && c) faces.push([a,b,c]);
  }
  const canvas=document.createElement("canvas");
  canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext("2d",{alpha:false});
  for(const wall of [false,true]) {
    const axis=wall?"z":"y", other=wall?"y":"z", plane=wall?wallZ:deskY;
    const rows=wall?wallRows:deskRows, start=wall?deskRows:0;
    ctx.save();ctx.beginPath();ctx.rect(0,start,width,rows);ctx.clip();
    for(const night of [false,true]) {
      function project(p) {
        const distance=p[axis]-plane;
        const scale=night?distance/(lamp[axis]-p[axis]):distance/sun[axis];
        const x=p.x-scale*(night?lamp.x-p.x:sun.x);
        const otherCoord=p[other]-scale*(night?lamp[other]-p[other]:sun[other]);
        return [(x-left)/spanX*width,start+(wall?1-(otherCoord-deskY)/wallHeight:(otherCoord-wallZ)/deskDepth)*rows];
      }
      const screen=new Map();
      const projected=p=>{
        if(!screen.has(p)) screen.set(p,project(p));
        return screen.get(p);
      };
      const outline=new Path2D();
      for(const face of faces) {
        const polygon=night && face.some(p=>p[axis]>=lamp[axis]-0.025)?inFrontOfLamp(face,axis):face;
        if(polygon.length<3) continue;
        const xy=polygon.map(projected);
        const [a,b,c]=xy;
        // Every polygon must have the same winding to get a union of silhouettes.
        if((b[0]-a[0])*(c[1]-a[1])<(b[1]-a[1])*(c[0]-a[0])) xy.reverse();
        outline.moveTo(...xy[0]);
        for(let i=1;i<xy.length;i++) outline.lineTo(...xy[i]);
        outline.closePath();
      }
      ctx.globalCompositeOperation="lighter";
      ctx.filter="blur("+(night?3:1.8)+"px)";
      ctx.fillStyle=night?"#00ff00":"#ff0000";
      ctx.fill(outline);
    }
    ctx.restore();
  }
  const mask=new CanvasTexture(canvas);
  mask.flipY=false;
  mask.generateMipmaps=false;
  mask.minFilter=LinearFilter;
  const read=(x,row,channel)=>{
    const u=x.sub(left).div(spanX);
    const inside=u.greaterThan(0).and(u.lessThan(1)).and(row.greaterThan(0)).and(row.lessThan(1));
    return select(inside,texture(mask,vec2(u,row))[channel],float(0));
  };
  // Project raised objects such as the mat down onto the same receiving plane.
  const h=positionWorld.y.sub(deskY);
  const daylightPoint=positionWorld.sub(vec3(sun.x/sun.y,1,sun.z/sun.y).mul(h));
  const lampRay=positionWorld.sub(vec3(lamp.x,lamp.y,lamp.z));
  const nightPoint=positionWorld.add(lampRay.mul(h.div(lampRay.y.negate().max(0.025))));
  const groundRow=p=>p.z.sub(wallZ).div(deskDepth).clamp(0.001,0.999).mul(deskRows/height);
  const strength=(day,night)=>mix(day.mul(0.39),night.mul(0.46),dayNight).oneMinus();
  const onDesk=strength(read(daylightPoint.x,groundRow(daylightPoint),"r"),read(nightPoint.x,groundRow(nightPoint),"g"));
  const wallRow=positionWorld.y.sub(deskY).div(wallHeight).oneMinus().clamp(0.001,0.999).mul(wallRows/height).add(deskRows/height);
  const onWall=strength(read(positionWorld.x,wallRow,"r"),read(positionWorld.x,wallRow,"g"));
  return {onDesk,onWall};
}
