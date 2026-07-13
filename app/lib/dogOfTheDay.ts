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
import { fetchAdoptableDogs, type Dog } from "./rescueDogs";

export const DCMT_BRAND: DailySocialBrandConfig = {
  brand: "dontclonemetom",
  siteName: "DontCloneMeTom.com",
  siteUrl: "https://dontclonemetom.com",
  markerPrefix: "Dog of the Day",
  hashtags: ["#DontCloneMeTom", "#AdoptDontShop", "#RescueDog", "#StLouis"],
  startDate: "2026-07-12",
  version: 1,
};

export const DOG_OF_THE_DAY_ZIP = "63040";
export const DOG_OF_THE_DAY_MILES = 50;

// The caption line the duplicate-exclusion scan looks for. Factual and small.
export function listingIdLine(dog: Pick<Dog, "id">) {
  return `Listing ID: ${dog.id}`;
}

// A dog is eligible only when every fact the card shows actually exists.
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
        dog.url.startsWith("http"),
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
    "DontCloneMeTom.com",
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

  const dog = selectDogForDate(dateKey, dogs, excludeIds, options.offset ?? 0);

  if (!dog) {
    throw new Error("no eligible dog found near 63040 (photo + name + rescue + listing URL required)");
  }

  // At publish time, confirm the original listing is still reachable.
  // 2xx–4xx counts as reachable (many shelter sites answer bots with 403);
  // network failure or 5xx does not.
  if (options.forPublish) {
    try {
      const listing = await fetch(dog.url, { method: "GET", redirect: "follow" });
      if (listing.status >= 500) {
        throw new Error(`original listing returned ${listing.status}: ${dog.url}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("original listing")) throw error;
      throw new Error(`original listing unreachable: ${dog.url}`);
    }
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
