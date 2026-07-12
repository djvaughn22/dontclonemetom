import type { MetadataRoute } from "next";

// Installable-app manifest — same app-readiness layer as stepinthering.com
// and idontcry.com.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DontCloneMeTom.com",
    short_name: "DontCloneMe",
    description:
      "A rescue-first campaign reminding the world that original dogs are waiting for homes today. Independent, unaffiliated, and tail-wagging.",
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
