// RescueGroups.org v5 public API — shared server-side fetch + normalization.
// One authoritative Dog shape powers the ZIP search API, the Dog of the Day,
// the Instagram card, the /dogs pages, and the caption generator.
// The API key stays server-side; clients only ever see trimmed results.

import { isGenericAnimalUrl } from "./dogDestination";
import type { AdoptionUrl } from "./adoptionUrlSchema";
import { emptyAdoptionUrl } from "./adoptionUrlSchema";
import { getAdoptionUrlStatus, getVerifiedAdoptionUrl } from "./adoptionUrlRegistry";
import { APA_ORG_ID, APA_PET_URL_BASE, buildApaPetUrl, parseApaPetUrl } from "./apaAdoption";
import { checkApaIndex, loadApaIndex, type ApaIndex } from "./officialAvailability";
import { findIdentityConflict, type IdentityConflict } from "./identityIntegrity";

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
  // The shelter's own pet id, when the feed publishes one (e.g. APA of
  // Missouri's "A318825") but no per-dog URL. Used to build/verify a
  // rescue-specific deep link; null for rescues that don't publish one.
  rescueId: string | null;
  // When the UPSTREAM FEED last showed this dog (RescueGroups `updatedDate`).
  // A feed refresh updates this and NOTHING else — it is never evidence the
  // destination is still alive. See adoptionUrlSchema.ts.
  feedSeenAt: string | null;
  // Set when the record contradicts itself about which dog it describes
  // (MOO's listing, whose description is about "Abigail"). A conflicting
  // record keeps its name and photo but has its description suppressed and
  // is barred from public selection surfaces.
  identityConflict: IdentityConflict | null;
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
// stonecountyhumanesociety.rescuegroups.org (added 2026-09-06, found by the
//   adoption-integrity audit): their entire RescueGroups mini-site is retired
//   — every per-dog URL AND the site root answer HTTP 410 Gone. RescueGroups
//   still lists 21 of their dogs as available, so the feed and the
//   destination flatly disagree; 410 is the server stating deliberately that
//   the resource is permanently gone, so the destination wins. Verified
//   21/21 dead on 2026-09-06. Remove once a per-dog page loads again.
const DEAD_PROFILE_HOSTS = new Set([
  "straypawsrescue.rescuegroups.org",
  "mastinorescue.rescuegroups.org",
  "mastino-rescue-inc.org",
  "stonecountyhumanesociety.rescuegroups.org",
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
  // Priority: RescueGroups URL first, then a known rescue-specific deep link
  // built from a shelter id RescueGroups does carry (APA of Missouri never
  // publishes a per-dog `url`, only its own "A318825"-style rescueId), then
  // a hand-verified override (e.g., GetBuddy for Spencer Pet Rescue).
  const rescueId = typeof at.rescueId === "string" ? at.rescueId.trim() || null : null;
  const apaPetUrl = orgRef?.id === APA_ORG_ID ? buildApaPetUrl(rescueId) : null;
  const rgProfileUrl =
    normalizeHttpUrl(at.url) ?? resolveRelativeProfileUrl(at.url, orgUrl) ?? apaPetUrl;
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
        // A registry entry is a person's hand-audit of the destination, so it
        // may carry a real destination timestamp — but only when it has one.
        destinationVerifiedAt: registryEntry.verifiedAt,
        destinationVerificationMethod: registryEntry.verifiedAt ? "manual-audit" : "none",
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
        // NOT a destination check. The feed handed us a dog-shaped URL and
        // that is all we know until something confirms the destination.
        destinationVerifiedAt: registryEntry?.verifiedAt ?? null,
        destinationVerificationMethod: registryEntry?.verifiedAt ? "manual-audit" : "none",
        adoptionProfileUrlDetail:
          registryEntry?.notes ?? "Dog-specific URL from the source feed — destination not yet confirmed",
        rescueWebsiteUrl: orgUrl,
        rescueWebsiteUrlKind: orgUrlKind,
      };
    }

    const result = emptyAdoptionUrl();
    if (registryEntry) {
      result.adoptionProfileUrlOriginal = sourceProfileUrl;
      result.adoptionProfileUrlStatus = registryEntry.status;
      result.adoptionProfileUrlSource = registryEntry.source;
      result.destinationVerifiedAt = registryEntry.verifiedAt;
      result.destinationVerificationMethod = registryEntry.verifiedAt ? "manual-audit" : "none";
      result.adoptionProfileUrlDetail = registryEntry.notes;
    }
    result.rescueWebsiteUrl = orgUrl;
    result.rescueWebsiteUrlKind = orgUrlKind;
    return result;
  })();

  const dogName = String(at.name ?? "").trim();
  const rawDesc = decodeEntities(String(at.descriptionText ?? "")).trim();
  // A record that names one dog and describes another is quarantined here,
  // at the single place every surface reads from, so no surface can publish
  // the conflicting description by forgetting to check.
  const identityConflict = findIdentityConflict(dogName, rawDesc);

  return {
    id: a.id,
    name: dogName,
    breed: String(at.breedString ?? "Mixed"),
    age: String(at.ageString ?? at.ageGroup ?? ""),
    sex: String(at.sex ?? ""),
    size: String(at.sizeGroup ?? ""),
    photo: photos[0] ?? null,
    photos,
    city: loc?.citystate ?? "",
    distance: typeof at.distance === "number" ? at.distance : null,
    rescueId,
    feedSeenAt:
      typeof at.updatedDate === "string" && at.updatedDate.trim()
        ? at.updatedDate.trim()
        : typeof at.createdDate === "string" && at.createdDate.trim()
          ? at.createdDate.trim()
          : null,
    identityConflict,
    adoption,
    profileUrl,
    sourceProfileUrl,
    orgUrl,
    orgUrlKind,
    url: resolveDogUrl({ profileUrl, orgUrl }),
    org: String(org?.name ?? ""),
    orgCity: org?.citystate ?? "",
    email,
    // Suppressed while the record disagrees with itself about which dog it
    // is — the name and photo stay, so an existing link still resolves to
    // something honest, but a story about another animal is never published.
    desc: identityConflict ? "" : rawDesc,
    facts: [
      flag(at.isHousetrained, "Housetrained", "Not housetrained yet"),
      flag(at.isDogsOk, "Good with dogs", "Prefers to be the only dog"),
      flag(at.isCatsOk, "Good with cats", "No cats, please"),
      flag(at.isKidsOk, "Good with kids", "Better without young kids"),
    ].filter((f): f is string => f !== null),
  };
}

