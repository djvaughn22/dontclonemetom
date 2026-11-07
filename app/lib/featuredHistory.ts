// The record of which dog was actually Dog of the Day on each date.
//
// Vercel deployments keep no state between requests or between deploys, so
// the record lives in this repository, on its own branch:
// .github/workflows/record-dog-of-the-day.yml asks the live site for today's
// dog every morning and appends it to dog-of-the-day.json on the
// `dog-of-the-day-history` branch (that branch never deploys). The rotation
// (rotation.ts) pins every recorded day and fills any gap by running its own
// rule forward, so a slow or missing record only ever means "less memory",
// never a broken page.

import { isValidDateKey } from "./dailySocialCore";
import type { FeaturedDay } from "./rotation";

export const FEATURED_HISTORY_URL =
  "https://raw.githubusercontent.com/djvaughn22/dontclonemetom/dog-of-the-day-history/dog-of-the-day.json";

export const FEATURED_HISTORY_TTL_MS = 10 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 2 * 60 * 1000;
const TIMEOUT_MS = 2500;
const MAX_DAYS = 1000;

let cached: { at: number; ttl: number; days: FeaturedDay[] } | null = null;

export function resetFeaturedHistoryForTests() {
  cached = null;
}

// The file is data from outside the deployment: keep only well-formed days
// (a real date, a numeric RescueGroups id), one per date, oldest first.
export function parseFeaturedHistory(value: unknown): FeaturedDay[] {
  const list = (value as { days?: unknown } | null)?.days;
  if (!Array.isArray(list)) return [];
  const byDate = new Map<string, FeaturedDay>();
  for (const item of list) {
    const date = (item as { date?: unknown })?.date;
    const id = (item as { id?: unknown })?.id;
    if (typeof date !== "string" || !isValidDateKey(date)) continue;
    if (typeof id !== "string" || !/^\d{1,12}$/.test(id)) continue;
    byDate.set(date, { date, id });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_DAYS);
}

export async function loadFeaturedHistory(
  options: { fetchImpl?: typeof fetch; now?: number } = {},
): Promise<FeaturedDay[]> {
  const now = options.now ?? Date.now();
  if (cached && now - cached.at < cached.ttl) return cached.days;

  try {
    const res = await (options.fetchImpl ?? fetch)(FEATURED_HISTORY_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`history-${res.status}`);
    const days = parseFeaturedHistory(await res.json());
    cached = { at: now, ttl: FEATURED_HISTORY_TTL_MS, days };
    return days;
  } catch {
    // Keep what we last knew and try again soon, instead of making every
    // visitor wait on an unreachable record.
    const days = cached?.days ?? [];
    cached = { at: now, ttl: RETRY_AFTER_FAILURE_MS, days };
    return days;
  }
}
