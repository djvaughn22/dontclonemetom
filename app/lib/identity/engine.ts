// Dog Identity Engine — the generator.
//
// Real dog + real behavior + current mood + inspiration lane = fitting
// identity. The engine composes candidates from pattern families over the
// lexicon; the owner decides what actually fits. It never outputs a real
// person's full name and never invents a fact about the dog.

import {
  ARCHETYPE_TRANSFORMS,
  BEHAVIOR_VOCAB,
  FAMOUS_SOURCES,
  LANE_WORDS,
  MOOD_ARCHETYPES,
  RHYME_BANK,
  SPORT_ROLES,
  TITLES,
  customVocab,
} from "./lexicon";
import { classifyRights } from "./rights";
import { makeRng, pick, shuffled, stableId, type Rng } from "./random";
import type {
  ConfirmedFact,
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

/** Drop the leading syllable of a word: "Taylor" → "lor", "Swift" → "ift". */
export function syllableTail(word: string): string {
  const m = word.match(/^[^aeiouAEIOU]*[aeiouAEIOU]+/);
  const tail = m ? word.slice(m[0].length) : word.slice(1);
  return tail.toLowerCase();
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
  /** pattern family — each deal caps per family so hands stay varied */
  family: string;
  archetype: string;
  wordplay: string;
  heroSuitable: boolean;
  matchedFact?: ConfirmedFact;
  situational?: string;
  nearBrand?: boolean;
  uniqueness: number;
};

function finishCandidate(d: Draft, input: IdentityInput, shownKeys: Set<string>): NicknameCandidate {
  const rights = classifyRights(d.nickname, { nearBrand: d.nearBrand });
  const key = nearDupKey(d.nickname);
  const repetition = shownKeys.has(key) ? 1 : 0;
  const fit: FitLevel = d.matchedFact ? "strong" : d.uniqueness > 0.6 ? "good" : "loose";
  const real = cap(clean(input.realName));
  return {
    id: stableId(d.nickname.toLowerCase()),
    nickname: d.nickname,
    heroSuitable: d.heroSuitable,
    lane: d.lane,
    archetype: d.archetype,
    matchedFactId: d.matchedFact?.id,
    matchedFactText: d.matchedFact?.text,
    wordplay: d.wordplay,
    situational: d.situational,
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

// ── pattern families ────────────────────────────────────────────────────────
// Each family returns drafts. Variety comes from composing these over the
// lexicon with the seeded RNG — thousands of combinations, not a fixed list.

type PatternCtx = {
  rng: Rng;
  base: string; // nickname base, e.g. "Zay"
  real: string; // cleaned real name
  facts: ConfirmedFact[];
  lanes: Set<InspirationLane>;
};

function famousDrafts(ctx: PatternCtx): Draft[] {
  const out: Draft[] = [];
  for (const f of FAMOUS_SOURCES) {
    if (!ctx.lanes.has(f.lane)) continue;
    const firstTail = syllableTail(f.first);
    const lastTail = syllableTail(f.last);
    // first-name sound substitution: "Taylor Swift" → "Zaylor Swift"
    if (firstTail.length >= 2) {
      out.push({
        nickname: `${ctx.base}${firstTail} ${f.last}`,
        lane: f.lane,
        family: "famous-sub",
        archetype: f.archetype,
        wordplay: `${ctx.real}'s sound folded into ${f.first} ${f.last} — the ${f.archetype}.`,
        heroSuitable: true,
        nearBrand: false,
        uniqueness: 0.85,
      });
    }
    // surname sound substitution: "Serena Williams" → "Serena Zaylliams"
    if (lastTail.length >= 3) {
      out.push({
        nickname: `${f.first} ${ctx.base}${lastTail}`,
        lane: f.lane,
        family: "famous-sub",
        archetype: f.archetype,
        wordplay: `A ${f.archetype}'s name, rebuilt around ${ctx.real}.`,
        heroSuitable: true,
        nearBrand: false,
        uniqueness: 0.8,
      });
    }
    // both transformed — fully owned wordplay
    if (firstTail.length >= 2 && lastTail.length >= 3) {
      out.push({
        nickname: `${ctx.base}${firstTail} ${ctx.base}${lastTail}`,
        lane: f.lane,
        family: "famous-sub",
        archetype: f.archetype,
        wordplay: `Double wordplay in the shape of a famous ${f.archetype}.`,
        heroSuitable: false,
        nearBrand: false,
        uniqueness: 0.65,
      });
    }
  }
  return out;
}

function archetypeDrafts(ctx: PatternCtx): Draft[] {
  const out: Draft[] = [];
  for (const t of ARCHETYPE_TRANSFORMS) {
    if (!ctx.lanes.has(t.lane)) continue;
    out.push({
      nickname: t.template.replace("{Base}", ctx.base).replace("{Real}", ctx.real),
      lane: t.lane,
      family: "archetype-transform",
      archetype: t.archetype,
      wordplay: `${ctx.real} recast as a ${t.archetype}.`,
      heroSuitable: t.heroSuitable,
      nearBrand: t.nearBrand,
      uniqueness: 0.7,
    });
  }
  return out;
}

function titleDrafts(ctx: PatternCtx): Draft[] {
  const out: Draft[] = [];
  // moods/situations make weak "titled specialist" material — behaviors only
  const behaviorFacts = ctx.facts.filter((f) => f.kind !== "mood" && f.kind !== "situation");
  const facts = behaviorFacts.length ? behaviorFacts : undefined;
  for (const t of TITLES) {
    if (!ctx.lanes.has(t.lane)) continue;
    // title + name — formal identity
    out.push({
      nickname: `${t.title} ${ctx.real}`,
      lane: t.lane,
      family: "title",
      archetype: "formal identity",
      wordplay: `${ctx.real}, elevated to office.`,
      heroSuitable: true,
      uniqueness: 0.35,
    });
    // title + confirmed trait: "Duke of the Laundry Room"
    if (facts) {
      const fact = pick(ctx.rng, facts);
      const vocab = BEHAVIOR_VOCAB[fact.id] ?? customVocab(fact.text);
      out.push({
        nickname: `${t.title} ${ctx.base}, ${cap(vocab.agent)} of ${cap(vocab.place)}`,
        lane: t.lane,
        family: "title",
        archetype: "titled specialist",
        wordplay: `A formal title for a confirmed truth: ${fact.text.toLowerCase()}.`,
        heroSuitable: true,
        matchedFact: fact,
        uniqueness: 0.85,
      });
    }
  }
  return out;
}

function sportRoleDrafts(ctx: PatternCtx): Draft[] {
  const out: Draft[] = [];
  const behaviorFacts = ctx.facts.filter((f) => f.kind !== "mood" && f.kind !== "situation");
  for (const r of SPORT_ROLES) {
    if (!ctx.lanes.has(r.lane)) continue;
    out.push({
      nickname: `${ctx.base} the ${r.role}`,
      lane: r.lane,
      family: "sport-role",
      archetype: r.role.toLowerCase(),
      wordplay: `${ctx.real} drafted as a ${r.role.toLowerCase()}.`,
      heroSuitable: true,
      uniqueness: 0.5,
    });
    if (behaviorFacts.length) {
      const fact = pick(ctx.rng, behaviorFacts);
      const vocab = BEHAVIOR_VOCAB[fact.id] ?? customVocab(fact.text);
      out.push({
        nickname: `${ctx.base}, ${r.role} of ${cap(vocab.place)}`,
        lane: r.lane,
        family: "sport-role",
        archetype: r.role.toLowerCase(),
        wordplay: `Position + confirmed behavior: ${fact.text.toLowerCase()}.`,
        heroSuitable: true,
        matchedFact: fact,
        uniqueness: 0.8,
      });
    }
  }
  return out;
}

function laneWordDrafts(ctx: PatternCtx): Draft[] {
  const out: Draft[] = [];
  for (const [lane, words] of Object.entries(LANE_WORDS) as [InspirationLane, string[]][]) {
    if (!ctx.lanes.has(lane)) continue;
    for (const w of words) {
      out.push({
        nickname: `${ctx.base} ${w}`,
        lane,
        family: "vibe",
        archetype: "vibe pairing",
        wordplay: `${ctx.real} plus pure ${lane.replace(/-/g, " ")} energy.`,
        heroSuitable: false,
        uniqueness: 0.45,
      });
      out.push({
        nickname: `${w} ${ctx.base}`,
        lane,
        family: "vibe",
        archetype: "vibe pairing",
        wordplay: `Leads with the ${lane.replace(/-/g, " ")}, lands on ${ctx.real}.`,
        heroSuitable: false,
        uniqueness: 0.45,
      });
    }
  }
  return out;
}

function moodDrafts(ctx: PatternCtx): Draft[] {
  const out: Draft[] = [];
  for (const fact of ctx.facts) {
    if (fact.kind === "mood" && ctx.lanes.has("fictional")) {
      const tails = MOOD_ARCHETYPES[fact.id] ?? [`the ${cap(fact.text)}`];
      for (const tail of tails) {
        out.push({
          nickname: `${ctx.real} ${tail}`,
          lane: "fictional",
          family: "mood-epithet",
          archetype: "storybook epithet",
          wordplay: `Current mood, storybook title: ${fact.text.toLowerCase()}.`,
          heroSuitable: true,
          matchedFact: fact,
          uniqueness: 0.7,
        });
      }
    }
    if ((fact.kind === "behavior" || fact.kind === "habit" || fact.kind === "quirk") && ctx.lanes.has("mischief")) {
      const vocab = BEHAVIOR_VOCAB[fact.id] ?? customVocab(fact.text);
      out.push({
        nickname: `The ${cap(vocab.noun)} ${["Whisperer", "Baron", "Bandit", "Commissioner", "Sheriff"][Math.floor(ctx.rng() * 5)]}`,
        lane: "mischief",
        family: "the-title",
        archetype: "the-identity title",
        wordplay: `Built straight from a confirmed truth: ${fact.text.toLowerCase()}.`,
        heroSuitable: true,
        matchedFact: fact,
        uniqueness: 0.75,
      });
    }
    if (fact.kind === "situation" && ctx.lanes.has("comedy")) {
      out.push({
        nickname: `${ctx.base} (${fact.text.toLowerCase()} edition)`,
        lane: "comedy",
        family: "situational",
        archetype: "situational edition",
        wordplay: `Same dog, ${fact.text.toLowerCase()} rules.`,
        heroSuitable: false,
        matchedFact: fact,
        situational: fact.text,
        uniqueness: 0.6,
      });
    }
  }
  return out;
}

function rhymeDrafts(ctx: PatternCtx): Draft[] {
  if (!ctx.lanes.has("comedy")) return [];
  const lastVowel = ctx.real.toLowerCase().match(/[aeiou](?=[^aeiou]*$)/)?.[0];
  return RHYME_BANK.filter((w) => {
    const wv = w.toLowerCase().match(/[aeiou](?=[^aeiou]*$)/)?.[0];
    return lastVowel && wv === lastVowel;
  }).map((w) => ({
    nickname: `${ctx.real} ${w}`,
    lane: "comedy" as InspirationLane,
    family: "rhyme",
    archetype: "rhyme department",
    wordplay: `It rhymes. That's the whole case.`,
    heroSuitable: false,
    uniqueness: 0.5,
  }));
}

// ── the public generate call ────────────────────────────────────────────────

export type GenerateResult = {
  candidates: NicknameCandidate[];
  /** near-dup keys of everything returned — feed back in as shownKeys */
  dealtKeys: string[];
};

/** Deterministic: same input + seed + step → same deal. */
export function generateCandidates(input: IdentityInput, count = 6): GenerateResult {
  const real = cap(clean(input.realName));
  if (!real) return { candidates: [], dealtKeys: [] };

  const rng = makeRng(input.seed, input.step ?? 0);
  const base = cap(clean(input.existingNickname ?? "")) || shortForm(real);
  const lanes = new Set<InspirationLane>(
    input.lanes && input.lanes.length ? input.lanes : (Object.keys(LANE_WORDS) as InspirationLane[]).concat(
      FAMOUS_SOURCES.map((f) => f.lane),
      ARCHETYPE_TRANSFORMS.map((t) => t.lane),
      TITLES.map((t) => t.lane),
      SPORT_ROLES.map((r) => r.lane),
      ["fictional", "comedy"],
    ),
  );
  const ctx: PatternCtx = { rng, base, real, facts: input.facts ?? [], lanes };

  let drafts = [
    ...famousDrafts(ctx),
    ...archetypeDrafts(ctx),
    ...titleDrafts(ctx),
    ...sportRoleDrafts(ctx),
    ...laneWordDrafts(ctx),
    ...moodDrafts(ctx),
    ...rhymeDrafts(ctx),
  ];

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
  // Favorite things gently steer: drafts mentioning one float up later via bonus.
  const favorites = (input.favoriteThings ?? []).map((w) => w.toLowerCase().trim()).filter(Boolean);

  const shownIds = new Set(input.shownIds ?? []);
  const shownKeys = new Set(input.shownKeys ?? []);
  const seenKeys = new Set<string>();
  const perLane = new Map<string, number>();
  const perFamily = new Map<string, number>();

  const scored = shuffled(rng, drafts)
    .map((d) => ({ d, c: finishCandidate(d, input, shownKeys) }))
    .filter(({ c }) => {
      if (input.commercialSafety && c.rightsRisk !== "playSafe") return false;
      return true;
    })
    .map(({ d, c }) => {
      let score = c.uniqueness + rng() * 0.4;
      if (shownIds.has(c.id)) score -= 2.5; // heavily reduce already-shown
      if (c.repetition > 0) score -= 1.5; // near-duplicate of something shown
      if (c.matchedFactId) score += 0.3; // real confirmed facts fit best
      if (favorites.some((w) => c.nickname.toLowerCase().includes(w))) score += 0.35;
      if (input.activityLevel === "rocket" && (c.lane === "speed" || c.lane === "chaos")) score += 0.2;
      if (input.activityLevel === "chill" && (c.lane === "sleep" || c.lane === "affection")) score += 0.2;
      return { family: d.family, c, score };
    })
    .sort((a, b) => b.score - a.score);

  const laneCap = Math.max(2, Math.ceil(count / 3));
  const familyCap = 2; // every hand mixes pattern families
  const out: NicknameCandidate[] = [];
  for (const { family, c } of scored) {
    if (out.length >= count) break;
    if ((perLane.get(c.lane) ?? 0) >= laneCap) continue;
    if ((perFamily.get(family) ?? 0) >= familyCap) continue;
    const key = nearDupKey(c.nickname);
    if (seenKeys.has(key)) continue; // no exact or near dupes inside a deal
    seenKeys.add(key);
    perLane.set(c.lane, (perLane.get(c.lane) ?? 0) + 1);
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
