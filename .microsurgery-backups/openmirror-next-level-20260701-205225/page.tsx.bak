"use client";

import { useState } from "react";

const dogs = [
  {
    name: "Biscuit",
    age: "3 years",
    personality: "Couch potato with elite snack radar.",
    superpower: "Emotional support eyebrows.",
    cloneStatus: "100% Original",
  },
  {
    name: "Maple",
    age: "5 years",
    personality: "Loves long naps and longer ear scratches.",
    superpower: "Finds the warmest lap in any room.",
    cloneStatus: "100% Original",
  },
  {
    name: "Tank",
    age: "2 years",
    personality: "Big energy, bigger heart. Sits on command, sometimes.",
    superpower: "Makes you feel like a hero just for showing up.",
    cloneStatus: "100% Original",
  },
  {
    name: "June Bug",
    age: "4 years",
    personality: "Gentle, watchful, loyal from day one.",
    superpower: "Knows when you need quiet company.",
    cloneStatus: "100% Original",
  },
];

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
    <div className="rounded-2xl border border-[#262626] bg-[#151515] p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FB923C] mb-2">
        Rescue Calculator
      </p>
      <p className="text-sm font-semibold text-[#9A9188] mb-4">
        Drag to explore what a donation could do for rescues already working today.
      </p>
      <div className="mb-3">
        <span className="text-3xl font-black text-[#F5F0E8]">
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
        className="w-full accent-[#FB923C] mb-4"
      />
      <p className="text-sm font-semibold leading-6 text-[#FB923C] bg-[#151515] rounded-xl px-4 py-3">
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
      className="block w-full text-left rounded-2xl border border-[#262626] bg-[#151515] px-5 py-4 transition hover:border-[#262626] hover:bg-[#151515] group"
    >
      <p className="text-sm font-semibold leading-6 text-[#F5F0E8] group-hover:text-[#F5F0E8]">
        &ldquo;{line}&rdquo;
      </p>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[#9A9188] group-hover:text-[#FB923C]">
        {copied ? "Copied!" : "Tap to copy"}
      </p>
    </button>
  );
}

