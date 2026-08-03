// Fun Dog Trading Cards — the one simple idea behind the dog pages.
//
// A card shows one dog, one nickname, one short funny saying, and the day.
// Every dog gets EXACTLY SEVEN names, and every one of the seven is built
// for that dog. The order of preference is strict:
//
//   1. the Name Book — hand-written names for that exact name (nameBook.ts),
//      including complete per-dog override decks keyed by listing id
//   2. real wordplay on the name's own sounds (rhymes that actually rhyme)
//   3. true things about the dog (picked traits, listed size/age/sex)
//   4. affectionate name forms a family really uses (short form, doubling)
//
// Generic filler is banned outright: no rank-and-title templates
// ("Captain X", "Mayor X", "Agent X"...), no Xzilla / X-asaurus, and no
// name that could be pasted onto just any dog. A weak candidate is
// discarded, never displayed.
//
// Isaiah is the permanent example: his seven live in dogProfiles.ts as an
// owner-locked deck (Batdog first, always). This module builds the seven
// for every other dog and enforces the quality bar for both.
//
// Pure logic + data. The UI spins through the deck one card at a time and
// never shows the whole list.

import { DECK_OVERRIDES, NAME_BOOK, type BookCard } from "./nameBook";
import { parseListingName, type ParsedDogName } from "./dogNames";
import { buildWordplayPool, selectWordplay, shortCallName, type WordplayCard } from "./wordplay";

export const DECK_SIZE = 7;

/** Why a name belongs to this dog — validation keys off it. */
export type CardBasis = "book" | "rhyme" | "trait" | "family";

/** One nickname with the sayings that fit it. */
export type CardPair = { nickname: string; sayings: string[]; basis?: CardBasis };

/** What one spin of the deck shows. */
export type DogCardFace = {
  nickname: string;
  saying: string;
  /** 1-based; counts spins, shown as "No. 3" on the card */
  cardNumber: number;
  /** "Thursday's Dog Card" */
  dayLabel: string;
  /** index into CARD_THEMES */
  themeIndex: number;
};

// Flat, colorful, collectible — no red (site rule).
export const CARD_THEMES = [
  "#2DD4BF", // teal
  "#FBBF24", // amber
  "#A78BFA", // violet
  "#38BDF8", // sky
  "#A3E635", // lime
] as const;

// Names that fail review on sight: they could be pasted onto nearly any
// dog. None of these may ever appear in any deck.
export const BANNED_GENERIC_NAMES = [
  "sir barks-a-lot",
  "sir barksalot",
  "professor paws",
  "captain cuddles",
  "captain couch",
  "mayor fluff",
  "neighborhood watchdog",
  "bark vader",
  "paw patrol",
  "the treat detective",
  "ruff rider",
  "good boy",
  "good girl",
  "fluffy",
  "doggo",
  "pupper",
];

// Rank-and-title templates read as machine output — any of these in front
// of a name is lazy filler. (The dog's own real name is exempt: a dog
// actually NAMED King or Princess keeps its name.) Kept deliberately off
// this list: family words like Grandpa/Grandma/Baby/Sweet, and specific
// cultural references like "Major Tom" or "Chef Ramsey" that only ever
// attach to the one matching name.
export const BANNED_TITLE_PREFIX =
  /^(sir|captain|capt|professor|prof|mayor|king|queen|prince|princess|doctor|dr|agent|chief|sheriff|deputy|sergeant|general|colonel|officer|president|lord|lady|count|countess|duke|duchess|baron|master|madam|mister|mr|mrs|super|mighty)[\s.]/i;

// Xzilla, X-asaurus and friends — the tired monster-suffix formula.
export const BANNED_NAME_SUFFIX = /(zilla|saurus|inator)$/i;

// Real-world claim terms may never ride along inside a joke — mirror of
// dogProfiles.CLAIM_TERMS, duplicated here to keep this module dependency-free.
const CLAIM_WORDS = [
  "good with kids",
  "good with cats",
  "good with dogs",
  "housetrained",
  "house trained",
  "potty trained",
  "vaccinated",
  "neutered",
  "spayed",
  "microchip",
  "bite",
  "aggressive",
  "medical",
  "diagnos",
  "medication",
  "obedience",
  "crate trained",
];

