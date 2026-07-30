"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { track } from "../../lib/analytics";
import {
  BEHAVIOR_CATALOG,
  MOOD_CATALOG,
  SITUATION_CATALOG,
  factFromCatalog,
  factFromOwnerText,
} from "../../lib/identity/behaviors";
import {
  deal,
  lockWord,
  newSession,
  removeSuggestion,
  resetSession,
  restoreSuggestion,
  saveFavorite,
  setLaneFilter,
  surpriseMe,
  unsaveFavorite,
  type ShuffleSession,
} from "../../lib/identity/shuffle";
import { SPORT_LANES, type ConfirmedFact, type InspirationLane, type NicknameCandidate, type ActivityLevel } from "../../lib/identity/types";
import { createDesignSpec, reviseDesign, type DesignSpecV1 } from "../../lib/identity/designSpec";
import type { ProviderStatus } from "../../lib/identity/commerce";
import PosterPreview from "./PosterPreview";

// The free Dog Legend studio. Everything here is free and everything stays
// in the visitor's browser: the photo is a local object URL, favorites and
// designs live in localStorage, and nothing is uploaded.

const DESIGNS_KEY = "dcmt-designs-v1";

export function loadDesigns(): DesignSpecV1[] {
  try {
    const raw = window.localStorage.getItem(DESIGNS_KEY);
    const parsed = raw ? (JSON.parse(raw) as DesignSpecV1[]) : [];
    return Array.isArray(parsed) ? parsed.filter((d) => d?.version === 1) : [];
  } catch {
    return [];
  }
}

function persistDesign(design: DesignSpecV1) {
  try {
    const rest = loadDesigns().filter((d) => d.designId !== design.designId);
    window.localStorage.setItem(DESIGNS_KEY, JSON.stringify([design, ...rest].slice(0, 20)));
  } catch {
    // storage blocked — the session state still works
  }
}

// Lane chips shown to the player — friendly labels over engine lanes.
const LANE_CHIPS: { label: string; lanes: InspirationLane[] }[] = [
  { label: "Everything", lanes: [] },
  { label: "Sports", lanes: SPORT_LANES },
  { label: "Football", lanes: ["football"] },
  { label: "Basketball", lanes: ["basketball"] },
  { label: "Baseball", lanes: ["baseball"] },
  { label: "Hockey", lanes: ["hockey"] },
  { label: "Soccer", lanes: ["soccer"] },
  { label: "Stars & icons", lanes: ["celebrity", "actors", "musicians", "historical", "broadcasters"] },
  { label: "Heroes & villains", lanes: ["superheroes", "villains", "action-movies", "fictional"] },
  { label: "Royalty & rank", lanes: ["royalty", "military-titles", "professions"] },
  { label: "Food", lanes: ["food"] },
  { label: "Chaos & speed", lanes: ["chaos", "speed", "weather", "extreme-sports"] },
  { label: "Soft & sleepy", lanes: ["sleep", "affection"] },
  { label: "Mischief", lanes: ["mischief", "comedy", "household"] },
];

const RISK_BADGE: Record<NicknameCandidate["rightsRisk"], { label: string; title: string }> = {
  playSafe: { label: "play-safe", title: "Generic wordplay — fine everywhere." },
  manualReview: { label: "game-only for now", title: "Fun to play with; a human review is required before this could ever go on merchandise." },
  blockedForMerch: { label: "game-only", title: "Contains a protected name — never sold on anything." },
};

