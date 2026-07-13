// Shared 1080×1350 dog-card renderer (Daily Social Engine card design for
// DontCloneMeTom). Used by the Dog of the Day route and the community
// "Make a Dog Card" route — the real adoptable dog is always the main
// subject; Isaiah appears only as the small heart-tag "IV" brand mark.

import { ImageResponse } from "next/og";
import type { Dog } from "./rescueDogs";
import { dogCityLabel } from "./dogOfTheDay";

const NAVY = "#0b1220";
const SURFACE = "#141d2e";
const BORDER = "#26324c";
const TEAL = "#2DD4BF";
const TEXT = "#e8edf5";
const MUTED = "#94a3b8";

// Isaiah's heart tag, drawn in shapes (two lobes + rotated square) with "IV".
function HeartTag() {
  return (
    <div style={{ display: "flex", position: "relative", width: 64, height: 60 }}>
      <div style={{ position: "absolute", left: 4, top: 4, width: 30, height: 30, borderRadius: "50%", background: TEAL, display: "flex" }} />
      <div style={{ position: "absolute", right: 4, top: 4, width: 30, height: 30, borderRadius: "50%", background: TEAL, display: "flex" }} />
      <div style={{ position: "absolute", left: 17, top: 12, width: 30, height: 30, background: TEAL, transform: "rotate(45deg)", display: "flex" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 16,
          width: 64,
          display: "flex",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 700,
          color: NAVY,
        }}
      >
        IV
      </div>
    </div>
  );
}

export function renderDogCard(
  dog: Dog,
  options: {
    headline: string; // "DOG OF THE DAY" or "ADOPTABLE NEAR YOU"
    dateLine: string; // full date (daily) or "Card made <date>" (community)
    footerUrl: string; // "DONTCLONEMETOM.COM/TODAY" or ".../DOGS/<id>"
    note?: string; // e.g. availability notice on community cards
  },
) {
  const city = dogCityLabel(dog);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NAVY,
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            border: `3px solid ${BORDER}`,
            borderRadius: 40,
            padding: "34px 40px 28px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 30, letterSpacing: 6, color: TEAL }}>
                {options.headline}
              </div>
              <div style={{ marginTop: 8, fontSize: 26, color: MUTED }}>
                {options.dateLine}
              </div>
            </div>
            <HeartTag />
          </div>

          {/* Real dog photo — the main subject. */}
          <div
            style={{
              display: "flex",
              marginTop: 24,
              borderRadius: 32,
              border: `3px solid ${BORDER}`,
              overflow: "hidden",
              width: 928,
              height: 700,
              background: SURFACE,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dog.photo ?? ""}
              alt=""
              width={928}
              height={700}
              style={{ objectFit: "cover", width: 928, height: 700 }}
            />
          </div>

          {/* Facts — only source-verified information. */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
            <div style={{ fontSize: 76, fontWeight: 700, color: TEXT }}>{dog.name}</div>
            <div style={{ marginTop: 8, fontSize: 36, color: TEAL }}>
              {`${city} · Looking for a good home`}
            </div>
            <div style={{ marginTop: 10, fontSize: 27, color: MUTED }}>
              {`Listed by ${dog.org} · via RescueGroups.org`}
            </div>
            {options.note ? (
              <div style={{ marginTop: 8, fontSize: 24, color: MUTED }}>
                {options.note}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "auto",
              fontSize: 27,
              letterSpacing: 4,
              color: MUTED,
            }}
          >
            {options.footerUrl}
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: {
        "Cache-Control": "public, max-age=900, s-maxage=3600",
      },
    },
  );
}