// ---------------------------------------------------------------------------
// Official-record enrichment (2026-09-06 adoption-integrity fix).
//
// normalizeDog() is synchronous and can only judge a URL by its SHAPE. That
// is exactly how MOO ended up "verified": her URL was built from APA's own
// pet id, so it looked like a dog page, and nothing ever asked APA whether
// the dog was still there. APA had migrated shelter software and retired
// every A#####-shaped id — the page answers HTTP 200 and renders
// "PET NOT FOUND".
//
// So after normalization, dogs whose rescue publishes an official
// availability feed get checked against it. One feed fetch covers the whole
// batch. The three outcomes are kept strictly distinct:
//
//   available   -> destination confirmed; destinationVerifiedAt is set.
//   unavailable -> dead-or-removed; the dog-specific URL is withdrawn.
//   unknown     -> unverified. NEVER "available", never "dead". A feed we
//                  could not reach changes nothing about whether the dog is
//                  there; it only means we cannot claim she is.
export function applyOfficialAvailability(dog: Dog, apaIndex: ApaIndex | null): Dog {
  const url = dog.adoption.adoptionProfileUrl ?? dog.adoption.adoptionProfileUrlOriginal;
  if (!url) return dog;

  const apa = parseApaPetUrl(url);
  if (!apa) return dog; // No official feed for this rescue — unchanged.

  const petId = apa.petId ?? dog.rescueId;
  const check = checkApaIndex(apaIndex, petId);

  // Whatever the verdict, an APA dog's fallback should be APA's live
  // adoptable-pets directory rather than their homepage — it is the page a
  // visitor whose dog is gone actually needs, and it is honestly labeled
  // "View shelter listings" by resolveDogDestination.
  const withDirectory = {
    ...dog.adoption,
    rescueWebsiteUrl: APA_PET_URL_BASE,
    rescueWebsiteUrlKind: "adoptable-list" as const,
  };

  if (check.verdict === "available") {
    return {
      ...dog,
      adoption: {
        ...withDirectory,
        adoptionProfileUrl: url,
        adoptionProfileUrlResolved: check.officialUrl ?? url,
        adoptionProfileUrlStatus: "verified-direct-dog-page",
        adoptionProfileUrlSource: "shelter-id-deep-link",
        destinationVerifiedAt: check.checkedAt,
        destinationVerificationMethod: "official-feed",
        adoptionProfileUrlDetail: check.detail,
      },
    };
  }

  if (check.verdict === "unavailable") {
    return {
      ...dog,
      url: APA_PET_URL_BASE,
      profileUrl: null,
      adoption: {
        ...withDirectory,
        // The dog-specific link is withdrawn the moment the shelter's own
        // record stops carrying her. No surface can offer it again.
        adoptionProfileUrl: null,
        adoptionProfileUrlOriginal: url,
        adoptionProfileUrlResolved: url,
        adoptionProfileUrlStatus: "dead-or-removed",
        destinationVerifiedAt: check.checkedAt,
        destinationVerificationMethod: "official-feed",
        adoptionProfileUrlDetail: check.detail,
      },
    };
  }

  return {
    ...dog,
    url: APA_PET_URL_BASE,
    profileUrl: null,
    adoption: {
      ...withDirectory,
      adoptionProfileUrl: null,
      adoptionProfileUrlOriginal: url,
      adoptionProfileUrlStatus: "unverified",
      destinationVerifiedAt: null,
      destinationVerificationMethod: "none",
      adoptionProfileUrlDetail: check.detail,
    },
  };
}

