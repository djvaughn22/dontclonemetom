// RescueGroups.org v5 public API — shared server-side fetch + normalization.
// One authoritative Dog shape powers the ZIP search API, the Dog of the Day,
// the Instagram card, the /dogs pages, and the caption generator.
// The API key stays server-side; clients only ever see trimmed results.

import { isGenericAnimalUrl } from "./dogDestination";
import type { AdoptionUrl } from "./adoptionUrlSchema";
import { emptyAdoptionUrl } from "./adoptionUrlSchema";
import { getAdoptionUrlStatus, getVerifiedAdoptionUrl } from "./adoptionUrlRegistry";

export type Dog = {
  id: string;
  name: string;
  breed: string;
  age: string;
  sex: string;
  size: string;
  photo: string | null;
  photos: string[];
  city: string;
  distance: number | null;
  // CANONICAL ADOPTION URLS — separated by status:
  // adoption = verified individual dog page OR classified status (generic/unverified/dead)
  adoption: AdoptionUrl;

  // LEGACY (kept for backward compatibility, replaced by adoption.adoptionProfileUrl):
  // profileUrl = this dog's own listing page; orgUrl = the rescue's
  // adoptable-dogs page or website. url = the resolved card destination
  // (see resolveDogUrl). Never let orgUrl stand in for profileUrl.
  profileUrl: string | null;
  // The per-dog URL exactly as the source supplied it, kept even when
  // profileUrl is demoted (dead host, generic page) so a recovered host can
  // be rechecked later. Never rendered as a link while demoted.
  sourceProfileUrl: string | null;
  orgUrl: string | null;
  // What orgUrl actually is, so fallback labels stay honest:
  // "adoptable-list" = the rescue's adoptable-dogs page, "website" = its site.
  orgUrlKind: "adoptable-list" | "website" | null;
  url: string;
  org: string;
  orgCity: string;
  email: string | null;
  desc: string;
  facts: string[];
};

// Accept only real fetchable web URLs. Rescues sometimes publish their
// address without a scheme ("www.nttsars.com") — repair that instead of
// throwing the whole link away, but reject anything non-http(s),
// placeholder-ish, or unparseable.
export function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let s = value.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) {
    // Scheme-less host like "www.example.org" or "example.org/adopt".
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]|$)/i.test(s)) return null;
    s = `https://${s}`;
  }
  try {
    const parsed = new URL(s);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

// A rescue's feed sometimes carries the dog's page as a bare path
// ("/animals/detail?AnimalID=5"). Resolve it against the rescue's own site
// instead of throwing the dog's page away.
export function resolveRelativeProfileUrl(
  value: unknown,
  orgUrl: string | null,
): string | null {
  if (typeof value !== "string" || !orgUrl) return null;
  const s = value.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  try {
    return normalizeHttpUrl(new URL(s, new URL(orgUrl).origin).href);
  } catch {
    return null;
  }
}

// One place decides where a dog card points: the dog's own listing first,
// the rescue's page only as a fallback. An org URL must never override an
// individual profile URL.
export function resolveDogUrl(dog: Pick<Dog, "profileUrl" | "orgUrl">): string {
  return dog.profileUrl ?? dog.orgUrl ?? "";
}

// True when the destination is the dog's own listing (drives honest link
// labels: "Bella's listing" vs "Visit the rescue").
export function hasOwnListing(dog: Pick<Dog, "profileUrl">): boolean {
  return dog.profileUrl !== null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ");
}

function flag(v: unknown, yes: string, no: string): string | null {
  return v === true ? yes : v === false ? no : null;
}

type RGResource = {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: { type: string; id: string }[] }>;
};

// Hand-verified corrections (2026-07-19) for upstream records that are
// demonstrably wrong. Keyed by RescueGroups org id. Remove an entry once the
// org fixes its data.
//
// 8121 STRAY PAWS RESCUE: their RescueGroups mini-site answers every animal
//   URL with a generic "Site Down" page, and their listed adoptionUrl
//   redirects to their homepage. Their real adoptable-animals list:
// 3085 St Charles County Humane Services: scchealth.org is gone (redirects
//   to the county public-health site). Their official adoptable-dogs list
//   (linked from sccmo.org/825/Pet-Adoptions):
const ORG_URL_OVERRIDES: Record<string, string> = {
  "8121": "https://www.straypawsrescue.com/animals",
  "3085": "https://24petconnect.com/STCHAdopt?at=DOG",
};

