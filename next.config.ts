import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nov 15 2026 (Nov 14 audit): three low-risk security headers on every page.
  // No Content-Security-Policy yet; that needs a report-only trial first.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  async redirects() {
    // The old nickname studio lives on as the card maker.
    return [{ source: "/legend", destination: "/cards", permanent: true }];
  },
};

export default nextConfig;
