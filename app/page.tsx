"use client";

import { useEffect, useState } from "react";
import OpenMirrorNav from "./OpenMirrorNav";

const shareLines = [
  "There’s a good dog near you looking for a home.",
  "Adopt if you can. Foster if you can. Share if you can.",
  "Every share helps one more dog get seen.",
  "Rescue first. Real dogs, real homes.",
  "Don’t clone me. Adopt me.",
];

function ShareCard({ line }: { line: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(line).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <button
      onClick={copy}
      className="block w-full text-left rounded-2xl border border-[#26324c] bg-[#141d2e] px-5 py-4 transition hover:border-[#26324c] hover:bg-[#141d2e] group"
    >
      <p className="text-sm font-semibold leading-6 text-[#e8edf5] group-hover:text-[#e8edf5]">
        &ldquo;{line}&rdquo;
      </p>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[#94a3b8] group-hover:text-[#2DD4BF]">
        {copied ? "Copied!" : "Tap to copy"}
      </p>
    </button>
  );
}

type Dog = { id: string; name: string; breed: string; photo: string; miles: number | null; city?: string | null; url: string };

function FindDogs() {
  const [zip, setZip] = useState("63040");
  const [activeZip, setActiveZip] = useState("63040");
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error">("loading");

  async function load(z: string) {
    const clean = z.match(/\d{5}/)?.[0] ?? "63040";
    setActiveZip(clean);
    setStatus("loading");
    // The upstream feed is intermittently flaky, so try a few times before
    // settling on the fallback links — a quick miss usually succeeds on retry.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`/api/adoptable-pets?zip=${clean}`);
        const data = await res.json();
        if (Array.isArray(data.dogs) && data.dogs.length > 0) {
          setDogs(data.dogs);
          setStatus("ok");
          return;
        }
      } catch {
        // fall through to retry
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1300));
    }
    setDogs([]);
    setStatus("error");
  }

  // Auto-load dogs near 63040 on first paint — no clicking required.
  useEffect(() => {
    load("63040");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clean = zip.match(/\d{5}/)?.[0] ?? "63040";
  const petfinderUrl = `https://www.petfinder.com/search/dogs-for-adoption/?location=${clean}&distance=50`;
  const adoptapetUrl = `https://www.adoptapet.com/dog-adoption/${activeZip}`;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          inputMode="numeric"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(zip); }}
          maxLength={5}
          aria-label="ZIP code"
          placeholder="ZIP code"
          className="w-full rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3 text-base font-bold text-[#e8edf5] placeholder-[#94a3b8] focus:border-[#2DD4BF] focus:outline-none sm:w-40"
        />
        <button
          onClick={() => load(zip)}
          className="inline-flex justify-center rounded-xl bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#0b1220] transition hover:opacity-90"
        >
          🐶 Find dogs near me
        </button>
      </div>

      {status === "loading" && (
        <p className="mt-5 text-sm font-semibold text-[#94a3b8]">Finding dogs near {activeZip}…</p>
      )}

      {status === "ok" && dogs.length > 0 && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {dogs.map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-2xl border border-[#26324c] bg-[#0b1220] transition hover:border-[#2DD4BF]"
              >
                <div className="aspect-square w-full overflow-hidden bg-[#141d2e]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.photo}
                    alt={d.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-black text-[#e8edf5]">{d.name}</p>
                  <p className="truncate text-xs font-semibold text-[#94a3b8]">{d.breed}</p>
                  {(d.city || d.miles != null) && (
                    <p className="mt-0.5 truncate text-xs font-semibold text-[#2DD4BF]">
                      {[d.city, d.miles != null ? `${d.miles} mi` : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
          <a
            href={adoptapetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex text-xs font-black uppercase tracking-[0.12em] text-[#2DD4BF] transition hover:underline"
          >
            See all dogs near {activeZip} on Adopt-a-Pet →
          </a>
          <p className="mt-2 text-xs font-semibold text-[#94a3b8]">
            Real adoptable dogs from Adopt-a-Pet. Tap a dog to meet them.
          </p>
        </>
      )}

      {(status === "empty" || status === "error") && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-[#94a3b8]">
            {status === "empty"
              ? `Couldn’t pull dogs for ${activeZip} right now — these open the adoption sites directly:`
              : "Couldn’t reach the adoption feed right now — these open the adoption sites directly:"}
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={petfinderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between rounded-xl border border-[#26324c] bg-[#0b1220] px-5 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
            >
              <span>See dogs on Petfinder</span>
              <span className="text-[#94a3b8]">→</span>
            </a>
            <a
              href={adoptapetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between rounded-xl border border-[#26324c] bg-[#0b1220] px-5 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
            >
              <span>See dogs on Adopt-a-Pet</span>
              <span className="text-[#94a3b8]">→</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DontCloneMeTom() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <OpenMirrorNav />
      <div className="mx-auto max-w-2xl px-5 py-10">

        {/* Hero — the domain is the whole hook (…Tom.com) */}
        <section className="text-center mb-10">
          <div className="mb-3 text-4xl">🐶</div>
          <h1
            className="font-black leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(1.4rem, 7vw, 3.75rem)" }}
          >
            <span className="text-[#e8edf5]">DontCloneMeTom</span>
            <span className="text-[#2DD4BF]">.com</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base font-bold text-[#2DD4BF] sm:text-lg">
            Good dogs looking for homes near you.
          </p>
          <p className="mx-auto mb-8 mt-2 max-w-sm text-sm font-semibold text-[#94a3b8]">
            Real, adoptable, and closer than you think.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#find"
              className="inline-flex justify-center rounded-full bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#0b1220] hover:opacity-90 transition"
            >
              See dogs near me
            </a>
            <a
              href="#share-real-dogs"
              className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#e8edf5] hover:border-[#26324c] transition"
            >
              Share
            </a>
          </div>
        </section>

        {/* Live adoptable dogs by ZIP */}
        <section id="find" className="mb-6 rounded-2xl border border-[#2DD4BF]/30 bg-[#141d2e] p-6">
          <h2 className="text-2xl font-black text-[#e8edf5] mb-2">Find a dog near you.</h2>
          <p className="text-sm font-semibold text-[#94a3b8] mb-5">
            Start at 63040 or type your ZIP to see adoptable dogs nearby.
          </p>
          <FindDogs />
        </section>

        {/* Why this source */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2DD4BF] mb-3">Why these sources?</p>
          <ul className="space-y-2 text-sm font-semibold leading-6 text-[#94a3b8]">
            <li>🐾 Searches open on <strong className="text-[#e8edf5]">Petfinder</strong> and <strong className="text-[#e8edf5]">Adopt-a-Pet</strong> — the original adoption sources.</li>
            <li>🐾 Photos and details come from real rescue and shelter partners on those sites.</li>
            <li>🐾 You adopt through the <strong className="text-[#e8edf5]">original organization</strong> — we just help you find them.</li>
          </ul>
          <p className="mt-4 text-xs font-bold text-[#94a3b8]">We don&apos;t replace rescues or shelters. We help people find them. Adopt. Foster. Share. Don&apos;t clone.</p>
        </section>

        {/* Thank you, Tom */}
        <section className="mb-10 rounded-2xl border border-[#2DD4BF]/25 bg-[#141d2e] p-6 text-center">
          <div className="mb-2 text-2xl" aria-hidden>🤍🐾</div>
          <h2 className="mb-3 text-xl font-black text-[#e8edf5]">Thank you, Tom Brady.</h2>
          <p className="mx-auto mb-3 max-w-xl text-sm font-semibold leading-7 text-[#94a3b8]">
            We love and respect Tom Brady and his choice — loving a pet that deeply is a beautiful thing.
            Not everyone can do it, and not everyone needs to.
          </p>
          <p className="mx-auto max-w-xl text-sm font-semibold leading-7 text-[#94a3b8]">
            But the attention it brought to how much we love our pets? That&apos;s a gift. Thank you, Tom,
            for reminding the world how much a dog can mean. We love you for it — and there are millions
            more dogs out there ready to be loved just the same.
          </p>
        </section>

        {/* Share */}
        <section
          id="share-real-dogs"
          className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6"
        >
          <h2 className="text-2xl font-black text-[#e8edf5] mb-3">Pass it on.</h2>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-5">
            Can&apos;t adopt right now? Sharing this helps a dog near someone else get noticed. That counts too.
          </p>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "DontCloneMeTom.com",
                  text: "Good dogs looking for homes near you — take a look.",
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#0b1220] px-5 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-[#2DD4BF] hover:border-[#2DD4BF] transition"
          >
            Share
          </button>
        </section>

        {/* Shareable Lines */}
        <section className="mb-10">
          <h2 className="text-xl font-black text-[#e8edf5] mb-2">Share These Lines</h2>
          <p className="text-sm font-semibold text-[#94a3b8] mb-5">Tap any line to copy it.</p>
          <div className="flex flex-col gap-3">
            {shareLines.map((line) => (
              <ShareCard key={line} line={line} />
            ))}
          </div>
        </section>

        {/* Find Dogs */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <h2 className="text-xl font-black text-[#e8edf5] mb-4">More ways to help.</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: "Find local shelters", href: "https://www.petfinder.com" },
              { label: "Search adoptable dogs", href: "https://www.adoptapet.com" },
              { label: "Support a rescue", href: "https://www.aspca.org/donate" },
              {
                label: "Foster if you can",
                href: "https://www.humanesociety.org/resources/how-foster-dog",
              },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between rounded-xl border border-[#26324c] bg-[#141d2e] px-5 py-3.5 text-sm font-black text-[#e8edf5] hover:border-[#26324c] hover:text-[#5eead4] transition"
              >
                <span>{item.label}</span>
                <span className="text-[#94a3b8]">→</span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold text-[#94a3b8]">
            Can&apos;t adopt? Share this page. That counts too.
          </p>
        </section>

        {/* Sources */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <h2 className="text-lg font-black text-[#e8edf5] mb-4">Sources &amp; Context</h2>
          <ul className="space-y-3 text-xs font-semibold text-[#94a3b8] list-disc list-inside leading-6">
            <li>
              Public reporting on Tom Brady confirming his dog Junie is a clone of his late dog
              Lua — widely covered by major news outlets in 2025.
            </li>
            <li>
              ViaGen Pets publicly lists dog cloning services. Pricing is publicly reported as
              approximately $50,000 USD, subject to change.
            </li>
            <li>
              ASPCA and Shelter Animals Count track shelter intake, adoption, and euthanasia
              statistics. Millions of dogs enter U.S. shelters annually.
            </li>
          </ul>
          <p className="mt-4 text-xs text-[#94a3b8]">
            All information is presented factually and neutrally. No claims are made beyond
            publicly available reporting.
          </p>
        </section>

        {/* Disclaimer */}
        <section className="rounded-2xl border border-[#26324c] bg-[#141d2e] p-5 mb-6">
          <p className="text-xs font-semibold leading-6 text-[#94a3b8]">
            <strong className="text-[#94a3b8]">Disclaimer:</strong> Don&apos;t Clone Me, Tom is an
            independent dog-rescue awareness project. It is not affiliated with, sponsored by, or
            endorsed by Tom Brady, Colossal Biosciences, ViaGen Pets, the NFL, the New England
            Patriots, the Tampa Bay Buccaneers, or any related trademark owner. No celebrity
            endorsement is claimed or implied.
          </p>
        </section>

        {/* Footer back to hub */}
        <div className="text-center">
          <p className="mb-3 text-sm font-black tracking-tight">
            <span className="text-[#94a3b8]">DontCloneMeTom</span>
            <span className="text-[#2DD4BF]">.com</span>
          </p>
          <a
            href="https://openmirrorllc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-black uppercase tracking-[0.2em] text-[#94a3b8] hover:text-[#94a3b8] transition"
          >
            ← Back to Open Mirror LLC
          </a>
        </div>

      </div>
    </main>
  );
}
