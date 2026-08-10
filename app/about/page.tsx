import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "For dogs still waiting. dontclonemetom.com is not for profit — it's a way to help real adoptable dogs get seen.",
};

const A = "#2DD4BF";

export default function AboutPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#e8edf5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>
          About <span style={{ color: "#e8edf5" }}>dontclonemetom</span><span style={{ color: A }}>.com</span>
        </h1>
        <p style={{ fontSize: 15, fontWeight: 700, color: A, margin: "0 0 28px" }}>
          For dogs still waiting.
        </p>

        <p style={{ fontSize: 16, lineHeight: 1.7, color: "#e8edf5", margin: "0 0 10px" }}>
          Tom Brady reminded millions of people how much a dog can mean to a family.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "#e8edf5", margin: "0 0 10px" }}>
          dontclonemetom.com is using a little of that attention to help adoptable dogs find
          families of their own.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: A, fontWeight: 700, margin: "0 0 32px" }}>
          Thank you, Tom — for loving your dog enough that everybody noticed.
        </p>

        <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase", color: A, margin: "0 0 8px" }}>
          Not for profit. Always for the dogs.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: "0 0 32px" }}>
          dontclonemetom.com isn&rsquo;t here to make money. The goal is simple: help more
          adoptable dogs get seen, shared, and home.
        </p>

        <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase", color: A, margin: "0 0 8px" }}>
          Real dogs. Real rescues.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: "0 0 32px" }}>
          Every adoptable dog here comes from a real rescue or shelter. When one steals your
          heart, dontclonemetom.com sends you to the people actually responsible for that
          dog&rsquo;s adoption — the rescue or shelter makes every adoption decision, not us.
        </p>

        <Link
          href="/"
          style={{ display: "inline-block", background: A, color: "#06231e", borderRadius: 50, padding: "13px 26px", fontSize: 15, fontWeight: 900, textDecoration: "none", marginBottom: 32 }}
        >
          🐶 Meet adoptable dogs
        </Link>

        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "#64748b", margin: 0 }}>
          dontclonemetom.com is an independent project by{" "}
          <a href="https://openmirrorllc.com" style={{ color: A, textDecoration: "none" }}>Open Mirror LLC</a>.
          It is not affiliated with, sponsored by, or endorsed by Tom Brady, Colossal
          Biosciences, ViaGen Pets, the NFL, the New England Patriots, the Tampa Bay Buccaneers,
          or any related trademark owner.
        </p>

        {/* The footer's Contact and Disclaimer links land on these two
            sections (family standard, 2026-08-02). */}
        <section id="contact" style={{ marginTop: 28, scrollMarginTop: 96 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 8px" }}>Contact</h2>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: 0 }}>
            Have a question or an idea? Email{" "}
            <a
              href="mailto:ask@openmirrorllc.com?subject=Open%20Mirror%20Inquiry"
              style={{ color: A }}
            >
              ask@openmirrorllc.com
            </a>
            .
          </p>
        </section>

        <section id="disclaimer" style={{ marginTop: 28, scrollMarginTop: 96 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 8px" }}>Disclaimer</h2>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: 0 }}>
            Open Mirror LLC is independently owned and operated. Nothing
            published by Open Mirror LLC is sponsored by, affiliated with,
            endorsed by, or representative of the owner&rsquo;s full-time
            employer. The trademark statement above also applies. Read the{" "}
            <a href="https://openmirrorllc.com/disclaimer" style={{ color: A }}>
              full Open Mirror disclaimer
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
