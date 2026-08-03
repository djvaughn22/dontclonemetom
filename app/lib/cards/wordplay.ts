// The wordplay engine — nickname candidates for dogs the Name Book has
// never met. Rescue listings change every day; a brand-new dog must get
// real sound-based names, not warm filler.
//
// The engine works the way the hand-written book does, just narrower:
//   · true rhymes on the name's actual ending (the Luna-Tuna tier)
//   · rhyming or alliterative descriptors (the Smiley-Miley tier)
//   · affectionate pet forms a family really uses (Kev, Kev-Kev, Kevvy)
// Every candidate is scored for how naturally it can be said out loud,
// candidates that could fit almost any dog are rejected or heavily
// capped, and a deck that can't reach seven strong cards comes back
// SHORT with a needs-review flag — never quietly padded.

import type { ParsedDogName } from "./dogNames";

export type WordplayKind = "rhyme" | "pet" | "descriptor";

export type WordplayCard = {
  nickname: string;
  saying: string;
  kind: WordplayKind;
  /** 0–100: how confidently a family would actually say this */
  score: number;
};

// ── True rhymes ──────────────────────────────────────────────────────────
// Each pattern matches the REAL ending sound of the name; the rhyme word
// lands on that sound, so the card only ever fits names it genuinely
// rhymes with. ("-aya" is deliberately absent: Papaya belongs to Isaiah.)
type RhymeRule = {
  test: RegExp;
  make: (name: string) => string;
  saying: string;
  score: number;
};

const R = (test: RegExp, make: (n: string) => string, saying: string, score = 90): RhymeRule => ({ test, make, saying, score });

