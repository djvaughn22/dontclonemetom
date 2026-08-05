// Canonical adoption URL schema — separates individual dog pages from
// rescue websites with explicit verification status.
//
// This is the source of truth for where each dog's adoption action leads.
// NEVER present rescueWebsiteUrl as adoptionProfileUrl.

export type AdoptionUrlStatus =
  | "verified-direct-dog-page" // Page verified to show this specific dog
  | "generic-rescue-page" // Rescue homepage/directory (fallback only)
  | "search-or-directory" // Adoptable-list or search page
  | "dead-or-removed" // 404/410 or verified unavailable
  | "name-mismatch" // Final page shows different dog
  | "unverified"; // Page-shaped but couldn't confirm dog identity

export type AdoptionUrlSource =
  | "rescuegroups-mini-site" // RG's own per-dog URL
  | "getbuddy"
  | "petfinder"
  | "adopt-a-pet"
  | "rescue-owned-site" // Rescue's own website per-dog page
  | "manual-override" // Hand-verified exception
  | "unknown";

export type AdoptionUrl = {
  // The individual dog's adoption/listing page. ONLY populated when
  // verification status is "verified-direct-dog-page".
  adoptionProfileUrl: string | null;

  // The exact URL as originally sourced (before redirect resolution).
  // Preserved even if demoted, for re-verification attempts.
  adoptionProfileUrlOriginal: string | null;

  // The final URL after following all redirects.
  adoptionProfileUrlResolved: string | null;

  // HTTP status of the final resolved URL (200, 404, 410, etc).
  adoptionProfileUrlHttpStatus: number | null;

  // Verification classification: is this really a dog page, a generic page,
  // dead, or unconfirmed?
  adoptionProfileUrlStatus: AdoptionUrlStatus;

  // Where did this URL come from? (platform + data source)
  adoptionProfileUrlSource: AdoptionUrlSource;

  // When was this URL last verified? ISO timestamp.
  adoptionProfileUrlVerifiedAt: string | null;

  // Reason for current status (e.g., "page mentions dog's name",
  // "redirect to homepage", "404", "unverified redirect")
  adoptionProfileUrlDetail: string;

  // The rescue's website. Present even if no individual dog page exists.
  // Used for the secondary "Visit {RescueName}" link only.
  rescueWebsiteUrl: string | null;

  // What kind of rescue link is rescueWebsiteUrl?
  // "adoptable-list" = rescue's list of available pets
  // "website" = rescue's main homepage
  rescueWebsiteUrlKind: "adoptable-list" | "website" | null;
};

// Every dog MUST have an AdoptionUrl filled in, even when adoptionProfileUrl
// is null. Never leave a dog with no adoption action at all.
export function emptyAdoptionUrl(): AdoptionUrl {
  return {
    adoptionProfileUrl: null,
    adoptionProfileUrlOriginal: null,
    adoptionProfileUrlResolved: null,
    adoptionProfileUrlHttpStatus: null,
    adoptionProfileUrlStatus: "unverified",
    adoptionProfileUrlSource: "unknown",
    adoptionProfileUrlVerifiedAt: null,
    adoptionProfileUrlDetail: "not yet verified",
    rescueWebsiteUrl: null,
    rescueWebsiteUrlKind: null,
  };
}

// True when the dog has a verified individual page and adoption CTA should
// be dog-specific ("Meet Paco") not generic ("Visit the rescue").
export function hasVerifiedAdoptionProfile(adoption: AdoptionUrl): boolean {
  return adoption.adoptionProfileUrlStatus === "verified-direct-dog-page" &&
    adoption.adoptionProfileUrl !== null;
}

// True when we should hide the direct adoption CTA (no verified page found).
export function shouldHideDirectAdoptionCta(adoption: AdoptionUrl): boolean {
  return adoption.adoptionProfileUrlStatus !== "verified-direct-dog-page" ||
    adoption.adoptionProfileUrl === null;
}

// True when we should show a secondary "Visit the rescue" link instead of
// the primary dog-specific action.
export function shouldShowRescueWebsiteFallback(adoption: AdoptionUrl): boolean {
  return adoption.rescueWebsiteUrl !== null &&
    (adoption.adoptionProfileUrlStatus !== "verified-direct-dog-page" ||
      adoption.adoptionProfileUrl === null);
}