// ── Name material ────────────────────────────────────────────────────────

/** First-syllable short form a family would actually say: "Biscuit"→"Bis",
 *  "Charlie"→"Char", "Luna"→"Lu", "Rex"→"Rex". */
export function shortForm(realName: string): string {
  return shortCallName(parseListingName(realName).primary);
}

// Tiny stable string hash — per-dog variety without any randomness.
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

// Universal second sayings — work under any nickname, so every card has a
// fresh line on the deck's second lap.
const POOL_SAYINGS = [
  "One of one. Never cloned.",
  "Ask anyone on the block.",
  "The tail votes yes.",
  "Try saying it without smiling.",
  "The ears perked. It's official.",
  "True since day one.",
  "Answers to it. Eventually.",
] as const;

function withPoolSayings(nickname: string, first?: string): string[] {
  const i = hash(nickname.toLowerCase()) % POOL_SAYINGS.length;
  const a = POOL_SAYINGS[i];
  const b = POOL_SAYINGS[(i + 3) % POOL_SAYINGS.length];
  return first ? [first, a] : [a, b];
}

function bookPair(card: BookCard): CardPair {
  return { basis: "book", nickname: card.n, sayings: withPoolSayings(card.n, card.s) };
}

// ── True things a kid can pick about their dog ───────────────────────────
// Each fuses the fact with the dog's own name, so the card still belongs
// to this dog alone. No ranks, no titles — words a family actually says.
export type CardTrait = { id: string; label: string; make: (name: string, short: string) => CardPair };

const T = (nickname: string, ...sayings: string[]): CardPair => ({ basis: "trait", nickname, sayings });

export const CARD_TRAITS: CardTrait[] = [
  { id: "big", label: "Big dog", make: (n) => T(`Mount ${n}`, "A landmark. Climb at your own risk.", "Visible from the kitchen.") },
  { id: "small", label: "Small dog", make: (n) => T(`Pocket-Size ${n}`, "Travel edition. Full features.", "Fits in every lap. That's the plan.") },
  { id: "naps", label: "Champion napper", make: (n) => T(`Sleepy ${n}`, "Undefeated since breakfast.", "Do not disturb. Ever.") },
  { id: "treats", label: "Lives for treats", make: (n) => T(`Snacky ${n}`, "I heard the snack bag.", "Today's mission: find the treats.") },
  { id: "fetch", label: "Loves fetch", make: (n) => T(`Boomerang ${n}`, "Always comes back. Eventually.", "One more throw. Forever.") },
  { id: "squirrels", label: "Squirrel watcher", make: (n) => T(`${n} the Squirrel Spotter`, "The squirrels know my name.", "Tree patrol never sleeps.") },
  { id: "barks", label: "Big barker", make: (n) => T(`${n} the Announcer`, "Someone had to say something.", "I heard that. And that.") },
  { id: "couch", label: "Owns the couch", make: (n) => T(`${n} the Couch Potato`, "The couch is under my protection.", "Adopted the family. Kept the couch.") },
  { id: "walks", label: "Loves walks", make: (n) => T(`Walkie-Talkie ${n}`, "Knows every mailbox personally.", "Talks the walk. Walks the talk.") },
  { id: "zoomies", label: "Gets the zoomies", make: (n) => T(`Turbo ${n}`, "All aboard. No brakes.", "Three laps. No reason.") },
  { id: "puppy", label: "Still a puppy", make: (n) => T(`${n} the Rookie`, "First season. Already a star.", "Growing in every direction.") },
  { id: "senior", label: "Sweet senior", make: (n) => T(`Vintage ${n}`, "The classic edition. Collectors agree.", "Aged like the good stuff.") },
];

// ── The quality gate ─────────────────────────────────────────────────────

