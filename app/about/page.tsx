import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About DontCloneMeTom",
  description:
    "A joke about a cloned dog that gets real dogs adopted. Real adoptable dogs, right on the page — adopt, foster, share.",
};

const A = "#2DD4BF";

export default function AboutPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#e8edf5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 12px" }}>
          About DontCloneMeTom<span style={{ color: A }}>.com</span>
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: "0 0 28px" }}>
          It started as a joke about cloning a very good dog named Tom. It became a simple
          rescue page: real adoptable dogs, right here, looking for homes. Rescue first.
        </p>

        <h2 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 8px" }}>What you can do here</h2>
        <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#94a3b8", margin: "0 0 28px", paddingLeft: 18 }}>
          <li>Meet real adoptable dogs from rescue organizations, right on the page.</li>
          <li>See the Dog of the Day.</li>
          <li>Search adoptable dogs near your own ZIP code.</li>
          <li>Share a dog with someone who has room on the couch.</li>
        </ul>

        <h2 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 8px" }}>The honest part</h2>
        <p style={{ background: "#141d2e", border: "1px solid #26324c", borderRadius: 14, padding: "14px 16px", fontSize: 15, lineHeight: 1.65, margin: "0 0 28px" }}>
          Free to use, no account, nothing saved. Dog listings come from the rescue
          organizations themselves — adoption always happens with the rescue, not here.
        </p>

        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#64748b", margin: 0 }}>
          DontCloneMeTom is an{" "}
          <a href="https://openmirrorllc.com" style={{ color: A, textDecoration: "none" }}>
            Open Mirror LLC
          </a>{" "}
          project.
        </p>
      </div>
    </main>
  );
}
