import { printedTexture } from "./BookPaper";

const ink = "#363630";
const pencil = "#605e50";
const sans = '"Microsoft YaHei", "PingFang SC", sans-serif';
const script = '"KaiTi", "STKaiti", "Songti SC", serif';

// Each layer casts only a short contact shadow on the sheet underneath.
function paper(ctx, path, color, blur = 2) {
  ctx.save();
  ctx.shadowColor = "#40372865";
  ctx.shadowOffsetX = -1.5;
  ctx.shadowOffsetY = 2.5;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
}

function label(ctx, value, x, y, font, color = ink) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function drawClip(ctx) {
  ctx.save();
  ctx.translate(409, 49);
  ctx.rotate(0.058);
  const wire = new Path2D("M0 21 L0 56 C0 67 14 67 14 56 L14 4 C14 -8 -4 -8 -4 4 L-4 52");
  ctx.lineCap = "round";
  ctx.shadowColor = "#30291888";
  ctx.shadowOffsetX = -2;
  ctx.shadowOffsetY = 2.5;
  ctx.shadowBlur = 2;
  ctx.strokeStyle = "#777366";
  ctx.lineWidth = 2.7;
  ctx.stroke(wire);
  ctx.shadowColor = "transparent";
  ctx.translate(0.45, -0.6);
  ctx.strokeStyle = "#eeeae0";
  ctx.lineWidth = 1.05;
  ctx.stroke(wire);
  ctx.restore();
}

function swatch(ctx, x, y, angle, stock, artwork) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const cut = new Path2D("M0 1 L92 0 L93 91 L0 93 Z");
  paper(ctx, cut, stock, 2);
  ctx.clip(cut);
  artwork();
  ctx.restore();
}

function drawSamples(ctx, image) {
  const tile = image.width / 3;
  function photo(column, row, inset = 0) {
    ctx.filter = "saturate(0.65) contrast(0.93)";
    ctx.drawImage(image, (column + inset) * tile, (row + inset) * tile,
      (1 - 2 * inset) * tile, (1 - 2 * inset) * tile, 3, 3, 87, 87);
  }
  swatch(ctx, 90, 304, -0.034, "#e1d8bc", () => {
    label(ctx, "TYPE PROOF", 8, 14, "7px monospace");
    label(ctx, "Aa", 3, 69, "bold 63px Georgia", "#554b37");
    label(ctx, "明朝体  /  正文", 8, 83, '9px ' + script);
  });
  swatch(ctx, 187, 299, 0.024, "#eee7d8", () => photo(0, 0));
  swatch(ctx, 282, 304, -0.017, "#e8dfc8", () => photo(1, 1, 0.14));
  swatch(ctx, 87, 401, 0.021, "#e4dbc5", () => photo(0, 1, 0.06));
  swatch(ctx, 186, 399, -0.031, "#526455", () => {
    ctx.strokeStyle = "#b2baa8";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = -3; i < 100; i += 10) {
      ctx.moveTo(i, 0); ctx.lineTo(i, 94);
      ctx.moveTo(0, i); ctx.lineTo(94, i);
    }
    ctx.moveTo(0, 91); ctx.lineTo(92, 0);
    ctx.stroke();
    label(ctx, "cutting mat", 5, 84, "italic 14px Georgia", "#f6ecd2");
  });
  swatch(ctx, 284, 400, 0.023, "#f1e7cd", () => photo(2, 0));
  swatch(ctx, 90, 499, -0.018, "#e8dac6", () => photo(1, 0));
  swatch(ctx, 187, 497, 0.032, "#b3583c", () => {
    label(ctx, "油墨试印", 9, 22, '12px ' + script, "#f5dbb2");
    label(ctx, "印", 15, 74, 'bold 58px ' + script, "#f5e1be");
    ctx.strokeStyle = "#ecd3ae";
    ctx.strokeRect(7, 26, 71, 53);
  });
  swatch(ctx, 284, 499, -0.024, "#e6dfc8", () => {
    label(ctx, "Yun", 2, 43, "italic bold 47px Georgia", "#414a3b");
    label(ctx, "wuxin", 4, 69, "italic 30px Georgia", "#414a3b");
    label(ctx, "字标 · 墨样", 7, 85, '9px ' + script);
  });
  for (const [x, y, tone] of [[181,395,"#475548"], [279,400,"#ae6243"],
                                [183,496,"#d5a656"], [280,494,"#aaa77a"]]) {
    const chip = new Path2D();
    chip.arc(x, y, 12, 0, Math.PI * 2);
    paper(ctx, chip, tone, 1.3);
    ctx.strokeStyle = "#3b382f77";
    ctx.lineWidth = 0.65;
    ctx.stroke(chip);
  }
}

