import Link from "next/link";
import type { DogProfileV1 } from "../../lib/dogProfiles";
import CardSpinner from "../cards/CardSpinner";

// Renders any DogProfileV1 record as a Fun Dog Trading Card page: one
// collectible card up top, spin + share, then the real facts and the real
// mission. One record + one photo = a whole page.

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <p className="mb-3 text-xs font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
      {children}
    </p>
  );
}

export default function DogProfileView({ profile }: { profile: DogProfileV1 }) {
  const p = profile;
  const accent = p.theme.accent;
  const pageUrl = `https://dontclonemetom.com/dogs/${p.slug}`;

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* The card */}
        <section className="mb-10">
          <div className="mb-5 text-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#94a3b8]">
              Fun Dog Trading Cards
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#e8edf5]">What would you nickname me?</h2>
            <p className="mx-auto mt-1 max-w-md text-sm font-semibold leading-6 text-[#94a3b8]">
              Spin through seven names made especially for {p.realName} and
              share your favorite card.
            </p>
          </div>
          <CardSpinner
            realName={p.realName}
            photoUrl={p.primaryImage}
            photoAlt={p.primaryImageAlt}
            deck={p.cards}
            photoSpec={p.photoSpec}
            shareUrl={pageUrl}
            fileName={p.slug}
            analyticsId={p.slug}
            makerHref={`/cards?dog=${p.slug}`}
          />
          {p.intro.length > 0 && (
            <div className="mx-auto mt-6 max-w-md text-center">
              {p.intro.map((line) => (
                <p key={line} className="text-base font-bold leading-7 text-[#e8edf5]">
                  {line}
                </p>
              ))}
            </div>
          )}
        </section>

        {/* The actual facts */}
        {p.verifiedFacts.length > 0 && (
          <section className="mb-8 rounded-2xl border p-6" style={{ borderColor: `${accent}55`, background: "#141d2e" }}>
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
              These are real, straight from {p.profileType === "family" ? "the family" : "the rescue"}. The cards are affectionate nonsense.
            </p>
          </section>
        )}

        {/* Make one for your dog */}
        <section className="mb-8 rounded-2xl border p-6 text-center" style={{ borderColor: `${accent}40`, background: "#141d2e" }}>
          <SectionTitle accent={accent}>Your dog belongs on one of these</SectionTitle>
          <p className="mx-auto max-w-md text-sm font-semibold leading-6 text-[#94a3b8]">
            Add a photo, type the real name, pick a few true things — spin and
            share new cards. Free, and the photo never leaves your device.
          </p>
          <Link
            href="/cards"
            className="mt-4 inline-flex justify-center rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#0b1220] transition hover:opacity-90"
            style={{ background: accent }}
          >
            Make one for your dog
          </Link>
        </section>

        {/* Adoption status → the real mission */}
        {p.adoptionStatus === "home" ? (
          <section className="mb-8 rounded-2xl border p-8 text-center" style={{ borderColor: `${accent}40`, background: "#141d2e" }}>
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
            <section className="mb-8 rounded-2xl border p-8 text-center" style={{ borderColor: `${accent}40`, background: "#141d2e" }}>
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

        <p className="text-center">
          <Link href="/" className="text-sm font-bold" style={{ color: accent }}>
            ← Find more adoptable dogs near you
          </Link>
        </p>
      </div>
    </main>
  );
}
