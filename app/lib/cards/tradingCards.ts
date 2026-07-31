// Fun Dog Trading Cards — the one simple idea behind the dog pages.
//
// A card shows one dog, one nickname, one short funny saying, and the day.
// Every name and saying here was written by a person and is worth seeing —
// there are no name mutations, no celebrity mashups, and no hidden pools of
// thousands. The deck is small on purpose.
//
// Pure logic + data. The UI spins through the deck one card at a time and
// never shows the whole list.

/** One nickname with the sayings that fit it. `{name}` in a nickname is
 *  replaced by the dog's real name. */
export type CardPair = { nickname: string; sayings: string[] };

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

/** True things a kid can pick about their dog. Each unlocks a card or two.
 *  Nicknames stay generic-playful — real-world claims live nowhere here. */
export type CardTrait = { id: string; label: string; pairs: CardPair[] };

export const CARD_TRAITS: CardTrait[] = [
  {
    id: "big",
    label: "Big dog",
    pairs: [{ nickname: "Big {name}", sayings: ["Built for comfort. Built for snacks.", "The floor is mine. All of it."] }],
  },
  {
    id: "small",
    label: "Small dog",
    pairs: [{ nickname: "Little {name}", sayings: ["Small dog. Large opinions.", "I fit in every lap. That's the plan."] }],
  },
  {
    id: "naps",
    label: "Champion napper",
    pairs: [{ nickname: "The Nap Champion", sayings: ["Undefeated since breakfast.", "Saving the neighborhood after nap time."] }],
  },
  {
    id: "treats",
    label: "Lives for treats",
    pairs: [{ nickname: "Snack Patrol", sayings: ["Today's mission: find the treats.", "I heard the snack bag."] }],
  },
  {
    id: "fetch",
    label: "Loves fetch",
    pairs: [{ nickname: "The Fetch Champ", sayings: ["Brings it back. Eventually.", "One more throw. Forever."] }],
  },
  {
    id: "squirrels",
    label: "Squirrel watcher",
    pairs: [{ nickname: "Squirrel Patrol", sayings: ["Fast enough to catch one squirrel. Probably.", "The squirrels know my name."] }],
  },
  {
    id: "barks",
    label: "Big barker",
    pairs: [{ nickname: "Sir Barks-a-Lot", sayings: ["I heard that. And that.", "Someone had to say something."] }],
  },
  {
    id: "couch",
    label: "Owns the couch",
    pairs: [{ nickname: "Captain Couch", sayings: ["The couch is under my protection.", "Adopted the family. Kept the couch."] }],
  },
  {
    id: "walks",
    label: "Loves walks",
    pairs: [{ nickname: "The Block Captain", sayings: ["Knows every mailbox personally.", "Same walk. New smells. Best day."] }],
  },
  {
    id: "zoomies",
    label: "Gets the zoomies",
    pairs: [{ nickname: "The {name} Express", sayings: ["All aboard. No brakes.", "Three laps. No reason."] }],
  },
];

/** Cards every dog gets, no questions asked. */
export const UNIVERSAL_PAIRS: CardPair[] = [
  { nickname: "{name} Jones", sayings: ["Local legend. Ask anyone.", "Today's mission: find the treats."] },
  { nickname: "Professor Paws", sayings: ["Professional blanket inspector.", "Currently grading your snack sharing."] },
  { nickname: "The Treat Detective", sayings: ["I heard the snack bag.", "The case of the missing biscuit: solved."] },
  { nickname: "Neighborhood Watchdog", sayings: ["Saving the neighborhood after nap time.", "Nothing gets past this porch."] },
  { nickname: "Captain Couch", sayings: ["The couch is under my protection.", "Adopted the family. Kept the couch."] },
  { nickname: "Sir Barks-a-Lot", sayings: ["Someone had to say something.", "I heard that. And that."] },
];

function fillName(pair: CardPair, realName: string): CardPair {
  return { ...pair, nickname: pair.nickname.replace("{name}", realName) };
}

// Tiny stable string hash — gives each dog its own deck order without any
// randomness, so the same dog always spins the same way.
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Build a dog's deck from its real name plus the true things picked about
 * it. Trait cards come first (they're the most "this is my dog" ones),
 * then the universal cards, deterministically rotated per dog so two dogs
 * don't open on the same card. Duplicate nicknames collapse to one.
 */
export function buildDeck(realName: string, traitIds: string[] = []): CardPair[] {
  const name = realName.trim();
  if (!name) return [];
  const traitPairs = CARD_TRAITS.filter((t) => traitIds.includes(t.id)).flatMap((t) => t.pairs);
  const rot = hash(name.toLowerCase()) % UNIVERSAL_PAIRS.length;
  const rotated = [...UNIVERSAL_PAIRS.slice(rot), ...UNIVERSAL_PAIRS.slice(0, rot)];
  const deck: CardPair[] = [];
  const seen = new Set<string>();
  for (const raw of [...traitPairs, ...rotated]) {
    const pair = fillName(raw, name);
    const key = pair.nickname.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deck.push(pair);
  }
  return deck;
}

/** "Thursday's Dog Card" */
export function dayLabel(date: Date): string {
  return `${date.toLocaleDateString("en-US", { weekday: "long" })}'s Dog Card`;
}

/**
 * The card for spin number `step` (0-based). Walks the deck in order; once
 * every nickname has been seen, the next pass shows each nickname's next
 * saying, so spinning keeps paying off.
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

/** Every nickname and saying in every pool — the safety tests scan this. */
export function allCardStrings(): string[] {
  const pairs = [...UNIVERSAL_PAIRS, ...CARD_TRAITS.flatMap((t) => t.pairs)];
  return pairs.flatMap((p) => [p.nickname, ...p.sayings]);
}
