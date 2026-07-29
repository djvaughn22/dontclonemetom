import Link from "next/link";
import type { DogProfileV1 } from "../../lib/dogProfiles";
import AliasStrip from "./AliasStrip";
import ProfileShareActions from "./ProfileShareActions";
import QuoteCards from "./QuoteCards";
import NameIdeasHelper from "./NameIdeasHelper";

// Renders any DogProfileV1 record. Sections with no data don't render —
// a new dog needs one record and a photo, nothing else.

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <p className="mb-3 text-xs font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
      {children}
    </p>
  );
}

function OwnerListSection({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  if (items.length === 0) return null;
  return (
    <section className="print-card mb-8 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
      <SectionTitle accent={accent}>{title}</SectionTitle>
      <ul className="space-y-2 text-sm font-semibold leading-6 text-[#e8edf5]">
        {items.map((item) => (
          <li key={item}>🐾 {item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function DogProfileView({ profile }: { profile: DogProfileV1 }) {
  const p = profile;
  const accent = p.theme.accent;
  const pageUrl = `https://dontclonemetom.com/dogs/${p.slug}`;

  return (
    <main className="print-sheet min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* Hero */}
        <section className="mb-10 text-center">
          <div className="mx-auto max-w-sm overflow-hidden rounded-3xl border-2" style={{ borderColor: accent }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.primaryImage} alt={p.primaryImageAlt} className="block w-full" />
          </div>
          <h1 className="mt-6 text-lg font-black uppercase tracking-[0.3em] text-[#94a3b8]">{p.realName}</h1>
          <p
            className="mt-1 font-black leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(2.2rem, 9vw, 4rem)", color: accent }}
          >
            {p.displayTitle}
          </p>
          <div className="mt-4">
            <AliasStrip aliases={p.aliases} accent={accent} />
          </div>
          {p.intro.length > 0 && (
            <div className="mx-auto mt-5 max-w-md">
              {p.intro.map((line) => (
                <p key={line} className="text-base font-bold leading-7 text-[#e8edf5]">
                  {line}
                </p>
              ))}
            </div>
          )}
        </section>

        {/* Character cards */}
        {p.characterCards.length > 0 && (
          <section className="mb-8">
            <SectionTitle accent={accent}>Known identities</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {p.characterCards.map((c) => (
                <div key={c.name} className="print-card rounded-2xl border border-[#26324c] bg-[#141d2e] px-4 py-4">
                  <p className="text-sm font-black" style={{ color: accent }}>
                    {c.name}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold leading-5 text-[#94a3b8]">{c.tagline}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nickname groups */}
        {p.nicknameGroups.length > 0 && (
          <section className="print-card mb-8 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
            <SectionTitle accent={accent}>Known aliases</SectionTitle>
            <div className="flex flex-col gap-4">
              {p.nicknameGroups.map((g) => (
                <div key={g.title}>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#94a3b8]">{g.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.names.map((n) => (
                      <span
                        key={n}
                        className="rounded-full border border-[#26324c] bg-[#0b1220] px-3.5 py-1.5 text-sm font-bold text-[#e8edf5]"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Situational names */}
        {p.situationalNames.length > 0 && (
          <section className="print-card mb-8 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
            <SectionTitle accent={accent}>Depends when you ask</SectionTitle>
            <ul className="space-y-2.5">
              {p.situationalNames.map((s) => (
                <li key={s.name + s.when} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="font-semibold text-[#94a3b8]">{s.when}</span>
                  <span className="text-right font-black text-[#e8edf5]">{s.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Story / humor sections from the record */}
        {p.sections.map((s) => (
          <section key={s.title} className="print-card mb-8 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
            <SectionTitle accent={accent}>{s.title}</SectionTitle>
            <div className="space-y-2.5 text-sm font-semibold leading-6 text-[#e8edf5]">
              {s.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>
        ))}

        {/* Charges */}
        {p.funnyCharges.length > 0 && (
          <section className="print-card mb-8 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
            <SectionTitle accent={accent}>Current charges</SectionTitle>
            <ul className="space-y-2 text-sm font-semibold leading-6 text-[#e8edf5]">
              {p.funnyCharges.map((c) => (
                <li key={c}>⚖️ {c}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Owner-supplied real sections — hidden until the owner fills them */}
        <OwnerListSection title="Personality (owner's words)" items={p.personalityNotes} accent={accent} />
        <OwnerListSection title="Real quirks" items={p.realQuirks} accent={accent} />
        <OwnerListSection title="Likes" items={p.likes} accent={accent} />
        <OwnerListSection title="Dislikes" items={p.dislikes} accent={accent} />
        <OwnerListSection title="Special abilities" items={p.abilities} accent={accent} />
        <OwnerListSection title="Weaknesses" items={p.weaknesses} accent={accent} />

        {/* The actual facts */}
        {p.verifiedFacts.length > 0 && (
          <section className="print-card mb-8 rounded-2xl border p-6" style={{ borderColor: `${accent}55`, background: "#141d2e" }}>
            <SectionTitle accent={accent}>The actual facts</SectionTitle>
            <ul className="flex flex-wrap gap-2">
              {p.verifiedFacts.map((f) => (
                <li
                  key={f.label}
                  className="rounded-full border border-[#26324c] bg-[#0b1220] px-4 py-1.5 text-xs font-bold text-[#e8edf5]"
                >
                  {f.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-semibold text-[#94a3b8]">
              These are real, straight from {p.profileType === "family" ? "the family" : "the rescue"}. The rest of the page is affectionate nonsense.
            </p>
          </section>
        )}

        {/* Shareable quotes */}
        {p.quotes.length > 0 && (
          <section className="mb-8">
            <SectionTitle accent={accent}>Lines worth stealing</SectionTitle>
            <QuoteCards quotes={p.quotes} />
          </section>
        )}

        {/* Share + print */}
        <section className="mb-10">
          <SectionTitle accent={accent}>Pass {p.realName} around</SectionTitle>
          <ProfileShareActions slug={p.slug} title={p.displayTitle} shareText={p.shareText} pageUrl={pageUrl} />
        </section>

        {/* Adoption status → the real mission */}
        {p.adoptionStatus === "home" ? (
          <section className="print-card mb-8 rounded-2xl border p-8 text-center" style={{ borderColor: `${accent}40`, background: "#141d2e" }}>
            <h2 className="text-2xl font-black text-[#e8edf5]">{p.realName} already has a home.</h2>
            {p.shelter && (
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#94a3b8]">
                Adopted from{" "}
                {p.shelter.url ? (
                  <a href={p.shelter.url} target="_blank" rel="noopener noreferrer" className="font-bold underline decoration-[#26324c] underline-offset-4" style={{ color: accent }}>
                    {p.shelter.name}
                  </a>
                ) : (
                  <strong className="text-[#e8edf5]">{p.shelter.name}</strong>
                )}
                {p.location ? `, ${p.location}` : ""}.
              </p>
            )}
            <p className="mt-4 text-base font-bold" style={{ color: accent }}>
              Meet a dog who still needs one.
            </p>
            <Link
              href="/#find"
              className="mt-4 inline-flex justify-center rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#0b1220] transition hover:opacity-90"
              style={{ background: accent }}
            >
              See adoptable dogs near you
            </Link>
          </section>
        ) : (
          p.adoptionUrl && (
            <section className="print-card mb-8 rounded-2xl border p-8 text-center" style={{ borderColor: `${accent}40`, background: "#141d2e" }}>
              <h2 className="text-2xl font-black text-[#e8edf5]">{p.realName} is looking for a home.</h2>
              <a
                href={p.adoptionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex justify-center rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#0b1220] transition hover:opacity-90"
                style={{ background: accent }}
              >
                Open the adoption listing →
              </a>
            </section>
          )
        )}

        {/* Quiet helper */}
        <section className="mb-6 text-center">
          <NameIdeasHelper />
        </section>

        <p className="no-print text-center">
          <Link href="/" className="text-sm font-bold" style={{ color: accent }}>
            ← Find more adoptable dogs near you
          </Link>
        </p>
      </div>
    </main>
  );
}
