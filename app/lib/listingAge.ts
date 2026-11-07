// "Listed since …" — when a dog's listing went up on RescueGroups.
//
// This is the listing's date (`createdDate` in the feed), not the day the dog
// came into a shelter or rescue, and the site never presents it as time spent
// waiting in one. It only ever reads "Listed since <month year>" or "New
// listing". Client-safe: pure functions, no env.

export const NEW_LISTING_DAYS = 14;
export const LONG_LISTING_DAYS = 365;

const DAY_MS = 86_400_000;

export function listingAgeDays(listedAt: string | null | undefined, now: number = Date.now()): number | null {
  if (!listedAt) return null;
  const at = Date.parse(listedAt);
  if (Number.isNaN(at) || at > now) return null;
  return Math.floor((now - at) / DAY_MS);
}

export function listedSinceLabel(listedAt: string | null | undefined, now: number = Date.now()): string | null {
  if (listingAgeDays(listedAt, now) === null) return null;
  const month = new Date(listedAt as string).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "America/Chicago",
  });
  return `Listed since ${month}`;
}

// The one short tag a dog card may show about its listing date: new
// listings are easy to spot, and dogs listed for a year or more get a little
// extra visibility. Everything in between shows nothing. (Nov 2026 near
// 63040: about 6% of dogs were new and 43% had been listed over a year.)
export function listingBadge(
  listedAt: string | null | undefined,
  now: number = Date.now(),
): { kind: "new" | "long"; text: string } | null {
  const days = listingAgeDays(listedAt, now);
  if (days === null) return null;
  if (days <= NEW_LISTING_DAYS) return { kind: "new", text: "New listing" };
  if (days >= LONG_LISTING_DAYS) {
    const year = new Date(listedAt as string).toLocaleDateString("en-US", { year: "numeric", timeZone: "America/Chicago" });
    return { kind: "long", text: `Listed since ${year}` };
  }
  return null;
}
