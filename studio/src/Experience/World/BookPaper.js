import * as THREE from "three/webgpu";

export function printedTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function slip(ctx, width, height, shade, seed) {
  ctx.beginPath();
  ctx.moveTo(0,2);
  for(let left=0;left<=width;left+=5) ctx.lineTo(left,(Math.sin(left*1.31+seed)+1)*1.6);
  ctx.lineTo(width,height);
  for(let left=width;left>=0;left-=5) ctx.lineTo(left,height-(Math.cos(left*1.81+seed)+1)*2.3);
  ctx.closePath();
  ctx.shadowColor="#35291c66";ctx.shadowOffsetY=3;ctx.shadowBlur=4;
  ctx.fillStyle=shade;ctx.fill();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.shadowColor="transparent";
}

function tape(ctx,left,top,angle) {
  ctx.save();ctx.translate(left,top);ctx.rotate(angle);
  slip(ctx,105,30,"rgba(208,182,128,.78)",9);
  ctx.fillStyle="#e9daaf65";
  for(let strand=0;strand<7;strand++) ctx.fillRect(3,strand*4+1,99,0.7);
  ctx.restore();
}

function print(ctx, image, index, left, top, width, height, angle, crop=false) {
  const tile=image.width/3, source=crop?tile*0.64:tile;
  ctx.save();ctx.translate(left,top);ctx.rotate(angle);
  slip(ctx,width+16,height+24,"#eae3cf",index);
  ctx.drawImage(image,index%3*tile+(tile-source)/2,Math.floor(index/3)*tile+(tile-source)/2,
    source,source,8,7,width,height);
  ctx.restore();
}

const colors=["#a73329","#bd532e","#345876","#446446","#985348"];
const subjects=["ROOM","SALON","STUDY","INDEX","NOTES"];

export function pageTexture(project,index,side,image) {
  return printedTexture(1088,1488,ctx=>{
    ctx.scale(2,2);
    const leftPage=side==="left";
    const paper=ctx.createLinearGradient(leftPage?544:0,0,leftPage?0:544,0);
    paper.addColorStop(0,"#bbaf98");
    paper.addColorStop(0.009,"#d9cfb8");
    paper.addColorStop(0.042,"#e5dcc6");
    paper.addColorStop(0.52,"#eae2cd");
    paper.addColorStop(0.95,"#e4dbc4");
    paper.addColorStop(1,"#dbd2bc");
    ctx.fillStyle=paper;ctx.fillRect(0,0,544,744);
    for(let rule=32;rule<744;rule+=32){
      ctx.fillStyle="#696b662e";ctx.fillRect(0,rule,544,0.95);
    }
    let noise=350+index;
    for(let grain=0;grain<24000;grain++) {
      noise=(Math.imul(noise,1664525)+1013904223)>>>0;
      ctx.fillStyle=grain%3?"#634d3120":"#fffdf750";
      ctx.fillRect(noise%544,(noise>>>12)%744,0.65+grain%4*0.28,0.68);
    }
    ctx.fillStyle="#534937";ctx.font="16px 'Courier New',monospace";
    if(leftPage) {
      ctx.fillText("YUNWUXIN  /  FIELD BOOK",37,49);
      const angles=[-0.047,0.033,-0.059,-0.012,0.025];
      ctx.save();ctx.translate(36,120);ctx.rotate(angles[index]);
      ctx.font='49px "Homemade Apple","Segoe Print",cursive';ctx.fillStyle="#302c25";
      project.english.split("\n").forEach((word,row)=>ctx.fillText(word,0,34+row*84,455));
      ctx.strokeStyle=colors[index];ctx.lineWidth=2.4;
      ctx.beginPath();ctx.moveTo(3,142);ctx.bezierCurveTo(123,128,212,134,281,126);ctx.stroke();
      ctx.restore();
      ctx.save();ctx.translate(45,286);ctx.rotate(-0.055);
      slip(ctx,402,85,"#c6b99a",index);
      ctx.fillStyle="#514637";ctx.font="bold 19px 'Courier New',monospace";
      ctx.fillText(project.kind,18,34);
      ctx.font="15px 'Courier New',monospace";ctx.fillText("PRINT PROOF   /   SERIES 0"+(index+1),18,61);
      ctx.restore();
      print(ctx,image,index,70,389,285,213,0.046+angles[index],true);
      tape(ctx,43,402,-0.35);
      ctx.save();ctx.translate(326,535);ctx.rotate(-0.105);
      slip(ctx,141,97,"#f0dfaa",5);
      ctx.fillStyle=colors[index];ctx.font="bold 38px Georgia";ctx.fillText("0"+(index+1),17,52);
      ctx.font="14px monospace";ctx.fillText("CONTACT",18,77);ctx.restore();
      ctx.fillStyle="#534937";ctx.font='20px "Homemade Apple","Segoe Print",cursive';
      ctx.fillText("selected works",53,674);
    } else {
      const angles=[0.042,-0.047,0.025,-0.017,0.056];
      ctx.save();ctx.translate(71,55);ctx.rotate(-0.065);
      slip(ctx,413,421,colors[index],4);ctx.restore();
      print(ctx,image,index,59,43,397,398,angles[index]);
      tape(ctx,198,33,-0.084);
      ctx.save();ctx.translate(52,423);ctx.rotate(-0.026);
      slip(ctx,440,101,"#f2e9d5",index+8);
      ctx.fillStyle=colors[index];ctx.font="bold 14px 'Courier New',monospace";
      ctx.fillText(subjects[index]+"   /   PROJECT 0"+(index+1),16,28);
      ctx.fillStyle="#332e25";ctx.font='bold 39px "SimSun",serif';
      ctx.fillText(project.title,14,78,410);ctx.restore();
      ctx.fillStyle="#514635";ctx.font='25px "KaiTi","SimSun",serif';
      const chars=Array.from(project.subtitle);
      const length=Math.ceil(chars.length/Math.ceil(chars.length/16));
      for(let start=0;start<chars.length;start+=length)
        ctx.fillText(chars.slice(start,start+length).join(""),61,566+Math.floor(start/length)*34);
      ctx.save();ctx.translate(60,639);ctx.rotate(-0.045);
      ctx.strokeStyle=colors[index];ctx.fillStyle=colors[index];ctx.lineWidth=2;
      ctx.strokeRect(0,0,211,45);ctx.font='23px "SimSun",serif';ctx.fillText("翻阅项目笔记  ↗",12,31);
      ctx.restore();
    }
    ctx.fillStyle="#5e5646";ctx.font="15px monospace";ctx.fillText(String(index*2+(leftPage?1:2)).padStart(2,"0"),leftPage?40:474,715);
  });
}
