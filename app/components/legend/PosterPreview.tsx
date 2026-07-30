"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "../../lib/analytics";
import { ISAIAH_HERO_NAME } from "../../lib/identity/heroIdentity";

// Free watermarked poster preview, drawn entirely in the browser.
//
// The photo never leaves the device: it arrives as a local object URL and is
// painted straight onto the canvas. Only the WATERMARKED render ever exists —
// there is no high-resolution clean file to leak because one is never made
// in the free experience.
//
// The Isaiah approval seal is the watermark: recognizable, friendly, and it
// carries the site URL so a shared preview brings people back.

export const POSTER_W = 1080;
export const POSTER_H = 1350;

export type PosterData = {
  realName: string;
  heroName: string;
  subtitle?: string;
  photoUrl?: string; // local object URL only
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, family: string): number {
  let px = startPx;
  do {
    ctx.font = `900 ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 4;
  } while (px > 28);
  return px;
}

export async function drawPoster(canvas: HTMLCanvasElement, data: PosterData): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = POSTER_W;
  const H = POSTER_H;
  canvas.width = W;
  canvas.height = H;
  const family = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const accent = "#2DD4BF";

  // Background
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#26324c";
  ctx.lineWidth = 6;
  roundRect(ctx, 24, 24, W - 48, H - 48, 36);
  ctx.stroke();

  // Photo frame
  const frame = { x: 140, y: 110, w: W - 280, h: 640 };
  const photo = data.photoUrl ? await loadImage(data.photoUrl) : null;
  roundRect(ctx, frame.x, frame.y, frame.w, frame.h, 32);
  ctx.save();
  ctx.clip();
  if (photo) {
    // cover-fit, centered focal point
    const scale = Math.max(frame.w / photo.width, frame.h / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    ctx.drawImage(photo, frame.x + (frame.w - dw) / 2, frame.y + (frame.h - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#141d2e";
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
    ctx.fillStyle = "#94a3b8";
    ctx.font = `900 200px ${family}`;
    ctx.textAlign = "center";
    ctx.fillText("🐶", W / 2, frame.y + frame.h / 2 + 70);
  }
  ctx.restore();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  roundRect(ctx, frame.x, frame.y, frame.w, frame.h, 32);
  ctx.stroke();

  // Hero name
  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  const heroPx = fitText(ctx, data.heroName.toUpperCase(), W - 160, 110, family);
  ctx.font = `900 ${heroPx}px ${family}`;
  ctx.fillText(data.heroName.toUpperCase(), W / 2, 880);

  // Subtitle
  if (data.subtitle) {
    ctx.fillStyle = "#e8edf5";
    const subPx = fitText(ctx, data.subtitle, W - 260, 54, family);
    ctx.font = `900 ${subPx}px ${family}`;
    ctx.fillText(data.subtitle, W / 2, 950);
  }

  // Real name, kept separate and plain
  ctx.fillStyle = "#94a3b8";
  ctx.font = `700 34px ${family}`;
  ctx.fillText(`Known in ordinary life as ${data.realName}`, W / 2, data.subtitle ? 1010 : 950);

  // Brand line — every shared preview points home
  ctx.fillStyle = "#94a3b8";
  ctx.font = `800 30px ${family}`;
  ctx.fillText("DontCloneMeTom.com", W / 2, H - 60);

  // Subtle diagonal preview strip across the lower art — protects the
  // design without hiding the dog.
  ctx.save();
  ctx.translate(W / 2, 620);
  ctx.rotate(-0.28);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#e8edf5";
  ctx.font = `900 54px ${family}`;
  ctx.fillText("FREE PREVIEW · DONTCLONEMETOM.COM", 0, 0);
  ctx.restore();

  // The Isaiah approval seal
  const seal = { cx: W - 190, cy: 1130, r: 105 };
  ctx.save();
  ctx.globalAlpha = 0.97;
  // ring
  ctx.beginPath();
  ctx.arc(seal.cx, seal.cy, seal.r, 0, Math.PI * 2);
  ctx.fillStyle = "#141d2e";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = accent;
  ctx.stroke();
  // Isaiah's face at the center of the seal
  const face = await loadImage("/isaiah-icon.jpg");
  if (face) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(seal.cx, seal.cy - 22, 58, 0, Math.PI * 2);
    ctx.clip();
    const s = Math.max(116 / face.width, 116 / face.height);
    ctx.drawImage(face, seal.cx - (face.width * s) / 2, seal.cy - 22 - (face.height * s) / 2, face.width * s, face.height * s);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(seal.cx, seal.cy - 22, 58, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = accent;
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8edf5";
  ctx.font = `900 22px ${family}`;
  ctx.fillText("Approved by Isaiah", seal.cx, seal.cy + 56);
  ctx.fillStyle = accent;
  ctx.font = `800 19px ${family}`;
  ctx.fillText(`a.k.a. ${ISAIAH_HERO_NAME}`, seal.cx, seal.cy + 82);
  ctx.restore();
}

export default function PosterPreview({ data }: { data: PosterData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    drawPoster(canvas, data).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  async function toBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  }

  async function download() {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dontclonemetom-${data.heroName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-preview.png`;
      a.click();
      URL.revokeObjectURL(url);
      track("dcmt_legend_poster_downloaded", {});
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const blob = await toBlob();
      const file = blob ? new File([blob], "dog-legend-preview.png", { type: "image/png" }) : null;
      const shareData: ShareData = {
        title: data.heroName,
        text: `${data.realName}? Never heard of that name. This is ${data.heroName}. Made free at DontCloneMeTom.com`,
        url: "https://dontclonemetom.com/legend",
      };
      if (file && navigator.canShare?.({ files: [file] })) shareData.files = [file];
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          track("dcmt_legend_poster_shared", {});
          return;
        } catch {
          // cancelled
        }
      }
      await download();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText("https://dontclonemetom.com/legend");
      track("dcmt_legend_link_copied", {});
    } catch {
      // clipboard blocked
    }
  }

  const btn =
    "inline-flex items-center justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-5 py-2.5 text-sm font-bold text-[#e8edf5] transition hover:border-[#2DD4BF] disabled:opacity-40";

  return (
    <div>
      <canvas
        ref={canvasRef}
        aria-label={`Watermarked poster preview for ${data.heroName}`}
        className="w-full rounded-2xl border border-[#26324c]"
      />
      <p className="mt-2 text-xs font-semibold text-[#94a3b8]">
        This is the free share-quality preview with the Isaiah approval seal.
        The print-ready file without the seal comes with a purchase.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={share} disabled={busy} className={btn}>
          Share the preview
        </button>
        <button type="button" onClick={download} disabled={busy} className={btn}>
          Download preview
        </button>
        <button type="button" onClick={copyLink} className={btn}>
          Copy link
        </button>
      </div>
    </div>
  );
}
