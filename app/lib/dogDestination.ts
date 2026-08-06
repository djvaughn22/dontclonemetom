// One shared resolver decides where every adoptable-dog link on the site
// points and what it may honestly say. Client-safe: pure functions, no env.
//
// The rule (never violated): when a dog has a verified adoption profile page,
// every tap — photo, name, card, call-to-action — opens that exact page in
// one step. A rescue’s multi-dog page is only ever a clearly-labeled fallback,
// and a fallback label must never imply it opens the exact dog.

import type { AdoptionUrl } from "./adoptionUrlSchema";

export type DogDestinationType = "exact-dog" | "shelter-fallback" | "none";

export type DogDestination = {
  type: DogDestinationType;
  url: string;
  // shelter-fallback flavor: "adoptable-list" = the rescue’s adoptable-dogs
  // page, "website" = the rescue’s own site. null otherwise.
  fallbackKind: "adoptable-list" | "website" | null;
  // Honest visible label ("Meet Bella" only when the link opens Bella).
  label: string;
  // Screen-reader text; always says the link leaves the site in a new tab.
  ariaLabel: string;
};

export type DogLinkFields = {
  name: string;
  org: string;
  profileUrl: string | null;
  orgUrl: string | null;
  orgUrlKind?: "adoptable-list" | "website" | null;
  adoption?: AdoptionUrl; // NEW: canonical adoption URL field
};

export function resolveDogDestination(dog: DogLinkFields): DogDestination {
  const name = dog.name?.trim() || "this dog";
  const rescue = dog.org?.trim() || "the rescue";

  // Canonical adoption data is authoritative.
  if (
    dog.adoption?.adoptionProfileUrlStatus === "verified-direct-dog-page" &&
    dog.adoption.adoptionProfileUrl
  ) {
    return {
      type: "exact-dog",
      url: dog.adoption.adoptionProfileUrl,
      fallbackKind: null,
      label: `View ${name}'s adoption page`,
      ariaLabel: `View ${name}'s adoption page — opens in a new tab`,
    };
  }

  // Legacy compatibility only when canonical adoption data is absent.
  if (!dog.adoption && dog.profileUrl) {
    return {
      type: "exact-dog",
      url: dog.profileUrl,
      fallbackKind: null,
      label: `View ${name}'s adoption page`,
      ariaLabel: `View ${name}'s adoption page — opens in a new tab`,
    };
  }

  // Use adoption field if available for fallback URL
  const fallbackUrl = dog.adoption?.rescueWebsiteUrl ?? dog.orgUrl;
  const fallbackKind = dog.adoption?.rescueWebsiteUrlKind ?? (dog.orgUrlKind ?? "website");

  if (fallbackUrl) {
    if (fallbackKind === "adoptable-list") {
      return {
        type: "shelter-fallback",
        url: fallbackUrl,
        fallbackKind: "adoptable-list",
        label: "View shelter listings",
        ariaLabel: `View ${rescue}’s adoptable-dog listings and look for ${name} there — opens in a new tab`,
      };
    }
    return {
      type: "shelter-fallback",
      url: fallbackUrl,
      fallbackKind: "website",
      label: "Visit the rescue",
      ariaLabel: `Visit ${rescue}’s website and ask about ${name} — opens in a new tab`,
    };
  }

  return { type: "none", url: "", fallbackKind: null, label: "", ariaLabel: "" };
}

// ---------------------------------------------------------------------------
// URL classification — what kind of page does an adoption URL point at?
//
// A URL claimed to be a dog's own profile may only be presented as one when
// it classifies as "animal-profile". Everything else (a homepage, a broad
// adoptable-dogs list, a search page, a contact/application form) is demoted
// to the honest shelter fallback so a generic page can never masquerade as
// the named dog.

