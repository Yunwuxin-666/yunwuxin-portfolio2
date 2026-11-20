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

const ink = "#322f29";
const mono = '"Courier New", monospace';
const chinese = '"Songti SC", "SimSun", serif';
const handwriting = '"Homemade Apple", "Segoe Print", cursive';
let grainTile;

// A small, repeatable paper tooth shared by sheets, mounts and the notebook stock.
function grain(ctx, x, y, w, h) {
  if (!grainTile) {
    grainTile = document.createElement("canvas");
    grainTile.width = grainTile.height = 192;
    const tile = grainTile.getContext("2d");
    let seed = 982;
    for (let i = 0; i < 3500; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      tile.fillStyle = i % 3 ? "#573e2922" : "#fffdf773";
      tile.fillRect(seed % 192, (seed >>> 12) % 192, 0.5 + i % 4 * 0.31, 0.75);
    }
  }
  ctx.fillStyle = ctx.createPattern(grainTile, "repeat");
  ctx.fillRect(x, y, w, h);
}

function at(ctx, x, y, angle, draw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * Math.PI / 180);
  draw();
  ctx.restore();
}

function text(ctx, value, x, y, font, color = ink, maxWidth) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y, maxWidth);
}

function line(ctx, x1, y1, x2, y2, color = ink, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function paper(ctx, w, h, stock, torn = false) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  if (torn) {
    for (let x = w; x > 0; x -= 5) {
      ctx.lineTo(x, h - 2 + 1.5 * Math.sin(x * .53) + 1.3 * Math.cos(x * .21));
    }
  }
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.shadowColor = "#37271655";
  ctx.shadowBlur = 3.8;
  ctx.shadowOffsetX = .8;
  ctx.shadowOffsetY = 2.5;
  ctx.fillStyle = stock;
  ctx.fill();
  ctx.clip();
  ctx.shadowColor = "transparent";
  grain(ctx, 0, 0, w, h);
  ctx.restore();
}

function tape(ctx, x, y, angle, w = 90) {
  at(ctx, x, y, angle, () => {
    paper(ctx, w, 24, "rgba(212,186,133,.74)", true);
    for (let n = 1; n < 6; n++) line(ctx, 2, n * 3.5, w - 2, n * 3.5, "#ffefd448", .65);
  });
}

