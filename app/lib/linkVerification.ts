// Server-side verification for per-dog adoption URLs: follow redirects
// safely, classify the final destination, and check that it is reasonably
// associated with the named dog.
//
// The verdict contract (the important part):
//   "exact-dog"  — the final page verifiably belongs to this dog.
//   "generic"    — the URL confirmably lands on a homepage / list / search /
//                  application page. Only this verdict may demote a link.
//   "wrong-dog"  — the final page is an individual profile for a DIFFERENT
//                  animal id. Also demotes.
//   "gone"       — the profile confirmably no longer exists (404/410).
//   "uncertain"  — anti-bot blocking, timeouts, network failures, or a page
//                  we could not positively confirm either way. NEVER treated
//                  as dead or generic; the link keeps its current standing
//                  and gets rechecked later.
//
// Used by scripts/verify-dog-links.ts to sweep every active listing; a host
// whose per-dog URLs confirmably land generic graduates into
// DEAD_PROFILE_HOSTS in rescueDogs.ts (the Mastino/Stray Paws mechanism).
//
// 2026-09-06 — TWO RULES CHANGED AFTER THE MOO FAILURE:
//
// 1. HTTP 200 IS NOT ALIVE. A shelter platform will happily answer 200 with
//    a page whose content is "PET NOT FOUND — this pet is no longer available
//    for adoption". Every 2xx destination is now read for those markers
//    before anything else, and a marker means "gone", not "fine".
//
// 2. APA IS DECIDED BY APA'S OWN FEED, NOT BY THE URL. The old rule accepted
//    "the URL carries a petID" as proof, because apamo.org renders its pet
//    pages client-side. That was true right up until APA migrated from
//    PetPoint to Shelterluv and retired every A#####-shaped id at once — at
//    which point the rule certified 29 dead links as "exact-dog". A petID is
//    now checked against APA's official adoptable-pets feed. Feed
//    unreachable = "uncertain", never "exact-dog".

import { classifyAdoptionUrl, type AdoptionUrlClass } from "./dogDestination";
import { normalizeApaPetId, parseApaPetUrl } from "./apaAdoption";
import { checkApaAvailability } from "./officialAvailability";
import { findUnavailableMarker } from "./unavailableListing";
import { safeFetch, VERIFIER_USER_AGENT } from "./safeFetch";

export type LinkVerdictStatus =
  | "exact-dog"
  | "generic"
  | "wrong-dog"
  | "gone"
  | "uncertain";

export type LinkVerdict = {
  status: LinkVerdictStatus;
  finalUrl: string | null;
  httpStatus: number | null;
  classification: AdoptionUrlClass | null;
  detail: string;
};

export type VerifyOptions = {
  dogName: string;
  // The source animal id (e.g. RescueGroups AnimalID) when known.
  animalId?: string | null;
  // The shelter's own pet id when the source publishes one directly (e.g.
  // APA of Missouri's "A318825"), for rescues whose deep-link query carries
  // that id rather than the RescueGroups AnimalID.
  sourcePetId?: string | null;
  orgUrl?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRedirects?: number;
};

// Every outbound check identifies itself honestly through safeFetch's
// VERIFIER_USER_AGENT. We never impersonate a browser to get past a site's
// bot protection — a rescue that does not want automated traffic gets
// "uncertain", not a workaround.

// Statuses that mean "we were blocked or the server hiccuped", not "the
// profile is gone": never demote on these.
const TRANSIENT_STATUS = new Set([401, 403, 408, 425, 429, 500, 502, 503, 504]);

function extractAnimalIds(url: string): string[] {
  const ids: string[] = [];
  try {
    const parsed = new URL(url);
    for (const [key, value] of parsed.searchParams) {
      if (/^(?:animal_?id|pet_?id|dog_?id|aid|id)$/i.test(key) && /^\d+$/.test(value.trim())) {
        ids.push(value.trim());
      }
    }
  } catch {
    // ignore
  }
  return ids;
}