export type AdoptionUrlClass =
  | "animal-profile" // an individual animal's own page (or a deep page that may be one)
  | "org-page" // literally the same page as the rescue's fallback URL
  | "org-homepage" // the rescue's homepage / site root
  | "animal-list" // a broad adoptable-dogs / available-pets listing page
  | "search" // a search or search-results page
  | "application" // application, contact, donate, about — never a dog
  | "invalid"; // unparseable or non-web URL

// Single-segment paths that are adoptable-dog lists, not an individual animal.
const GENERIC_LIST_PATH =
  /^\/(?:animals?|adopt(?:ions?|able)?|adoptable-(?:dogs|pets|animals)|dogs|pets|available(?:-pets|-dogs|-animals)?|our-(?:dogs|pets|animals)|meet-the-dogs|dogs-for-adoption|gallery|listings?)\/?$/i;

// Search or search-results pages.
const SEARCH_PATH = /(?:^|\/)(?:search|pet-?search|searchresults|results)(?:\.\w+)?\/?$/i;

// Pages that exist for people-paperwork, never for a specific dog.
const APPLICATION_PATH =
  /^\/(?:contact(?:-us)?|about(?:-us)?|apply|applications?|adoption-(?:application|form)|adopt(?:ion)?-process|forms?|foster|volunteer|donate|donations?|events?|home|index(?:\.\w+)?)\/?$/i;

// Query params that carry an individual animal's identity. A URL whose query
// names a specific animal id is that animal's page (?AnimalID=123) — such
// ids must never be stripped or rejected, or the dog is lost.
const ANIMAL_ID_PARAM = /^(?:animal_?id|pet_?id|dog_?id|aid|id)$/i;

function hasAnimalIdParam(parsed: URL): boolean {
  for (const [key, value] of parsed.searchParams) {
    if (ANIMAL_ID_PARAM.test(key) && /^\d+$/.test(value.trim())) return true;
  }
  return false;
}

export function classifyAdoptionUrl(url: string, orgUrl: string | null): AdoptionUrlClass {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "invalid";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "invalid";

  // An animal id in the query names the exact animal regardless of path.
  if (hasAnimalIdParam(parsed)) return "animal-profile";

  if (orgUrl) {
    try {
      const org = new URL(orgUrl);
      const trim = (p: string) => p.replace(/\/+$/, "");
      if (
        parsed.hostname === org.hostname &&
        trim(parsed.pathname) === trim(org.pathname) &&
        parsed.search === org.search
      ) {
        return "org-page";
      }
    } catch {
      // Unparseable org URL — judge the profile URL on its own.
    }
  }

  const path = parsed.pathname;

  // Petfinder: /dog/<slug>/… is an animal; a member/org page is not.
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "petfinder.com") {
    if (/^\/(?:dog|cat|pet)\/[^/]+/i.test(path)) return "animal-profile";
    if (/^\/member\//i.test(path)) return "org-homepage";
  }
  // A social-network page is an org presence, never a dog's own profile.
  if (host === "facebook.com" || host === "m.facebook.com" || host === "instagram.com") {
    return "org-homepage";
  }

  if (SEARCH_PATH.test(path)) return "search";
  if (APPLICATION_PATH.test(path)) return "application";
  if (GENERIC_LIST_PATH.test(path)) return "animal-list";
  // Site root — with or without leftover query params, no recognized animal
  // id means this is not a verified profile.
  if (/^\/?$/.test(path)) return "org-homepage";

  // A deep, non-generic path — treat as a candidate individual page. The
  // redirect-following verifier (linkVerification.ts) is what confirms or
  // refutes these against the live destination.
  return "animal-profile";
}

// True when a URL claimed to be a dog's own profile is really a generic
// page — the rescue's homepage, its adoptable-dogs list, a search page, an
// application form, or the same page already used as the org fallback.
export function isGenericAnimalUrl(url: string, orgUrl: string | null): boolean {
  return classifyAdoptionUrl(url, orgUrl) !== "animal-profile";
}
