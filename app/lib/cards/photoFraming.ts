// Smart photo framing for the trading cards — one set of pure math shared
// by the on-page card (CSS) and the canvas share export, so the framing a
// person sees is exactly the framing they share.
//
// Two modes:
//   Fit Whole Dog (default) — object-fit: contain; the entire photo shows,
//     as large as possible, never stretched; a blurred copy fills the rest.
//   Center Your Dog (focal) — a cover crop anchored to a chosen focus point
//     with optional zoom-in; the person (or the owner, for Isaiah) decides
//     what stays in frame. Never a blind centered crop.

export type PhotoSpec =
  | { fit: "contain" }
  | { fit: "focal"; x: number; y: number; zoom: number };

/** The default for every photo: show the whole dog. */
export const FIT_WHOLE_DOG: PhotoSpec = { fit: "contain" };

/** The card photo window is portrait 4:5 — dogs are mostly taller than
 *  wide, so this keeps them big without beheading anyone. */
export const PHOTO_FRAME_RATIO = 4 / 5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clampSpec(spec: PhotoSpec): PhotoSpec {
  if (spec.fit === "contain") return spec;
  return {
    fit: "focal",
    x: clamp(spec.x, 0, 1),
    y: clamp(spec.y, 0, 1),
    zoom: clamp(spec.zoom, 1, 3),
  };
}

/** Destination rect (inside a frameW×frameH window) that letterboxes the
 *  whole image, centered, undistorted — the "Fit Whole Dog" placement. */
export function containRect(imgW: number, imgH: number, frameW: number, frameH: number) {
  const scale = Math.min(frameW / imgW, frameH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return { dx: (frameW - dw) / 2, dy: (frameH - dh) / 2, dw, dh };
}

/**
 * Source rect (inside the image) for the focal cover crop. Matches CSS
 * `object-fit: cover` + `object-position: x% y%` + `scale(zoom)` with the
 * transform origin at the focus point, so DOM and canvas agree:
 *   1. cover: the largest source rect with the frame's aspect ratio,
 *      slack distributed by the focus percentages;
 *   2. zoom: shrink that rect about the focus point, clamped inside.
 */
export function focalSourceRect(
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  spec: { x: number; y: number; zoom: number },
) {
  const { x, y, zoom } = clampSpec({ fit: "focal", ...spec }) as { x: number; y: number; zoom: number };
  const frameRatio = frameW / frameH;
  let sw: number, sh: number;
  if (imgW / imgH > frameRatio) {
    sh = imgH;
    sw = imgH * frameRatio;
  } else {
    sw = imgW;
    sh = imgW / frameRatio;
  }
  let sx = (imgW - sw) * x;
  let sy = (imgH - sh) * y;
  if (zoom > 1) {
    const zw = sw / zoom;
    const zh = sh / zoom;
    sx = clamp(sx + (sw - zw) * x, 0, imgW - zw);
    sy = clamp(sy + (sh - zh) * y, 0, imgH - zh);
    sw = zw;
    sh = zh;
  }
  return { sx, sy, sw, sh };
}

/** CSS for the foreground <img> of a card photo window. */
export function photoImgStyle(spec: PhotoSpec): React.CSSProperties {
  const s = clampSpec(spec);
  if (s.fit === "contain") return { objectFit: "contain" };
  const pos = `${s.x * 100}% ${s.y * 100}%`;
  return {
    objectFit: "cover",
    objectPosition: pos,
    transform: s.zoom > 1 ? `scale(${s.zoom})` : undefined,
    transformOrigin: pos,
  };
}
