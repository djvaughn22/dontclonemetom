import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The old nickname studio lives on as the card maker.
    return [{ source: "/legend", destination: "/cards", permanent: true }];
  },
};

export default nextConfig;