// The dog's first name token, long enough to be meaningful ("Bo" matches too
// much; require 3+ chars before name-matching counts as confirmation).
function nameToken(dogName: string): string | null {
  const first = dogName.trim().split(/\s+/)[0]?.replace(/[^a-z0-9]/gi, "");
  return first && first.length >= 3 ? first.toLowerCase() : null;
}

// Hosts a listing check is allowed to end up on, derived from where it
// started. A link that redirects off its own provider and its rescue's own
// site is not proof of anything about this dog, so it is refused rather than
// followed and believed.
function allowedHosts(url: string, orgUrl: string | null | undefined): string[] {
  const hosts = new Set<string>();
  for (const candidate of [url, orgUrl ?? ""]) {
    if (!candidate) continue;
    try {
      const host = new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
      hosts.add(host);
      // A provider commonly moves between its apex and a subdomain
      // (rescue.org -> app.rescue.org); allow within the registrable-ish
      // suffix, never across providers.
      const parts = host.split(".");
      if (parts.length > 2) hosts.add(parts.slice(-2).join("."));
    } catch {
      // ignore an unparseable candidate
    }
  }
  return [...hosts];
}

export async function verifyDogProfileUrl(
  url: string,
  opts: VerifyOptions,
): Promise<LinkVerdict> {
  // APA of Missouri is decided by APA's own official adoptable-pets feed,
  // BEFORE any page fetch. Their pet pages are client-rendered, so fetching
  // one can never answer the question; the feed can, and it is the shelter's
  // own record of who is actually there.
  const apaPetAtSource = parseApaPetUrl(url);
  if (apaPetAtSource) {
    if (!apaPetAtSource.petId) {
      return {
        status: "generic",
        finalUrl: url,
        httpStatus: null,
        classification: "animal-list",
        detail: "APA adoptable-pets page carries no petID — this is the list, not a specific dog",
      };
    }
    const expectedApaId = normalizeApaPetId(opts.sourcePetId);
    if (expectedApaId && apaPetAtSource.petId !== expectedApaId) {
      return {
        status: "wrong-dog",
        finalUrl: url,
        httpStatus: null,
        classification: "animal-profile",
        detail: `APA petID ${apaPetAtSource.petId} does not match this dog's shelter id ${expectedApaId}`,
      };
    }

    const availability = await checkApaAvailability(apaPetAtSource.petId, {
      fetchImpl: opts.fetchImpl,
    });
    if (availability.verdict === "available") {
      return {
        status: "exact-dog",
        finalUrl: availability.officialUrl ?? url,
        httpStatus: null,
        classification: "animal-profile",
        detail: availability.detail,
      };
    }
    if (availability.verdict === "unavailable") {
      return {
        status: "gone",
        finalUrl: url,
        httpStatus: null,
        classification: "animal-profile",
        detail: availability.detail,
      };
    }
    return {
      status: "uncertain",
      finalUrl: url,
      httpStatus: null,
      classification: "animal-profile",
      detail: availability.detail,
    };
  }

  const outcome = await safeFetch(url, {
    allowHosts: allowedHosts(url, opts.orgUrl),
    timeoutMs: opts.timeoutMs ?? 12_000,
    maxRedirects: opts.maxRedirects ?? 5,
    userAgent: VERIFIER_USER_AGENT,
    fetchImpl: opts.fetchImpl,
  });

  if (!outcome.ok) {
    // A URL we refuse to follow is a real defect in the link, not a network
    // blip: it can never be presented as this dog's page.
    if (
      outcome.reason === "invalid-url" ||
      outcome.reason === "blocked-protocol" ||
      outcome.reason === "blocked-host"
    ) {
      return {
        status: "generic",
        finalUrl: outcome.finalUrl,
        httpStatus: outcome.status,
        classification: "invalid",
        detail: outcome.detail,
      };
    }
    // Off-allowlist means the link left its provider — we cannot confirm the
    // dog there, and we will not follow it, so the link stands unproven.
    return {
      status: "uncertain",
      finalUrl: outcome.finalUrl,
      httpStatus: outcome.status,
      classification: null,
      detail: `${outcome.detail} — profile standing unchanged`,
    };
  }

  if (outcome.status === 404 || outcome.status === 410) {
    return {
      status: "gone",
      finalUrl: outcome.finalUrl,
      httpStatus: outcome.status,
      classification: null,
      detail: `listing returns ${outcome.status}`,
    };
  }
  if (TRANSIENT_STATUS.has(outcome.status) || outcome.status >= 400) {
    return {
      status: "uncertain",
      finalUrl: outcome.finalUrl,
      httpStatus: outcome.status,
      classification: null,
      detail: `blocked or transient upstream status ${outcome.status} — never treated as dead`,
    };
  }

  // 2xx. Before anything else: does the page itself say this listing is over?
  // This is the check MOO's link needed and did not have.
  const marker = findUnavailableMarker(outcome.body);
  if (marker) {
    return {
      status: "gone",
      finalUrl: outcome.finalUrl,
      httpStatus: outcome.status,
      classification: null,
      detail: `destination returned ${outcome.status} but says "${marker.label}": ${marker.excerpt}`,
    };
  }

  // A different APA page may be where the redirects landed; decide it by the
  // same official-feed rule rather than by reading a client-rendered shell.
  const apaPetAtDestination = parseApaPetUrl(outcome.finalUrl);
  if (apaPetAtDestination) {
    if (!apaPetAtDestination.petId) {
      return {
        status: "generic",
        finalUrl: outcome.finalUrl,
        httpStatus: outcome.status,
        classification: "animal-list",
        detail: "redirected to APA's adoptable-pets list, which names no specific dog",
      };
    }
    const availability = await checkApaAvailability(apaPetAtDestination.petId, {
      fetchImpl: opts.fetchImpl,
    });
    return {
      status:
        availability.verdict === "available"
          ? "exact-dog"
          : availability.verdict === "unavailable"
            ? "gone"
            : "uncertain",
      finalUrl: outcome.finalUrl,
      httpStatus: outcome.status,
      classification: "animal-profile",
      detail: availability.detail,
    };
  }

  const classification = classifyAdoptionUrl(outcome.finalUrl, opts.orgUrl ?? null);
  if (classification !== "animal-profile") {
    return {
      status: "generic",
      finalUrl: outcome.finalUrl,
      httpStatus: outcome.status,
      classification,
      detail: `final destination classifies as ${classification}`,
    };
  }

  // It looks like an individual profile — confirm it is THIS dog's.
  const expectedIds = opts.animalId
    ? [opts.animalId, ...extractAnimalIds(url)]
    : extractAnimalIds(url);
  const finalIds = extractAnimalIds(outcome.finalUrl);
  if (expectedIds.length && finalIds.length) {
    if (finalIds.some((id) => expectedIds.includes(id))) {
      return {
        status: "exact-dog",
        finalUrl: outcome.finalUrl,
        httpStatus: outcome.status,
        classification,
        detail: "final URL carries this dog's listing id",
      };
    }
    return {
      status: "wrong-dog",
      finalUrl: outcome.finalUrl,
      httpStatus: outcome.status,
      classification,
      detail: `final URL names a different animal id (${finalIds.join(",")})`,
    };
  }

  // No id to compare — look for the dog's name in the page itself.
  const token = nameToken(opts.dogName);
  const haystack = outcome.body.toLowerCase();
  if (token && haystack.includes(token)) {
    return {
      status: "exact-dog",
      finalUrl: outcome.finalUrl,
      httpStatus: outcome.status,
      classification,
      detail: `page mentions "${opts.dogName.trim().split(/\s+/)[0]}"`,
    };
  }
  if (expectedIds.length && haystack.includes(expectedIds[0])) {
    return {
      status: "exact-dog",
      finalUrl: outcome.finalUrl,
      httpStatus: outcome.status,
      classification,
      detail: "page carries this dog's listing id",
    };
  }
  return {
    status: "uncertain",
    finalUrl: outcome.finalUrl,
    httpStatus: outcome.status,
    classification,
    detail:
      "profile-shaped destination without positive dog confirmation — recheck later, do not demote",
  };
}
