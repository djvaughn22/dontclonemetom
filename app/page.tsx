"use client";

import { useState } from "react";
import OpenMirrorNav from "./OpenMirrorNav";

const shareLines = [
  "Don't clone me, Tom. I'm already here.",
  "I have one tail, zero trademarks, and unlimited love.",
  "Clone status: impossible. Original good boy.",
  "A second chance should not require a lab.",
  "Tom got a second chance. Let's give one to the dogs still waiting.",
  "We are not anti-love. We are pro-dog.",
  "Tom, if you're reading this, the pack saved you a spot.",
];

function DonationCalc() {
  const [amount, setAmount] = useState(50000);

  function message() {
    if (amount >= 50000)
      return "That could give dozens of rescues real breathing room — vet care, transport, foster support.";
    if (amount >= 10000) return "That could support a rescue operation for months. Real dogs. Real help.";
    if (amount >= 1000) return "That's rescue fuel. Vaccinations, food, transport for dogs already waiting.";
    if (amount >= 100) return "That helps real dogs already waiting.";
    return "That's not a clone. That's a second chance.";
  }

  return (
    <div className="rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2DD4BF] mb-2">
        Rescue Calculator
      </p>
      <p className="text-sm font-semibold text-[#94a3b8] mb-4">
        Drag to explore what a donation could do for rescues already working today.
      </p>
      <div className="mb-3">
        <span className="text-3xl font-black text-[#e8edf5]">
          ${amount.toLocaleString()}
        </span>
      </div>
      <input
        type="range"
        min={50}
        max={50000}
        step={50}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="w-full accent-[#2DD4BF] mb-4"
      />
      <p className="text-sm font-semibold leading-6 text-[#2DD4BF] bg-[#141d2e] rounded-xl px-4 py-3">
        {message()}
      </p>
    </div>
  );
}

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

type Pet = {
  id: string;
  name: string;
  age: string | null;
  sex: string | null;
  size: string | null;
  city: string | null;
  state: string | null;
  organizationName: string | null;
  photoUrl: string | null;
  description: string | null;
  adoptionUrl: string | null;
  distance: number | null;
};