// Enrich a whole batch with one feed fetch. Skipped entirely when no dog in
// the batch comes from a rescue that has an official feed.
export async function withOfficialAvailability(
  dogs: Dog[],
  options: { fetchImpl?: typeof fetch } = {},
): Promise<Dog[]> {
  const needsApa = dogs.some((d) =>
    parseApaPetUrl(d.adoption.adoptionProfileUrl ?? d.adoption.adoptionProfileUrlOriginal ?? "") !== null,
  );
  if (!needsApa) return dogs;

  const apaIndex = await loadApaIndex(options);
  return dogs.map((dog) => applyOfficialAvailability(dog, apaIndex));
}

// Small in-memory cache so repeat calls don't hammer the free API.
const cache = new Map<string, { at: number; dogs: Dog[] }>();
const CACHE_MS = 10 * 60 * 1000;

export function normalizeZip(value: string | null | undefined): string {
  return /^\d{5}$/.test(value ?? "") ? (value as string) : "63040";
}

// RescueGroups' v5 API rejects any limit above 250 ("Invalid Limit") and a
// single request only ever returns one page — a fixed limit=222 silently
// truncated the real result set (306 real dogs within 50mi of 63040 vs. 222
// returned, discovered 2026-08-10). Page through the full result instead.
const RG_PAGE_LIMIT = 250;
// Safety backstop against a runaway page count; the widest radius the site
// offers (250mi of 63040) measured 1140 dogs = 5 pages, so 10 pages of
// headroom is generous without risking an unbounded fetch loop.
const RG_MAX_PAGES = 10;

async function fetchAnimalsPage(key: string, zip: string, miles: number, page: number) {
  const res = await fetch(
    `https://api.rescuegroups.org/v5/public/animals/search/available/dogs?limit=${RG_PAGE_LIMIT}&page=${page}&include=pictures,locations,orgs`,
    {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({ data: { filterRadius: { miles, postalcode: zip } } }),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`upstream-${res.status}`);
  return (await res.json()) as {
    data?: RGResource[];
    included?: RGResource[];
    meta?: { pages?: number };
  };
}

// Currently AVAILABLE dogs near a ZIP. Returns null when the key is missing
// or the upstream fails (callers must treat null as "source unavailable",
// never as "no dogs"). Pages through the full result set — never silently
// truncates the real pool to one page's worth of dogs.
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
    const first = await fetchAnimalsPage(key, zip, safeMiles, 1);
    const totalPages = Math.max(1, Math.min(RG_MAX_PAGES, first.meta?.pages ?? 1));

    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => fetchAnimalsPage(key, zip, safeMiles, i + 2)),
    );
    const pages = [first, ...rest];

    const included = new Map<string, Record<string, unknown>>();
    const records: RGResource[] = [];
    for (const page of pages) {
      for (const r of page.included ?? []) included.set(`${r.type}:${r.id}`, r.attributes);
      records.push(...(page.data ?? []));
    }

    // Shape-screen every record, then ask the shelters that publish an
    // official availability feed whether these dogs are actually still there.
    const dogs = await withOfficialAvailability(records.map((a) => normalizeDog(a, included)));
    dogs.sort((x, y) => (x.distance ?? 999) - (y.distance ?? 999));

    cache.set(cacheKey, { at: Date.now(), dogs });
    return { dogs };
  } catch {
    return { dogs: null, reason: "fetch-failed" };
  }
}

