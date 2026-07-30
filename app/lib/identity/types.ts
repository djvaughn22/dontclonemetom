// Dog Identity Engine — shared types.
//
// PURE MODULE RULES (the whole app/lib/identity folder):
//   - no React, no Next.js, no browser APIs, no DontCloneMeTom components
//   - deterministic given the same input + seed
//   - designed to be lifted into a shared package (iDontCry will consume it)
//
// Truth boundary: the engine never invents facts about a dog. It only riffs
// on the name and on facts the owner confirmed. Every confirmed fact carries
// its source. Suggestions are suggestions — the owner decides what fits.

/** Every inspiration lane the generator can draw from. */
export const INSPIRATION_LANES = [
  "celebrity",
  "actors",
  "musicians",
  "fictional",
  "historical",
  "athletes",
  "football",
  "basketball",
  "baseball",
  "hockey",
  "soccer",
  "tennis",
  "golf",
  "racing",
  "combat-sports",
  "olympic",
  "track-and-field",
  "skiing",
  "extreme-sports",
  "coaches",
  "broadcasters",
  "sports-language",
  "superheroes",
  "villains",
  "action-movies",
  "comedy",
  "royalty",
  "military-titles",
  "professions",
  "food",
  "household",
  "weather",
  "speed",
  "sleep",
  "chaos",
  "bravery",
  "mischief",
  "affection",
] as const;

export type InspirationLane = (typeof INSPIRATION_LANES)[number];

/** Lanes that are sports in some form — used by "filter by sport". */
export const SPORT_LANES: InspirationLane[] = [
  "athletes",
  "football",
  "basketball",
  "baseball",
  "hockey",
  "soccer",
  "tennis",
  "golf",
  "racing",
  "combat-sports",
  "olympic",
  "track-and-field",
  "skiing",
  "extreme-sports",
  "coaches",
  "broadcasters",
  "sports-language",
];

/** Lanes built on famous *people* — these carry rights review by default. */
export const PEOPLE_LANES: InspirationLane[] = [
  "celebrity",
  "actors",
  "musicians",
  "historical",
  "athletes",
  "football",
  "basketball",
  "baseball",
  "hockey",
  "soccer",
  "tennis",
  "golf",
  "racing",
  "combat-sports",
  "olympic",
  "track-and-field",
  "skiing",
  "extreme-sports",
  "coaches",
  "broadcasters",
];

export type FactKind = "behavior" | "mood" | "habit" | "quirk" | "situation";

/** A real thing the owner confirmed about their dog — with its source. */
export type ConfirmedFact = {
  id: string;
  text: string;
  kind: FactKind;
  source: "owner-selected" | "owner-entered";
};

export type ActivityLevel = "chill" | "moderate" | "rocket";
export type Pronouns = "he" | "she" | "they";

/** Everything the generator may know about a dog. Owner-supplied only. */
export type IdentityInput = {
  realName: string;
  existingNickname?: string;
  /** only when the owner supplied it */
  pronouns?: Pronouns;
  /** confirmed behaviors, moods, habits, quirks, situations (kind on each) */
  facts: ConfirmedFact[];
  activityLevel?: ActivityLevel;
  favoriteThings?: string[];
  /** only when the owner supplied them */
  dislikes?: string[];
  /** only when the owner supplied them */
  physicalFeatures?: string[];
  /** empty or missing = all lanes */
  lanes?: InspirationLane[];
  /** words that must never appear in a suggestion */
  excludedWords?: string[];
  /** candidate ids already shown this session (heavily down-weighted) */
  shownIds?: string[];
  /** normalized name keys already shown (near-duplicate suppression) */
  shownKeys?: string[];
  /** ids the owner saved */
  favoriteIds?: string[];
  /** a word every suggestion must contain (part locking) */
  lockedWord?: string;
  /** deterministic session seed */
  seed: string | number;
  /** deal step — advance for a fresh deal from the same seed */
  step?: number;
  /** true = only merch-eligible playSafe results */
  commercialSafety?: boolean;
};

/** Honest rights classification for a single result. */
export type RightsRisk = "playSafe" | "manualReview" | "blockedForMerch";

export type FitLevel = "loose" | "good" | "strong";

/** A structured nickname candidate — never just a string. */
export type NicknameCandidate = {
  /** stable id derived from the display text */
  id: string;
  nickname: string;
  /** would this work as a full hero identity (vs a household nickname)? */
  heroSuitable: boolean;
  lane: InspirationLane;
  /** the pattern/archetype that produced it, e.g. "surname-sound-sub" */
  archetype: string;
  /** the confirmed fact this riffs on, when one does */
  matchedFactId?: string;
  matchedFactText?: string;
  /** one plain line explaining the wordplay */
  wordplay: string;
  /** situational label, e.g. "after dinner", when relevant */
  situational?: string;
  /** ready-to-share caption text (no claims, just the joke) */
  shareText: string;
  /** the line as it would sit on a poster */
  posterText: string;
  /** 0..1 — how far from the obvious default patterns */
  uniqueness: number;
  /** 0..1 — closeness to something already shown this session */
  repetition: number;
  fit: FitLevel;
  /** always fine in the free game */
  playEligible: boolean;
  /** could go to merch after a human owner review */
  merchReviewEligible: boolean;
  rightsRisk: RightsRisk;
  rightsReason: string;
};
