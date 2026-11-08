// Shelters' own official adoptable lists on 24PetConnect — how a dog whose
// RescueGroups record carries no per-dog page still earns a verified link.
//
// WHY THIS EXISTS (2026-11-07)
// ---------------------------------------------------------------------------
// Only ~23 of the ~250 dogs within 50 miles of 63040 had a verified per-dog
// page, so the 2026-08-10 link rule hid the rest. The two biggest groups were
// the Humane Society of Missouri (46 dogs across St. Louis and Maryland
// Heights) and St. Charles County Humane Services (27). Both publish every
// adoptable dog on their own 24PetConnect portal, each with its own page —
// and RescueGroups carries the same shelter id ("A764812") as `rescueId`.
//
// So the match is exact, by the shelter's own id, never by name: a dog gets
// her official page only when her shelter's live list carries her id, and
// loses it the moment she leaves the list (the link is rebuilt on every read,
// never stored). Same rules as APA's feed (officialAvailability.ts):
//   on the list   -> verified, destination = her page on the shelter's portal
//   not on it     -> unchanged (no link of ours to take away; she stays hidden)
//   unreachable   -> unchanged — never "available", never "dead"
//
// The list pages are plain server-rendered HTML; 24petconnect.com publishes
// no robots.txt. One read per portal per cache window, through the same
// bounded, SSRF-screened fetch every other destination check uses.

import { safeFetch } from "./safeFetch";

export const PORTAL_HOST = "24petconnect.com";

// RescueGroups org id -> that shelter's 24PetConnect portal. Add a shelter
// only after checking its list ids match its RescueGroups `rescueId`s.
export const SHELTER_PORTALS: Readonly<Record<string, { portal: string; shelter: string }>> = {
  "2034": { portal: "MOHSAdopt", shelter: "Humane Society of Missouri" },
  "2035": { portal: "MOHSAdopt", shelter: "Humane Society of Missouri" },
  "3085": { portal: "STCHAdopt", shelter: "St. Charles County Humane Services" },
};

export type PortalIndex = {
  portal: string;
  // shelter id (upper-case) -> the shelter code her page lives under
  byId: Map<string, { code: string; name: string }>;
  total: number;
  complete: boolean;
  fetchedAt: string;
};

const PAGE_SIZE = 30;
const MAX_PAGES = 10;
const CACHE_MS = 10 * 60 * 1000;
const FAILURE_BACKOFF_MS = 60 * 1000;
const cache = new Map<string, { at: number; index: PortalIndex | null }>();

export function __resetPortalCacheForTests() {
  cache.clear();
}

export function portalListUrl(portal: string, index = 0): string {
  return `https://${PORTAL_HOST}/${portal}${index > 0 ? `?index=${index}&at=DOG` : "?at=DOG"}`;
}

export function portalDogUrl(portal: string, code: string, shelterId: string): string {
  return `https://${PORTAL_HOST}/${portal}/Details/${code}/${shelterId}`;
}

// One list page: every dog's (code, id, name) plus the list's own total.
export function parsePortalPage(html: string, portal: string) {
  const entries: { code: string; id: string; name: string }[] = [];
  const details = new RegExp(`Details\\('${portal}',\\s*'([A-Z0-9]+)',\\s*'(A\\d{3,12})'\\)`, "g");
  for (const match of html.matchAll(details)) {
    const id = match[2].toUpperCase();
    const named = html.match(new RegExp(`text_Name[^>]*>\\s*([^<]*?)\\s*\\(${id}\\)`, "i"));
    entries.push({ code: match[1], id, name: named ? named[1].trim() : "" });
  }
  const total = html.match(/Animals:\s*\d+\s*-\s*\d+\s*of\s*(\d+)/i);
  return { entries, total: total ? Number(total[1]) : null };
}

export async function loadPortalIndex(
  portal: string,
  options: { fetchImpl?: typeof fetch; now?: number } = {},
): Promise<PortalIndex | null> {
  const now = options.now ?? Date.now();
  const hit = cache.get(portal);
  if (hit && now - hit.at < (hit.index ? CACHE_MS : FAILURE_BACKOFF_MS)) return hit.index;

  const byId = new Map<string, { code: string; name: string }>();
  let total: number | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const outcome = await safeFetch(portalListUrl(portal, page * PAGE_SIZE), {
      allowHosts: [PORTAL_HOST],
      accept: "text/html,*/*",
      maxBytes: 3 * 1024 * 1024,
      timeoutMs: 12_000,
      fetchImpl: options.fetchImpl,
    });
    if (!outcome.ok || outcome.status !== 200 || outcome.truncated) break;
    const parsed = parsePortalPage(outcome.body, portal);
    total ??= parsed.total;
    for (const entry of parsed.entries) byId.set(entry.id, { code: entry.code, name: entry.name });
    if (!parsed.entries.length || total === null || byId.size >= total) break;
  }

  // Nothing readable is "unknown", not "every dog is gone".
  const index =
    byId.size && total
      ? { portal, byId, total, complete: byId.size >= total, fetchedAt: new Date(now).toISOString() }
      : null;
  cache.set(portal, { at: now, index });
  return index;
}
