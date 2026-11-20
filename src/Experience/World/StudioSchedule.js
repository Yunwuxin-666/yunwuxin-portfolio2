import { printedTexture } from "./BookPaper";

// Public studio entries. Undated projects stay out of the calendar grid.
export const studioEntries = [
  { day: 20, title: "建弦线下沙龙", note: "工作稿与活动材料" },
  { day: 21, title: "作品集工作台", note: "场景校对与项目册更新" },
];
export const undatedProjects = ["AI 设计求职训练营", "行知知识库"];
const ink = "#3d4035", red = "#9c4937", rule = "#b3aa93";
const type = 'Georgia, "Songti SC", SimSun, serif';
const sans = '"Microsoft YaHei", sans-serif';

export function scheduleCover() {
  return printedTexture(640,960,ctx=>{
    ctx.fillStyle="#536151";ctx.fillRect(0,0,640,960);
    for(let i=0;i<640;i+=3) {
      ctx.fillStyle=i%2?"#a5a28720":"#313a3320";ctx.fillRect(i,0,1,960);
    }
    ctx.strokeStyle="#c0b28e";ctx.lineWidth=2;ctx.strokeRect(33,34,574,892);
    ctx.textAlign="center";ctx.fillStyle="#f0dfaf";
    ctx.font="22px Georgia";ctx.fillText("Y U N W U X I N",320,127);
    ctx.font="italic 74px Georgia";ctx.fillText("Studio Almanac",320,354);
    ctx.font=`58px ${type}`;ctx.fillText("工作室月志",320,461);
    ctx.fillRect(245,516,150,2);
    ctx.font="italic 34px Georgia";ctx.fillText("November",320,625);
    ctx.font="40px Georgia";ctx.fillText("2026",320,806);
  });
}

export function schedulePrint() {
  return printedTexture(960,1080, ctx => {
    const stock = ctx.createLinearGradient(0,0,960,1080);
    stock.addColorStop(0,"#e2d9c3");
    stock.addColorStop(0.42,"#f6f1e2");
    stock.addColorStop(1,"#e7dfca");
    ctx.fillStyle=stock;
    ctx.fillRect(0,0,960,1080);
    function text(value,x,y,font,color=ink) {
      ctx.fillStyle=color;
      ctx.font=font;
      ctx.fillText(value,x,y);
    }
    function line(x,y,width) {
      ctx.fillStyle=rule;
      ctx.fillRect(x,y,width,1.5);
    }
    text("YUNWUXIN   /   STUDIO",56,76,'23px monospace');
    text("2026",821,78,'italic 30px Georgia',red);
    line(56,98,848);
    text("November",52,211,'italic 108px Georgia');
    text("十一月 · 工作室日程",60,262,`30px ${type}`,red);
    const x0=58,y0=360,cell=120,rowHeight=91;
    ["日","一","二","三","四","五","六"].forEach((d,i)=>{
      text(d,x0+i*cell+12,330,`24px ${sans}`);
    });
    const first=new Date(Date.UTC(2026,10,1)).getUTCDay();
    for(let row=0;row<=5;row++) line(x0,y0+row*rowHeight,840);
    for(let d=1;d<=30;d++) {
      const i=first+d-1, x=x0+(i%7)*cell+12, y=y0+Math.floor(i/7)*rowHeight+47;
      const entry=studioEntries.find(e=>e.day===d);
      text(String(d),x,y,'36px Georgia',entry?red:ink);
      if(entry) {
        ctx.fillStyle=red;
        ctx.fillRect(x,y+8,35,3);
      }
    }
    studioEntries.forEach((e,i)=>{
      const y=902+i*71;
      text("11 / "+e.day,66,y,'italic 32px Georgia',red);
      text(e.title,230,y,`37px ${type}`);
    });
    line(56,1024,848);
  });
}
