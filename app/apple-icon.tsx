import { ImageResponse } from "next/og";

// Apple touch icon — a teal paw print drawn in shapes (no emoji/text so it
// renders identically everywhere). Generated at build time.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const toe = {
    position: "absolute" as const,
    width: 30,
    height: 38,
    background: "#2DD4BF",
    borderRadius: "50%",
  };
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b1220",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 132,
            height: 132,
            display: "flex",
          }}
        >
          {/* Main pad */}
          <div
            style={{
              position: "absolute",
              left: 30,
              top: 62,
              width: 72,
              height: 62,
              background: "#2DD4BF",
              borderRadius: "50% 50% 50% 50% / 44% 44% 56% 56%",
            }}
          />
          {/* Toes */}
          <div style={{ ...toe, left: 2, top: 30, transform: "rotate(-24deg)" }} />
          <div style={{ ...toe, left: 36, top: 8 }} />
          <div style={{ ...toe, left: 68, top: 8 }} />
          <div style={{ ...toe, left: 100, top: 30, transform: "rotate(24deg)" }} />
        </div>
      </div>
    ),
    size,
  );
}
