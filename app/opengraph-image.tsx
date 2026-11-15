// Share preview for every page that doesn't set its own: 1200×630 PNG in the
// Open Mirror dark palette with this site's accent (Nov 14 2026: links used to
// preview as a blank box). Same pattern as WhatAmIAI's card.

import { ImageResponse } from "next/og";

export const alt = "DontCloneMeTom.com: real adoptable dogs near you, each one linked straight to its rescue.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0b1220";
const TEXT = "#e8edf5";
const SUB = "#94a3b8";
const BRAND = "#2DD4BF";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: BG,
          color: TEXT,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ width: 140, height: 10, borderRadius: 5, background: BRAND, display: "flex" }} />
        <div style={{ marginTop: 36, fontSize: 30, letterSpacing: 6, color: SUB, display: "flex" }}>DONTCLONEMETOM.COM</div>
        <div style={{ marginTop: 20, fontSize: 84, lineHeight: 1.08, display: "flex", flexWrap: "wrap" }}>
          <span>Don’t clone me.&nbsp;</span>
          <span style={{ color: BRAND }}>Rescue me.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 36, color: SUB, lineHeight: 1.35, display: "flex" }}>
          Real adoptable dogs near you, each one linked straight to its rescue.
        </div>
      </div>
    ),
    size,
  );
}
