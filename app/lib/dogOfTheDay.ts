// DontCloneMeTom — Dog of the Day content adapter for the shared
// Daily Social Engine (see app/lib/dailySocialCore.ts).
//
// One verified adoptable dog near ZIP 63040 each day. Selection is
// deterministic for a date OVER THE CURRENT AVAILABLE LISTINGS: the same
// date re-run while the same dogs are listed picks the same dog. Because
// availability changes over time, the permanent archive is the dog's own
// stable page (/dogs/[id]), not a dated page.
//
// HARD RULES (never violated): only currently-available listings with a real
// photo, a real name, an identified rescue, and a working original listing
// URL are eligible. Nothing about a dog is ever invented — the caption and
// card carry only source-verified facts.
//
// 2026-09-06 — DOG OF THE DAY IS THE HIGHEST-VALUE PLACEMENT ON THE SITE, so
// it now carries the strictest bar: the dog's individual adoption destination
// must be CONFIRMED, not merely dog-shaped. MOO held this slot while her APA
// page said "PET NOT FOUND", because eligibility only ever asked whether the
// URL looked like a dog page. A dog is featured only when the shelter's own
// official feed carries her, or a live destination check confirms her. An
// unconfirmed or unreachable destination does not get the slot — the ring
// simply walks on to the next dog, so the slot is never left holding a dead
// listing and never left empty while a good dog is available.

import {
  activeHashtags,
  captionMarkerForDate,
  formatFullDate,
  hashSeed,
  isValidDateKey,
  type DailySocialBrandConfig,
  type DailySocialPost,
} from "./dailySocialCore";
import {
  readPublishConfig,
  recentPublishedCaptions,
} from "./instagramPublisherCore";
import { fetchAdoptableDogs, isPubliclyEligible, type Dog } from "./rescueDogs";
import { hasConfirmedDestination } from "./adoptionUrlSchema";
import { verifyDogProfileUrl } from "./linkVerification";

export const DCMT_BRAND: DailySocialBrandConfig = {
  brand: "dontclonemetom",
  siteName: "dontclonemetom.com",
  siteUrl: "https://dontclonemetom.com",
  markerPrefix: "Dog of the Day",
  hashtags: ["#dontclonemetom", "#AdoptDontShop", "#RescueDog", "#StLouis"],
  startDate: "2026-07-12",
  version: 1,
};

export const DOG_OF_THE_DAY_ZIP = "63040";
export const DOG_OF_THE_DAY_MILES = 50;

// The caption line the duplicate-exclusion scan looks for. Factual and small.
export function listingIdLine(dog: Pick<Dog, "id">) {
  return `Listing ID: ${dog.id}`;
}

// A dog is eligible only when every fact the card shows actually exists —
// and, since 2026-08-10, only when it has a verified direct adoption page.
// Dog of the Day is a public selection surface; it must never feature a
// dog whose only destination is a generic rescue homepage.
export function eligibleDogs(dogs: Dog[]): Dog[] {
  const seen = new Set<string>();

  return dogs.filter((dog) => {
    if (seen.has(dog.id)) return false;
    seen.add(dog.id);

    return Boolean(
      dog.id &&
        dog.name &&
        dog.name.length >= 2 &&
        dog.photo &&
        dog.org &&
        (dog.city || dog.orgCity) &&
        dog.url.startsWith("http") &&
        isPubliclyEligible(dog),
    );
  });
}

// Deterministic pick for a date, skipping recently featured listing ids and
// stepping forward with `offset` (the admin "choose another dog" control).
export function selectDogForDate(
  dateKey: string,
  dogs: Dog[],
  excludeIds: Set<string>,
  offset = 0,
): Dog | null {
  const eligible = eligibleDogs(dogs).sort((a, b) =>
    Number(a.id) - Number(b.id),
  );
  if (!eligible.length) return null;

  const start = hashSeed(`dontclonemetom|${dateKey}`) % eligible.length;

  // Walk the ring: skip excluded dogs, land offset steps beyond the first fit.
  let remaining = offset;
  for (let step = 0; step < eligible.length; step += 1) {
    const dog = eligible[(start + step) % eligible.length];
    if (excludeIds.has(dog.id)) continue;
    if (remaining === 0) return dog;
    remaining -= 1;
  }

  // Everything nearby was featured recently — better to repeat a real dog
  // than to publish nothing? No: the publisher treats null as a clean error.
  return null;
}

