import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DontCloneMeTom.com — Rescue Dogs Are Already Here",
  description:
    "DontCloneMeTom.com — a playful rescue-first campaign reminding the world that original dogs are waiting for homes today. Independent, unaffiliated, and tail-wagging.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
