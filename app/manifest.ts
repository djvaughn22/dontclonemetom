import type { MetadataRoute } from "next";

// Installable-app manifest — same app-readiness layer as stepinthering.com
// and idontcry.com.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "dontclonemetom.com",
    short_name: "dontclonemetom",
    description:
      "Real adoptable dogs, waiting for homes today. Independent, not for profit, and tail-wagging.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/icons/dcmt-512.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/dcmt-512-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
