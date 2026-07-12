import type { Metadata } from "next";
import "./globals.css";
import OpenMirrorFooter from "./OpenMirrorFooter";
import OpenMirrorNav from "./OpenMirrorNav";
import Script from "next/script";

export const metadata: Metadata = {
  title: "DontCloneMeTom.com — Rescue Dogs Are Already Here",
  description:
    "DontCloneMeTom.com — a rescue-first campaign reminding the world that original dogs are waiting for homes today. Independent, unaffiliated, and tail-wagging.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <OpenMirrorNav site="DontCloneMeTom.com" />
        {children}
        <OpenMirrorFooter siteName="DontCloneMeTom.com" tagline="Rescue dogs are already here" accent="#2DD4BF" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-668B5WZ3TJ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-668B5WZ3TJ');`}
        </Script>
      </body>
    </html>
  );
}
