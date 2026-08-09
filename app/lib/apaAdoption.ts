// Animal Protective Association of Missouri (APA) — one narrow, source-aware
// rule for their adoption links.
//
// APA publishes no per-dog URL in the RescueGroups feed, but every APA record
// carries the shelter's own pet id (`rescueId`, e.g. "A318825"), and APA's
// adoptable-pets page opens that exact pet when the id rides in the query:
//
//   https://apamo.org/adopt/adoptable-pets/?petID=A318825
//
// That page renders the individual pet's popup in the browser, so the raw
// server HTML is NOT evidence either way — a link with a matching petID is
// this dog's page, and the absence of the dog's name in the fetched HTML must
// never demote it. The same page WITHOUT a petID is just the full list.
//
// This rule applies to apamo.org only. Nothing here loosens verification for
// any other rescue.

export const APA_ORG_ID = "1915";
export const APA_PET_URL_BASE = "https://apamo.org/adopt/adoptable-pets/";

const APA_HOSTS = new Set(["apamo.org"]);
const APA_PET_PATH = /^\/adopt\/adoptable-pets\/?$/i;
// APA/PetPoint shelter ids look like A318825.
const APA_PET_ID = /^A\d{4,10}$/i;

export type ApaPetUrl = {
  // null when the adoptable-pets page was linked without naming a pet.
  petId: string | null;
};

// The shelter's own pet id, normalized ("a318825" → "A318825"). null when the
// value is missing or not shaped like an APA id.
export function normalizeApaPetId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return APA_PET_ID.test(s) ? s.toUpperCase() : null;
}

// This pet's own APA page, built from the shelter's id — never from a name.
export function buildApaPetUrl(petId: unknown): string | null {
  const id = normalizeApaPetId(petId);
  return id ? `${APA_PET_URL_BASE}?petID=${id}` : null;
}

// Recognize APA's adoptable-pets URL and read the pet it names. Returns null
// when the URL is not APA's adoptable-pets page at all.
export function parseApaPetUrl(url: string): ApaPetUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!APA_HOSTS.has(host)) return null;
  if (!APA_PET_PATH.test(parsed.pathname)) return null;

  for (const [key, value] of parsed.searchParams) {
    if (key.toLowerCase() === "petid") {
      const id = normalizeApaPetId(value);
      if (id) return { petId: id };
    }
  }
  return { petId: null };
}

// True when the URL is APA's adoptable-pets page opened on a specific pet.
export function isApaPetProfileUrl(url: string): boolean {
  return parseApaPetUrl(url)?.petId != null;
}

// True when an APA pet URL names a DIFFERENT pet than this dog's source id.
// Only ever true for APA pet URLs with a known source pet id — every other
// URL is judged by the normal rules.
export function apaPetUrlConflictsWithPet(
  url: string,
  sourcePetId: string | null | undefined,
): boolean {
  const expected = normalizeApaPetId(sourcePetId);
  if (!expected) return false;
  const parsed = parseApaPetUrl(url);
  if (!parsed?.petId) return false;
  return parsed.petId !== expected;
}
