"use client";

import { useRef } from "react";
import { CARD_THEMES, type DogCardFace } from "../../lib/cards/tradingCards";
import { clampSpec, FIT_WHOLE_DOG, photoImgStyle, type PhotoSpec } from "../../lib/cards/photoFraming";

// One collectible dog trading card. Presentational — the spinner decides
// which face to show. The photo window is portrait 4:5 with smart framing:
// Fit Whole Dog (contain + blurred fill) by default, or a stored focal
// position (Isaiah's is owner-tuned). Never a blind centered crop.
//
// When `onPhotoSpecChange` is provided (the maker's Center Your Dog step),
// the photo can be dragged to move the focus point.

export type CardAttribution = {
  org: string;
  location?: string;
};

export default function TradingCard({
  realName,
  photoUrl,
  photoAlt,
  face,
  attribution,
  photoSpec = FIT_WHOLE_DOG,
  onPhotoSpecChange,
}: {
  realName: string;
  photoUrl?: string;
  photoAlt: string;
  face: DogCardFace;
  attribution?: CardAttribution;
  photoSpec?: PhotoSpec;
  onPhotoSpecChange?: (spec: PhotoSpec) => void;
}) {
  const color = CARD_THEMES[face.themeIndex % CARD_THEMES.length];
  const spec = clampSpec(photoSpec);
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const editable = !!onPhotoSpecChange && spec.fit === "focal";

  function onPointerDown(e: React.PointerEvent) {
    if (!editable) return;
    dragging.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!editable || !dragging.current || spec.fit !== "focal") return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - dragging.current.x) / rect.width;
    const dy = (e.clientY - dragging.current.y) / rect.height;
    dragging.current = { x: e.clientX, y: e.clientY };
    onPhotoSpecChange!(
      clampSpec({ fit: "focal", x: spec.x - dx, y: spec.y - dy, zoom: spec.zoom }),
    );
  }
  function onPointerUp() {
    dragging.current = null;
  }

  return (
    <div
      key={face.cardNumber}
      className="dcmt-card-flip mx-auto w-full max-w-sm rounded-3xl border-4 bg-[#141d2e] p-4 text-center shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
      style={{ borderColor: color }}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="truncate text-left text-xl font-black uppercase tracking-[0.14em] text-[#e8edf5]">{realName}</p>
        <span
          className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide"
          style={{ borderColor: color, color }}
        >
          No. {face.cardNumber}
        </span>
      </div>
      <div
        ref={frameRef}
        className={`relative mt-3 aspect-[4/5] overflow-hidden rounded-2xl border-2 bg-[#0b1220] ${editable ? "cursor-move touch-none" : ""}`}
        style={{ borderColor: color }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {photoUrl ? (
          <>
            {spec.fit === "contain" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
                draggable={false}
              />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={photoAlt}
              className="absolute inset-0 h-full w-full select-none"
              style={photoImgStyle(spec)}
              draggable={false}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-7xl" aria-label={photoAlt}>
            🐶
          </div>
        )}
      </div>
      <p
        className="mt-4 font-black uppercase leading-none tracking-tight"
        style={{ color, fontSize: "clamp(1.6rem, 8vw, 2.2rem)" }}
      >
        {face.nickname}
      </p>
      <p className="mx-auto mt-2.5 max-w-[18rem] text-sm font-bold italic leading-6 text-[#e8edf5]">
        &ldquo;{face.saying}&rdquo;
      </p>
      {attribution && (
        <p className="mt-2.5 text-[11px] font-semibold leading-4 text-[#94a3b8]">
          {attribution.org}
          {attribution.location ? ` · ${attribution.location}` : ""}
        </p>
      )}
      <div className="mt-3.5 flex items-center justify-between border-t border-[#26324c] px-1 pt-3 text-[11px] font-black uppercase tracking-[0.12em]">
        <span className="text-[#94a3b8]">{face.dayLabel}</span>
        <span style={{ color }}>🐾 DontCloneMeTom.com</span>
      </div>
    </div>
  );
}
