import { describe, expect, it } from "vitest";
import {
  FEATURED_BEFORE_ROTATION,
  RECENT_FEATURE_DAYS,
  ROTATION_EPOCH,
  listingWeight,
  rotationOrder,
  type FeaturedDay,
  type RotationDog,
} from "../rotation";

const DAY_MS = 86_400_000;
const OLD_LISTING = "2024-10-01T15:00:00Z"; // two years before the epoch: full 1.5 weight
const day = (n: number) => new Date(Date.parse(`${ROTATION_EPOCH}T18:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const listedOn = (n: number) => `${day(n)}T15:00:00Z`;
const dogs = (count: number, listedAt: string | null = OLD_LISTING, prefix = 900): RotationDog[] =>
  Array.from({ length: count }, (_, i) => ({ id: String(prefix * 1000 + i), listedAt }));

// What visitors see: each day's pick is the first in that day's order, and the
// daily recorder writes it down before the next day.
function simulate(days: number, poolOn: (n: number) => RotationDog[], record = true): string[] {
  const history: FeaturedDay[] = [];
  const picks: string[] = [];
  for (let n = 0; n < days; n += 1) {
    const [pick] = rotationOrder(day(n), poolOn(n), record ? history : []);
    picks.push(pick);
    history.push({ date: day(n), id: pick });
  }
  return picks;
}

// Tiny seeded generator so the churn scenario is the same on every run.
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("stable daily selection", () => {
  it("gives the same order for the same date and listings, whatever order the feed lists them in", () => {
    const pool = dogs(12);
    const shuffled = [...pool].reverse();
    expect(rotationOrder(day(5), pool)).toEqual(rotationOrder(day(5), shuffled));
    expect(rotationOrder(day(5), pool)).toEqual(rotationOrder(day(5), pool));
    expect(new Set(rotationOrder(day(5), pool)).size).toBe(12);
  });

  it("is recomputed identically from scratch, so a deploy or a cold server can't reshuffle it", () => {
    const pool = () => dogs(9);
    expect(simulate(40, pool, false)).toEqual(simulate(40, pool, true));
  });

  it("returns an empty order for no dogs or a bad date", () => {
    expect(rotationOrder(day(1), [])).toEqual([]);
    expect(rotationOrder("2026-02-30", dogs(3))).toEqual([]);
  });

  it("ignores duplicate and empty ids", () => {
    const pool = [...dogs(3), dogs(3)[0], { id: "", listedAt: OLD_LISTING }];
    expect(rotationOrder(day(2), pool)).toHaveLength(3);
  });
});

describe("fair turns", () => {
  it("features every dog once before any dog repeats", () => {
    const picks = simulate(30, () => dogs(10));
    for (let round = 0; round < 3; round += 1) {
      expect(new Set(picks.slice(round * 10, round * 10 + 10)).size).toBe(10);
    }
  });

  it("never features the same dog twice within a week, even across rounds", () => {
    const picks = simulate(60, () => dogs(9));
    for (let i = 1; i < picks.length; i += 1) {
      const window = picks.slice(Math.max(0, i - RECENT_FEATURE_DAYS), i);
      expect(window, `day ${i}`).not.toContain(picks[i]);
    }
  });

  it("is the fix for 'the same dogs keep appearing': nobody takes more than a fair share", () => {
    // The old pick featured Karma 18 of 60 days among 23 eligible dogs.
    const picks = simulate(60, () => dogs(23));
    const counts = new Map<string, number>();
    for (const id of picks) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect(counts.size).toBe(23);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
    expect(Math.min(...counts.values())).toBeGreaterThanOrEqual(2);
  });

  it("gives longer-listed dogs a modest head start in each round, never exclusive priority", () => {
    const longListed = dogs(10, OLD_LISTING, 700);
    const newlyListed = dogs(10, listedOn(0), 800);
    const picks = simulate(200, () => [...longListed, ...newlyListed]);
    const position = { long: 0, new: 0 };
    let newDogOpenedARound = false;
    for (let round = 0; round < 10; round += 1) {
      const order = picks.slice(round * 20, round * 20 + 20);
      expect(new Set(order).size).toBe(20); // still exactly one turn each
      order.forEach((id, i) => {
        if (id.startsWith("700")) position.long += i;
        else position.new += i;
      });
      if (order[0].startsWith("800")) newDogOpenedARound = true;
    }
    expect(position.long).toBeLessThan(position.new);
    expect(newDogOpenedARound).toBe(true);
  });

  it("weights a listing from 1.0 when new to 1.5 after a year, and treats missing or future dates as new", () => {
    expect(listingWeight(null, 100)).toBe(1);
    expect(listingWeight(100, 100)).toBe(1);
    expect(listingWeight(200, 100)).toBe(1); // listed "in the future"
    expect(listingWeight(0, 365)).toBe(1.5);
    expect(listingWeight(0, 3000)).toBe(1.5); // an eight-year-old record is capped
    expect(listingWeight(0, 73)).toBeCloseTo(1.1, 5);
  });
});

describe("feed changes", () => {
  it("gives a new listing its turn inside the round already underway", () => {
    const base = dogs(10);
    const newcomer = { id: "555000", listedAt: listedOn(3) };
    const picks = simulate(11, (n) => (n >= 3 ? [...base, newcomer] : base));
    expect(picks).toContain("555000");
    expect(new Set(picks).size).toBe(11); // nobody repeated while the newcomer waited
  });

  it("keeps an adopted dog's recorded day without moving anyone else's turn", () => {
    const pool = dogs(12);
    const history: FeaturedDay[] = [];
    for (let n = 0; n < 6; n += 1) {
      const [pick] = rotationOrder(day(n), pool, history);
      history.push({ date: day(n), id: pick });
    }
    const adopted = history[2].id;
    const withHer = rotationOrder(day(6), pool, history);
    const withoutHer = rotationOrder(day(6), pool.filter((d) => d.id !== adopted), history);
    expect(withoutHer[0]).toBe(withHer[0]);
    expect(withoutHer).toEqual(withHer.filter((id) => id !== adopted));
  });

  it("pins a recorded day even when the rule alone would have chosen someone else", () => {
    const pool = dogs(8);
    const natural = rotationOrder(day(0), pool);
    const recorded = [{ date: day(0), id: natural[3] }];
    expect(rotationOrder(day(0), pool, recorded)[0]).toBe(natural[3]);
    const next = rotationOrder(day(1), pool, recorded);
    expect(next[0]).toBe(natural[0]); // the dog the substitute stood in for keeps her turn
    expect(next[next.length - 1]).toBe(natural[3]); // the substitute just had hers
  });

  it("treats a recorded dog who has left the listings as nobody else's turn", () => {
    const pool = dogs(6);
    const natural = rotationOrder(day(0), pool);
    const next = rotationOrder(day(1), pool, [{ date: day(0), id: "123456789" }]);
    expect(next[0]).toBe(natural[0]);
  });

  it("survives daily churn — arrivals, adoptions, dogs dropping out for a day — without near repeats", () => {
    const random = prng(20261107);
    let nextId = 600000;
    let pool: RotationDog[] = dogs(18, OLD_LISTING, 500);
    const pools: RotationDog[][] = [];
    for (let n = 0; n < 150; n += 1) {
      if (random() < 0.25) pool = pool.filter((_, i) => i !== Math.floor(random() * pool.length));
      if (random() < 0.25) pool = [...pool, { id: String(nextId++), listedAt: listedOn(n) }];
      // A flaky day: one listing is missing from the feed, then comes back.
      const today = random() < 0.1 ? pool.filter((_, i) => i !== Math.floor(random() * pool.length)) : pool;
      pools.push(today);
    }
    const picks = simulate(150, (n) => pools[n]);
    for (let i = 1; i < picks.length; i += 1) {
      const window = picks.slice(Math.max(0, i - RECENT_FEATURE_DAYS), i);
      expect(window, `day ${i}`).not.toContain(picks[i]);
    }
    // Every dog listed for at least three weeks got featured.
    for (const dog of pools[149]) {
      const listedFor = pools.filter((p) => p.some((d) => d.id === dog.id)).length;
      if (listedFor >= 21) expect(picks, dog.id).toContain(dog.id);
    }
  });
});

describe("switching over from the old pick", () => {
  it("features the dogs the old pick never featured before its favorites come back around", () => {
    const favorites = Object.keys(FEATURED_BEFORE_ROTATION).map((id) => ({ id, listedAt: OLD_LISTING }));
    const neglected = dogs(5, "2026-09-15T12:00:00Z", 222);
    const picks = simulate(22, () => [...favorites, ...neglected]);
    expect(new Set(picks.slice(0, 5))).toEqual(new Set(neglected.map((d) => d.id)));
    // Then one full round where all 17 get exactly one turn...
    expect(new Set(picks.slice(5, 22)).size).toBe(17);
    // ...and Karma, the old pick's most frequent choice (18 of 60 days, and
    // the switch-over day itself), sits out at least the first week.
    expect(picks.slice(0, RECENT_FEATURE_DAYS + 1)).not.toContain("17819052");
  });
});