// Crop inside a single square of the existing 3 × 2 print atlas without stretching it.
function crop(ctx, image, index, x, y, w, h, zoom = 1, focusX = .5, focusY = .5) {
  const tw = image.width / 3, th = image.height / 2;
  const scale = Math.min(tw / w, th / h) / zoom;
  const sw = w * scale, sh = h * scale;
  const sx = (index % 3) * tw + (tw - sw) * focusX;
  const sy = Math.floor(index / 3) * th + (th - sh) * focusY;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

function english(ctx, project, x, y, size, spacing, angle = 0) {
  at(ctx, x, y, angle, () => project.english.split("\n").forEach((word, i) =>
    text(ctx, word, 0, i * spacing, size + "px " + handwriting, ink, 452)));
}

function heading(ctx, project, x, y, width = 440) {
  text(ctx, project.title, x, y, "bold 41px " + chinese, ink, width);
}

function caption(ctx, project, x, y, width = 448) {
  text(ctx, project.subtitle, x, y, "24px " + chinese, "#504638", width);
}

function grid(ctx, x, y, w, h, step, color, vertical = true) {
  for (let n = step; n < h; n += step) line(ctx, x, y + n, x + w, y + n, color, .75);
  if (vertical) {
    for (let n = step; n < w; n += step) line(ctx, x + n, y, x + n, y + h, color, .75);
  }
}

function room(ctx, { project, image, index, left }) {
  if (left) {
    english(ctx, project, 43, 152, 46, 72, -3);
    at(ctx, 54, 298, -3, () => {
      paper(ctx, 426, 283, "#d8e0ce", true);
      grid(ctx, 8, 6, 410, 267, 18, "#738a795e");
      ctx.strokeStyle = "#456456";
      ctx.lineWidth = 1.8;
      const outline = new Path2D("M50 200H360 M69 192V125H177 M62 125L82 74H128 M161 74H207 M274 76H313L330 126H291 M322 126V192H290 M98 102L136 58L171 102 M105 101L136 66L164 101V122H105Z M184 112L244 31L306 116L298 121L244 43L192 119Z M195 117V138H289V115 M185 138H300L293 147H191Z M198 147L210 153V189L198 183Z M210 153H274L288 147V183L274 190H210 M198 184V194L211 200H273L288 193V184 M74 130H184L176 140H74Z M81 140V187 M123 140V187 M174 140V187 M74 190H175 M76 195H174 M120 200H176 M179 77V49H192V77 M176 49V44H195V49Z");
      ctx.stroke(outline);
      ctx.lineWidth = 1.15;
      ctx.stroke(new Path2D("M123 91H147V116H123Z M123 103H147 M230 82H257V125H230Z M230 102H257 M227 126H260 M225 155H253V183H225Z M225 168H253 M96 149H112V172H96Z M96 160H112 M143 147H161V186H143Z M81 174H140 M81 180H140 M274 153V189"));
      for (let x = 85; x < 140; x += 6) line(ctx, x, 175, x, 187, "#687c70", .85);
      for (let y = 154; y < 184; y += 5) {
        line(ctx, 211, y, 222, y, "#7d8b7a", .65);
        line(ctx, 256, y, 272, y, "#7d8b7a", .65);
      }
      line(ctx, 69, 216, 322, 216, "#597163");
      for (const x of [69, 322]) line(ctx, x-3, 221, x+3, 211, "#597163");
      text(ctx, "工作台小屋 · 立面草图", 28, 254, "20px " + chinese);
    });
    tape(ctx, 168, 288, -5);
    text(ctx, "INTERACTIVE SPACE", 62, 640, "bold 18px " + mono, "#435d50");
  } else {
    at(ctx, 65, 61, 2, () => {
      paper(ctx, 405, 411, "#f6efdc");
      crop(ctx, image, index, 12, 12, 381, 381);
      for (const [x,y,angle] of [[5,5,0],[400,5,90],[400,405,180],[5,405,270]]) {
        at(ctx, x, y, angle, () => {
          ctx.fillStyle = "#5b5043";
          ctx.fill(new Path2D("M0 0H24L0 24Z"));
        });
      }
    });
    heading(ctx, project, 54, 552);
    caption(ctx, project, 56, 598);
  }
}

function salon(ctx, { project, image, index, left }) {
  if (left) {
    at(ctx, 49, 97, -3, () => {
      paper(ctx, 433, 193, "#d99568");
      ctx.strokeStyle = "#703a2a";
      ctx.lineWidth = 1.8;
      ctx.strokeRect(9, 9, 415, 175);
      ctx.setLineDash([4, 4]);
      line(ctx, 311, 10, 311, 183, "#764434", 1.3);
      ctx.setLineDash([]);
      text(ctx, "建弦线下沙龙", 24, 77, "bold 34px " + chinese);
      text(ctx, "入场联", 25, 144, "24px " + chinese);
      text(ctx, "11", 331, 84, "bold 45px Georgia");
      line(ctx, 330, 97, 397, 97, "#75412f");
      text(ctx, "20", 331, 144, "bold 45px Georgia");
    });
    english(ctx, project, 73, 410, 48, 77, 2);
    line(ctx, 71, 555, 426, 548, "#9d5d43", 1.4);
    text(ctx, "FIELD NOTES", 71, 601, "bold 18px " + mono, "#754434");
  } else {
    heading(ctx, project, 48, 122);
    at(ctx, 47, 183, -3, () => {
      paper(ctx, 446, 323, "#c99e78");
      crop(ctx, image, index, 8, 9, 430, 286, 1, .5, .48);
    });
    tape(ctx, 60, 190, -25, 76);
    tape(ctx, 405, 444, -26, 79);
    at(ctx, 76, 475, 2, () => {
      paper(ctx, 391, 100, "#f5ead5", true);
      text(ctx, "圆桌手记", 16, 31, "bold 17px " + chinese, "#904c36");
      caption(ctx, project, 16, 74, 358);
    });
  }
}

function training(ctx, { project, image, index, left }) {
  if (left) {
    english(ctx, project, 45, 139, 44, 64, -2);
    at(ctx, 55, 273, 2, () => {
      paper(ctx, 430, 336, "#dce1dc", true);
      grid(ctx, 10, 10, 410, 310, 17, "#80949b55");
      text(ctx, "练习校样", 19, 44, "bold 25px " + chinese, "#294d66");
      const stages = ["工具练习", "作品迭代", "项目讲述"];
      stages.forEach((label, i) => {
        const y = 75 + i * 83;
        ctx.strokeStyle = "#546e79"; ctx.lineWidth = 1.4;
        ctx.strokeRect(21, y, 75, 53);
        if (i === 0) {
          const sharpener = new Path2D("M29 103L59 83L86 91L56 113Z M29 103V113L56 124L86 102V91 M56 113V124 M39 102L61 88L75 92L53 107Z M47 101L66 91");
          ctx.stroke(sharpener);
        }
        if (i === 1) {
          crop(ctx, image, index, 26, y+5, 65, 43, 1.8, .76, .53);
          line(ctx, 82, y+40, 103, y+20, "#a34d37", 2.7);
        }
        if (i === 2) {
          crop(ctx, image, index, 25, y+4, 44, 44);
          for (let n=0; n<3; n++) line(ctx, 74, y+13+n*8, 91, y+13+n*8, "#546e79");
        }
        text(ctx, label, 124, y+36, "24px " + chinese);
      });
    });
    tape(ctx, 334, 266, 8, 83);
  } else {
    at(ctx, 41, 64, 0, () => {
      paper(ctx, 458, 392, "#293b48");
      crop(ctx, image, index, 18, 17, 422, 345, 1, .5, .55);
      for (const x of [18, 440]) {
        line(ctx, x, 4, x, 13, "#e3ddc8");
        line(ctx, x, 365, x, 374, "#e3ddc8");
      }
    });
    at(ctx, 75, 432, -3, () => {
      paper(ctx, 395, 86, "#c3cfc8", true);
      heading(ctx, project, 14, 57, 368);
    });
    caption(ctx, project, 47, 589);
  }
}

function library(ctx, { project, image, index, left }) {
  if (left) {
    at(ctx, 44, 94, -3, () => {
      paper(ctx, 422, 277, "#b2b694");
      at(ctx, 251, -20, 0, () => paper(ctx, 125, 31, "#b2b694"));
      text(ctx, "公开材料", 262, 2, "16px " + chinese);
    });
    at(ctx, 65, 174, 2, () => {
      paper(ctx, 416, 253, "#cdb88e");
      text(ctx, "目录", 20, 33, "20px " + chinese);
    });
    at(ctx, 52, 239, -1, () => {
      paper(ctx, 430, 276, "#eee6ce");
      grid(ctx, 14, 70, 402, 181, 34, "#989c8588", false);
      line(ctx, 51, 12, 51, 257, "#b2695488");
      text(ctx, "SUBJECT INDEX", 68, 53, "bold 18px " + mono, "#4a6250");
      english(ctx, project, 75, 132, 42, 71);
    });
    text(ctx, "主题归档 · 检索卡", 63, 609, "22px " + chinese, "#4a6250");
  } else {
    at(ctx, 48, 66, -2, () => {
      paper(ctx, 221, 450, "#46594c");
      crop(ctx, image, index, 8, 8, 205, 424, 1, .67, .5);
    });
    at(ctx, 244, 122, 1, () => {
      paper(ctx, 254, 341, "#f1ead6");
      text(ctx, "馆藏索引", 16, 49, "20px " + chinese, "#4a6250");
      line(ctx, 15, 69, 239, 69, "#68735d");
      heading(ctx, project, 15, 138, 226);
      grid(ctx, 16, 165, 222, 149, 35, "#9b9f8a88", false);
      text(ctx, "KNOWLEDGE", 17, 230, "bold 19px " + mono, "#4a6250");
      text(ctx, "DESIGN", 17, 261, "bold 19px " + mono, "#4a6250");
    });
    caption(ctx, project, 47, 584);
  }
}

function contactSheet(ctx, { project, image, index, left }) {
  if (left) {
    at(ctx, 43, 129, -4, () => {
      paper(ctx, 458, 192, "#36342e");
      [.10,.55,.93].forEach((focus, i) => {
        crop(ctx, image, index, 12+i*149, 33, 136, 125, 2.3, focus, [.20,.75,.44][i]);
        text(ctx, String(i+1), 13+i*149, 177, "13px " + mono, "#e6c58e");
      });
      for (let x=13; x<450; x+=17) {
        ctx.fillStyle="#dfd6bd";
        ctx.fillRect(x,8,8,5); ctx.fillRect(x,181,8,5);
      }
      ctx.strokeStyle="#c76949"; ctx.lineWidth=3;
      ctx.strokeRect(156, 28, 145, 133);
    });
    english(ctx, project, 60, 420, 53, 77, -3);
    text(ctx, "接触印样 · 取景选择", 70, 609, "21px " + chinese, "#72473f");
  } else {
    heading(ctx, project, 54, 122);
    at(ctx, 109, 164, 5, () => {
      paper(ctx, 335, 387, "#f4eee1");
      crop(ctx, image, index, 14, 14, 307, 307);
      text(ctx, "work in progress", 23, 361, "19px " + handwriting, "#614d46");
    });
    tape(ctx, 264, 163, 5, 85);
    caption(ctx, project, 47, 602);
  }
}

const layouts = { house: room, table: salon, pencil: training, books: library, leaf: contactSheet };

export function pageTexture(project, index, side, image) {
  return printedTexture(1088, 1488, ctx => {
    ctx.scale(2, 2);
    const left = side === "left";
    const stock = ctx.createLinearGradient(left ? 544 : 0, 0, left ? 0 : 544, 0);
    for (const [stop, color] of [[0,"#bbaf98"],[.009,"#d9cfb8"],[.042,"#e5dcc6"],[.52,"#eae2cd"],[.95,"#e4dbc4"],[1,"#dbd2bc"]]) {
      stock.addColorStop(stop, color);
    }
    ctx.fillStyle = stock;
    ctx.fillRect(0, 0, 544, 744);
    grid(ctx, 0, 0, 544, 744, 32, "#696b662e", false);
    grain(ctx, 0, 0, 544, 744);
    if (left) text(ctx, "YUNWUXIN  /  FIELD BOOK", 37, 49, "16px " + mono, "#534937");
    layouts[project.sketch](ctx, { project, image, index, left });
    if (!left) {
      at(ctx, 59, 639, -2, () => {
        ctx.strokeStyle = project.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 211, 45);
        text(ctx, "翻阅项目笔记  ↗", 12, 31, "23px " + chinese, project.ink);
      });
    }
    const number = String(index * 2 + (left ? 1 : 2)).padStart(2, "0");
    text(ctx, number, left ? 40 : 474, 715, "15px monospace", "#5e5646");
  });
}
