import type { Metadata } from "next";
import "./globals.css";
import OpenMirrorFooter from "./OpenMirrorFooter";

export const metadata: Metadata = {
  title: "DontCloneMeTom.com — Rescue Dogs Are Already Here",
  description:
    "DontCloneMeTom.com — a rescue-first campaign reminding the world that original dogs are waiting for homes today. Independent, unaffiliated, and tail-wagging.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body>
        {children}
        <OpenMirrorFooter siteName="DontCloneMeTom.com" tagline="Rescue dogs are already here" />
      </body>
    </html>
  );
}
