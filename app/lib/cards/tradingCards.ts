// Fun Dog Trading Cards — the one simple idea behind the dog pages.
//
// A card shows one dog, one nickname, one short funny saying, and the day.
// Every dog gets EXACTLY SEVEN names, and every one of the seven is built
// for that dog — from its real name's sounds, shortenings, rhymes, and any
// true things picked about it. There is no shared generic deck, no pool of
// thousands, and no name that could be pasted onto just any dog.
//
// Isaiah is the permanent example: his seven live in dogProfiles.ts as an
// owner-locked deck (Batdog first, always). This module generates the seven
// for every other dog and enforces the quality bar for both.
//
// Pure logic + data. The UI spins through the deck one card at a time and
// never shows the whole list.

export const DECK_SIZE = 7;

/** Why a name belongs to this dog — validation keys off it. */
export type CardBasis = "hero" | "family" | "rhyme" | "sound" | "trait";

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
  "professor paws",
  "captain couch",
  "neighborhood watchdog",
  "the treat detective",
  "ruff rider",
  "good boy",
  "fluffy",
  "doggo",
  "pupper",
];

// ── Name material ────────────────────────────────────────────────────────

function cleanName(realName: string): string {
  const first = realName.trim().split(/\s+/)[0] ?? "";
  const letters = first.replace(/[^a-zA-Z'-]/g, "");
  if (!letters) return "";
  return letters[0].toUpperCase() + letters.slice(1).toLowerCase();
}

const isVowel = (c: string) => "aeiouy".includes(c.toLowerCase());

/** First-syllable short form a family would actually say: "Biscuit"→"Bis",
 *  "Charlie"→"Char", "Luna"→"Lu", "Rex"→"Rex". */
export function shortForm(realName: string): string {
  const name = cleanName(realName);
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

// ── The builders ─────────────────────────────────────────────────────────
// Every builder bakes the dog's own name (or short form) into the nickname,
// so two dogs can never end up with the same deck.

type Ctx = { name: string; short: string; h: number };
type Builder = { basis: CardBasis; make: (c: Ctx) => CardPair | null };

// Hero identity — always the first card, like Batdog is for Isaiah.
const HERO_STYLES: ((c: Ctx) => CardPair)[] = [
  (c) => ({
    basis: "hero",
    nickname: `Super ${c.name}`,
    sayings: ["Faster than a dropped meatball.", "Cape sold separately."],
  }),
  (c) => ({
    basis: "hero",
    nickname: `Captain ${c.name}`,
    sayings: ["Reporting for duty. And snacks.", "The mission is lunch."],
  }),
  (c) => ({
    basis: "hero",
    nickname: `Mighty ${c.name}`,
    sayings: ["Legendary around here.", "The legend does its own stunts."],
  }),
];

// Sound-alike celebrity / character transformations. Each entry only fires
// when the dog's name genuinely echoes the sound — the Izzy Osbourne rule.
const SOUND_MATCHES: Builder[] = [
  {
    basis: "sound",
    make: (c) =>
      /izz|ozz/i.test(c.name) || /^i[sz]/i.test(c.name)
        ? {
            nickname: `${/izz|ozz/i.test(c.short) ? c.short : "Izzy"} Osbourne`,
            sayings: ["Loud. Legendary. Slightly unhinged.", "Rocks the entire cul-de-sac."],
          }
        : null,
  },
  {
    basis: "sound",
    make: (c) =>
      /(ay|ai|aye|ade)$/i.test(c.short) || /ay/i.test(c.short)
        ? {
            nickname: `Darth ${c.short}der`,
            sayings: ["The bark side is strong with this one.", "Appears after dinner. Ask the couch."],
          }
        : null,
  },
  {
    basis: "sound",
    make: (c) =>
      /ella$/i.test(c.name)
        ? {
            nickname: `Cinder${c.name.toLowerCase()}`.replace(/^c/, "C"),
            sayings: ["Home by dinner. Every time.", "The slipper fits. It's a paw."],
          }
        : null,
  },
  {
    basis: "sound",
    make: (c) =>
      /^rex$/i.test(c.name)
        ? { nickname: "T-Rex", sayings: ["Tiny arms not included.", "Roars at the vacuum. Wins."] }
        : null,
  },
  {
    basis: "sound",
    make: (c) =>
      /^max$/i.test(c.name)
        ? { nickname: "Max to the Max", sayings: ["There is no half speed.", "Everything. All the way. Always."] }
        : null,
  },
];

// Real rhymes on the name's actual ending — the Isaiah Papaya rule.
const RHYMES: { test: RegExp; word: string; sayings: string[] }[] = [
  { test: /una$/i, word: "Tuna", sayings: ["Rhymes with dinner. Coincidence?", "It rhymes. That's the whole case."] },
  { test: /ella$/i, word: "Mozzarella", sayings: ["Extra cheesy. Zero regrets.", "It rhymes. That's the whole case."] },
  { test: /(ia|iah|aya)$/i, word: "Papaya", sayings: ["Sweet, seedless, occasionally slippery.", "It rhymes. That's the whole case."] },
  { test: /(oco|oko)$/i, word: "Loco", sayings: ["Runs on zoomies and vibes.", "It rhymes. That's the whole case."] },
  { test: /oney?$/i, word: "Baloney", sayings: ["One hundred percent baloney. The good kind.", "It rhymes. That's the whole case."] },
  { test: /(ie|y)$/i, word: "Macaroni", sayings: ["Sticks to everything. Mostly you.", "It rhymes. That's the whole case."] },
];

// True things a kid can pick about their dog. Each fuses the fact with the
// dog's own name, so the card still belongs to this dog alone.
export type CardTrait = { id: string; label: string; make: (c: Ctx) => CardPair };

export const CARD_TRAITS: CardTrait[] = [
  { id: "big", label: "Big dog", make: (c) => ({ basis: "trait", nickname: `Big ${c.name}`, sayings: ["The floor is mine. All of it.", "Built for comfort."] }) },
  { id: "small", label: "Small dog", make: (c) => ({ basis: "trait", nickname: `Lil ${c.name}`, sayings: ["Small dog. Large opinions.", "Fits in every lap. That's the plan."] }) },
  { id: "naps", label: "Champion napper", make: (c) => ({ basis: "trait", nickname: `Sleepy ${c.short}`, sayings: ["Undefeated since breakfast.", "Do not disturb. Ever."] }) },
  { id: "treats", label: "Lives for treats", make: (c) => ({ basis: "trait", nickname: `Snack Boss ${c.name}`, sayings: ["I heard the snack bag.", "Today's mission: find the treats."] }) },
  { id: "fetch", label: "Loves fetch", make: (c) => ({ basis: "trait", nickname: `Boomerang ${c.short}`, sayings: ["Always comes back. Eventually.", "One more throw. Forever."] }) },
  { id: "squirrels", label: "Squirrel watcher", make: (c) => ({ basis: "trait", nickname: `Sheriff ${c.short}`, sayings: ["The squirrels know my name.", "Fast enough to catch one squirrel. Probably."] }) },
  { id: "barks", label: "Big barker", make: (c) => ({ basis: "trait", nickname: `${c.name} the Announcer`, sayings: ["Someone had to say something.", "I heard that. And that."] }) },
  { id: "couch", label: "Owns the couch", make: (c) => ({ basis: "trait", nickname: `Couch Boss ${c.short}`, sayings: ["The couch is under my protection.", "Adopted the family. Kept the couch."] }) },
  { id: "walks", label: "Loves walks", make: (c) => ({ basis: "trait", nickname: `Mayor ${c.name}`, sayings: ["Knows every mailbox personally.", "Re-elected every single walk."] }) },
  { id: "zoomies", label: "Gets the zoomies", make: (c) => ({ basis: "trait", nickname: `Turbo ${c.name}`, sayings: ["All aboard. No brakes.", "Three laps. No reason."] }) },
];

// Affectionate family fillers — still built from this dog's name, used only
// to complete the seven when the special builders don't fire.
const FAMILY_STYLES: ((c: Ctx) => CardPair)[] = [
  (c) => ({ basis: "family", nickname: `${c.short}-${c.short}`, sayings: [`So nice they named ${c.short} twice.`, "Answers to both. Eventually."] }),
  (c) => ({ basis: "family", nickname: `Big ${c.name}`, sayings: ["The floor is mine. All of it.", "Built for comfort."] }),
  (c) => ({ basis: "family", nickname: `${c.name}zilla`, sayings: ["The city is safe. Probably.", "Fear the wag."] }),
  (c) => ({ basis: "family", nickname: `Agent ${c.name}`, sayings: ["Licensed to sniff.", "The treats never see it coming."] }),
  (c) => ({ basis: "family", nickname: `Mayor ${c.name}`, sayings: ["Knows every mailbox personally.", "Re-elected every single walk."] }),
  (c) => ({ basis: "family", nickname: `${c.name}-Boo`, sayings: ["Official household sweetheart.", "Yes, that face works every time."] }),
];

// ── Deck building ────────────────────────────────────────────────────────

/**
 * Exactly seven names for this dog, in spin order, hero first. Candidates
 * are ranked: hero, then sound-alike and rhyme wordplay (the best cards),
 * then the dog's picked true things, then name-built family forms to
 * complete the seven. The dog's name hash rotates the hero style so
 * different dogs open differently.
 */
export function buildDeck(realName: string, traitIds: string[] = []): CardPair[] {
  const name = cleanName(realName);
  if (!name) return [];
  const c: Ctx = { name, short: shortForm(name), h: hash(name.toLowerCase()) };

  const candidates: CardPair[] = [HERO_STYLES[c.h % HERO_STYLES.length](c)];
  for (const b of SOUND_MATCHES) {
    const pair = b.make(c);
    if (pair) candidates.push({ ...pair, basis: "sound" });
  }
  const rhyme = RHYMES.find((r) => r.test.test(name));
  if (rhyme) candidates.push({ basis: "rhyme", nickname: `${name} ${rhyme.word}`, sayings: rhyme.sayings });
  for (const t of CARD_TRAITS) {
    if (traitIds.includes(t.id)) candidates.push(t.make(c));
  }
  const familyStart = c.h % FAMILY_STYLES.length;
  for (let i = 0; i < FAMILY_STYLES.length; i++) {
    candidates.push(FAMILY_STYLES[(familyStart + i) % FAMILY_STYLES.length](c));
  }

  const deck: CardPair[] = [];
  const seen = new Set<string>();
  for (const pair of candidates) {
    const key = pair.nickname.toLowerCase();
    if (seen.has(key) || BANNED_GENERIC_NAMES.includes(key)) continue;
    seen.add(key);
    deck.push(pair);
    if (deck.length === DECK_SIZE) break;
  }
  return deck;
}

// ── Quality review ───────────────────────────────────────────────────────

/**
 * The name-quality bar, as code. Returns every problem with a deck; must be
 * empty before a deck ships. `locked` decks (owner-curated, like Isaiah's)
 * skip the name-connection rule — a human already made each name personal —
 * but never skip the count, uniqueness, or generic-filler rules.
 */
export function findDeckProblems(
  deck: CardPair[],
  opts: { realName: string; locked?: boolean },
): string[] {
  const problems: string[] = [];
  if (deck.length !== DECK_SIZE) problems.push(`deck has ${deck.length} cards, needs exactly ${DECK_SIZE}`);
  const seen = new Set<string>();
  const name = cleanName(opts.realName).toLowerCase();
  const short = shortForm(opts.realName).toLowerCase();
  for (const pair of deck) {
    const low = pair.nickname.toLowerCase();
    if (seen.has(low)) problems.push(`duplicate name: ${pair.nickname}`);
    seen.add(low);
    if (BANNED_GENERIC_NAMES.includes(low)) problems.push(`generic filler: ${pair.nickname}`);
    if (pair.sayings.length === 0) problems.push(`no saying for: ${pair.nickname}`);
    if (!opts.locked && pair.basis !== "sound" && !low.includes(name) && !low.includes(short)) {
      problems.push(`not built from this dog's name: ${pair.nickname}`);
    }
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
