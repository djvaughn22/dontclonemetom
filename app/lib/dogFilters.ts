// Homepage filters and sort for the live dog list. Visitors narrow the list
// only by what each rescue actually reported: a dog whose rescue left a field
// blank never matches a filter on that field, and "good with" means the
// rescue said so. Client-safe: pure functions, no env.

export type FindPrefs = { size: string; age: string; sex: string; goodWith: string; sort: string };

export const NO_FILTERS: FindPrefs = { size: "", age: "", sex: "", goodWith: "", sort: "near" };

// Option values are the feed's own words (RescueGroups sizeGroup, ageGroup,
// sex); the labels are what visitors read.
export const FILTER_OPTIONS = {
  size: [["", "Any size"], ["Small", "Small"], ["Medium", "Medium"], ["Large", "Large"], ["X-Large", "Extra large"]],
  age: [["", "Any age"], ["Baby", "Puppy"], ["Young", "Young"], ["Adult", "Adult"], ["Senior", "Senior"]],
  sex: [["", "Any"], ["Female", "Female"], ["Male", "Male"]],
  goodWith: [["", "Any"], ["kids", "Kids"], ["dogs", "Other dogs"], ["cats", "Cats"]],
  sort: [["near", "Nearest first"], ["long", "Listed longest"], ["new", "Newest listings"]],
} as const satisfies Record<keyof FindPrefs, readonly (readonly [string, string])[]>;

const GOOD_WITH_FACT: Record<string, string> = {
  kids: "Good with kids",
  dogs: "Good with dogs",
  cats: "Good with cats",
};

type FilterableDog = {
  size: string;
  sex: string;
  ageGroup?: string;
  facts: string[];
  listedAt?: string | null;
};

// Keep only known option values, so a stale or hand-edited saved setting can
// never hide every dog.
export function cleanPrefs(value: unknown): FindPrefs {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const pick = (key: keyof FindPrefs) => {
    const v = raw[key];
    return FILTER_OPTIONS[key].some(([option]) => option === v) ? (v as string) : NO_FILTERS[key];
  };
  return { size: pick("size"), age: pick("age"), sex: pick("sex"), goodWith: pick("goodWith"), sort: pick("sort") };
}

export function hasFilters(prefs: FindPrefs): boolean {
  return Boolean(prefs.size || prefs.age || prefs.sex || prefs.goodWith);
}

export function matchesFilters(dog: FilterableDog, prefs: FindPrefs): boolean {
  if (prefs.size && dog.size !== prefs.size) return false;
  if (prefs.age && (dog.ageGroup ?? "") !== prefs.age) return false;
  if (prefs.sex && dog.sex !== prefs.sex) return false;
  if (prefs.goodWith && !dog.facts.includes(GOOD_WITH_FACT[prefs.goodWith])) return false;
  return true;
}

// "Nearest first" keeps the feed's distance order. The listing-date sorts put
// dogs without a listing date last instead of guessing one.
export function sortDogs<T extends FilterableDog>(dogs: T[], sort: string): T[] {
  if (sort !== "long" && sort !== "new") return dogs;
  const listed = (dog: T) => (dog.listedAt ? Date.parse(dog.listedAt) : NaN);
  return [...dogs].sort((a, b) => {
    const x = listed(a);
    const y = listed(b);
    if (Number.isNaN(x) || Number.isNaN(y)) return Number(Number.isNaN(x)) - Number(Number.isNaN(y));
    return sort === "long" ? x - y : y - x;
  });
}