// The same deterministic ring selectDogForDate walks, but returned in order
// so a candidate whose destination fails confirmation can be replaced by the
// next one instead of leaving the slot on a dead listing.
export function candidateRingForDate(
  dateKey: string,
  dogs: Dog[],
  excludeIds: Set<string>,
  offset = 0,
): Dog[] {
  const eligible = eligibleDogs(dogs).sort((a, b) => Number(a.id) - Number(b.id));
  if (!eligible.length) return [];

  const start = hashSeed(`dontclonemetom|${dateKey}`) % eligible.length;
  const ring: Dog[] = [];
  for (let step = 0; step < eligible.length; step += 1) {
    const dog = eligible[(start + step) % eligible.length];
    if (excludeIds.has(dog.id)) continue;
    ring.push(dog);
  }
  return ring.slice(Math.max(0, offset));
}

// ---------------------------------------------------------------------------
// Featured-placement confirmation.
//
// A dog earns the Dog of the Day slot only when her individual destination is
// actually confirmed. Two ways to earn it, strongest first:
//
//   1. Her rescue publishes an official availability feed and that feed
//      carries her (already resolved during the inventory fetch — free).
//   2. A live destination check confirms the page is hers and does not say
//      the listing is over.
//
// "uncertain" (blocked, timed out, unreadable) does NOT earn the slot. It is
// not evidence she is gone either — she stays in the grid; she just isn't
// promoted to the one placement that creates the most adoption intent.

// How many candidates may be checked before giving up. Bounded so a bad day
// upstream can never turn one page render into an unbounded fetch storm.
export const MAX_FEATURE_VERIFY_ATTEMPTS = 8;

// Selection is deterministic, so the same dog is re-checked on every render.
// Remember the verdict briefly to keep the homepage to (usually) zero
// outbound checks and to stay a polite visitor to the rescues.
const featureVerdictCache = new Map<string, { at: number; ok: boolean; detail: string }>();
const FEATURE_VERDICT_MS = 30 * 60 * 1000;

export function __resetFeatureVerdictCacheForTests() {
  featureVerdictCache.clear();
}

export type FeatureCheck = { confirmed: boolean; detail: string };

export async function confirmFeatureEligibility(
  dog: Dog,
  options: { fetchImpl?: typeof fetch; now?: number } = {},
): Promise<FeatureCheck> {
  // Already confirmed against the shelter's own official record.
  if (hasConfirmedDestination(dog.adoption)) {
    return { confirmed: true, detail: dog.adoption.adoptionProfileUrlDetail };
  }

  const url = dog.adoption.adoptionProfileUrl;
  if (!url) {
    return { confirmed: false, detail: "no individual adoption destination to confirm" };
  }

  const now = options.now ?? Date.now();
  const cacheKey = `${dog.id}|${url}`;
  const hit = featureVerdictCache.get(cacheKey);
  if (hit && now - hit.at < FEATURE_VERDICT_MS) {
    return { confirmed: hit.ok, detail: hit.detail };
  }

  const verdict = await verifyDogProfileUrl(url, {
    dogName: dog.name,
    animalId: dog.id,
    sourcePetId: dog.rescueId,
    orgUrl: dog.orgUrl,
    fetchImpl: options.fetchImpl,
  });

  const ok = verdict.status === "exact-dog";
  const detail = `${verdict.status}: ${verdict.detail}`;
  featureVerdictCache.set(cacheKey, { at: now, ok, detail });
  return { confirmed: ok, detail };
}