/** True when a nickname is worthy of a card for this dog. */
export function isAllowedNickname(nickname: string, realName: string): boolean {
  const low = nickname.toLowerCase().trim();
  if (!low || nickname.length > 28) return false;
  if (BANNED_GENERIC_NAMES.includes(low)) return false;
  if (CLAIM_WORDS.some((w) => low.includes(w))) return false;
  const p = parseListingName(realName);
  const firstWord = nickname.split(/[\s.]+/)[0]?.toLowerCase() ?? "";
  const ownName = firstWord === p.primary.toLowerCase() || firstWord === p.display.split(" ")[0]?.toLowerCase();
  if (!ownName && BANNED_TITLE_PREFIX.test(nickname)) return false;
  if (nickname.split(/[\s-]+/).some((w) => BANNED_NAME_SUFFIX.test(w) && w.toLowerCase() !== p.primary.toLowerCase())) return false;
  return true;
}

// ── Deck building ────────────────────────────────────────────────────────

function wordplayPair(c: WordplayCard): CardPair {
  const basis: CardBasis = c.kind === "rhyme" ? "rhyme" : "family";
  return { basis, nickname: c.nickname, sayings: withPoolSayings(c.nickname, c.saying) };
}

function gatherDeck(
  p: ParsedDogName,
  sources: CardPair[],
  pool: WordplayCard[],
  max: number,
): CardPair[] {
  const deck: CardPair[] = [];
  const seen = new Set<string>();
  for (const pair of sources) {
    if (deck.length >= max) break;
    const key = pair.nickname.toLowerCase();
    if (seen.has(key) || !isAllowedNickname(pair.nickname, p.display)) continue;
    seen.add(key);
    deck.push(pair);
  }
  const picked = selectWordplay(
    pool.filter((c) => isAllowedNickname(c.nickname, p.display)),
    max - deck.length,
    seen,
  );
  deck.push(...picked.map(wordplayPair));
  return deck;
}

/**
 * The deck for a dog named by a visitor (Make One for Your Dog). The deck
 * is FINISHED only at exactly seven cards — never padded. When the name's
 * own wordplay can't reach seven, the missing cards come from the true
 * things the family picks (`traitIds`); the maker asks for them instead
 * of showing an incomplete or filler-padded deck.
 */
export function buildDeck(realName: string, traitIds: string[] = []): CardPair[] {
  const p = parseListingName(realName);
  if (!p.display) return [];
  const entry = NAME_BOOK[p.display.toLowerCase()] ?? NAME_BOOK[p.primary.toLowerCase()];
  const traitCards = CARD_TRAITS.filter((t) => traitIds.includes(t.id)).map((t) =>
    t.make(p.display, shortForm(p.primary)),
  );
  if (entry) {
    // Book hero leads; the family's picked true things always make the cut.
    const book = entry.map(bookPair);
    return gatherDeck(p, [book[0], ...traitCards, ...book.slice(1)], buildWordplayPool(p), DECK_SIZE);
  }
  // Unknown name: the strongest wordplay leads, picked true things follow.
  const deck = gatherDeck(p, [], buildWordplayPool(p), DECK_SIZE);
  const seen = new Set(deck.map((c) => c.nickname.toLowerCase()));
  for (const card of traitCards) {
    if (deck.length >= DECK_SIZE) break;
    const key = card.nickname.toLowerCase();
    if (seen.has(key) || !isAllowedNickname(card.nickname, p.display)) continue;
    seen.add(key);
    deck.push(card);
  }
  return deck;
}

/** The listing fields the deck builder can honestly use. */
export type ListingDog = {
  id: string;
  name: string;
  breed?: string;
  age?: string;
  size?: string;
  sex?: string;
};

export type ListingDeckReport = {
  deck: CardPair[];
  /** true when this dog's deck is NOT ready to publish — the pages hide
   *  the card maker for this dog until seven cards pass review */
  needsReview: boolean;
  reasons: string[];
};

/**
 * The deck for a live adoptable listing, with its publish gate. Published
 * decks are entirely hand-written: the dog's own override deck, or its
 * Name Book entry. A dog the book has never met gets engine wordplay as a
 * REVIEW DRAFT — the report flags it and the public pages keep its normal
 * adoption listing visible without activating the incomplete deck.
 */