// ---------------------------------------------------------------------------
// Public-display eligibility (2026-08-10 link-integrity lock).
//
// A generic rescue homepage, adoptable-list page, search page, or dead/
// mismatched listing must never be a PUBLIC dog card's destination. Only a
// dog with a verified individual page may be surfaced by the site's own
// selection surfaces (results grid, Dog of the Day). The honest
// "shelter-fallback" resolution in dogDestination.ts still exists and is
// still correct for a directly-addressed /dogs/[id] page someone already
// has a link to — this eligibility gate is about what the site itself
// chooses to show, not about breaking existing deep links.
export function isPubliclyEligible(dog: Pick<Dog, "adoption" | "identityConflict">): boolean {
  // A record that contradicts itself about which dog it is never gets chosen
  // by the site. It keeps its page for anyone holding a link; it just isn't
  // something we hand to a new visitor as a dog to fall in love with.
  if (dog.identityConflict) return false;
  return (
    dog.adoption.adoptionProfileUrlStatus === "verified-direct-dog-page" &&
    Boolean(dog.adoption.adoptionProfileUrl)
  );
}

// The measured count of dogs the production homepage displayed at its
// default view (63040, 50mi) on 2026-08-10, before this eligibility filter
// existed — the locked floor "publicly displayed must never decrease"
// is measured against. See docs/LINK-INTEGRITY-BASELINE-2026-08-10.md.
//
// 2026-09-06 — READ THIS BEFORE TREATING THE NUMBER AS A GOAL. When this
// floor was measured, 50 of the dogs it counted had dead destinations (29 APA
// links retired by a shelter-software migration, 21 Stone County links
// answering HTTP 410). A count is only worth defending if every dog in it is
// real. This target still drives the radius widening — reach further to find
// MORE verified dogs — but it must never be satisfied by keeping an
// unverified or dead dog on the page. Showing 204 real dogs beats showing
// 254 with 50 dead ends, every time.
export const PUBLIC_DISPLAY_BASELINE = 222;

// The widest radius the site is willing to search on a visitor's behalf —
// 250mi is already the largest user-facing choice on the homepage itself
// (RADIUS_OPTIONS in app/page.tsx), so widening the search never reaches
// further than a visitor could already select by hand.
const MAX_SEARCH_MILES = 250;

export type PubliclyEligibleResult = {
  dogs: Dog[];
  requestedMiles: number;
  effectiveMiles: number;
  widened: boolean;
  candidatesConsidered: number;
};

// Verified-direct dogs near a ZIP. Fetches the requested radius and the
// site's own maximum radius (250mi) in parallel — cheaper than walking a
// ladder of radii one at a time — and uses the smaller of the two that
// still meets the display floor, widening only when the requested radius
// alone doesn't have enough verified dogs. Never fabricates a dog or a
// link — if even 250mi can't reach the floor, returns every verified dog
// found there and says so honestly via `widened`.
export async function fetchPubliclyEligibleDogs(
  zip: string,
  requestedMiles: number,
  targetCount: number = PUBLIC_DISPLAY_BASELINE,
): Promise<{ result: PubliclyEligibleResult | null; reason?: string }> {
  const safeRequested = Math.min(MAX_SEARCH_MILES, Math.max(5, requestedMiles || 50));

  const [requested, widest] =
    safeRequested === MAX_SEARCH_MILES
      ? [await fetchAdoptableDogs(zip, safeRequested), null]
      : await Promise.all([fetchAdoptableDogs(zip, safeRequested), fetchAdoptableDogs(zip, MAX_SEARCH_MILES)]);

  if (requested.dogs) {
    const eligible = requested.dogs.filter(isPubliclyEligible);
    if (eligible.length >= targetCount || !widest) {
      return {
        result: {
          dogs: eligible,
          requestedMiles: safeRequested,
          effectiveMiles: safeRequested,
          widened: false,
          candidatesConsidered: requested.dogs.length,
        },
      };
    }
  }

  if (widest?.dogs) {
    return {
      result: {
        dogs: widest.dogs.filter(isPubliclyEligible),
        requestedMiles: safeRequested,
        effectiveMiles: MAX_SEARCH_MILES,
        widened: true,
        candidatesConsidered: widest.dogs.length,
      },
    };
  }

  return { result: null, reason: requested.reason ?? widest?.reason ?? "no-eligible-dogs" };
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
    // A single dog's page must apply the same official-record check the grid
    // does — this is the page a shared link lands on, so it is the page that
    // most needs to be honest about whether she is still available.
    const [dog] = await withOfficialAvailability([normalizeDog(record, included)]);
    return { dog };
  } catch {
    return { dog: null, reason: "fetch-failed" };
  }
}