// Walk the ring until a dog's destination is confirmed. Returns the first
// confirmed dog plus everything that was rejected on the way, so the reason a
// dog lost the slot is loggable instead of invisible.
export async function selectConfirmedDogForDate(
  dateKey: string,
  dogs: Dog[],
  excludeIds: Set<string>,
  offset = 0,
  options: { fetchImpl?: typeof fetch; maxAttempts?: number } = {},
): Promise<{ dog: Dog | null; rejected: { dog: Dog; detail: string }[]; attempts: number }> {
  const ring = candidateRingForDate(dateKey, dogs, excludeIds, offset);
  const maxAttempts = options.maxAttempts ?? MAX_FEATURE_VERIFY_ATTEMPTS;
  const rejected: { dog: Dog; detail: string }[] = [];

  let attempts = 0;
  for (const candidate of ring) {
    if (attempts >= maxAttempts) break;
    attempts += 1;
    const check = await confirmFeatureEligibility(candidate, { fetchImpl: options.fetchImpl });
    if (check.confirmed) return { dog: candidate, rejected, attempts };
    rejected.push({ dog: candidate, detail: check.detail });
  }

  return { dog: null, rejected, attempts };
}

export function dogCityLabel(dog: Dog): string {
  return dog.city || dog.orgCity;
}

export function buildDogCaption(dateKey: string, dog: Dog): string {
  const city = dogCityLabel(dog);

  return [
    captionMarkerForDate(DCMT_BRAND, dateKey),
    "",
    `Meet ${dog.name}.`,
    "",
    `${dog.name} is currently looking for a good home near ${city}.`,
    "",
    "See the original adoption listing and verified details through the link in our bio.",
    "",
    "Every good boy and girl deserves a good home.",
    "",
    "dontclonemetom.com",
    "",
    `Listing via ${dog.org} · ${listingIdLine(dog)}`,
    "",
    activeHashtags(DCMT_BRAND.hashtags).join(" "),
  ].join("\n");
}

export type DogOfTheDay = {
  post: DailySocialPost;
  dog: Dog;
};

// Recently featured listing ids, read from the account's own captions —
// no database needed. Empty until Meta credentials exist.
export async function recentlyFeaturedDogIds(): Promise<Set<string>> {
  const captions = await recentPublishedCaptions(readPublishConfig());
  const ids = new Set<string>();

  for (const caption of captions) {
    const match = caption.match(/Listing ID: (\d+)/);
    if (match) ids.add(match[1]);
  }

  return ids;
}

export async function buildDogOfTheDay(
  dateKey: string,
  options: { offset?: number; forPublish?: boolean } = {},
): Promise<DogOfTheDay> {
  if (!isValidDateKey(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const { dogs, reason } = await fetchAdoptableDogs(
    DOG_OF_THE_DAY_ZIP,
    DOG_OF_THE_DAY_MILES,
  );

  if (!dogs) {
    throw new Error(`dog source unavailable (${reason ?? "unknown"})`);
  }

  const excludeIds = options.forPublish
    ? await recentlyFeaturedDogIds()
    : new Set<string>();

  const { dog, rejected, attempts } = await selectConfirmedDogForDate(
    dateKey,
    dogs,
    excludeIds,
    options.offset ?? 0,
  );

  if (rejected.length) {
    // Actionable, and carries nothing about any visitor.
    console.warn(
      `[dog-of-the-day] ${rejected.length} candidate(s) failed destination confirmation: ` +
        rejected.map((r) => `${r.dog.id} ${r.dog.name} (${r.dog.org}) -> ${r.detail}`).join(" | "),
    );
  }

  if (!dog) {
    throw new Error(
      `no dog could be confirmed for the featured slot after ${attempts} attempt(s) — ` +
        "a dog is featured only when her adoption destination is confirmed",
    );
  }

  const city = dogCityLabel(dog);

  return {
    dog,
    post: {
      brand: DCMT_BRAND.brand,
      date: dateKey,
      fullDate: formatFullDate(dateKey),
      timezone: "America/Chicago",
      version: DCMT_BRAND.version,
      contentId: dog.id,
      typeLabel: "Dog of the Day",
      title: dog.name,
      caption: buildDogCaption(dateKey, dog),
      hashtags: activeHashtags(DCMT_BRAND.hashtags),
      imagePath: `/api/social/dog-of-the-day/${dateKey}.png`,
      imageFileName: `dog-of-the-day-${dateKey}-1080x1350.png`,
      pagePath: `/dogs/${dog.id}`,
      parityKeys: [dog.name, city, dog.org, listingIdLine(dog)],
    },
  };
}
