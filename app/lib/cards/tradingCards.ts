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

const isVowel = (c: string) => "aeiouy".includes(c.toLowerCase());

/** First-syllable short form a family would actually say: "Biscuit"→"Bis",
 *  "Charlie"→"Char", "Luna"→"Lu", "Rex"→"Rex". */
export function shortForm(realName: string): string {
  const name = parseListingName(realName).primary;
  if (name.length <= 4) return name;
  let i = 0;
  while (i < name.length && !isVowel(name[i])) i++; // onset
  while (i < name.length && isVowel(name[i])) i++; // first vowel group
  if (i < name.length && !isVowel(name[i])) i++; // one trailing consonant
  const short = name.slice(0, Math.max(2, i));
  return short.length >= 2 ? short : name;
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

// ── Wordplay rules ───────────────────────────────────────────────────────
// Only rhymes that genuinely land on the name's real ending. The book
// covers today's dogs; these catch tomorrow's. ("Papaya" is deliberately
// absent — it belongs to Isaiah alone.)
const RHYMES: { test: RegExp; make: (name: string) => string; sayings: string[] }[] = [
  { test: /una$/i, make: (n) => `${n} Tuna`, sayings: ["Rhymes with dinner. Coincidence?"] },
  { test: /ella$/i, make: (n) => `${n} Mozzarella`, sayings: ["Extra cheesy. Zero regrets."] },
  { test: /(oco|oko)$/i, make: (n) => `${n} Loco`, sayings: ["Runs on zoomies and vibes."] },
  { test: /oney?$/i, make: (n) => `${n} Baloney`, sayings: ["One hundred percent baloney. The good kind."] },
  { test: /ax$/i, make: (n) => `${n} Snacks`, sayings: ["Rhymes with his favorite hobby."] },
  { test: /ippy?$/i, make: (n) => `Zippy ${n}`, sayings: ["Fast name, faster feet."] },
];

// ── True things a kid can pick about their dog ───────────────────────────
// Each fuses the fact with the dog's own name, so the card still belongs
// to this dog alone. No ranks, no titles — words a family actually says.
export type CardTrait = { id: string; label: string; make: (name: string, short: string) => CardPair };

const T = (nickname: string, ...sayings: string[]): CardPair => ({ basis: "trait", nickname, sayings });

export const CARD_TRAITS: CardTrait[] = [
  { id: "big", label: "Big dog", make: (n) => T(`Big ${n}`, "The floor is mine. All of it.", "Built for comfort.") },
  { id: "small", label: "Small dog", make: (n) => T(`Lil ${n}`, "Small dog. Large opinions.", "Fits in every lap. That's the plan.") },
  { id: "naps", label: "Champion napper", make: (n) => T(`Sleepy ${n}`, "Undefeated since breakfast.", "Do not disturb. Ever.") },
  { id: "treats", label: "Lives for treats", make: (n) => T(`Snacky ${n}`, "I heard the snack bag.", "Today's mission: find the treats.") },
  { id: "fetch", label: "Loves fetch", make: (n, s) => T(`Boomerang ${s}`, "Always comes back. Eventually.", "One more throw. Forever.") },
  { id: "squirrels", label: "Squirrel watcher", make: (n) => T(`${n} the Squirrel Spotter`, "The squirrels know my name.", "Tree patrol never sleeps.") },
  { id: "barks", label: "Big barker", make: (n) => T(`${n} the Announcer`, "Someone had to say something.", "I heard that. And that.") },
  { id: "couch", label: "Owns the couch", make: (n) => T(`${n} the Couch Potato`, "The couch is under my protection.", "Adopted the family. Kept the couch.") },
  { id: "walks", label: "Loves walks", make: (n) => T(`Walkie-Talkie ${n}`, "Knows every mailbox personally.", "Talks the walk. Walks the talk.") },
  { id: "zoomies", label: "Gets the zoomies", make: (n) => T(`Turbo ${n}`, "All aboard. No brakes.", "Three laps. No reason.") },
  { id: "puppy", label: "Still a puppy", make: (n) => T(`Baby ${n}`, "Everything is new. Everything is great.", "Growing in every direction.") },
  { id: "senior", label: "Sweet senior", make: (n) => T(`${n} the Old Soul`, "Wise, unhurried, always right.", "Seen it all. Naps through most of it.") },
];

// Affectionate family forms — the shapes families really use for any name.
// These complete the seven only when the book and wordplay run short, and
// only when the short form actually sounds like something a person would
// say ("Bax", "Gus" — never "Tyl" or "Sweeti").
function saysWell(short: string): boolean {
  if (short.length < 2) return false;
  const last = short[short.length - 1].toLowerCase();
  const penult = short[short.length - 2].toLowerCase();
  if ("aeiou".includes(last)) return true;
  return "aeiou".includes(penult) && "bdgkmnprstxz".includes(last);
}

function affectionForms(p: ParsedDogName): CardPair[] {
  const short = shortForm(p.primary);
  const out: CardPair[] = [];
  if (!saysWell(short)) return out;
  if (p.display.length >= 6 && short.length >= 3 && short.toLowerCase() !== p.display.toLowerCase()) {
    out.push({ basis: "family", nickname: short, sayings: withPoolSayings(short, `Short. Sweet. ${short}.`) });
  }
  if (short.length <= 4) {
    const dbl = `${short}-${short}`;
    out.push({ basis: "family", nickname: dbl, sayings: withPoolSayings(dbl, `So nice they named ${short} twice.`) });
  }
  const last = short[short.length - 1]?.toLowerCase() ?? "";
  const alreadyDiminutive = /(y|ie|ee)$/i.test(p.display);
  if (last && !isVowel(last) && !alreadyDiminutive) {
    const doubled = "bdgmnprst".includes(last) ? short + last : short;
    const dim = `${doubled}y`;
    if (dim.toLowerCase() !== p.display.toLowerCase().slice(0, dim.length) || dim.length >= p.display.length) {
      out.push({ basis: "family", nickname: dim, sayings: withPoolSayings(dim) });
    }
  }
  return out;
}

// Warm last-resort forms for names the book has never met — still built
// from this dog's name, rotated by name hash so no two dogs open alike.
function fallbackForms(p: ParsedDogName): CardPair[] {
  const n = p.display;
  const forms: [string, string][] = [
    [`${n} the One and Only`, "Accept no imitations."],
    [`Sweet ${n}`, "The neighborhood agrees."],
    [`${n} Superstar`, "Front yard sold out again."],
    [`Bouncy ${n}`, "Gravity is a suggestion."],
    [`${n} the Snuggler`, "Certified couch professional."],
    [`Happy ${n}`, "The tail never lies."],
    [`${n} the Snoozer`, "Undefeated since breakfast."],
  ];
  const start = hash(n.toLowerCase()) % forms.length;
  return Array.from({ length: forms.length }, (_, i) => {
    const [nickname, saying] = forms[(start + i) % forms.length];
    return { basis: "family" as const, nickname, sayings: withPoolSayings(nickname, saying) };
  });
}

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

type ComposeOpts = {
  id?: string;
  traitIds?: string[];
  /** listing decks are curated: when the book knows the name, no
   *  algorithmic short-forms — filler only as a last resort */
  curated?: boolean;
};

function compose(p: ParsedDogName, opts: ComposeOpts): CardPair[] {
  if (!p.display) return [];

  // A per-dog override deck is final: written for this exact listing.
  const override = opts.id ? DECK_OVERRIDES[opts.id] : undefined;
  if (override) return override.map(bookPair);

  const candidates: CardPair[] = [];

  // 1. The Name Book — hand-written for this name, hero first.
  const entry = NAME_BOOK[p.display.toLowerCase()] ?? NAME_BOOK[p.primary.toLowerCase()];
  if (entry) candidates.push(...entry.map(bookPair));

  // 2. Real rhymes on the name's actual ending — the book already mined
  //    the good ones for names it knows.
  if (!entry) {
    for (const r of RHYMES) {
      if (r.test.test(p.primary)) {
        candidates.push({ basis: "rhyme", nickname: r.make(p.primary), sayings: withPoolSayings(r.make(p.primary), r.sayings[0]) });
      }
    }
  }

  // 3. True things about this dog.
  for (const t of CARD_TRAITS) {
    if (opts.traitIds?.includes(t.id)) candidates.push(t.make(p.display, shortForm(p.primary)));
  }

  // 4. Affectionate name forms; a curated listing deck the book already
  //    knows never falls back to generated short-forms.
  if (!(opts.curated && entry)) candidates.push(...affectionForms(p));
  candidates.push(...fallbackForms(p));

  const deck: CardPair[] = [];
  const seen = new Set<string>();
  for (const pair of candidates) {
    const key = pair.nickname.toLowerCase();
    if (seen.has(key)) continue;
    if (!isAllowedNickname(pair.nickname, p.display)) continue;
    seen.add(key);
    deck.push(pair);
    if (deck.length === DECK_SIZE) break;
  }
  return deck;
}

/**
 * Exactly seven names for a dog named by a visitor (Make One for Your
 * Dog), in spin order, hero first. `traitIds` are the true things the
 * visitor picked.
 */
export function buildDeck(realName: string, traitIds: string[] = []): CardPair[] {
  return compose(parseListingName(realName), { traitIds });
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

// Verified listing facts → trait ids. Only what the rescue actually
// published is used — nothing invented.
export function listingTraitIds(dog: Pick<ListingDog, "size" | "age">): string[] {
  const ids: string[] = [];
  if (/x-?large|large|giant/i.test(dog.size ?? "")) ids.push("big");
  else if (/small|tiny|toy/i.test(dog.size ?? "")) ids.push("small");
  if (/baby/i.test(dog.age ?? "")) ids.push("puppy");
  else if (/senior/i.test(dog.age ?? "")) ids.push("senior");
  return ids;
}

/**
 * Exactly seven names for a live adoptable listing. The dog's own override
 * deck wins outright; otherwise the Name Book plus wordplay carries the
 * deck, with the listing's verified size/age filling out the seven.
 * A senior dog with a listed sex gets the family version of the senior
 * card — Grandpa or Grandma — instead of the generic one.
 */
export function buildListingDeck(dog: ListingDog): CardPair[] {
  const p = parseListingName(dog.name);
  const deck = compose(p, {
    id: dog.id,
    traitIds: listingTraitIds(dog),
    curated: true,
  });
  if (DECK_OVERRIDES[dog.id]) return deck;
  // A senior with a listed sex gets the family version of the senior card —
  // unless the book already wrote a grandparent name for this dog.
  const grand = /senior/i.test(dog.age ?? "")
    ? /female/i.test(dog.sex ?? "") ? "Grandma" : /male/i.test(dog.sex ?? "") ? "Grandpa" : null
    : null;
  if (grand && !deck.some((c) => /grandpa|grandma|granny|grampa/i.test(c.nickname))) {
    const i = deck.findIndex((c) => c.nickname === `${p.display} the Old Soul`);
    if (i >= 0) {
      deck[i] = {
        basis: "trait",
        nickname: `${grand} ${p.display}`,
        sayings: ["Wise, unhurried, always right.", "Seen it all. Naps through most of it."],
      };
    }
  }
  return deck;
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