function AdoptablePets() {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(50);
  const [species, setSpecies] = useState("dogs");
  const [phase, setPhase] = useState<
    "idle" | "loading" | "ok" | "empty" | "unconfigured" | "error"
  >("idle");
  const [pets, setPets] = useState<Pet[]>([]);
  const [searchedZip, setSearchedZip] = useState("");

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const z = zip.replace(/[^0-9]/g, "").slice(0, 5);
    if (z.length !== 5) {
      setPhase("error");
      return;
    }
    setSearchedZip(z);
    setPhase("loading");
    try {
      const res = await fetch(
        `/api/adoptable-pets?zip=${z}&radius=${radius}&species=${species}`,
      );
      const data = await res.json();
      // No key yet, or the key isn't returning data yet (RescueGroups approval):
      // show the "meet dogs now" fallback either way so the site always helps.
      if (data.status === "unconfigured" || data.status === "error") {
        setPets([]);
        setPhase("unconfigured");
        return;
      }
      const list: Pet[] = Array.isArray(data.pets) ? data.pets : [];
      setPets(list);
      setPhase(list.length ? "ok" : "empty");
    } catch {
      setPhase("error");
    }
  }

  const externalSearch = (site: "petfinder" | "adoptapet") =>
    site === "petfinder"
      ? `https://www.petfinder.com/search/dogs-for-adoption/?location=${searchedZip}`
      : `https://www.adoptapet.com/pet-search?geo_range=${radius}&location=${searchedZip}`;

  return (
    <div>
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[9rem] flex-1">
          <span className="mb-1 block text-xs font-black uppercase tracking-wide text-[#94a3b8]">ZIP code</span>
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 63101"
            aria-label="ZIP code"
            className="w-full rounded-full border border-[#26324c] bg-[#141d2e] px-5 py-3 text-base font-bold text-[#e8edf5] placeholder:text-[#94a3b8] outline-none focus:border-[#2DD4BF]"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-black uppercase tracking-wide text-[#94a3b8]">Distance</span>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            aria-label="Distance"
            className="rounded-full border border-[#26324c] bg-[#141d2e] px-4 py-3 text-sm font-bold text-[#e8edf5] outline-none focus:border-[#2DD4BF]"
          >
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
            <option value={100}>100 miles</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-black uppercase tracking-wide text-[#94a3b8]">Type</span>
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            aria-label="Species"
            className="rounded-full border border-[#26324c] bg-[#141d2e] px-4 py-3 text-sm font-bold text-[#e8edf5] outline-none focus:border-[#2DD4BF]"
          >
            <option value="dogs">Dogs</option>
            <option value="cats">Cats</option>
            <option value="any">Any</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#0b1220] transition hover:opacity-90"
        >
          Show me faces
        </button>
      </form>

      {phase === "error" && (
        <p className="mt-3 text-sm font-bold text-[#5eead4]">Please enter a valid 5-digit ZIP code.</p>
      )}
      {phase === "loading" && (
        <p className="mt-5 text-sm font-bold text-[#94a3b8]">Finding original good pups near {searchedZip}…</p>
      )}

      {phase === "unconfigured" && (
        <div className="mt-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6 text-center">
          <p className="text-base font-bold text-[#e8edf5]">First 3 closest dog faces near {searchedZip}.</p>
          <p className="mt-1 text-sm text-[#94a3b8]">
            The live rescue feed is still warming up. Until the partner feed returns photos, these links open real nearby adoptable dogs:
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a href={externalSearch("petfinder")} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#26324c] bg-[#0b1220] px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#2DD4BF]">Petfinder →</a>
            <a href={externalSearch("adoptapet")} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#26324c] bg-[#0b1220] px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#2DD4BF]">Adopt-a-Pet →</a>
          </div>
        </div>
      )}

      {phase === "empty" && (
        <div className="mt-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6 text-center">
          <p className="text-base font-bold text-[#e8edf5]">No pets found for that search yet.</p>
          <p className="mt-1 text-sm text-[#94a3b8]">Try a wider distance or another ZIP code.</p>
        </div>
      )}

      {phase === "ok" && (
        <>
          <p className="mt-5 text-xs font-black uppercase tracking-wide text-[#94a3b8]">
            {pets.length} faces near {searchedZip} · closest first
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {pets.slice(0, 3).map((p) => (
              <a
                key={p.id}
                href={p.adoptionUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-2xl bg-[#0b1220] ring-1 ring-[#26324c] transition hover:ring-[#2DD4BF]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoUrl as string}
                  alt={`${p.name}, adoptable near ${p.city || searchedZip}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  style={{ objectPosition: "center 28%" }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2.5 pt-8">
                  <p className="truncate text-sm font-black text-white">{p.name}</p>
                  <p className="text-[0.65rem] font-bold text-[#5eead4]">
                    {[p.age, p.size, p.distance != null ? `${p.distance} mi` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </a>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={externalSearch("petfinder")} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#94a3b8] underline underline-offset-2 hover:text-[#e8edf5]">See more nearby dogs on Petfinder</a>
            <a href={externalSearch("adoptapet")} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#94a3b8] underline underline-offset-2 hover:text-[#e8edf5]">See more nearby dogs on Adopt-a-Pet</a>
          </div>
        </>
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
          <p className="mt-4 text-lg font-black text-[#e8edf5] sm:text-xl">
            Don&apos;t clone me. Adopt me.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm font-bold text-[#2DD4BF] sm:text-base">
            Tom cloned his dog. There are millions of originals in shelters who&apos;ll do the zoomies for free.
          </p>
          <p className="mx-auto mb-8 mt-2 max-w-sm text-sm font-semibold text-[#94a3b8]">
            Scroll real rescue faces near you and meet the shelter ready to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#find"
              className="inline-flex justify-center rounded-full bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#0b1220] hover:opacity-90 transition"
            >
              🐶 Meet Real Dogs Near You
            </a>
            <a
              href="#rescue-challenge"
              className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#2DD4BF] hover:bg-[#141d2e] transition"
            >
              Take the $50K Rescue Challenge
            </a>
            <a
              href="#invite-tom"
              className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#e8edf5] hover:border-[#26324c] transition"
            >
              Invite Tom to Join the Pack
            </a>
          </div>
        </section>

        {/* Not Anti-Love */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <h2 className="text-xl font-black text-[#e8edf5] mb-3">Not Anti-Love. Pro-Dog.</h2>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-3">
            We get why people miss the dogs they loved. Grief makes people do big things.
            This campaign is not here to mock love. It is here to multiply it.
          </p>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8]">
            A cloned dog may be one family&apos;s second chance. A rescue dog is a first chance
            for a dog already waiting.
          </p>
        </section>

        {/* Live adoptable dogs by ZIP */}
        <section id="find" className="mb-6 rounded-2xl border border-[#2DD4BF]/30 bg-[#141d2e] p-6">
          <h2 className="text-2xl font-black text-[#e8edf5] mb-2">Don&apos;t clone me. Adopt me.</h2>
          <p className="text-sm font-semibold text-[#94a3b8] mb-5">
            Type your ZIP and scroll the faces of real rescue dogs near you — closest first. Every one an original. No lab, no waitlist, no $50,000.
          </p>
          <AdoptablePets />
        </section>

        {/* Why this source */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2DD4BF] mb-3">Why this source?</p>
          <ul className="space-y-2 text-sm font-semibold leading-6 text-[#94a3b8]">
            <li>🐾 Powered by <strong className="text-[#e8edf5]">RescueGroups.org</strong> — nonprofit, rescue-first pet data (not a big corporate monster).</li>
            <li>🐾 Photos and details come from rescue and shelter partners.</li>
            <li>🐾 You adopt through the <strong className="text-[#e8edf5]">original organization</strong> — we just help you find them.</li>
          </ul>
          <p className="mt-4 text-xs font-bold text-[#94a3b8]">We don&apos;t replace rescues or shelters. We help people find them. Adopt. Foster. Share. Don&apos;t clone.</p>
        </section>

        {/* Rescue Challenge */}
        <section id="rescue-challenge" className="mb-10">
          <h2 className="text-xl font-black text-[#e8edf5] mb-2">What Could One Clone Budget Do?</h2>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-4">
            Dog cloning can cost around $50,000. Imagine what that same amount could do for
            rescues already fighting for food, vet care, transport, foster support, and adoption help.
          </p>
          <DonationCalc />
        </section>

        {/* Invite Tom */}
        <section
          id="invite-tom"
          className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2DD4BF] mb-3">
            Public Invitation — Not an Endorsement
          </p>
          <h2 className="text-2xl font-black text-[#e8edf5] mb-4">Tom, Join the Pack.</h2>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-3">
            Tom, we know you love dogs. So do we.
          </p>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-3">
            This is a public, tail-wagging invitation: help turn one cloned-dog headline into
            thousands of rescue second chances.
          </p>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-5">
            No drama. No shame. Just dogs.
          </p>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#94a3b8] mb-5">
            This is an invitation, not an endorsement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: "DontCloneMeTom.com",
                    text: "Tom, the rescue pack is waiting. Don't clone me — I'm already here. DontCloneMeTom.com",
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-5 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-[#2DD4BF] hover:bg-[#141d2e] transition"
            >
              Share the Invite
            </button>
            <a
              href="https://www.petfinder.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-5 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-[#94a3b8] hover:border-[#26324c] transition"
            >
              Nominate a Rescue
            </a>
          </div>
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
          <h2 className="text-xl font-black text-[#e8edf5] mb-4">Find a Dog. Change a Life.</h2>
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