// Hand-verified individual dog adoption URLs for rescues whose RescueGroups
// records lack per-dog URLs but publish them elsewhere. Keyed by RescueGroups
// animal ID. Add an entry when a dog's verified individual page (e.g. GetBuddy,
// Petfinder, or a rescue's own site) is confirmed but RescueGroups provides
// nothing or a generic page. Remove once RescueGroups' upstream data improves.
//
// Format validation: only https:// URLs with clear per-dog identity (query
// param like ?pet=ID or unique path segment). Every URL must be:
//   1. Verified to reach a real dog's page (not a generic listing/homepage)
//   2. Tested to confirm it names or displays the exact dog
//   3. Preserved even if the page later closes (for rechecking)
//
// Spencer Pet Rescue publishes via GetBuddy; RescueGroups feed lacks
// individual dog URLs for their rescuings (2026-08-04 audit). All 17 Spencer
// dogs must be audited and mapped. START WITH PACO (22649663):
const ADOPTION_URL_OVERRIDES: Record<string, string> = {
  // Spencer Pet Rescue via GetBuddy (verified 2026-08-04):
  "22649663": "https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile",
  // TODO: Map remaining 16 Spencer dogs to their GetBuddy pages:
  // 22649636 Carl, 22649637 Darla, 22649640 Dart, 22649644 Dumpling,
  // 22649646 Holden, 22649648 ?, 22649650 ?, 22649652 ?,
  // 22649657 ?, 22649660 ?, 22649666 ?, 22649668 ?,
  // 22649671 ?, 22649675 ?, 22649678 ?, 22649681 ?
};

// Profile hosts currently serving a generic or empty page for every
// animal — treat their per-dog URLs as absent so cards fall back to the
// rescue honestly instead of claiming a listing that doesn't load.
// Matched with any leading "www." stripped.
//
// mastinorescue.rescuegroups.org (added 2026-08-04): redirects every per-dog
//   URL to mastino-rescue-inc.org/animals/detail.php?AnimalID=… whose Wix
//   animals section — including their own /animals list — renders an empty
//   shell (no animal-data requests). Remove once a real per-dog page loads.
const DEAD_PROFILE_HOSTS = new Set([
  "straypawsrescue.rescuegroups.org",
  "mastinorescue.rescuegroups.org",
  "mastino-rescue-inc.org",
]);

function isDeadProfileHost(url: string): boolean {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  return DEAD_PROFILE_HOSTS.has(host);
}

