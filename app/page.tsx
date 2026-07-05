"use client";

import { createElement, useEffect, useState } from "react";
import OpenMirrorNav from "./OpenMirrorNav";

const shareLines = [
  "Thanks for the spotlight. Now let’s help real dogs get seen.",
  "Original dogs are waiting near you.",
  "Adopt if you can. Foster if you can. Share if you can.",
  "A real dog near you may be waiting tonight.",
  "One headline can become one more adoption.",
  "Kindness first. Rescue first. Real dogs first.",
  "Don’t clone me. Find me.",
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

function PetfinderWidget() {
  useEffect(() => {
    if (document.querySelector('script[data-petfinder-scroller="true"]')) return;

    const script = document.createElement("script");
    script.src = "https://www.petfinder.com/pet-scroller.bundle.js";
    script.async = true;
    script.dataset.petfinderScroller = "true";
    document.body.appendChild(script);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#26324c] bg-white p-1">
      {createElement("pet-scroller", {
        s3Url: "https://dbw3zep4prcju.cloudfront.net/",
        apiBase: "https://psl.petfinder.com/graphql",
        organization: "[]",
        status: "adoptable",
        petfinderUrl: "https://www.petfinder.com/",
        hideBreed: "true",
        limit: "24",
        petListTitle: "",
      })}
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
            A cloned-dog headline got people talking. Let&apos;s use that attention to help real dogs get seen.
          </p>
          <p className="mx-auto mb-8 mt-2 max-w-sm text-sm font-semibold text-[#94a3b8]">
            Real adoptable pets from Petfinder. Find one. Help one. Share one.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#find"
              className="inline-flex justify-center rounded-full bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#0b1220] hover:opacity-90 transition"
            >
              🐶 Meet Adoptable Pets
            </a>
            <a
              href="#rescue-challenge"
              className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#2DD4BF] hover:bg-[#141d2e] transition"
            >
              Take the $50K Rescue Challenge
            </a>
            <a
              href="#share-real-dogs"
              className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#e8edf5] hover:border-[#26324c] transition"
            >
              Share Real Dogs
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
            Browse real adoptable pets from Petfinder below.
          </p>
          <PetfinderWidget />
        </section>

        {/* Why this source */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2DD4BF] mb-3">Why these sources?</p>
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
        {/* Thanks for the Spotlight */}
        <section
          id="share-real-dogs"
          className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2DD4BF] mb-3">
            Thankful for the Spotlight
          </p>
          <h2 className="text-2xl font-black text-[#e8edf5] mb-4">Use the Attention for Good.</h2>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-3">
            This page is not here to tease, shame, or send people after anyone.
          </p>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-3">
            The name says enough. The rest is simple: help people find real adoptable dogs near them.
          </p>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-5">
            Thanks for the publicity, Tom. Now let&apos;s point that attention toward dogs already waiting for homes.
          </p>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "DontCloneMeTom.com",
                  text: "Find real adoptable dogs near you. Don't clone me. Find me.",
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#0b1220] px-5 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-[#2DD4BF] hover:border-[#2DD4BF] transition"
          >
            Share Real Dogs
          </button>
        </section>

        {/* Shareable Lines */}
        <section className="mb-10">
          <h2 className="text-xl font-black text-[#e8edf5] mb-2">Share These Lines</h2>
          <p className="text-sm font-semibold text-[#94a3b8] mb-5">Tap any line to copy a kind rescue-first message.</p>
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
