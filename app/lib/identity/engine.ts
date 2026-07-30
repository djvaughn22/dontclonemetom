// Dog Identity Engine — the generator.
//
// One job, done well: spin names that rhyme with movie stars and sports
// legends. "Biscuit" → "Batrick Swayze", "Baylor Swift", "BeBron James".
// Two sources feed the deck:
//   1. rhymed-famous — the dog's own name sound swapped into a famous
//      first name, keeping the perfect rhyme ("Zaylor Swift")
//   2. punned-famous — hand-written dog puns ("Pawtrick Swayze",
//      "Napoleon Bone-aparte"); the best jokes are written, not computed
// The engine never outputs a real person's full name, and results that
// keep a real surname carry an honest manual-review label for merch.

import { FAMOUS_SOURCES, PUNNED_FAMOUS } from "./lexicon";
import { classifyRights } from "./rights";
import { makeRng, shuffled, stableId } from "./random";
import type {
  FitLevel,
  IdentityInput,
  InspirationLane,
  NicknameCandidate,
} from "./types";

// ── name mechanics ──────────────────────────────────────────────────────────

const clean = (s: string) => s.replace(/[^a-zA-Z0-9' -]/g, "").replace(/\s+/g, " ").trim();
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** First syllable-ish chunk: "Isaiah" → "Isa", "Biscuit" → "Bis". */
export function shortForm(name: string): string {
  const m = name.match(/^[^aeiouAEIOU]*[aeiouAEIOU]+[^aeiouAEIOU]?/);
  let chunk = m ? m[0] : name.slice(0, 3);
  if (chunk.length < 3 && name.length >= 3) chunk = name.slice(0, 3);
  return cap(chunk.toLowerCase());
}

/** Leading consonant sound of a name: "Biscuit" → "B", "Charlie" → "Ch". */
export function onsetOf(name: string): string {
  const m = name.match(/^[^aeiouAEIOU]{1,2}/);
  return m ? cap(m[0].toLowerCase()) : "";
}

/** The rhyming part of a first name: "Patrick" → "atrick", "Taylor" → "aylor". */
export function rimeOf(first: string): string {
  return first.replace(/^[^aeiouAEIOU]+/, "").toLowerCase();
}

/** Normalized key for duplicate / near-duplicate detection. */
export function nearDupKey(nickname: string): string {
  const FILLER = new Set(["the", "a", "of", "big", "little", "sir", "mr", "mrs", "dr", "his", "her"]);
  return nickname
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
    .sort()
    .join("-");
}

// ── candidate assembly ──────────────────────────────────────────────────────

type Draft = {
  nickname: string;
  lane: InspirationLane;
  family: "rhymed-famous" | "punned-famous";
  archetype: string;
  wordplay: string;
  nearBrand: boolean;
  uniqueness: number;
};

function finishCandidate(d: Draft, realName: string, shownKeys: Set<string>): NicknameCandidate {
  const rights = classifyRights(d.nickname, { nearBrand: d.nearBrand });
  const repetition = shownKeys.has(nearDupKey(d.nickname)) ? 1 : 0;
  const fit: FitLevel = d.uniqueness > 0.85 ? "strong" : "good";
  const real = cap(clean(realName));
  return {
    id: stableId(d.nickname.toLowerCase()),
    nickname: d.nickname,
    heroSuitable: true,
    lane: d.lane,
    archetype: d.archetype,
    wordplay: d.wordplay,
    shareText: `${real}? Never heard of that name. This is ${d.nickname}.`,
    posterText: d.nickname.toUpperCase(),
    uniqueness: d.uniqueness,
    repetition,
    fit,
    playEligible: true,
    merchReviewEligible: rights.risk !== "blockedForMerch",
    rightsRisk: rights.risk,
    rightsReason: rights.reason,
  };
}

// ── the two families ────────────────────────────────────────────────────────

/** "Biscuit" + "Patrick Swayze" → "Batrick Swayze" — a perfect rhyme with
 *  the star, in the dog's own sound. Skipped when the swap wouldn't change
 *  anything (that would just be the real person's name). */
function rhymedFamousDrafts(onset: string, real: string, lanes: Set<InspirationLane>): Draft[] {
  if (!onset) return [];
  const out: Draft[] = [];
  for (const f of FAMOUS_SOURCES) {
    if (!lanes.has(f.lane)) continue;
    const rime = rimeOf(f.first);
    if (rime.length < 2) continue;
    const swapped = `${onset}${rime}`;
    if (swapped.toLowerCase() === f.first.toLowerCase()) continue;
    out.push({
      nickname: `${swapped} ${f.last}`,
      lane: f.lane,
      family: "rhymed-famous",
      archetype: f.archetype,
      wordplay: `Rhymes with ${f.first} ${f.last} — the ${f.archetype}. Now it's ${real}'s.`,
      nearBrand: false,
      uniqueness: 0.8,
    });
  }
  return out;
}

/** Hand-written dog puns on the famous names — "Pawtrick Swayze". */
function punnedFamousDrafts(lanes: Set<InspirationLane>): Draft[] {
  const out: Draft[] = [];
  for (const p of PUNNED_FAMOUS) {
    if (!lanes.has(p.lane)) continue;
    out.push({
      nickname: p.pun,
      lane: p.lane,
      family: "punned-famous",
      archetype: p.archetype,
      wordplay: `${p.source}, but make it dog.`,
      // manualReview entries ride the nearBrand flag; the classifier can
      // only ever escalate from there, never soften.
      nearBrand: p.risk === "manualReview",
      uniqueness: 0.9,
    });
  }
  return out;
}

// ── the public generate call ────────────────────────────────────────────────

export type GenerateResult = {
  candidates: NicknameCandidate[];
  /** near-dup keys of everything returned — feed back in as shownKeys */
  dealtKeys: string[];
};

const ALL_LANES = new Set<InspirationLane>([
  ...FAMOUS_SOURCES.map((f) => f.lane),
  ...PUNNED_FAMOUS.map((p) => p.lane),
]);

/** Deterministic: same input + seed + step → same deal. */
export function generateCandidates(input: IdentityInput, count = 6): GenerateResult {
  const real = cap(clean(input.realName));
  if (!real) return { candidates: [], dealtKeys: [] };

  const rng = makeRng(input.seed, input.step ?? 0);
  const base = cap(clean(input.existingNickname ?? "")) || real;
  const onset = onsetOf(base) || onsetOf(real);
  const lanes = new Set<InspirationLane>(
    input.lanes && input.lanes.length ? input.lanes.filter((l) => ALL_LANES.has(l)) : ALL_LANES,
  );

  let drafts = [...punnedFamousDrafts(lanes), ...rhymedFamousDrafts(onset, real, lanes)];

  // A nickname you can't yell across a yard isn't one.
  drafts = drafts.filter((d) => d.nickname.length <= 26 && d.nickname.split(/\s+/).length <= 5);

  // Owner boundaries: excluded words and dislikes never appear.
  const banned = [...(input.excludedWords ?? []), ...(input.dislikes ?? [])]
    .map((w) => w.toLowerCase().trim())
    .filter(Boolean);
  if (banned.length) {
    drafts = drafts.filter((d) => !banned.some((w) => d.nickname.toLowerCase().includes(w)));
  }
  // Part locking: keep only drafts containing the locked word.
  if (input.lockedWord) {
    const lock = input.lockedWord.toLowerCase();
    drafts = drafts.filter((d) => d.nickname.toLowerCase().includes(lock));
  }

  const shownIds = new Set(input.shownIds ?? []);
  const shownKeys = new Set(input.shownKeys ?? []);
  const seenKeys = new Set<string>();

  const scored = shuffled(rng, drafts)
    .map((d) => ({ d, c: finishCandidate(d, input.realName, shownKeys) }))
    .filter(({ c }) => !(input.commercialSafety && c.rightsRisk !== "playSafe"))
    .map(({ d, c }) => {
      let score = c.uniqueness + rng() * 0.4;
      if (shownIds.has(c.id)) score -= 2.5; // heavily reduce already-shown
      if (c.repetition > 0) score -= 1.5; // near-duplicate of something shown
      return { family: d.family, c, score };
    })
    .sort((a, b) => b.score - a.score);

  // Every hand mixes written puns with rhymes of the dog's own name.
  const familyCap = Math.max(2, Math.ceil(count / 2));
  const perFamily = new Map<string, number>();
  const out: NicknameCandidate[] = [];
  for (const { family, c } of scored) {
    if (out.length >= count) break;
    if ((perFamily.get(family) ?? 0) >= familyCap) continue;
    const key = nearDupKey(c.nickname);
    if (seenKeys.has(key)) continue; // no exact or near dupes inside a deal
    seenKeys.add(key);
    perFamily.set(family, (perFamily.get(family) ?? 0) + 1);
    out.push(c);
  }
  // Backfill if the caps starved the deal.
  if (out.length < count) {
    for (const { c } of scored) {
      if (out.length >= count) break;
      const key = nearDupKey(c.nickname);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      out.push(c);
    }
  }
  return { candidates: out, dealtKeys: out.map((c) => nearDupKey(c.nickname)) };
}