export function normalizeDog(
  a: RGResource,
  included: Map<string, Record<string, unknown>>,
): Dog {
  const at = a.attributes;
  const pics = (a.relationships?.pictures?.data ?? [])
    .map((ref) => included.get(`pictures:${ref.id}`) as Record<string, { url?: string }> & { order?: number } | undefined)
    .filter(Boolean) as (Record<string, { url?: string }> & { order?: number })[];
  pics.sort((x, y) => (Number(x.order) || 0) - (Number(y.order) || 0));
  const photos = pics
    .map((p) => p.large?.url ?? p.small?.url ?? p.original?.url)
    .filter((u): u is string => typeof u === "string");
  const locRef = a.relationships?.locations?.data?.[0];
  const loc = locRef ? (included.get(`locations:${locRef.id}`) as Record<string, string> | undefined) : undefined;
  const orgRef = a.relationships?.orgs?.data?.[0];
  const org = orgRef ? (included.get(`orgs:${orgRef.id}`) as Record<string, string> | undefined) : undefined;
  // The org's adoptable-dogs page, then its homepage, kept separately as the
  // fallback — with its kind, so the UI never over-promises what it opens.
  const orgListUrl =
    (orgRef ? ORG_URL_OVERRIDES[orgRef.id] : undefined) ??
    normalizeHttpUrl(org?.adoptionUrl);
  const orgUrl = orgListUrl ?? normalizeHttpUrl(org?.url);
  const orgUrlKind = orgUrl ? (orgListUrl ? ("adoptable-list" as const) : ("website" as const)) : null;
  // This dog's own listing page. Not every animal record has one (only
  // rescues with a RescueGroups mini-site publish them). A URL that is
  // really a generic org or listings page is demoted to the fallback so it
  // can never masquerade as the dog's own profile.
  // Priority: RescueGroups URL first, then override (e.g., GetBuddy for
  // Spencer Pet Rescue when RescueGroups lacks the URL).
  const rgProfileUrl = normalizeHttpUrl(at.url) ?? resolveRelativeProfileUrl(at.url, orgUrl);
  const overrideUrl = ADOPTION_URL_OVERRIDES[a.id];
  const sourceProfileUrl = rgProfileUrl ?? (overrideUrl ? normalizeHttpUrl(overrideUrl) : null);
  let profileUrl = sourceProfileUrl;
  if (profileUrl && isDeadProfileHost(profileUrl)) {
    profileUrl = null;
  }
  if (profileUrl && isGenericAnimalUrl(profileUrl, orgUrl)) {
    profileUrl = null;
  }
  const email = typeof org?.email === "string" && org.email.includes("@") ? org.email : null;

  // Build canonical adoption URL object — check registry first
  const adoption: AdoptionUrl = (() => {
    const registryEntry = getAdoptionUrlStatus(a.id);

    // Verified and explicitly rejected registry decisions are authoritative.
    // An unverified placeholder must not suppress a valid dog-specific URL
    // already screened from the live RescueGroups record.
    if (registryEntry && registryEntry.status !== "unverified") {
      return {
        adoptionProfileUrl: registryEntry.adoptionProfileUrl,
        adoptionProfileUrlOriginal: registryEntry.adoptionProfileUrl,
        adoptionProfileUrlResolved: registryEntry.adoptionProfileUrl,
        adoptionProfileUrlHttpStatus: registryEntry.adoptionProfileUrl ? 200 : null,
        adoptionProfileUrlStatus: registryEntry.status,
        adoptionProfileUrlSource: registryEntry.source,
        adoptionProfileUrlVerifiedAt: registryEntry.verifiedAt,
        adoptionProfileUrlDetail: registryEntry.notes,
        rescueWebsiteUrl: orgUrl,
        rescueWebsiteUrlKind: orgUrlKind,
      };
    }

    if (profileUrl) {
      return {
        adoptionProfileUrl: profileUrl,
        adoptionProfileUrlOriginal: sourceProfileUrl,
        adoptionProfileUrlResolved: profileUrl,
        adoptionProfileUrlHttpStatus: null,
        adoptionProfileUrlStatus: "verified-direct-dog-page",
        adoptionProfileUrlSource:
          registryEntry && registryEntry.source !== "unknown"
            ? registryEntry.source
            : "rescuegroups-mini-site",
        adoptionProfileUrlVerifiedAt: registryEntry?.verifiedAt ?? null,
        adoptionProfileUrlDetail:
          registryEntry?.notes ?? "Dog-specific URL from RescueGroups feed",
        rescueWebsiteUrl: orgUrl,
        rescueWebsiteUrlKind: orgUrlKind,
      };
    }

    const result = emptyAdoptionUrl();
    if (registryEntry) {
      result.adoptionProfileUrlOriginal = sourceProfileUrl;
      result.adoptionProfileUrlStatus = registryEntry.status;
      result.adoptionProfileUrlSource = registryEntry.source;
      result.adoptionProfileUrlVerifiedAt = registryEntry.verifiedAt;
      result.adoptionProfileUrlDetail = registryEntry.notes;
    }
    result.rescueWebsiteUrl = orgUrl;
    result.rescueWebsiteUrlKind = orgUrlKind;
    return result;
  })();

  return {
    id: a.id,
    name: String(at.name ?? "").trim(),
    breed: String(at.breedString ?? "Mixed"),
    age: String(at.ageString ?? at.ageGroup ?? ""),
    sex: String(at.sex ?? ""),
    size: String(at.sizeGroup ?? ""),
    photo: photos[0] ?? null,
    photos,
    city: loc?.citystate ?? "",
    distance: typeof at.distance === "number" ? at.distance : null,
    adoption,
    profileUrl,
    sourceProfileUrl,
    orgUrl,
    orgUrlKind,
    url: resolveDogUrl({ profileUrl, orgUrl }),
    org: String(org?.name ?? ""),
    orgCity: org?.citystate ?? "",
    email,
    desc: decodeEntities(String(at.descriptionText ?? "")).trim(),
    facts: [
      flag(at.isHousetrained, "Housetrained", "Not housetrained yet"),
      flag(at.isDogsOk, "Good with dogs", "Prefers to be the only dog"),
      flag(at.isCatsOk, "Good with cats", "No cats, please"),
      flag(at.isKidsOk, "Good with kids", "Better without young kids"),
    ].filter((f): f is string => f !== null),
  };
}

