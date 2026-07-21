import type { Metadata } from "next";
import AboutDestinationCard from "../components/AboutDestinationCard";
import { BE_PREPARED_CARD } from "../lib/destinations";

export const metadata: Metadata = {
  title: "About DontCloneMeTom",
  description:
    "A rescue-first campaign inspired by a cloned-dog headline. Meet real adoptable dogs already waiting for homes.",
};

const A = "#2DD4BF";

export default function AboutPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#e8edf5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 12px" }}>
          About DontCloneMeTom<span style={{ color: A }}>.com</span>
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: "0 0 16px" }}>
          DontCloneMeTom.com turns attention from cloning one dog toward helping the real dogs
          already waiting for homes.
        </p>
        <p style={{ background: "#141d2e", border: `1px solid ${A}44`, borderRadius: 14, padding: "14px 16px", fontSize: 15, lineHeight: 1.65, fontStyle: "italic", margin: "0 0 16px" }}>
          &ldquo;Don&rsquo;t clone me, Tom. I&rsquo;m already here. I don&rsquo;t need a double.
          I need a home.&rdquo;
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: "0 0 16px" }}>
          The name speaks from a rescue dog&rsquo;s point of view. The project was inspired by
          the public story about Tom Brady&rsquo;s cloned dog. It is not about a dog named Tom,
          and it is not an attack on Tom Brady — it is a rescue-first invitation to adopt,
          foster, or help a dog get seen.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: "0 0 28px" }}>
          Isaiah, a rescue dog who once faced a kill shelter, is the face of the project.
        </p>

        <h2 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 8px" }}>What you can do here</h2>
        <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#94a3b8", margin: "0 0 28px", paddingLeft: 18 }}>
          <li>Find real adoptable dogs near your ZIP code.</li>
          <li>Visit the rescue organization handling each adoption.</li>
          <li>See the Dog of the Day.</li>
          <li>Share a dog — or the project — with someone who may be able to help.</li>
        </ul>

        <h2 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 8px" }}>How it works</h2>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: "0 0 12px" }}>
          DontCloneMeTom does not perform adoptions. Dog listings come from rescue organizations
          and adoption networks (RescueGroups.org and Petfinder), and the rescue or shelter makes
          every adoption decision.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: "0 0 28px" }}>
          No account. The ZIP code you type is used only to run the dog search — this site
          doesn&rsquo;t keep it. Your light-or-dark choice is saved on your device.
        </p>

        <a
          href="/"
          style={{ display: "inline-block", background: A, color: "#06231e", borderRadius: 50, padding: "13px 26px", fontSize: 15, fontWeight: 900, textDecoration: "none", marginBottom: 28 }}
        >
          🐶 Meet adoptable dogs
        </a>

        {/* The one quiet destination card — after the site's own story.
            A pet household is still a household; the reminder fits here. */}
        <div style={{ margin: "0 0 28px" }}>
          <AboutDestinationCard card={BE_PREPARED_CARD} />
        </div>

        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "#64748b", margin: 0 }}>
          DontCloneMeTom is an independent dog-rescue awareness project by{" "}
          <a href="https://openmirrorllc.com" style={{ color: A, textDecoration: "none" }}>Open Mirror LLC</a>.
          It is not affiliated with, sponsored by, or endorsed by Tom Brady, Colossal
          Biosciences, ViaGen Pets, the NFL, the New England Patriots, the Tampa Bay Buccaneers,
          or any related trademark owner. The full statement is on the{" "}
          <a href="/" style={{ color: "#94a3b8" }}>home page</a>.
        </p>
      </div>
    </main>
  );
}