export function deskDraft(image) {
  return printedTexture(960, 1440, ctx => {
    ctx.scale(2, 2);
    const folder = new Path2D("M26 64 L134 64 L140 38 Q141 35 144 35 L205 35 L211 61 L219 35 L280 35 L287 61 L294 35 L355 35 L361 61 L369 35 L432 35 Q437 35 438 42 L445 67 L448 681 L29 685 Z");
    const kraft = ctx.createLinearGradient(40, 35, 440, 680);
    kraft.addColorStop(0, "#e2c18b");
    kraft.addColorStop(0.62, "#cda976");
    kraft.addColorStop(1, "#d9b781");
    paper(ctx, folder, kraft, 4);
    ["纸样", "字样", "印样", "配色"].forEach((name, i) =>
      label(ctx, name, 160 + 76 * i, 54, '11px ' + script, "#685538"));
    const loose = new Path2D("M9 108 L418 61 L467 641 L55 699 Z");
    paper(ctx, loose, "#dcd9cf", 4);
    const graph = new Path2D("M34 77 Q173 76 305 72 L437 73 L440 352 Q437 501 444 662 Q442 667 433 668 L37 673 L33 486 Z");
    const stock = ctx.createLinearGradient(33, 75, 439, 666);
    stock.addColorStop(0, "#e9e8e1");
    stock.addColorStop(0.37, "#f0eee6");
    stock.addColorStop(0.93, "#eae7dc");
    stock.addColorStop(1, "#e1ddcf");
    paper(ctx, graph, stock, 5);
    ctx.save();
    ctx.clip(graph);
    ctx.strokeStyle = "#87988e4a";
    ctx.lineWidth = 0.42;
    ctx.beginPath();
    for (let x = 39; x < 446; x += 14) { ctx.moveTo(x, 73); ctx.lineTo(x, 674); }
    for (let y = 82; y < 675; y += 14) { ctx.moveTo(32, y); ctx.lineTo(445, y); }
    ctx.stroke();

    label(ctx, "YUNWUXIN   /   STUDIO", 60, 112, "10px 'Courier New', monospace", pencil);
    label(ctx, "视觉方向草稿", 56, 165, 'bold 42px ' + sans);
    label(ctx, "把桌上的纸、印刷图像和裁切垫放在一起，", 60, 201, '15px ' + sans);
    label(ctx, "试一试这间房间的底色。", 60, 224, '15px ' + sans);
    ["纸张肌理", "旧印刷", "暖色调"].forEach((name, i) => {
      const x = 59 + i * 113;
      ctx.beginPath(); ctx.roundRect(x, 247, 103, 27, 14);
      ctx.strokeStyle = "#5c5d51"; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.textAlign = "center"; label(ctx, name, x + 51.5, 265, '13px ' + sans);
    });
    ctx.textAlign = "left";
    drawSamples(ctx, image);
    label(ctx, "铅字", 46, 346, '14px ' + script, pencil);
    label(ctx, "削笔器", 383, 435, '13px ' + script, pencil);
    label(ctx, "砖红", 207, 625, '15px ' + script, pencil);
    ctx.strokeStyle = pencil; ctx.lineWidth = 1.05; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke(new Path2D("M56 353 Q57 368 83 370 M78 366 L83 370 L77 373 M399 441 Q394 453 380 454 M385 450 L380 454 L386 456 M237 614 Q251 609 248 594 M245 600 L248 594 L252 599"));
    label(ctx, "WORKTABLE   /   COLOUR & MATERIAL STUDY", 60, 652, "8.7px 'Courier New', monospace", pencil);
    ctx.restore();

    // A narrow torn tape strip straddles the edge of the graph sheet.
    const tape = new Path2D("M312 659 L375 653 L374 656 L377 658 L376 665 L378 671 L315 678 L314 674 L315 670 L312 667 Z");
    ctx.fillStyle = "#dbc79495"; ctx.fill(tape);
    ctx.strokeStyle = "#fff6df9a"; ctx.lineWidth = 0.75;
    ctx.stroke(new Path2D("M317 661 L372 655 M322 665 L337 664 L342 660 M348 673 L374 670"));
    drawClip(ctx);

    // One fine grain pass covers paper, ink and cut edges alike.
    ctx.globalCompositeOperation = "source-atop";
    let grain = 117;
    for (let i = 0; i < 22500; i++) {
      grain = (Math.imul(grain, 1664525) + 1013904223) >>> 0;
      ctx.fillStyle = i % 3 ? "#6350381c" : "#fffef84a";
      ctx.fillRect((grain & 65535) * 480 / 65536, (grain >>> 16) * 720 / 65536, 0.55 + i % 4 * 0.32, 0.53);
    }
  });
}
