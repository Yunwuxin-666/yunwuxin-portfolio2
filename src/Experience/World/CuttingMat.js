import { Vector3 } from "three/webgpu";
import { printedTexture } from "./BookPaper";
import { sun, lamp } from "./HouseShadow";

export const matBounds = { left:-7.0902, right:5.2588, back:-28.5674, front:-22.6185, top:-1.3471 };
const width=2048, height=992;
const {left,right,back,front,top}=matBounds;

function grid(ctx) {
  const field=ctx.createLinearGradient(0,0,width,height);
  field.addColorStop(0,"#315963");
  field.addColorStop(0.7,"#426c72");
  field.addColorStop(1,"#537a79");
  ctx.fillStyle=field;
  ctx.fillRect(0,0,width,height);
  const step=61, x0=49, y0=38, cols=32, rows=15;
  const x1=x0+cols*step, y1=y0+rows*step;
  ctx.strokeStyle="#d2d2ad";
  ctx.fillStyle="#ddddc7";
  ctx.font="17px Arial";
  ctx.lineWidth=1.55;
  ctx.beginPath();
  for(let col=0;col<=cols;col++) {
    const x=x0+col*step;
    ctx.moveTo(x,y0);ctx.lineTo(x,y1+7);
    if(col<cols) for(let i=1;i<8;i++) {
      const tick=x+i*step/8;
      ctx.moveTo(tick,y1);ctx.lineTo(tick,y1+(i===4?9:4));
    }
    if(col%2===0) ctx.fillText(String(col),x-5,y1+27);
  }
  for(let row=0;row<=rows;row++) {
    const y=y1-step*row;
    ctx.moveTo(x0-6,y);ctx.lineTo(x1,y);
    if(row>0) ctx.fillText(String(row),x0-31,y+6);
  }
  ctx.stroke();
  ctx.save();
  ctx.beginPath();ctx.rect(x0,y0,x1-x0,y1-y0);ctx.clip();
  ctx.lineWidth=1.25;ctx.strokeStyle="#c3cbb59a";
  for(const angle of [30,45,60]) {
    ctx.beginPath();ctx.moveTo(x0,y1);
    ctx.lineTo(x1,y1-(x1-x0)*Math.tan(angle*Math.PI/180));ctx.stroke();
  }
  ctx.restore();
}

// Bake silhouettes from the same transformed triangles that the camera sees.
// The host room uses day/night lightmaps, so only the two static poses are needed.
function silhouette(mesh,sceneAtlas,night) {
  mesh.updateWorldMatrix(true,false);
  const geometry=mesh.geometry, positions=geometry.attributes.position;
  const projected=new Float32Array(positions.count*2);
  const regions=new Uint8Array(positions.count);
  const point=new Vector3();
  for(let i=0;i<positions.count;i++) {
    point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
    const {x,y,z}=point;
    if(!sceneAtlas) regions[i]=1;
    else if(y>top-0.02 && y<top+0.26 && x>-3.95 && x<-0.15 && z>-28.35 && z< -26.5) regions[i]=1;
    else if(y>top-0.11 && y<top+0.24 && x>1.60 && x<5.95 && z>-24.4 && z< -20.5) regions[i]=1;
    const h=Math.max(0,y-top);
    const lamplift=h/Math.max(0.025,lamp.y-y);
    const sx=night?x+(x-lamp.x)*lamplift:x-(sun.x/sun.y)*h;
    const sz=night?z+(z-lamp.z)*lamplift:z-(sun.z/sun.y)*h;
    projected[i*2]=(sx-left)*width/(right-left);
    projected[i*2+1]=(sz-back)*height/(front-back);
  }
  const index=geometry.index?.array;
  const count=index?.length??positions.count;
  const path=new Path2D();
  for(let i=0;i<count;i+=3) {
    const a=index?index[i]:i, b=index?index[i+1]:i+1, c=index?index[i+2]:i+2;
    const region=regions[a];
    if(!region || region!==regions[b] || region!==regions[c]) continue;
    const ax=projected[2*a],ay=projected[2*a+1],bx=projected[2*b],by=projected[2*b+1],cx=projected[2*c],cy=projected[2*c+1];
    path.moveTo(ax,ay);
    if((bx-ax)*(cy-ay)>(by-ay)*(cx-ax)){path.lineTo(bx,by);path.lineTo(cx,cy);}
    else {path.lineTo(cx,cy);path.lineTo(bx,by);}
    path.closePath();
  }
  return path;
}

export class CuttingMat {
  constructor() {
    this.maps=[printedTexture(width,height,grid),printedTexture(width,height,grid)];
  }

  castShadows(roomMesh,deskCasters) {
    this.maps.forEach((map,mode)=>{
      const ctx=map.image.getContext("2d");
      const night=mode===1;
      const path=silhouette(roomMesh,true,night);
      for(const mesh of deskCasters) path.addPath(silhouette(mesh,false,night));
      ctx.save();
      ctx.fillStyle=night?"#292725":"#314d56";
      ctx.globalAlpha=0.46;ctx.filter=night?"blur(4px)":"blur(3px)";ctx.fill(path);
      ctx.restore();
      map.needsUpdate=true;
    });
  }
}
