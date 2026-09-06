// Official availability feeds — the only thing allowed to prove a dog is
// still adoptable at a rescue whose individual pages are client-rendered.
//
// WHY THIS EXISTS (the MOO failure, 2026-09-06)
// ---------------------------------------------------------------------------
// APA of Missouri publishes no per-dog URL in the RescueGroups feed, so the
// site built one from the shelter's own pet id: ?petID=A313601. That page is
// a client-rendered SPA, so the server HTML never says whether the pet is
// real — and the old rule therefore accepted "a petID is present" as proof.
//
// Then APA migrated shelter software from PetPoint (ids like "A313601") to
// Shelterluv (plain numeric ids). Every A#####-shaped petID retired at once.
// The page still answers HTTP 200; the SPA renders "PET NOT FOUND — this pet
// is no longer available for adoption". Nothing in the pipeline could see it,
// so 29 dogs — MOO among them, on the Dog of the Day slot — kept their
// "verified" standing while pointing at a dead end.
//
// APA's own pet-finder widget reads a public JSON feed of exactly the pets it
// will render. That feed is the authority: a petID is confirmed adoptable
// only when the feed carries it and marks it adoptable. Absent = unavailable.
// Unreachable = unknown, never "available" and never "dead".
//
// Fetched from apamo.org/pet-finder/data/, which robots.txt allows (only
// /wp-admin/ is disallowed), once per cache window, with the same bounded,
// SSRF-screened fetch every other destination check uses.

import { safeFetch } from "./safeFetch";

export type AvailabilityVerdict = "available" | "unavailable" | "unknown";

export type AvailabilityResult = {
  verdict: AvailabilityVerdict;
  // Human-readable reason, safe to log and to put in a status detail.
  detail: string;
  // The feed's own view of this pet, when it had one.
  officialUrl: string | null;
  // When the official record was read. Only set for a real answer.
  checkedAt: string | null;
};

export const APA_FEED_URL = "https://apamo.org/pet-finder/data/";
export const APA_HOST = "apamo.org";

// APA's current (Shelterluv) ids are plain numbers. The retired PetPoint ids
// look like "A313601". Keeping this distinction explicit means that if
// RescueGroups ever starts publishing the new ids, they simply start matching
// the feed and APA dogs come back on their own — no code change needed.
const PETPOINT_ID = /^A\d{4,10}$/i;

export function isRetiredPetPointId(petId: string | null | undefined): boolean {
  return typeof petId === "string" && PETPOINT_ID.test(petId.trim());
}

type ApaFeedRecord = {
  animal_id?: unknown;
  name?: unknown;
  species?: unknown;
  isAdoptable?: unknown;
  link?: unknown;
};

export type ApaIndex = {
  // animal_id -> adoptable?
  byId: Map<string, { adoptable: boolean; name: string; link: string | null }>;
  fetchedAt: string;
  size: number;
};

// A feed answer is reused for this long. APA says the list updates hourly;
// ten minutes matches the RescueGroups cache already in rescueDogs.ts and
// keeps a page render from ever making a second call.
const CACHE_MS = 10 * 60 * 1000;
// A feed that fails is retried soon, but not on every single request.
const FAILURE_BACKOFF_MS = 60 * 1000;

let cached: { at: number; index: ApaIndex | null } | null = null;

export function __resetApaCacheForTests() {
  cached = null;
}

export function parseApaFeed(raw: unknown): ApaIndex | null {
  if (!Array.isArray(raw)) return null;
  const byId = new Map<string, { adoptable: boolean; name: string; link: string | null }>();
  for (const entry of raw as ApaFeedRecord[]) {
    if (!entry || typeof entry !== "object") continue;
    const id = String(entry.animal_id ?? "").trim();
    if (!id) continue;
    // The feed uses 1/0 (sometimes "1"/"0"); anything else is not a yes.
    const adoptable = entry.isAdoptable === 1 || entry.isAdoptable === "1" || entry.isAdoptable === true;
    byId.set(id.toUpperCase(), {
      adoptable,
      name: String(entry.name ?? "").trim(),
      link: typeof entry.link === "string" ? entry.link : null,
    });
  }
  // An empty array is a plausible transport failure dressed as success —
  // refuse to let it mark the entire shelter dead.
  if (byId.size === 0) return null;
  return { byId, fetchedAt: new Date().toISOString(), size: byId.size };
}

export async function loadApaIndex(
  options: { fetchImpl?: typeof fetch; now?: number } = {},
): Promise<ApaIndex | null> {
  const now = options.now ?? Date.now();
  if (cached && now - cached.at < (cached.index ? CACHE_MS : FAILURE_BACKOFF_MS)) {
    return cached.index;
  }

  const outcome = await safeFetch(APA_FEED_URL, {
    allowHosts: [APA_HOST],
    accept: "application/json,*/*",
    // The feed is ~210KB today; leave room without inviting an unbounded read.
    maxBytes: 4 * 1024 * 1024,
    timeoutMs: 12_000,
    fetchImpl: options.fetchImpl,
  });

  if (!outcome.ok || outcome.status !== 200 || outcome.truncated) {
    cached = { at: now, index: null };
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outcome.body);
  } catch {
    cached = { at: now, index: null };
    return null;
  }

  const index = parseApaFeed(parsed);
  cached = { at: now, index };
  return index;
}

// Look one APA pet id up against the official feed.
export function checkApaIndex(index: ApaIndex | null, petId: string | null): AvailabilityResult {
  if (!petId) {
    return {
      verdict: "unknown",
      detail: "no shelter pet id to check against the official feed",
      officialUrl: null,
      checkedAt: null,
    };
  }
  if (!index) {
    return {
      verdict: "unknown",
      detail: "APA official feed unreachable — availability unchanged, not confirmed",
      officialUrl: null,
      checkedAt: null,
    };
  }

  const hit = index.byId.get(petId.trim().toUpperCase());
  if (!hit) {
    return {
      verdict: "unavailable",
      detail: isRetiredPetPointId(petId)
        ? `shelter pet id ${petId} is a retired PetPoint id — APA now publishes Shelterluv ids, and this pet is not in APA's ${index.size}-pet official feed`
        : `shelter pet id ${petId} is not in APA's ${index.size}-pet official adoptable feed`,
      officialUrl: null,
      checkedAt: index.fetchedAt,
    };
  }
  if (!hit.adoptable) {
    return {
      verdict: "unavailable",
      detail: `APA's official feed lists ${petId} but marks it not adoptable`,
      officialUrl: hit.link,
      checkedAt: index.fetchedAt,
    };
  }
  return {
    verdict: "available",
    detail: "confirmed adoptable in APA's official pet feed",
    officialUrl: hit.link,
    checkedAt: index.fetchedAt,
  };
}

export async function checkApaAvailability(
  petId: string | null,
  options: { fetchImpl?: typeof fetch } = {},
): Promise<AvailabilityResult> {
  return checkApaIndex(await loadApaIndex(options), petId);
}