const RHYME_RULES: RhymeRule[] = [
  R(/una$/i, (n) => `${n} Tuna`, "Rhymes with dinner. Coincidence?"),
  R(/una$/i, (n) => `${n} Laguna`, "Beach-day energy, every day.", 85),
  R(/ella$/i, (n) => `${n} Mozzarella`, "Extra cheesy. Zero regrets."),
  R(/ella$/i, (n) => `${n} Umbrella`, "Covers the whole family.", 85),
  R(/illa$/i, (n) => `${n} Vanilla`, "The best flavor. No contest."),
  R(/ita$/i, (n) => `${n} Chiquita`, "Little and lovely, twice over."),
  R(/ito$/i, (n) => `${n} Burrito`, "Wraps into every blanket."),
  R(/(ana|anna)$/i, (n) => `${n} Banana`, "Top of the bunch."),
  R(/(ino|eeno)$/i, (n) => `${n} Bambino`, "The family's little one."),
  R(/ola$/i, (n) => `${n} Granola`, "Crunchy, wholesome, full of energy."),
  R(/(oco|oko)$/i, (n) => `${n} Loco`, "Runs on zoomies and vibes."),
  R(/(oney|ony)$/i, (n) => `${n} Baloney`, "One hundred percent. The good kind."),
  R(/oni$/i, (n) => `${n} Rigatoni`, "The premium pasta shape."),
  R(/etta$/i, (n) => `${n} Bruschetta`, "The fancy appetizer of dogs."),
  R(/otta$/i, (n) => `${n} Ricotta`, "Soft on the inside. All the way through."),
  R(/ax$/i, (n) => `${n} Snacks`, "Rhymes with the life's work."),
  R(/ash$/i, (n) => `${n} Splash`, "Cannonballs into every puddle."),
  R(/ip$/i, (n) => `${n} Chip`, "Right off the good-dog block."),
  R(/op$/i, (n) => `${n} Pop`, "The sound of pure joy."),
  R(/ug$/i, (n) => `${n} the Love Bug`, "Snuggles are mandatory.", 85),
  R(/ub$/i, (n) => `${n} the Cub`, "The den's favorite.", 80),
  R(/(ain|ane)$/i, (n) => `${n} the Brain`, "Solved the treat jar in one afternoon.", 85),
  R(/(ain|ane)$/i, (n) => `${n} Train`, "All aboard. Next stop: home."),
  R(/ake$/i, (n) => `${n} Pancake`, "Flat-out sweet."),
  R(/ake$/i, (n) => `${n} Milkshake`, "Brings everyone to the yard.", 85),
  R(/(ean|een)$/i, (n) => `${n} Jellybean`, "Every flavor turns out sweet."),
  R(/out$/i, (n) => `${n} the Sprout`, "Growing on everyone.", 85),
  R(/ock$/i, (n) => `${n} Around the Clock`, "Rocks it. All day.", 85),
  R(/ocket$/i, (n) => `${n} Rocket`, "Three, two, one, zoomies."),
  R(/elly$/i, (n) => `${n} Jelly`, "Wobbles with joy."),
  R(/olly$/i, (n) => `${n} Lolly`, "Sweetness on a stick."),
  R(/andy$/i, (n) => `${n} Dandy`, "Fine and dandy, daily."),
  R(/oodle$/i, (n) => `${n} Noodle`, "Uses it. Mostly for snacks."),
  R(/uddle$/i, (n) => `${n} Cuddle-Puddle`, "The whole family fits."),
  R(/ee$/i, (n) => `${n} Jubilee`, "A celebration on four paws."),
  R(/oo$/i, (n) => `${n} Kazoo`, "The silliest instrument. The best."),
  R(/ick$/i, (n) => `Slick ${n}`, "Smooth moves only."),
  R(/(iggle|ggles)$/i, (n) => `${n} the Giggle`, "The house's laugh track.", 80),
  R(/ow$/i, (n) => `Holy Cow ${n}`, "The correct reaction.", 80),
  R(/ist(er)?$/i, (n) => `${n} the Twister`, "Spins for joy. Literally.", 80),
  R(/east$/i, (n) => `${n} the Feast`, "For the eyes AND the heart.", 80),
  R(/uck$/i, (n) => `${n} the Lucky Duck`, "Quacks himself up.", 80),
  R(/ero$/i, (n) => `${n} Sombrero`, "Wide-brimmed personality."),
  R(/in$/i, (n) => `${n} the Grin`, "Wears it all day.", 78),
  R(/ot$/i, (n) => `${n} Polka-Dot`, "Dances in spots.", 78),
  R(/ummy$/i, (n) => `${n} Yummy`, "The reviews are in."),
  R(/ixie$/i, (n) => `${n} Pixie`, "A little bit of backyard magic."),
];

// ── Descriptors ──────────────────────────────────────────────────────────
// Warm, sayable words — but only when the SOUND ties them to this name:
// same opening sound (Merry Miley) or a real rhyme on the ending. A
// descriptor that doesn't echo the name is exactly the "fits any dog"
// filler this engine exists to prevent, so it never fires.
type Descriptor = { w: string; s: string; rime?: RegExp };

