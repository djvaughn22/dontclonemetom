// Draws the exact trading card being shown as a shareable 1080×1350 PNG.
// Client-only (canvas). Remote rescue photos go through /api/photo so the
// canvas stays clean; local photos and same-origin images draw directly.
//
// The photo window is the same 4:5 frame as the on-page card and uses the
// same framing math (photoFraming.ts), so the share image preserves the
// exact framing the person saw — Fit Whole Dog or their focal position.

import { CARD_THEMES, type DogCardFace } from "./tradingCards";
import { clampSpec, containRect, FIT_WHOLE_DOG, focalSourceRect, type PhotoSpec } from "./photoFraming";

const BG = "#0b1220";
const PANEL = "#141d2e";
const TEXT = "#e8edf5";
const SUB = "#94a3b8";
const BORDER = "#26324c";

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const probe = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(probe).width <= maxWidth || !cur) cur = probe;
    else { lines.push(cur); cur = w; if (lines.length === maxLines - 1) break; }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…";
  }
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, err) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = err;
    i.src = src;
  });
}

export async function renderCardImage(o: {
  realName: string;
  face: DogCardFace;
  /** already proxied/local — safe to draw */
  photoSrc?: string;
  photoSpec?: PhotoSpec;
  attribution?: { org: string; location?: string };
}): Promise<Blob> {
  const W = 1080, H = 1350;
  const color = CARD_THEMES[o.face.themeIndex % CARD_THEMES.length];
  const spec = clampSpec(o.photoSpec ?? FIT_WHOLE_DOG);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // page behind the card, then the framed card itself
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const M = 48; // card inset
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.roundRect(M, M, W - M * 2, H - M * 2, 48);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 14;
  ctx.stroke();

  // header: real name + card number
  ctx.textAlign = "left";
  ctx.fillStyle = TEXT;
  ctx.font = "900 58px system-ui, sans-serif";
  ctx.fillText(o.realName.toUpperCase(), M + 56, M + 104, W - M * 2 - 300);
  ctx.textAlign = "right";
  ctx.fillStyle = color;
  ctx.font = "900 38px system-ui, sans-serif";
  ctx.fillText(`No. ${o.face.cardNumber}`, W - M - 56, M + 98);

  // photo window — portrait 4:5, same ratio as the on-page card
  const photoW = 608;
  const photoH = 760;
  const px = (W - photoW) / 2;
  const py = M + 132;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, photoW, photoH, 32);
  ctx.clip();
  ctx.fillStyle = BG;
  ctx.fillRect(px, py, photoW, photoH);
  let drew = false;
  if (o.photoSrc) {
    try {
      const img = await loadImage(o.photoSrc);
      if (spec.fit === "contain") {
        // blurred cover fill behind the letterboxed dog
        const s = focalSourceRect(img.width, img.height, photoW, photoH, { x: 0.5, y: 0.5, zoom: 1 });
        ctx.filter = "blur(36px)";
        ctx.globalAlpha = 0.6;
        ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, px - 24, py - 24, photoW + 48, photoH + 48);
        ctx.filter = "none";
        ctx.globalAlpha = 1;
        const d = containRect(img.width, img.height, photoW, photoH);
        ctx.drawImage(img, px + d.dx, py + d.dy, d.dw, d.dh);
      } else {
        const s = focalSourceRect(img.width, img.height, photoW, photoH, spec);
        ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, px, py, photoW, photoH);
      }
      drew = true;
    } catch { /* placeholder below */ }
  }
  if (!drew) {
    ctx.font = "260px serif";
    ctx.textAlign = "center";
    ctx.fillText("🐶", W / 2, py + photoH / 2 + 90);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(px, py, photoW, photoH, 32);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.stroke();

  // nickname + saying
  let y = py + photoH + 90;
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.font = "900 72px system-ui, sans-serif";
  const nickLines = wrapLines(ctx, o.face.nickname.toUpperCase(), W - M * 2 - 80, 2);
  for (const line of nickLines) {
    ctx.fillText(line, W / 2, y);
    y += 80;
  }
  y += 2;
  ctx.fillStyle = TEXT;
  ctx.font = "italic 700 38px system-ui, sans-serif";
  // a two-line nickname leaves room for only one saying line
  for (const line of wrapLines(ctx, `“${o.face.saying}”`, W - M * 2 - 120, nickLines.length > 1 ? 1 : 2)) {
    ctx.fillText(line, W / 2, y);
    y += 50;
  }
  if (o.attribution) {
    y += 4;
    ctx.fillStyle = SUB;
    ctx.font = "600 28px system-ui, sans-serif";
    const attr = o.attribution.org + (o.attribution.location ? ` · ${o.attribution.location}` : "");
    ctx.fillText(attr, W / 2, y, W - M * 2 - 120);
  }

  // footer strip
  const fy = H - M - 78;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(M + 56, fy);
  ctx.lineTo(W - M - 56, fy);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = SUB;
  ctx.font = "900 30px system-ui, sans-serif";
  ctx.fillText(o.face.dayLabel.toUpperCase(), M + 56, fy + 56);
  ctx.textAlign = "right";
  ctx.fillStyle = color;
  ctx.font = "900 30px system-ui, sans-serif";
  ctx.fillText("🐾 DONTCLONEMETOM.COM", W - M - 56, fy + 56);

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) throw new Error("card image failed");
  return blob;
}
