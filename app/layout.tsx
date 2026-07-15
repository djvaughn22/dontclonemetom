import type { Metadata, Viewport } from "next";
import "./globals.css";
import OpenMirrorFooter from "./OpenMirrorFooter";
import OpenMirrorNav from "./OpenMirrorNav";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://dontclonemetom.com"),
  title: {
    default: "DontCloneMeTom.com — Rescue Dogs Are Already Here",
    template: "%s",
  },
  description:
    "DontCloneMeTom.com — a rescue-first campaign reminding the world that original dogs are waiting for homes today. Independent, unaffiliated, and tail-wagging.",
  applicationName: "DontCloneMeTom.com",
  appleWebApp: { capable: true, title: "DontCloneMe", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "DontCloneMeTom.com — Rescue Dogs Are Already Here",
    description:
      "DontCloneMeTom.com — a rescue-first campaign reminding the world that original dogs are waiting for homes today. Independent, unaffiliated, and tail-wagging.",
    url: "https://dontclonemetom.com",
    siteName: "DontCloneMeTom.com",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className="antialiased">
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
