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

function FindDogs() {
  const [zip, setZip] = useState("63040");

  // Load Petfinder's widget script once, then inject a small style into its
  // shadow DOM so cards show two-per-row on desktop (and stack on mobile).
  useEffect(() => {
    if (!document.querySelector("script[data-pet-scroller]")) {
      const s = document.createElement("script");
      s.src = "https://www.petfinder.com/pet-scroller.bundle.js";
      s.async = true;
      s.setAttribute("data-pet-scroller", "true");
      document.body.appendChild(s);
    }
    let tries = 0;
    const iv = setInterval(() => {
      const el = document.querySelector("pet-scroller") as
        | (HTMLElement & { shadowRoot: ShadowRoot | null })
        | null;
      const sr = el?.shadowRoot;
      if (sr && !sr.getElementById("dcmt-2col")) {
        const st = document.createElement("style");
        st.id = "dcmt-2col";
        st.textContent =
          "@media(min-width:640px){.grid-col_result{flex:0 0 48% !important;max-width:48% !important;box-sizing:border-box}}" +
          // Filter dropdowns render white-on-white by default — force readable text.
          ".multiselect-popup,.multiselect-popup-list,.multiselect-popup-list_single{background:#ffffff !important;}" +
          ".multiselect-listItem,.multiselect-listItem *,.multiselect-popup-list *{color:#111827 !important;}" +
          ".multiselect-listItem:hover,.multiselect-listItem[aria-selected=\"true\"]{background:#f1f5f9 !important;}" +
          ".multiselect-field,.multiselect-field-selection,.multiselect-field-selection *,.multiselectLabel{color:#111827 !important;}";
        sr.appendChild(st);
      }
      if (sr || ++tries > 40) clearInterval(iv);
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const clean = zip.match(/\d{5}/)?.[0] ?? "63040";
  const petfinderUrl = `https://www.petfinder.com/search/dogs-for-adoption/?location=${clean}&distance=50`;
  const adoptapetUrl = `https://www.adoptapet.com/dog-adoption/${clean}`;

  const openNearMe = () => window.open(petfinderUrl, "_blank", "noopener,noreferrer");

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          inputMode="numeric"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") openNearMe(); }}
          maxLength={5}
          aria-label="ZIP code"
          placeholder="ZIP code"
          className="w-full rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3 text-base font-bold text-[#e8edf5] placeholder-[#94a3b8] focus:border-[#2DD4BF] focus:outline-none sm:w-40"
        />
        <button
          onClick={openNearMe}
          className="inline-flex justify-center rounded-xl bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#0b1220] transition hover:opacity-90"
        >
          🐶 Find dogs near me
        </button>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#94a3b8]">
        Enter a ZIP to open dog-only searches on Petfinder and{" "}
        <a href={adoptapetUrl} target="_blank" rel="noopener noreferrer" className="text-[#2DD4BF] underline">Adopt-a-Pet</a>. Or meet adoptable dogs right here 👇
      </p>

      {/* Petfinder's live adoptable-dog widget (dogs only) */}
      <div
        className="mt-5 overflow-hidden rounded-2xl bg-white p-1"
        dangerouslySetInnerHTML={{
          __html:
            `<pet-scroller s3Url="https://dbw3zep4prcju.cloudfront.net/" apiBase="https://psl.petfinder.com/graphql" organization="[]" status="adoptable" petfinderUrl="https://www.petfinder.com/" type='["dog"]' hideBreed="false" limit="24" petListTitle=""></pet-scroller>`,
        }}
      />

      <a
        href={adoptapetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-[#26324c] bg-[#141d2e] px-5 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
      >
        <span>See more dogs on Adopt-a-Pet</span>
        <span className="text-[#94a3b8]">→</span>
      </a>
    </div>
  );
}

export default function DontCloneMeTom() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <OpenMirrorNav />
      <div className="mx-auto max-w-3xl px-5 py-10">

        {/* Hero — the domain is the whole hook (…Tom.com) */}
        <section className="text-center mb-10">
          <div className="mb-4 flex justify-center">
            <img
              src="/isaiah-icon.jpg"
              alt="Isaiah"
              width={128}
              height={128}
              className="rounded-full"
              style={{
                width: 128,
                height: 128,
                border: "3px solid #2DD4BF",
                boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              }}
            />
          </div>
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
            <li>🐾 The dogs on this page come live from <strong className="text-[#e8edf5]">Petfinder</strong>; you can also search <strong className="text-[#e8edf5]">Adopt-a-Pet</strong> — both original adoption sources.</li>
            <li>🐾 Photos and details come from real rescue and shelter partners on those sites.</li>
            <li>🐾 You adopt through the <strong className="text-[#e8edf5]">original organization</strong> — we just help you find them.</li>
          </ul>
          <p className="mt-4 text-xs font-bold text-[#94a3b8]">We don&apos;t replace rescues or shelters. We help people find them. Adopt. Foster. Share. Don&apos;t clone.</p>
        </section>

        {/* Thank you, Tom */}
        <section className="mb-10 rounded-2xl border border-[#2DD4BF]/25 bg-[#141d2e] p-8 text-center">
          <div className="mb-3 text-3xl" aria-hidden>🤍🐾</div>
          <h2 className="mb-3 text-2xl font-black text-[#e8edf5] sm:text-3xl">Thank you, Tom Brady.</h2>
          <p className="mx-auto max-w-md text-base font-bold leading-8 text-[#2DD4BF]">
            You showed the world how much a dog can mean.<br />
            We love you for it — now let&apos;s love a few million more.
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
              {
                emoji: "🏠",
                label: "Local shelters (St. Louis area)",
                links: [
                  { label: "Open Door Animal Sanctuary", href: "https://odas.org/" },
                  { label: "APA Adoption Center", href: "https://apamo.org/" },
                  { label: "Humane Society of Missouri", href: "https://hsmo.org/adopt/" },
                ],
              },
              {
                emoji: "🔎",
                label: "Adoption agencies",
                links: [
                  { label: "Petfinder", href: "https://www.petfinder.com/" },
                  { label: "Adopt-a-Pet", href: "https://www.adoptapet.com/" },
                  { label: "ASPCA — Adopt a Pet", href: "https://www.aspca.org/adopt-pet" },
                  { label: "Best Friends Animal Society", href: "https://bestfriends.org/" },
                ],
              },
              {
                emoji: "❤️",
                label: "Support a pet",
                links: [
                  { label: "ASPCA — Donate", href: "https://www.aspca.org/donate" },
                  { label: "Best Friends — Donate", href: "https://bestfriends.org/donate" },
                  { label: "The Humane Society of the United States", href: "https://www.humanesociety.org/" },
                ],
              },
              {
                emoji: "🐾",
                label: "Foster, if you can",
                links: [
                  { label: "How to foster a dog (Humane Society)", href: "https://www.humanesociety.org/resources/how-foster-dog" },
                  { label: "Foster with Best Friends", href: "https://bestfriends.org/adopt-or-foster/foster" },
                ],
              },
            ].map((cat) => (
              <details key={cat.label} className="group rounded-xl border border-[#26324c] bg-[#0b1220] px-5 py-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-[#e8edf5]">
                  <span>{cat.emoji} {cat.label}</span>
                  <span className="text-[#94a3b8] transition group-open:rotate-180">▾</span>
                </summary>
                <div className="mt-3 flex flex-col gap-2.5 border-t border-[#26324c] pt-3">
                  {cat.links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-[#2DD4BF] transition hover:text-[#5eead4] hover:underline"
                    >
                      {l.label} →
                    </a>
                  ))}
                </div>
              </details>
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
