import type { Metadata, Viewport } from "next";
import "./globals.css";
import OpenMirrorFooter from "./OpenMirrorFooter";
import OpenMirrorNav from "./OpenMirrorNav";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://dontclonemetom.com"),
  title: {
    default: "DontCloneMeTom.com",
    template: "%s | DontCloneMeTom.com",
  },
  description:
    "DontCloneMeTom.com — real adoptable dogs, waiting for homes today. Independent, not for profit, and tail-wagging.",
  applicationName: "DontCloneMeTom.com",
  appleWebApp: { capable: true, title: "DontCloneMeTom.com", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "DontCloneMeTom.com — Rescue Dogs Are Already Here",
    description:
      "DontCloneMeTom.com — real adoptable dogs, waiting for homes today. Independent, not for profit, and tail-wagging.",
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
        <OpenMirrorNav
          site="DontCloneMeTom.com"
          accent="#2DD4BF"
          links={[
            { emoji: "🐶", name: "Meet the Dogs", href: "/" },
            { emoji: "🌅", name: "Dog of the Day", href: "/today" },
            { emoji: "ℹ️", name: "About", href: "/about" },
          ]}
        />
        {children}
        <OpenMirrorFooter />
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