const DESCRIPTORS: Descriptor[] = [
  { w: "Jolly", s: "Ho ho ho, basically.", rime: /olly$/i },
  { w: "Jazzy", s: "Smooth notes, quick paws.", rime: /(azzy|azz)$/i },
  { w: "Snazzy", s: "Dressed up in plain fur.", rime: /(azzy|azz)$/i },
  { w: "Zippy", s: "Fast name, faster feet.", rime: /(ippy|ip)$/i },
  { w: "Peppy", s: "Factory-installed enthusiasm.", rime: /(eppy|ep)$/i },
  { w: "Wiggly", s: "The tail moves the whole dog.", rime: /iggly$/i },
  { w: "Waggy", s: "Measured in wags per minute.", rime: /aggy$/i },
  { w: "Merry", s: "The holiday feeling, year-round.", rime: /(erry|ary)$/i },
  { w: "Sunny", s: "The forecast every single day.", rime: /unny$/i },
  { w: "Mellow", s: "The acoustic version of a dog.", rime: /ellow?$/i },
  { w: "Dapper", s: "Better dressed than most of us.", rime: /apper$/i },
  { w: "Spunky", s: "Small word, full charge.", rime: /unky$/i },
  { w: "Plucky", s: "Never met a big deal it couldn't handle.", rime: /ucky$/i },
  { w: "Bubbly", s: "Carbonated personality.", rime: /ubbly$/i },
  { w: "Chipper", s: "Up before the alarm. Thrilled about it.", rime: /ipper$/i },
  { w: "Cheery", s: "Walks in. Room improves.", rime: /eery$/i },
  { w: "Breezy", s: "Easy like Sunday morning.", rime: /eezy$/i },
  { w: "Toasty", s: "Warm on every side.", rime: /oasty$/i },
  { w: "Tip-Top", s: "Peak condition, peak charm.", rime: /op$/i },
  { w: "Rowdy", s: "The fun kind of loud.", rime: /owdy$/i },
  { w: "Doodle", s: "Drawn with a happy pencil.", rime: /oodle$/i },
  { w: "Frisky", s: "Factory setting: playful.", rime: /isky$/i },
  { w: "Goofy", s: "The good kind of ridiculous.", rime: /oofy$/i },
  { w: "Hoppy", s: "Part dog, part pogo stick.", rime: /oppy$/i },
  { w: "Loopy", s: "Runs in the fun kind of circles.", rime: /oopy$/i },
  { w: "Nifty", s: "Handy to have around.", rime: /ifty$/i },
  { w: "Velvet", s: "The softest ears in the county.", rime: /elvet$/i },
];

// ── Pet forms ────────────────────────────────────────────────────────────
// The shapes families really use — short call name, the doubled form, the
// -y diminutive, the plural-of-affection. Gated hard for mouth-feel:
// "Kev" and "Zigs" pass, "Tur" and "Sweetty" never do.

const isVowel = (c: string) => "aeiouy".includes(c.toLowerCase());

/** First-syllable short form: "Penelope"→"Pen", "Charlie"→"Char". */
export function shortCallName(primary: string): string {
  if (primary.length <= 4) return primary;
  let i = 0;
  while (i < primary.length && !isVowel(primary[i])) i++;
  while (i < primary.length && isVowel(primary[i])) i++;
  if (i < primary.length && !isVowel(primary[i])) i++;
  const short = primary.slice(0, Math.max(2, i));
  return short.length >= 2 ? short : primary;
}

/** True when a short form actually sounds like something a person says. */
export function saysWell(short: string): boolean {
  if (short.length < 2) return false;
  if (/[uei][rl]$/i.test(short)) return false; // "Tur", "Wil" — mouthfeel fails
  const last = short[short.length - 1].toLowerCase();
  const penult = short[short.length - 2].toLowerCase();
  if ("aeiou".includes(last)) return true;
  return "aeiou".includes(penult) && "bdgkmnprstxz".includes(last);
}

