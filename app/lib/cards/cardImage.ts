// Draws the exact trading card being shown as a shareable 1080×1350 PNG.
// Client-only (canvas). Remote rescue photos go through /api/photo so the
// canvas stays clean; local photos and same-origin images draw directly.

import { CARD_THEMES, type DogCardFace } from "./tradingCards";

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
  attribution?: { org: string; location?: string };
}): Promise<Blob> {
  const W = 1080, H = 1350;
  const color = CARD_THEMES[o.face.themeIndex % CARD_THEMES.length];
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
  ctx.font = "900 64px system-ui, sans-serif";
  ctx.fillText(o.realName.toUpperCase(), M + 56, M + 110, W - M * 2 - 320);
  ctx.textAlign = "right";
  ctx.fillStyle = color;
  ctx.font = "900 40px system-ui, sans-serif";
  ctx.fillText(`No. ${o.face.cardNumber}`, W - M - 56, M + 104);

  // photo window
  const P = M + 56;
  const photoW = W - P * 2;
  const photoH = 560;
  const photoY = M + 150;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(P, photoY, photoW, photoH, 32);
  ctx.clip();
  ctx.fillStyle = BG;
  ctx.fillRect(P, photoY, photoW, photoH);
  let drew = false;
  if (o.photoSrc) {
    try {
      const img = await loadImage(o.photoSrc);
      const scale = Math.max(photoW / img.width, photoH / img.height);
      const sw = photoW / scale, sh = photoH / scale;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.25, sw, sh, P, photoY, photoW, photoH);
      drew = true;
    } catch { /* placeholder below */ }
  }
  if (!drew) {
    ctx.font = "260px serif";
    ctx.textAlign = "center";
    ctx.fillText("🐶", W / 2, photoY + photoH / 2 + 90);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(P, photoY, photoW, photoH, 32);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.stroke();

  // nickname + saying
  let y = photoY + photoH + 110;
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.font = "900 88px system-ui, sans-serif";
  for (const line of wrapLines(ctx, o.face.nickname.toUpperCase(), W - P * 2, 2)) {
    ctx.fillText(line, W / 2, y);
    y += 96;
  }
  y += 6;
  ctx.fillStyle = TEXT;
  ctx.font = "italic 700 44px system-ui, sans-serif";
  for (const line of wrapLines(ctx, `“${o.face.saying}”`, W - P * 2 - 40, 3)) {
    ctx.fillText(line, W / 2, y);
    y += 60;
  }
  if (o.attribution) {
    y += 8;
    ctx.fillStyle = SUB;
    ctx.font = "600 30px system-ui, sans-serif";
    const attr = o.attribution.org + (o.attribution.location ? ` · ${o.attribution.location}` : "");
    ctx.fillText(attr, W / 2, y, W - P * 2);
    y += 40;
  }

  // footer strip
  const fy = H - M - 120;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(P, fy);
  ctx.lineTo(W - P, fy);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = SUB;
  ctx.font = "900 34px system-ui, sans-serif";
  ctx.fillText(o.face.dayLabel.toUpperCase(), P, fy + 62);
  ctx.textAlign = "right";
  ctx.fillStyle = color;
  ctx.font = "900 34px system-ui, sans-serif";
  ctx.fillText("🐾 DONTCLONEMETOM.COM", W - P, fy + 62);

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) throw new Error("card image failed");
  return blob;
}