export function buildListingDeckReport(dog: ListingDog): ListingDeckReport {
  const p = parseListingName(dog.name);
  if (!p.display) return { deck: [], needsReview: true, reasons: ["unparseable name"] };

  const override = DECK_OVERRIDES[dog.id];
  if (override) return { deck: override.map(bookPair), needsReview: false, reasons: [] };

  const entry = NAME_BOOK[p.display.toLowerCase()] ?? NAME_BOOK[p.primary.toLowerCase()];
  const sources: CardPair[] = [...(entry ?? []).map(bookPair)];
  const deck = gatherDeck(p, sources, entry ? [] : buildWordplayPool(p), DECK_SIZE);

  const reasons: string[] = [];
  if (!entry) reasons.push("name not in the Name Book");
  if (deck.length < DECK_SIZE) reasons.push(`only ${deck.length} strong cards`);
  return { deck, needsReview: reasons.length > 0, reasons };
}

/** The deck alone — for surfaces that have already checked the gate. */
export function buildListingDeck(dog: ListingDog): CardPair[] {
  return buildListingDeckReport(dog).deck;
}

/** The name the card surfaces should display for a listing — program
 *  codes and markers stripped, caps fixed. */
export function listingDisplayName(rawName: string): string {
  return parseListingName(rawName).display || rawName.trim();
}

// ── Quality review ───────────────────────────────────────────────────────

/**
 * The name-quality bar, as code. Returns every problem with a deck; must
 * be empty before a deck ships. `locked` decks (owner-curated, like
 * Isaiah's) skip the name-connection rule — a human already made each name
 * personal — but never skip the count, uniqueness, or filler rules.
 */
export function findDeckProblems(
  deck: CardPair[],
  opts: { realName: string; locked?: boolean },
): string[] {
  const problems: string[] = [];
  if (deck.length !== DECK_SIZE) problems.push(`deck has ${deck.length} cards, needs exactly ${DECK_SIZE}`);
  const p = parseListingName(opts.realName);
  const short = shortForm(p.primary).toLowerCase();
  const seen = new Set<string>();
  for (const pair of deck) {
    const low = pair.nickname.toLowerCase();
    if (seen.has(low)) problems.push(`duplicate name: ${pair.nickname}`);
    seen.add(low);
    if (!isAllowedNickname(pair.nickname, opts.realName)) problems.push(`generic or banned: ${pair.nickname}`);
    if (pair.sayings.length === 0) problems.push(`no saying for: ${pair.nickname}`);
    for (const s of pair.sayings) {
      if (s.length > 70) problems.push(`saying too long for ${pair.nickname}: ${s}`);
      if (CLAIM_WORDS.some((w) => s.toLowerCase().includes(w))) problems.push(`claim inside saying for ${pair.nickname}`);
    }
    const connected =
      low.includes(p.primary.toLowerCase()) ||
      low.includes(short) ||
      pair.basis === "book" ||
      pair.basis === "rhyme";
    if (!opts.locked && !connected) problems.push(`not built for this dog: ${pair.nickname}`);
  }
  return problems;
}

// ── Spinning ─────────────────────────────────────────────────────────────

/** "Thursday's Dog Card" */
export function dayLabel(date: Date): string {
  return `${date.toLocaleDateString("en-US", { weekday: "long" })}'s Dog Card`;
}

/**
 * The card for spin number `step` (0-based). Walks the seven in order —
 * card 0 is always the hero (Batdog for Isaiah) — and once every nickname
 * has been seen, the next lap shows each nickname's next saying.
 */
export function cardAt(deck: CardPair[], step: number, date: Date): DogCardFace | null {
  if (deck.length === 0) return null;
  const i = step % deck.length;
  const pass = Math.floor(step / deck.length);
  const pair = deck[i];
  return {
    nickname: pair.nickname,
    saying: pair.sayings[pass % pair.sayings.length],
    cardNumber: step + 1,
    dayLabel: dayLabel(date),
    themeIndex: step % CARD_THEMES.length,
  };
}

/** Every nickname and saying this module can produce — safety tests scan
 *  a broad sample so no pool string ever smuggles in a real-world claim. */
export function allCardStrings(sampleNames: string[]): string[] {
  const out: string[] = [];
  for (const n of sampleNames) {
    for (const pair of buildDeck(n, CARD_TRAITS.map((t) => t.id))) {
      out.push(pair.nickname, ...pair.sayings);
    }
  }
  return out;
}
