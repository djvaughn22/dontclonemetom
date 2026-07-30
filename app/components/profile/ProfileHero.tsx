"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "../../lib/analytics";
import type { HeroIdentity } from "../../lib/identity/heroIdentity";
import { useHeroIdentity } from "./HeroIdentityContext";
import AliasStrip from "./AliasStrip";

// The hero block: the chosen identity in lights, the legend subtitle, and
// the real name kept plainly separate. The hero name is a button — clicking
// it opens the identity chooser. The rotating alias strip below is display
// only and never changes the chosen identity.

const KIND_LABELS: Record<HeroIdentity["kind"], string> = {
  curated: "The classics",
  favorite: "Saved favorites",
  behavior: "Caught in the act",
  mood: "Depends on the mood",
  recent: "Recently in rotation",
};

const KIND_ORDER: HeroIdentity["kind"][] = ["curated", "favorite", "behavior", "mood", "recent"];

function ChooserDialog({
  onClose,
  accent,
  slug,
}: {
  onClose: () => void;
  accent: string;
  slug: string;
}) {
  const hero = useHeroIdentity();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Move focus into the dialog; Escape closes it.
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!hero) return null;

  const groups = KIND_ORDER.map((kind) => ({
    kind,
    items: hero.identities.filter((i) => i.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Choose the current identity"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#26324c] bg-[#0b1220] p-6 outline-none sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
              Who is {hero.realName} today?
            </p>
            <p className="mt-1 text-xs font-semibold text-[#94a3b8]">
              The real name stays {hero.realName}. This just picks the legend.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#26324c] px-3 py-1.5 text-xs font-black text-[#e8edf5] hover:border-[#2DD4BF]"
          >
            Close
          </button>
        </div>

        {groups.map((g) => (
          <div key={g.kind} className="mb-5">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#94a3b8]">
              {KIND_LABELS[g.kind]}
            </p>
            <ul className="flex flex-col gap-2">
              {g.items.map((i) => {
                const selected = i.id === hero.identity.id;
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => {
                        hero.choose(i.id);
                        track("dcmt_hero_identity_chosen", { dog_slug: slug, hero_id: i.id });
                        onClose();
                      }}
                      aria-pressed={selected}
                      className="w-full rounded-2xl border px-4 py-3 text-left transition"
                      style={{
                        borderColor: selected ? accent : "#26324c",
                        background: selected ? "#141d2e" : "transparent",
                      }}
                    >
                      <span className="block text-sm font-black" style={{ color: selected ? accent : "#e8edf5" }}>
                        {i.name}
                        {selected ? " ✓" : ""}
                      </span>
                      {i.subtitle && (
                        <span className="mt-0.5 block text-xs font-bold text-[#94a3b8]">{i.subtitle}</span>
                      )}
                      {i.tagline && (
                        <span className="mt-0.5 block text-xs font-semibold text-[#94a3b8]">{i.tagline}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileHero({
  aliases,
  accent,
  slug,
  subtitle,
}: {
  aliases: string[];
  accent: string;
  slug: string;
  /** the legend subtitle, e.g. "The Dark Zay" */
  subtitle: string;
}) {
  const hero = useHeroIdentity();
  const [open, setOpen] = useState(false);

  if (!hero) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          track("dcmt_hero_chooser_opened", { dog_slug: slug });
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group mx-auto block"
        title="Choose another identity"
      >
        <span
          className="block font-black uppercase leading-[1.02] tracking-tight underline-offset-8 transition group-hover:underline"
          style={{ fontSize: "clamp(2.2rem, 9vw, 4rem)", color: accent, textDecorationColor: `${accent}66` }}
        >
          {hero.identity.name}
        </span>
        <span className="mt-1 block text-lg font-black tracking-[0.08em] text-[#e8edf5]">
          {hero.identity.id === hero.defaultHeroId ? subtitle : (hero.identity.subtitle ?? subtitle)}
        </span>
        <span className="mt-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#94a3b8] group-hover:text-[#e8edf5]">
          Known in ordinary life as {hero.realName} · tap to choose ▾
        </span>
      </button>

      <div className="mt-4">
        <AliasStrip aliases={aliases} accent={accent} />
      </div>

      {open && <ChooserDialog onClose={() => setOpen(false)} accent={accent} slug={slug} />}
    </>
  );
}