// Small in-memory cache so repeat calls don't hammer the free API.
const cache = new Map<string, { at: number; dogs: Dog[] }>();
const CACHE_MS = 10 * 60 * 1000;

export function normalizeZip(value: string | null | undefined): string {
  return /^\d{5}$/.test(value ?? "") ? (value as string) : "63040";
}

// Currently AVAILABLE dogs near a ZIP. Returns null when the key is missing
// or the upstream fails (callers must treat null as "source unavailable",
// never as "no dogs").
export async function fetchAdoptableDogs(
  zip: string,
  miles: number,
): Promise<{ dogs: Dog[] | null; reason?: string }> {
  const key = process.env.RESCUEGROUPS_API_KEY;
  if (!key) return { dogs: null, reason: "no-key" };

  const safeMiles = Math.min(250, Math.max(5, miles || 50));
  const cacheKey = `${zip}:${safeMiles}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return { dogs: hit.dogs };
  }

  try {
    const res = await fetch(
      "https://api.rescuegroups.org/v5/public/animals/search/available/dogs?limit=222&include=pictures,locations,orgs",
      {
        method: "POST",
        headers: { Authorization: key, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({ data: { filterRadius: { miles: safeMiles, postalcode: zip } } }),
        cache: "no-store",
      },
    );
    if (!res.ok) return { dogs: null, reason: `upstream-${res.status}` };

    const json = (await res.json()) as { data?: RGResource[]; included?: RGResource[] };
    const included = new Map(
      (json.included ?? []).map((r) => [`${r.type}:${r.id}`, r.attributes]),
    );

    const dogs = (json.data ?? []).map((a) => normalizeDog(a, included));
    dogs.sort((x, y) => (x.distance ?? 999) - (y.distance ?? 999));

    cache.set(cacheKey, { at: Date.now(), dogs });
    return { dogs };
  } catch {
    return { dogs: null, reason: "fetch-failed" };
  }
}

// One dog by its stable RescueGroups id — powers the permanent /dogs/[id]
// pages. Returns { dog: null, gone: true } when the listing no longer exists.
export async function fetchDogById(
  id: string,
): Promise<{ dog: Dog | null; gone?: boolean; reason?: string }> {
  const key = process.env.RESCUEGROUPS_API_KEY;
  if (!key) return { dog: null, reason: "no-key" };
  if (!/^\d+$/.test(id)) return { dog: null, gone: true };

  try {
    const res = await fetch(
      `https://api.rescuegroups.org/v5/public/animals/${id}?include=pictures,locations,orgs`,
      {
        headers: { Authorization: key, "Content-Type": "application/vnd.api+json" },
        cache: "no-store",
      },
    );
    if (res.status === 404) return { dog: null, gone: true };
    if (!res.ok) return { dog: null, reason: `upstream-${res.status}` };

    const json = (await res.json()) as { data?: RGResource | RGResource[]; included?: RGResource[] };
    const record = Array.isArray(json.data) ? json.data[0] : json.data;
    if (!record) return { dog: null, gone: true };

    const included = new Map(
      (json.included ?? []).map((r) => [`${r.type}:${r.id}`, r.attributes]),
    );
    return { dog: normalizeDog(record, included) };
  } catch {
    return { dog: null, reason: "fetch-failed" };
  }
}
