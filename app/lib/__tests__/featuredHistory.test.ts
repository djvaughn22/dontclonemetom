import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FEATURED_HISTORY_TTL_MS,
  FEATURED_HISTORY_URL,
  loadFeaturedHistory,
  parseFeaturedHistory,
  resetFeaturedHistoryForTests,
} from "../featuredHistory";

beforeEach(resetFeaturedHistoryForTests);

const record = {
  days: [
    { date: "2026-11-08", id: "22780465", name: "Chianti" },
    { date: "2026-11-07", id: "21355539", name: "Dottie" },
  ],
};

describe("parseFeaturedHistory — the record is outside data, so only well-formed days count", () => {
  it("keeps real dates with numeric ids, oldest first", () => {
    expect(parseFeaturedHistory(record)).toEqual([
      { date: "2026-11-07", id: "21355539" },
      { date: "2026-11-08", id: "22780465" },
    ]);
  });

  it("drops malformed days and keeps one dog per date", () => {
    const days = parseFeaturedHistory({
      days: [
        { date: "2026-02-30", id: "1" },
        { date: "2026-11-09", id: "../../etc" },
        { date: "2026-11-09", id: 22780465 },
        null,
        { date: "2026-11-10", id: "111" },
        { date: "2026-11-10", id: "222" },
      ],
    });
    expect(days).toEqual([{ date: "2026-11-10", id: "222" }]);
  });

  it("treats anything that isn't a record as an empty history", () => {
    expect(parseFeaturedHistory(null)).toEqual([]);
    expect(parseFeaturedHistory([{ date: "2026-11-07", id: "1" }])).toEqual([]);
    expect(parseFeaturedHistory({ days: "nope" })).toEqual([]);
  });
});

describe("loadFeaturedHistory", () => {
  it("reads the record once and reuses it for ten minutes", async () => {
    const fetchImpl = vi.fn(async () => Response.json(record)) as unknown as typeof fetch;
    const now = Date.parse("2026-11-08T12:00:00Z");
    expect(await loadFeaturedHistory({ fetchImpl, now })).toHaveLength(2);
    expect(await loadFeaturedHistory({ fetchImpl, now: now + 60_000 })).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe(FEATURED_HISTORY_URL);
    await loadFeaturedHistory({ fetchImpl, now: now + FEATURED_HISTORY_TTL_MS + 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("never throws: an unreachable record means no history, not a broken page", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await loadFeaturedHistory({ fetchImpl })).toEqual([]);
  });

  it("keeps the last good record through a failed refresh", async () => {
    const now = Date.parse("2026-11-08T12:00:00Z");
    const good = vi.fn(async () => Response.json(record)) as unknown as typeof fetch;
    await loadFeaturedHistory({ fetchImpl: good, now });
    const down = vi.fn(async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    const days = await loadFeaturedHistory({ fetchImpl: down, now: now + FEATURED_HISTORY_TTL_MS + 1 });
    expect(days).toHaveLength(2);
  });
});
