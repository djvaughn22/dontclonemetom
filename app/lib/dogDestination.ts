// One shared resolver decides where every adoptable-dog link on the site
// points and what it may honestly say. Client-safe: pure functions, no env.
//
// The rule (never violated): when a dog has its own profile page, every
// tap — photo, name, card, call-to-action — opens that exact page in one
// step. A rescue's multi-dog page is only ever a clearly-labeled fallback,
// and a fallback label must never imply it opens the exact dog.

export type DogDestinationType = "exact-dog" | "shelter-fallback" | "none";

export type DogDestination = {
  type: DogDestinationType;
  url: string;
  // shelter-fallback flavor: "adoptable-list" = the rescue's adoptable-dogs
  // page, "website" = the rescue's own site. null otherwise.
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
};

export function resolveDogDestination(dog: DogLinkFields): DogDestination {
  const name = dog.name?.trim() || "this dog";
  const rescue = dog.org?.trim() || "the rescue";

  if (dog.profileUrl) {
    return {
      type: "exact-dog",
      url: dog.profileUrl,
      fallbackKind: null,
      label: `Meet ${name}`,
      ariaLabel: `Meet ${name} — opens ${name}’s own adoption page in a new tab`,
    };
  }

  if (dog.orgUrl) {
    if ((dog.orgUrlKind ?? "website") === "adoptable-list") {
      return {
        type: "shelter-fallback",
        url: dog.orgUrl,
        fallbackKind: "adoptable-list",
        label: "View shelter listings",
        ariaLabel: `View ${rescue}’s adoptable-dog listings and look for ${name} there — opens in a new tab`,
      };
    }
    return {
      type: "shelter-fallback",
      url: dog.orgUrl,
      fallbackKind: "website",
      label: "Visit the rescue",
      ariaLabel: `Visit ${rescue}’s website and ask about ${name} — opens in a new tab`,
    };
  }

  return { type: "none", url: "", fallbackKind: null, label: "", ariaLabel: "" };
}

// Paths that are adoptable-dog lists or search pages, not an individual
// animal. A URL with a query string is kept — ids ride in the query
// (?AnimalID=123) and stripping or rejecting them would lose the dog.
const GENERIC_LIST_PATH =
  /^\/(?:animals?|adopt(?:ions?|able)?|adoptable-(?:dogs|pets|animals)|dogs|pets|available(?:-pets)?|search)?\/?$/i;

// True when a URL claimed to be a dog's own profile is obviously a generic
// page — the rescue's homepage, its adoptable-dogs list, or the same page
// already used as the org fallback. Such a URL must not masquerade as an
// individual profile; demoting it keeps the labels honest.
export function isGenericAnimalUrl(url: string, orgUrl: string | null): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  if (orgUrl) {
    try {
      const org = new URL(orgUrl);
      const trim = (p: string) => p.replace(/\/+$/, "");
      if (
        parsed.hostname === org.hostname &&
        trim(parsed.pathname) === trim(org.pathname) &&
        parsed.search === org.search
      ) {
        return true;
      }
    } catch {
      // Unparseable org URL — judge the profile URL on its own.
    }
  }
  if (parsed.search) return false;
  return GENERIC_LIST_PATH.test(parsed.pathname);
}
