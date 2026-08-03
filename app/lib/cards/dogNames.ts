// Listing names as rescues actually publish them are messy: program codes
// ("NO  Kevin", "LH Pip", "DK- King"), parentheticals ("Auggie (Spot)"),
// aka forms ("Gunner aka Rolo"), shouting caps ("TOASTED RAVIOLI"), litter
// numbering ("Peaches II", "Pebbles 2021"), bonded pairs ("Bandit and
// Basque"). A nickname can only be good if it starts from the dog's actual
// name, so this module turns a raw listing name into the name a family
// would really use.

export type ParsedDogName = {
  /** the dog's real call name, cleanly cased — may be more than one word */
  display: string;
  /** the single word nicknames transform — usually the first name word */
  primary: string;
};

const LOWER_WORDS = new Set(["and", "the", "of", "von", "van", "de", "la"]);

function titleCaseWord(w: string): string {
  if (!w) return w;
  const low = w.toLowerCase();
  if (LOWER_WORDS.has(low)) return low;
  return low[0].toUpperCase() + low.slice(1);
}

/** "TOASTED RAVIOLI" → "Toasted Ravioli"; mixed-case names pass through. */
function fixShoutingCaps(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => (/^[A-Z'-]{2,}$/.test(w) ? titleCaseWord(w) : w))
    .join(" ");
}

/**
 * The real call name from a raw listing name. Conservative on purpose:
 * every rule below exists for a name actually seen in the live listings.
 */
export function parseListingName(raw: string): ParsedDogName {
  let s = (raw ?? "").trim();

  // Editorial markers and parentheticals: "*Special Needs*",
  // "(from Stranger Things)", "(senior bonded pair)", "(Spot)".
  s = s.replace(/\*[^*]*\*/g, " ");
  s = s.replace(/\([^)]*\)/g, " ");

  // "Gunner aka Rolo" → the listed first name is the call name.
  s = s.replace(/\s+a\.?k\.?a\.?[\s.].*$/i, "");

  // Shelter program codes in front of the name: "NO  Kevin", "LH Pip",
  // "HP Carol", "HS Bonita", "SR Betty Sue", "HE Mayflower", "DK- King",
  // "D Michael". One or two capitals (with optional dash) before a real word.
  s = s.replace(/^[A-Z]{1,2}-?\s+(?=[A-Za-z]{3,})/, "");

  // Litter/re-listing counters: "Peaches II", "Pebbles 2021", "Buddy #2".
  s = s.replace(/\s+(?:[IVX]{2,}|\d{1,4}|#\d+)$/, "");

  // Bonded pair listings name two dogs; the card can only star one.
  s = s.replace(/\s{2,}/g, " ").trim();
  const pair = s.match(/^([A-Za-z'-]+)\s+and\s+[A-Za-z'-]+$/i);
  if (pair) s = pair[1];

  s = fixShoutingCaps(s.replace(/\s{2,}/g, " ").trim());
  // Drop anything that isn't name material after cleanup.
  s = s
    .split(" ")
    .filter((w) => /^[A-Za-z'-]+$/.test(w))
    .map((w) => (/^[a-z]/.test(w) && !LOWER_WORDS.has(w) ? titleCaseWord(w) : w))
    .join(" ")
    .trim();

  if (!s) return { display: "", primary: "" };

  const words = s.split(" ").filter((w) => !LOWER_WORDS.has(w.toLowerCase()));
  return { display: s, primary: words[0] ?? s };
}
