"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { track } from "../../lib/analytics";
import { buildDeck, CARD_TRAITS } from "../../lib/cards/tradingCards";
import CardSpinner from "./CardSpinner";

// Make a dog card: photo, real name, a few true things — then the first
// card appears. Works for your dog, a family member's dog, a dog you know,
// or a real adoptable dog you're interested in. No long questionnaire.

const chip = (active: boolean) =>
  `rounded-full border px-4 py-2.5 text-sm font-bold transition ${
    active ? "border-[#2DD4BF] bg-[#2DD4BF] text-[#0b1220]" : "border-[#26324c] bg-[#0b1220] text-[#e8edf5] hover:border-[#2DD4BF]"
  }`;

export default function CardMaker() {
  const [realName, setRealName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [traits, setTraits] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const name = realName.trim();
  const deck = useMemo(() => buildDeck(name, traits), [name, traits]);

  function onPhoto(file: File | undefined) {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    // Local object URL only — the photo never leaves this browser.
    setPhotoUrl(file ? URL.createObjectURL(file) : undefined);
    if (file) track("dcmt_cards_photo_added");
  }

  function toggleTrait(id: string) {
    setTraits((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      {/* Intro */}
      <section className="mb-8 text-center">
        <h1 className="text-xs font-black uppercase tracking-[0.3em] text-[#94a3b8]">Fun Dog Trading Cards</h1>
        <p className="mt-2 font-black leading-[1.05] tracking-tight text-[#2DD4BF]" style={{ fontSize: "clamp(2rem, 8vw, 3.4rem)" }}>
          Make a dog card.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[#94a3b8]">
          Your dog, a family member&apos;s dog, a dog you know, or an adoptable
          dog you like. Free — the photo never leaves your device.
        </p>
      </section>

      {/* The dog */}
      <section className="mb-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className={chip(!!photoUrl)}>
              {photoUrl ? "Change photo" : "📷 Add a dog photo"}
            </button>
            {photoUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="The dog, as selected" className="h-14 w-14 rounded-xl border border-[#26324c] object-cover" />
                <button type="button" onClick={() => onPhoto(undefined)} className="text-xs font-bold text-[#94a3b8] underline underline-offset-4">
                  Remove
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Dog photo" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </div>
          <input
            type="text"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="Dog's real name"
            aria-label="Dog's real name"
            className="w-full rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3 text-base font-bold text-[#e8edf5] placeholder-[#94a3b8] focus:border-[#2DD4BF] focus:outline-none"
          />
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#94a3b8]">
              What is {name || "your dog"} known for? Pick a few — or skip it.
            </p>
            <div className="flex flex-wrap gap-2">
              {CARD_TRAITS.map((t) => (
                <button key={t.id} type="button" onClick={() => toggleTrait(t.id)} aria-pressed={traits.includes(t.id)} className={chip(traits.includes(t.id))}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The card */}
      {name ? (
        <section className="mb-8">
          <CardSpinner
            key={`${name}|${traits.join(",")}`}
            realName={name}
            photoUrl={photoUrl}
            photoAlt={photoUrl ? `${name}, as selected` : "No photo yet — a friendly dog placeholder"}
            deck={deck}
            shareUrl="https://dontclonemetom.com/cards"
            fileName={name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "dog"}
            analyticsId="cards"
          />
        </section>
      ) : (
        <p className="mb-8 text-center text-sm font-semibold text-[#94a3b8]">
          Type the dog&apos;s real name to see the first card.
        </p>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/dogs/isaiah" className="text-sm font-bold text-[#2DD4BF]">
          See Isaiah&apos;s card — he started this →
        </Link>
        <Link href="/#find" className="text-sm font-bold text-[#2DD4BF]">
          Meet an adoptable dog near you →
        </Link>
      </div>
    </div>
  );
}
