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

type Dog = {
  id: number;
  name: string;
  breed: string;
  age: string;
  gender: string;
  size: string;
  photo: string | null;
  city: string | null;
  state: string | null;
  distance: number | null;
  url: string;
};

function ZipDogSearch() {
  const [zip, setZip] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [searchedZip, setSearchedZip] = useState("");

  const petfinderLink = (z: string) =>
    `https://www.petfinder.com/search/dogs-for-adoption/?location=${z}`;

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
      const res = await fetch(`/api/dogs?zip=${z}`);
      const data = await res.json();
      setDogs(Array.isArray(data.dogs) ? data.dogs : []);
      setPhase("done");
    } catch {
      setDogs([]);
      setPhase("done");
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          inputMode="numeric"
          maxLength={5}
          placeholder="Enter your ZIP code"
          aria-label="ZIP code"
          className="flex-1 rounded-full border border-[#26324c] bg-[#141d2e] px-5 py-3.5 text-base font-bold text-[#e8edf5] placeholder:text-[#94a3b8] outline-none focus:border-[#2DD4BF]"
        />
        <button
          type="submit"
          className="rounded-full bg-[#2DD4BF] px-6 py-3.5 text-sm font-black uppercase tracking-[0.15em] text-[#0b1220] transition hover:opacity-90"
        >
          Find Dogs Near Me
        </button>
      </form>

      {phase === "error" && (
        <p className="mt-3 text-sm font-bold text-[#5eead4]">
          Please enter a valid 5-digit ZIP code.
        </p>
      )}

      {phase === "loading" && (
        <p className="mt-5 text-sm font-bold text-[#94a3b8]">
          Fetching good boys and girls near {searchedZip}…
        </p>
      )}

      {phase === "done" && dogs.length > 0 && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {dogs.map((dog) => (
              <a
                key={dog.id}
                href={dog.url}
                target="_blank"
                rel="noopener noreferrer"
                className="pop group overflow-hidden rounded-2xl border border-[#26324c] bg-[#141d2e] transition hover:border-[#2DD4BF]"
              >
                {dog.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dog.photo}
                    alt={dog.name}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-[#0b1220] text-5xl">
                    🐶
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-black text-[#e8edf5]">{dog.name}</h3>
                    {dog.distance !== null && (
                      <span className="shrink-0 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                        {dog.distance} mi
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-bold text-[#94a3b8]">
                    {dog.age} · {dog.gender} · {dog.breed}
                  </p>
                  {dog.city && (
                    <p className="mt-0.5 text-xs font-semibold text-[#94a3b8]">
                      {dog.city}, {dog.state}
                    </p>
                  )}
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.15em] text-[#2DD4BF]">
                    Meet {dog.name} →
                  </p>
                </div>
              </a>
            ))}
          </div>
          <a
            href={petfinderLink(searchedZip)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-full border border-[#26324c] bg-[#141d2e] px-5 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-[#2DD4BF] transition hover:border-[#2DD4BF]"
          >
            See more adoptable dogs near {searchedZip} →
          </a>
        </>
      )}

      {phase === "done" && dogs.length === 0 && (
        <div className="mt-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6 text-center">
          <p className="text-base font-bold text-[#e8edf5]">
            Real, original good boys and girls are waiting near {searchedZip} right now.
          </p>
          <a
            href={petfinderLink(searchedZip)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-full bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#0b1220] transition hover:opacity-90"
          >
            Meet adoptable dogs near {searchedZip} →
          </a>
          <p className="mt-3 text-xs font-semibold text-[#94a3b8]">
            Opens live adoptable dogs on Petfinder — real dogs, ready to go home.
          </p>
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

        {/* Hero */}
        <section className="text-center mb-12">
          <div className="mb-6 inline-flex items-baseline rounded-full border border-[#26324c] bg-[#141d2e] px-4 py-1.5 text-lg font-black tracking-tight sm:text-xl">
            <span className="text-[#e8edf5]">DontCloneMeTom</span>
            <span className="text-[#2DD4BF]">.com</span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#2DD4BF] mb-4">
            Campaign MVP · Rescue First
          </p>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight text-[#e8edf5] mb-5">
            Don&apos;t Clone Me, Tom.
          </h1>
          <p className="text-xl font-semibold text-[#e8edf5] mb-2">
            I&apos;m already here. I already wag. I already need a home.
          </p>
          <p className="text-base font-bold text-[#2DD4BF] mb-2 max-w-md mx-auto">
            Tom cloned his dog. There are millions of originals in shelters who&apos;ll do the zoomies for free.
          </p>
          <p className="text-sm font-semibold text-[#94a3b8] max-w-sm mx-auto mb-8">
            A rescue-first campaign for original dogs waiting for real homes today.
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
        <section id="find" className="mb-10 rounded-2xl border border-[#2DD4BF]/30 bg-[#141d2e] p-6">
          <h2 className="text-2xl font-black text-[#e8edf5] mb-2">Real dogs. Ready right now.</h2>
          <p className="text-sm font-semibold text-[#94a3b8] mb-5">
            Type your ZIP and meet original good boys and girls waiting for a home near you today — no lab, no waitlist, no $50,000.
          </p>
          <ZipDogSearch />
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