function petForms(p: ParsedDogName): WordplayCard[] {
  const out: WordplayCard[] = [];
  const short = shortCallName(p.primary);
  // A derived fragment under three letters ("An" from Angus) is not a
  // call name anyone uses — only a dog actually NAMED Bo keeps "Bo" —
  // and a fragment that lands on an English function word ("For" from
  // Fortuna) sounds like half a sentence, not a nickname.
  const derived = short.toLowerCase() !== p.primary.toLowerCase();
  if (derived && short.length < 3) return out;
  if (derived && ["for", "the", "and", "but", "not", "was", "can", "con", "com", "per", "pro", "off", "out"].includes(short.toLowerCase())) return out;
  const wellSaid = saysWell(short);

  if (wellSaid && p.display.length >= 6 && short.length >= 3 && short.toLowerCase() !== p.display.toLowerCase()) {
    out.push({ kind: "pet", score: 74, nickname: short, saying: `Short. Sweet. ${short}.` });
  }
  if (wellSaid && short.length <= 4) {
    out.push({ kind: "pet", score: 70, nickname: `${short}-${short}`, saying: `So nice they named ${short} twice.` });
  }
  const last = short[short.length - 1]?.toLowerCase() ?? "";
  const alreadyDiminutive = /(y|ie|ee)$/i.test(p.display);
  const doubleVowelBase = /[aeiou]{2}[^aeiou]$/i.test(short);
  if (wellSaid && last && !isVowel(last) && !alreadyDiminutive && !doubleVowelBase) {
    const doubled = "bdgmnprst".includes(last) ? short + last : short;
    out.push({ kind: "pet", score: 68, nickname: `${doubled}y`, saying: "The bedtime version." });
  }
  // "Ziggy"→"Zigs": strip the -y, add the plural of affection.
  if (/[a-z]{3,}y$/i.test(p.primary) && p.primary.length >= 5) {
    const base = p.primary.slice(0, -1);
    const sForm = /[aeiou]$/i.test(base) ? "" : `${base[0].toUpperCase()}${base.slice(1).toLowerCase()}s`;
    if (sForm && saysWell(base)) {
      out.push({ kind: "pet", score: 72, nickname: sForm, saying: "The team-roster version." });
    }
  }
  return out;
}

// ── The pool ─────────────────────────────────────────────────────────────

/** Every wordplay candidate for this name, best first. Larger than seven
 *  on purpose — selection happens later, against the quality caps. */
export function buildWordplayPool(p: ParsedDogName): WordplayCard[] {
  if (!p.primary) return [];
  const pool: WordplayCard[] = [];

  for (const r of RHYME_RULES) {
    if (r.test.test(p.primary)) {
      pool.push({ kind: "rhyme", score: r.score, nickname: r.make(p.primary), saying: r.saying });
    }
  }

  const onset = p.primary[0]?.toLowerCase();
  for (const d of DESCRIPTORS) {
    const alliterates = d.w[0].toLowerCase() === onset && d.w.toLowerCase() !== p.primary.toLowerCase();
    const rhymes = d.rime ? d.rime.test(p.primary) : false;
    if (alliterates || rhymes) {
      pool.push({
        kind: "descriptor",
        score: rhymes ? 82 : 62,
        nickname: `${d.w} ${p.display}`,
        saying: d.s,
      });
    }
  }

  pool.push(...petForms(p));

  // Longer nicknames are harder to say out loud — tax them.
  for (const c of pool) {
    const syllables = (c.nickname.match(/[aeiouy]+/gi) ?? []).length;
    if (syllables > 5) c.score -= 10;
    if (c.nickname.length > 22) c.score -= 8;
  }

  return pool.sort((a, b) => b.score - a.score);
}

// How many of each kind a single deck can carry — variety is the point.
// Two pet forms max: "Mar", "Mar-Mar", AND "Marry" in one deck reads as
// the same idea three times.
const KIND_CAPS: Record<WordplayKind, number> = { rhyme: 3, pet: 2, descriptor: 1 };

/**
 * Pick up to `want` distinct, genuinely usable cards from the pool.
 * Returns fewer when the pool runs out of strong candidates — a short
 * deck plus a review flag beats a padded one.
 */
export function selectWordplay(
  pool: WordplayCard[],
  want: number,
  taken: Set<string>,
): WordplayCard[] {
  const used: Record<WordplayKind, number> = { rhyme: 0, pet: 0, descriptor: 0 };
  const picked: WordplayCard[] = [];
  for (const c of pool) {
    if (picked.length >= want) break;
    const key = c.nickname.toLowerCase();
    if (taken.has(key)) continue;
    if (used[c.kind] >= KIND_CAPS[c.kind]) continue;
    if (c.score < 55) continue; // weak candidates are discarded, not displayed
    taken.add(key);
    used[c.kind] += 1;
    picked.push(c);
  }
  return picked;
}