const chip = (active: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
    active ? "border-[#2DD4BF] bg-[#2DD4BF] text-[#0b1220]" : "border-[#26324c] bg-[#0b1220] text-[#e8edf5] hover:border-[#2DD4BF]"
  }`;

const inputCls =
  "w-full rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3 text-base font-bold text-[#e8edf5] placeholder-[#94a3b8] focus:border-[#2DD4BF] focus:outline-none";

export default function LegendStudio({
  providers,
  donationLine,
}: {
  providers: ProviderStatus[];
  donationLine: string | null;
}) {
  // ── dog inputs ──
  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoName, setPhotoName] = useState<string | undefined>(undefined);
  const [activity, setActivity] = useState<ActivityLevel | undefined>(undefined);
  const [facts, setFacts] = useState<ConfirmedFact[]>([]);
  const [customText, setCustomText] = useState("");

  // ── shuffle session ──
  const [session, setSession] = useState<ShuffleSession>(() => newSession(`legend-${Date.now()}`));
  const [deck, setDeck] = useState<NicknameCandidate[]>([]);
  const [laneChip, setLaneChip] = useState("Everything");
  const [pinSource, setPinSource] = useState<NicknameCandidate | null>(null);

  // ── hero + design ──
  const [heroPick, setHeroPick] = useState<NicknameCandidate | null>(null);
  const [design, setDesign] = useState<DesignSpecV1 | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const canPlay = realName.trim().length > 0;

  const baseInput = useMemo(
    () => ({
      realName,
      existingNickname: nickname || undefined,
      facts,
      activityLevel: activity,
    }),
    [realName, nickname, facts, activity],
  );

  function shuffle() {
    if (!canPlay) return;
    const r = deal(session, baseInput, 6);
    setSession(r.session);
    setDeck(r.candidates);
    track("dcmt_legend_shuffled", { step: r.session.step });
  }

  function toggleFact(fact: ConfirmedFact) {
    setFacts((prev) => (prev.some((f) => f.id === fact.id) ? prev.filter((f) => f.id !== fact.id) : [...prev, fact]));
  }

  function addCustomFact() {
    const fact = factFromOwnerText(customText, "behavior");
    if (!fact) return;
    setFacts((prev) => (prev.some((f) => f.id === fact.id) ? prev : [...prev, fact]));
    setCustomText("");
  }

  function pickLane(label: string, lanes: InspirationLane[]) {
    setLaneChip(label);
    setSession((s) => setLaneFilter(s, lanes.length ? lanes : undefined));
  }

  function onPhoto(file: File | undefined) {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const nextName = file?.name;
    // Local object URL only — the photo never leaves this browser.
    setPhotoUrl(file ? URL.createObjectURL(file) : undefined);
    setPhotoName(nextName);
    if (design && design.photoRef !== nextName) {
      const next = reviseDesign(design, { photoRef: nextName }, "Photo updated");
      setDesign(next);
      persistDesign(next);
    }
  }

  function chooseHero(c: NicknameCandidate) {
    setHeroPick(c);
    const next = design
      ? reviseDesign(design, { heroName: c.nickname, subtitle: c.matchedFactText ?? c.situational, photoRef: photoName, facts }, `Hero identity set to ${c.nickname}`)
      : createDesignSpec({
          dogRef: `anon-${session.seed}`,
          realName: realName.trim(),
          heroName: c.nickname,
          subtitle: c.matchedFactText ?? c.situational,
          photoRef: photoName,
          facts,
        });
    setDesign(next);
    persistDesign(next);
    track("dcmt_legend_hero_chosen", { lane: c.lane });
  }

  const favoriteIds = new Set(session.favorites.map((f) => f.id));
  const shopify = providers.find((p) => p.provider === "shopify");
  const etsy = providers.find((p) => p.provider === "etsy");
  const shopReady = !!shopify?.publicUrl;

  const purchaseActions = [
    "Remove the Isaiah watermark",
    "Download the high-resolution digital poster",
    "Order the printed poster",
    "Put this design on a mug",
    "Put this design on a shirt",
    "Put this design on a tote",
    "Shop all Dog Legend products",
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      {/* Intro */}
      <section className="mb-8 text-center">
        <h1 className="text-xs font-black uppercase tracking-[0.3em] text-[#94a3b8]">Dog Legend Studio</h1>
        <p className="mt-2 font-black leading-[1.05] tracking-tight text-[#2DD4BF]" style={{ fontSize: "clamp(2rem, 8vw, 3.4rem)" }}>
          Every dog is somebody.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[#94a3b8]">
          Real name + real habits + today&apos;s mood = the fitting identity. You confirm
          what&apos;s true; the shuffle does the rest. Free, no account, and your photo
          never leaves your device.
        </p>
      </section>

      {/* 1 · the dog */}
      <section className="mb-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">1 · Your dog</p>
        <div className="flex flex-col gap-3">
          <input type="text" value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="Dog's real name (required)" aria-label="Dog's real name" className={inputCls} />
          <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Existing nickname, if any" aria-label="Existing nickname" className={inputCls} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className={chip(!!photoUrl)}>
              {photoUrl ? "Change photo" : "Add a photo (stays on your device)"}
            </button>
            {photoUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Your dog, as selected" className="h-14 w-14 rounded-xl border border-[#26324c] object-cover" />
                <button type="button" onClick={() => onPhoto(undefined)} className="text-xs font-bold text-[#94a3b8] underline underline-offset-4">
                  Remove
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Dog photo" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </div>
        </div>
      </section>

      {/* 2 · what's true */}
      <section className="mb-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
        <p className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">2 · What&apos;s actually true</p>
        <p className="mb-3 text-xs font-semibold text-[#94a3b8]">
          Pick only what your dog really does — the best names come from the truth. Nothing here is assumed.
        </p>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#94a3b8]">Behaviors &amp; quirks</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {BEHAVIOR_CATALOG.map((e) => (
            <button key={e.id} type="button" onClick={() => toggleFact(factFromCatalog(e))} aria-pressed={facts.some((f) => f.id === e.id)} className={chip(facts.some((f) => f.id === e.id))}>
              {e.label}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#94a3b8]">Today&apos;s mood</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {MOOD_CATALOG.map((e) => (
            <button key={e.id} type="button" onClick={() => toggleFact(factFromCatalog(e))} aria-pressed={facts.some((f) => f.id === e.id)} className={chip(facts.some((f) => f.id === e.id))}>
              {e.label}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#94a3b8]">Situations</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {SITUATION_CATALOG.map((e) => (
            <button key={e.id} type="button" onClick={() => toggleFact(factFromCatalog(e))} aria-pressed={facts.some((f) => f.id === e.id)} className={chip(facts.some((f) => f.id === e.id))}>
              {e.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomFact()}
            placeholder="Add your own truth (e.g. steals exactly one shoe)"
            aria-label="Add your own behavior"
            className={inputCls}
          />
          <button type="button" onClick={addCustomFact} className="shrink-0 rounded-xl border border-[#26324c] px-4 text-sm font-black text-[#e8edf5] hover:border-[#2DD4BF]">
            Add
          </button>
        </div>
        <p className="mb-2 mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#94a3b8]">Energy level</p>
        <div className="flex flex-wrap gap-2">
          {(["chill", "moderate", "rocket"] as ActivityLevel[]).map((a) => (
            <button key={a} type="button" onClick={() => setActivity(activity === a ? undefined : a)} aria-pressed={activity === a} className={chip(activity === a)}>
              {a === "chill" ? "Professional napper" : a === "moderate" ? "Standard dog energy" : "Full rocket"}
            </button>
          ))}
        </div>
      </section>

      {/* 3 · inspiration + shuffle */}
      <section className="mb-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">3 · Inspiration</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {LANE_CHIPS.map((l) => (
            <button key={l.label} type="button" onClick={() => pickLane(l.label, l.lanes)} aria-pressed={laneChip === l.label} className={chip(laneChip === l.label)}>
              {l.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setLaneChip("Everything");
              setSession((s) => surpriseMe(s));
              shuffle();
            }}
            className={chip(false)}
          >
            🎲 Surprise me
          </button>
        </div>
        {session.lockedWord && (
          <p className="mb-3 text-sm font-bold text-[#e8edf5]">
            Keeping every name that includes <span className="text-[#2DD4BF]">“{session.lockedWord}”</span>{" "}
            <button type="button" onClick={() => setSession((s) => lockWord(s, undefined))} className="ml-1 text-xs font-black text-[#94a3b8] underline underline-offset-4">
              unlock
            </button>
          </p>
        )}
        <button
          type="button"
          onClick={shuffle}
          disabled={!canPlay}
          className="w-full rounded-2xl bg-[#2DD4BF] px-6 py-4 text-base font-black uppercase tracking-[0.12em] text-[#0b1220] transition hover:opacity-90 disabled:opacity-40"
        >
          {deck.length ? "Shuffle again" : "Deal the first names"}
        </button>
        {!canPlay && <p className="mt-2 text-center text-xs font-semibold text-[#94a3b8]">Type your dog&apos;s real name first.</p>}

        {/* the deck */}
        {deck.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {deck.map((c) => (
              <div key={c.id} className="rounded-2xl border border-[#26324c] bg-[#0b1220] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-black leading-6 text-[#e8edf5]">{c.nickname}</p>
                  <span className="shrink-0 rounded-full border border-[#26324c] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#94a3b8]" title={RISK_BADGE[c.rightsRisk].title}>
                    {RISK_BADGE[c.rightsRisk].label}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#94a3b8]">{c.wordplay}</p>
                {c.matchedFactText && <p className="mt-1 text-[11px] font-bold text-[#2DD4BF]">because: {c.matchedFactText.toLowerCase()}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSession((s) => (favoriteIds.has(c.id) ? unsaveFavorite(s, c.id) : saveFavorite(s, c)))} className={chip(favoriteIds.has(c.id))} aria-pressed={favoriteIds.has(c.id)}>
                    {favoriteIds.has(c.id) ? "♥ Saved" : "♡ Save"}
                  </button>
                  <button type="button" onClick={() => setPinSource(pinSource?.id === c.id ? null : c)} className={chip(pinSource?.id === c.id)}>
                    📌 Keep a word
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSession((s) => removeSuggestion(s, c));
                      setDeck((d) => d.filter((x) => x.id !== c.id));
                    }}
                    className={chip(false)}
                  >
                    ✕ Not this dog
                  </button>
                </div>
                {pinSource?.id === c.id && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[...new Set(c.nickname.replace(/[^a-zA-Z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 2))].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setSession((s) => lockWord(s, w));
                          setPinSource(null);
                        }}
                        className="rounded-full border border-[#26324c] px-2.5 py-1 text-xs font-bold text-[#e8edf5] hover:border-[#2DD4BF]"
                      >
                        keep “{w}”
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {(deck.length > 0 || session.removed.length > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#94a3b8]">
            <button
              type="button"
              onClick={() => {
                setSession((s) => resetSession(s));
                setDeck([]);
              }}
              className="underline underline-offset-4 hover:text-[#e8edf5]"
            >
              Reset the shuffle
            </button>
            {session.removed.length > 0 && (
              <span>
                {session.removed.length} set aside ·{" "}
                {session.removed.map((r) => (
                  <button key={r.id} type="button" onClick={() => setSession((s) => restoreSuggestion(s, r.id))} className="mr-2 underline underline-offset-4 hover:text-[#e8edf5]">
                    restore “{r.nickname}”
                  </button>
                ))}
              </span>
            )}
          </div>
        )}
      </section>

      {/* 4 · favorites + hero pick */}
      {session.favorites.length > 0 && (
        <section className="mb-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <p className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">4 · Saved favorites</p>
          <p className="mb-3 text-xs font-semibold text-[#94a3b8]">Pick one as the current hero identity — it goes on the poster.</p>
          <div className="flex flex-col gap-2">
            {session.favorites.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: heroPick?.id === f.id ? "#2DD4BF" : "#26324c" }}>
                <div>
                  <p className="text-sm font-black text-[#e8edf5]">{f.nickname}</p>
                  <p className="text-[11px] font-semibold text-[#94a3b8]">{f.wordplay}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => chooseHero(f)} className={chip(heroPick?.id === f.id)} aria-pressed={heroPick?.id === f.id}>
                    {heroPick?.id === f.id ? "★ Hero" : "Make hero"}
                  </button>
                  <button type="button" onClick={() => setSession((s) => unsaveFavorite(s, f.id))} className={chip(false)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5 · the poster */}
      {heroPick && realName.trim() && (
        <section className="mb-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">5 · The free poster preview</p>
          <PosterPreview
            data={{
              realName: realName.trim(),
              heroName: heroPick.nickname,
              subtitle: heroPick.matchedFactText ?? heroPick.situational,
              photoUrl,
            }}
          />
        </section>
      )}

      {/* 6 · the shop, truthfully */}
      {heroPick && (
        <section className="mb-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <p className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">Take it past the preview</p>
          {donationLine && <p className="mb-2 text-xs font-bold text-[#e8edf5]">{donationLine}</p>}
          {shopReady ? (
            <div className="flex flex-col gap-2">
              {purchaseActions.map((label) => (
                <a key={label} href={shopify!.publicUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[#26324c] px-4 py-3 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF]">
                  {label} →
                </a>
              ))}
              <a href={shopify!.publicUrl} target="_blank" rel="noopener noreferrer" className="mt-1 rounded-2xl bg-[#2DD4BF] px-4 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-[#0b1220]">
                Continue to Shopify checkout
              </a>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold leading-6 text-[#94a3b8]">
                The clean version, printed posters, mugs, shirts, and totes are on the
                way — the shop isn&apos;t open yet. Your design is saved in this browser,
                so it&apos;ll be ready when the shop is.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {purchaseActions.map((label) => (
                  <li key={label} className="rounded-full border border-[#26324c] px-3.5 py-1.5 text-xs font-bold text-[#94a3b8]">
                    {label} · soon
                  </li>
                ))}
              </ul>
            </>
          )}
          {etsy?.publicUrl && (
            <a href={etsy.publicUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-[#2DD4BF] underline underline-offset-4">
              Visit the Etsy shop →
            </a>
          )}
          <p className="mt-3 text-[11px] font-semibold leading-4 text-[#94a3b8]">
            Names inspired by famous people or franchises stay in the free game
            unless they pass a human review first — the honest badges on each
            card tell you which is which.
          </p>
        </section>
      )}

      <p className="text-center">
        <Link href="/" className="text-sm font-bold text-[#2DD4BF]">
          ← Meet real adoptable dogs near you
        </Link>
      </p>
    </div>
  );
}
