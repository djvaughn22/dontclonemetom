// Dog of the Day rotation — who gets the featured slot, day by day.
//
// 2026-11-07 — the old pick put every dog with an audited destination first,
// then took the first one after a date-seeded starting point in id order.
// Only 12 of the 23 eligible dogs near 63040 had an audit, and the ones that
// sat after long gaps in id order won most days: Karma was featured 18 of the
// last 60 days, and the 11 eligible dogs without an audit were never featured
// at all. Nothing remembered who had already had a turn.
//
// The rule now:
//   - Rounds. Every eligible dog gets one turn per round before any dog
//     repeats. A new listing joins the round in progress, so a new dog gets a
//     turn in the current round instead of waiting for the next one.
//   - Inside a round the order is a weighted shuffle. A listing that has been
//     up longer gets a modestly bigger weight — up to 1.5x after a year — so
//     longer-listed dogs tend to come earlier. It is a nudge, never a queue.
//   - A dog featured in the last week waits behind everyone else, so a new
//     round never opens with the dog that closed the last one.
//
// Memory: the dog actually featured each day is recorded once a day outside
// the deployment (featuredHistory.ts), and recorded days are pinned here.
// Days without a record are filled in by running this same rule forward from
// ROTATION_EPOCH. Nothing depends on server memory, so a deploy cannot
// reshuffle the rotation, and a recorded dog who has since left the listings
// keeps her day without moving anyone else's turn.
//
// `listedAt` is when the listing was created on RescueGroups. It is not an
// intake date and says nothing about how long a dog has been in a shelter.

import { chicagoDateKey, hashSeed, isValidDateKey } from "./dailySocialCore";

export type RotationDog = { id: string; listedAt?: string | null };
export type FeaturedDay = { date: string; id: string };

export const ROTATION_EPOCH = "2026-11-07";
export const RECENT_FEATURE_DAYS = 7;
export const LONG_LISTING_BONUS = 0.5;
export const LONG_LISTING_FULL_DAYS = 365;

// What the old pick featured in the 60 days before the epoch, recomputed on
// 2026-11-07 from that day's listings (its live checks can't be replayed, so
// this is close, not exact). These dogs count as having had their turn in the
// first round, so the eligible dogs it never featured go first.
export const FEATURED_BEFORE_ROTATION: Readonly<Record<string, string>> = {
  "22194571": "2026-09-26", // Ruger
  "22259414": "2026-10-06", // REGINA
  "21070243": "2026-10-21", // Lucious
  "21968587": "2026-10-24", // Auggie (Spot)
  "22502142": "2026-10-26", // PEPPERONI
  "22475460": "2026-10-29", // GLORIA
  "22194580": "2026-11-01", // Ramsey
  "22296359": "2026-11-02", // Rhythm
  "22174123": "2026-11-04", // Stella
  "22540950": "2026-11-05", // NIBBLES
  "22669249": "2026-11-06", // BELLA
  "17819052": "2026-11-07", // Karma
};

const DAY_MS = 86_400_000;

// Whole days since 1970-01-01 for a YYYY-MM-DD key.
export function dayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

// The Chicago calendar day of a timestamp — the site's day boundary.
function listedDayIndex(listedAt: string | null | undefined): number | null {
  if (!listedAt) return null;
  const at = new Date(listedAt);
  return Number.isNaN(at.getTime()) ? null : dayIndex(chicagoDateKey(at));
}

// 1.0 for a brand-new listing, rising evenly to 1.5 after a year. A missing
// or future listing date counts as new — no data never earns a bonus.
export function listingWeight(listedDay: number | null, onDay: number): number {
  if (listedDay === null) return 1;
  const days = Math.min(Math.max(onDay - listedDay, 0), LONG_LISTING_FULL_DAYS);
  return 1 + LONG_LISTING_BONUS * (days / LONG_LISTING_FULL_DAYS);
}

// Weighted shuffle key (Efraimidis–Spirakis), seeded per round: a bigger
// weight pulls the key toward 1, so the dog tends to come earlier that round.
function roundKey(id: string, round: number, weight: number): number {
  const u = (hashSeed(`dontclonemetom|rotation|${round}|${id}`) + 0.5) / 4294967296;
  return Math.pow(u, 1 / weight);
}

type Entry = { id: string; join: number; listed: number | null };
type Ranked = { id: string; group: number; last: number; key: number };

function rankOrder(a: Ranked, b: Ranked): number {
  if (a.group !== b.group) return a.group - b.group;
  // Dogs still waiting for this round's turn: weighted shuffle order.
  // Dogs who already had a turn: longest since their last feature first.
  if (a.group > 0 && a.last !== b.last) return a.last - b.last;
  if (a.key !== b.key) return b.key - a.key;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Every eligible dog, best candidate first, for one day. The first id is
// that day's pick; the rest are the order to fall back on (a listing that
// fails its live check) and the order "Spin another dog" walks.
export function rotationOrder(
  dateKey: string,
  dogs: RotationDog[],
  featured: FeaturedDay[] = [],
): string[] {
  if (!isValidDateKey(dateKey)) return [];
  const target = dayIndex(dateKey);
  const start = Math.min(dayIndex(ROTATION_EPOCH), target);

  const seen = new Set<string>();
  const entries: Entry[] = [];
  for (const dog of dogs) {
    if (!dog.id || seen.has(dog.id)) continue;
    seen.add(dog.id);
    const listed = listedDayIndex(dog.listedAt);
    entries.push({ id: dog.id, join: Math.max(start, listed ?? start), listed });
  }

  const recorded = new Map<number, string>();
  for (const day of featured) {
    if (isValidDateKey(day.date) && day.id) recorded.set(dayIndex(day.date), day.id);
  }

  const last = new Map<string, number>();
  const hadTurn = new Set<string>();
  for (const [id, date] of Object.entries(FEATURED_BEFORE_ROTATION)) {
    if (dayIndex(date) > target) continue;
    last.set(id, dayIndex(date));
    hadTurn.add(id);
  }
  let round = 1;
  let roundStart = start;

  for (let day = start; day <= target; day += 1) {
    const active = entries.filter((entry) => entry.join <= day);
    if (active.length && active.every((entry) => hadTurn.has(entry.id))) {
      round += 1;
      roundStart = day;
      hadTurn.clear();
    }

    const ranked = active.map((entry): Ranked => {
      const lastDay = last.get(entry.id);
      const recent = lastDay !== undefined && day - lastDay <= RECENT_FEATURE_DAYS;
      return {
        id: entry.id,
        group: recent ? 2 : hadTurn.has(entry.id) ? 1 : 0,
        last: lastDay ?? -Infinity,
        key: roundKey(entry.id, round, listingWeight(entry.listed, Math.max(roundStart, entry.join))),
      };
    });

    if (day === target) {
      const order = ranked.sort(rankOrder).map((r) => r.id);
      const pinned = recorded.get(day);
      return pinned && order.includes(pinned) ? [pinned, ...order.filter((id) => id !== pinned)] : order;
    }

    // Past days only need their winner, so skip the full sort.
    const pick = recorded.get(day) ?? ranked.reduce<Ranked | null>(
      (best, r) => (best === null || rankOrder(r, best) < 0 ? r : best),
      null,
    )?.id;
    if (pick) {
      hadTurn.add(pick);
      last.set(pick, day);
    }
  }
  return [];
}