export default function DontCloneMeTom() {
  return (
    <main className="min-h-screen bg-[#0C0C0C] text-[#F5F0E8]">
      <div className="mx-auto max-w-2xl px-5 py-10">

        {/* Nav back */}
        <div className="flex items-center justify-between mb-10">
          <a
            href="https://openmirrorllc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#9A9188] hover:text-[#9A9188] transition"
          >
            ← Open Mirror LLC
          </a>
          <a
            href="https://crossheartpray.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-black uppercase tracking-[0.2em] text-[#FB923C] hover:text-[#FDBA74] transition"
          >
            CrossHeartPray ✝️
          </a>
        </div>

        {/* Hero */}
        <section className="text-center mb-12">
          <div className="mb-6 inline-flex items-baseline rounded-full border border-[#262626] bg-[#151515] px-4 py-1.5 text-lg font-black tracking-tight sm:text-xl">
            <span className="text-[#F5F0E8]">DontCloneMeTom</span>
            <span className="text-[#FB923C]">.com</span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#FB923C] mb-4">
            Campaign MVP · Rescue First
          </p>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight text-[#F5F0E8] mb-5">
            Don&apos;t Clone Me, Tom.
          </h1>
          <p className="text-xl font-semibold text-[#F5F0E8] mb-2">
            I&apos;m already here. I already wag. I already need a home.
          </p>
          <p className="text-sm font-semibold text-[#9A9188] max-w-sm mx-auto mb-8">
            A rescue-first campaign for original dogs waiting for real homes today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://www.petfinder.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-full bg-[#FB923C] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#0C0C0C] hover:opacity-90 transition"
            >
              Meet Dogs Near You
            </a>
            <a
              href="#rescue-challenge"
              className="inline-flex justify-center rounded-full border border-[#262626] bg-[#151515] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#FB923C] hover:bg-[#151515] transition"
            >
              Take the $50K Rescue Challenge
            </a>
            <a
              href="#invite-tom"
              className="inline-flex justify-center rounded-full border border-[#262626] bg-[#151515] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#F5F0E8] hover:border-[#262626] transition"
            >
              Invite Tom to Join the Pack
            </a>
          </div>
        </section>

        {/* Not Anti-Love */}
        <section className="mb-10 rounded-2xl border border-[#262626] bg-[#151515] p-6">
          <h2 className="text-xl font-black text-[#F5F0E8] mb-3">Not Anti-Love. Pro-Dog.</h2>
          <p className="text-sm font-semibold leading-7 text-[#9A9188] mb-3">
            We get why people miss the dogs they loved. Grief makes people do big things.
            This campaign is not here to mock love. It is here to multiply it.
          </p>
          <p className="text-sm font-semibold leading-7 text-[#9A9188]">
            A cloned dog may be one family&apos;s second chance. A rescue dog is a first chance
            for a dog already waiting.
          </p>
        </section>

        {/* Dog Cards */}
        <section className="mb-10">
          <h2 className="text-xl font-black text-[#F5F0E8] mb-2">Meet the Originals</h2>
          <p className="text-sm font-semibold text-[#9A9188] mb-5">
            These are stand-ins for the real dogs waiting in shelters near you — same energy, same love, genuinely 100% original.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {dogs.map((dog) => (
              <div
                key={dog.name}
                className="rounded-2xl border border-[#262626] bg-[#151515] p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-black text-[#F5F0E8]">{dog.name}</h3>
                    <p className="text-xs text-[#9A9188] font-semibold">{dog.age}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#262626] bg-[#151515] px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#9A9188]">
                    {dog.cloneStatus}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#9A9188] mb-1">{dog.personality}</p>
                <p className="text-xs font-semibold text-[#FB923C]">
                  Superpower: {dog.superpower}
                </p>
                <a
                  href="https://www.petfinder.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block w-full rounded-full border border-[#262626] bg-[#151515] py-2 text-xs font-black uppercase tracking-[0.15em] text-[#FB923C] hover:bg-[#151515] transition text-center"
                >
                  Find a Dog Like This →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Rescue Challenge */}
        <section id="rescue-challenge" className="mb-10">
          <h2 className="text-xl font-black text-[#F5F0E8] mb-2">What Could One Clone Budget Do?</h2>
          <p className="text-sm font-semibold leading-7 text-[#9A9188] mb-4">
            Dog cloning can cost around $50,000. Imagine what that same amount could do for
            rescues already fighting for food, vet care, transport, foster support, and adoption help.
          </p>
          <DonationCalc />
        </section>

        {/* Invite Tom */}
        <section
          id="invite-tom"
          className="mb-10 rounded-2xl border border-[#262626] bg-[#151515] p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FB923C] mb-3">
            Public Invitation — Not an Endorsement
          </p>
          <h2 className="text-2xl font-black text-[#F5F0E8] mb-4">Tom, Join the Pack.</h2>
          <p className="text-sm font-semibold leading-7 text-[#9A9188] mb-3">
            Tom, we know you love dogs. So do we.
          </p>
          <p className="text-sm font-semibold leading-7 text-[#9A9188] mb-3">
            This is a public, tail-wagging invitation: help turn one cloned-dog headline into
            thousands of rescue second chances.
          </p>
          <p className="text-sm font-semibold leading-7 text-[#9A9188] mb-5">
            No drama. No shame. Just dogs.
          </p>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9A9188] mb-5">
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
              className="inline-flex justify-center rounded-full border border-[#262626] bg-[#151515] px-5 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-[#FB923C] hover:bg-[#151515] transition"
            >
              Share the Invite
            </button>
            <a
              href="https://www.petfinder.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-full border border-[#262626] bg-[#151515] px-5 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-[#9A9188] hover:border-[#262626] transition"
            >
              Nominate a Rescue
            </a>
          </div>
        </section>

        {/* Shareable Lines */}
        <section className="mb-10">
          <h2 className="text-xl font-black text-[#F5F0E8] mb-2">Share These Lines</h2>
          <p className="text-sm font-semibold text-[#9A9188] mb-5">Tap any line to copy it.</p>
          <div className="flex flex-col gap-3">
            {shareLines.map((line) => (
              <ShareCard key={line} line={line} />
            ))}
          </div>
        </section>

        {/* Find Dogs */}
        <section className="mb-10 rounded-2xl border border-[#262626] bg-[#151515] p-6">
          <h2 className="text-xl font-black text-[#F5F0E8] mb-4">Find a Dog. Change a Life.</h2>
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
                className="inline-flex items-center justify-between rounded-xl border border-[#262626] bg-[#151515] px-5 py-3.5 text-sm font-black text-[#F5F0E8] hover:border-[#262626] hover:text-[#FDBA74] transition"
              >
                <span>{item.label}</span>
                <span className="text-[#9A9188]">→</span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold text-[#9A9188]">
            Can&apos;t adopt? Share this page. That counts too.
          </p>
        </section>

        {/* Sources */}
        <section className="mb-10 rounded-2xl border border-[#262626] bg-[#151515] p-6">
          <h2 className="text-lg font-black text-[#F5F0E8] mb-4">Sources &amp; Context</h2>
          <ul className="space-y-3 text-xs font-semibold text-[#9A9188] list-disc list-inside leading-6">
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
          <p className="mt-4 text-xs text-[#9A9188]">
            All information is presented factually and neutrally. No claims are made beyond
            publicly available reporting.
          </p>
        </section>

        {/* Disclaimer */}
        <section className="rounded-2xl border border-[#262626] bg-[#151515] p-5 mb-6">
          <p className="text-xs font-semibold leading-6 text-[#9A9188]">
            <strong className="text-[#9A9188]">Disclaimer:</strong> Don&apos;t Clone Me, Tom is an
            independent dog-rescue awareness project. It is not affiliated with, sponsored by, or
            endorsed by Tom Brady, Colossal Biosciences, ViaGen Pets, the NFL, the New England
            Patriots, the Tampa Bay Buccaneers, or any related trademark owner. No celebrity
            endorsement is claimed or implied.
          </p>
        </section>

        {/* Footer back to hub */}
        <div className="text-center">
          <p className="mb-3 text-sm font-black tracking-tight">
            <span className="text-[#9A9188]">DontCloneMeTom</span>
            <span className="text-[#FB923C]">.com</span>
          </p>
          <a
            href="https://openmirrorllc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-black uppercase tracking-[0.2em] text-[#9A9188] hover:text-[#9A9188] transition"
          >
            ← Back to Open Mirror LLC
          </a>
        </div>

      </div>
    </main>
  );
}
