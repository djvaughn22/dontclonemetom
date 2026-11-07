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
    "Don’t clone me. Rescue me. Real adoptable dogs near you, each one linked straight to its rescue.",
  applicationName: "DontCloneMeTom.com",
  appleWebApp: { capable: true, title: "DontCloneMeTom.com", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "DontCloneMeTom.com — Don’t clone me. Rescue me.",
    description:
      "Real adoptable dogs near you, each one linked straight to its rescue.",
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
            { emoji: "ℹ️", name: "About DontCloneMeTom", href: "/about" },
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
