// Canonical adoption URL schema — separates individual dog pages from
// rescue websites with explicit verification status.
//
// This is the source of truth for where each dog's adoption action leads.
// NEVER present rescueWebsiteUrl as adoptionProfileUrl.
//
// FRESHNESS IS TWO DIFFERENT FACTS (2026-09-06 integrity fix)
// ---------------------------------------------------------------------------
// The MOO failure came from one word doing two jobs. A dog's page said
// "Last verified <a timestamp>" while the destination said "PET NOT FOUND",
// because the timestamp meant "we rendered this page just now" — nobody had
// ever asked the shelter anything. These are separate facts and the schema
// now keeps them separate:
//
//   Dog.feedSeenAt          — when the UPSTREAM FEED last showed this dog.
//                             A feed refresh updates this and nothing else.
//   destinationVerifiedAt   — when the DESTINATION (or the shelter's own
//                             official record) actually confirmed this dog is
//                             still adoptable. Only a real confirmation may
//                             ever write here.
//
// A feed refresh must never write destinationVerifiedAt. The UI must never
// say "verified" from feedSeenAt. Both rules are test-locked.

export type AdoptionUrlStatus =
  | "verified-direct-dog-page" // Page verified to show this specific dog
  | "generic-rescue-page" // Rescue homepage/directory (fallback only)
  | "search-or-directory" // Adoptable-list or search page
  | "dead-or-removed" // 404/410, or the destination/official record says gone
  | "name-mismatch" // Final page shows different dog
  | "identity-conflict" // The record contradicts itself about which dog it is
  | "unverified"; // Page-shaped but couldn't confirm dog identity

export type AdoptionUrlSource =
  | "rescuegroups-mini-site" // RG's own per-dog URL
  | "getbuddy"
  | "petfinder"
  | "adopt-a-pet"
  | "rescue-owned-site" // Rescue's own website per-dog page
  | "shelter-id-deep-link" // Built from the shelter's own pet id, not a published URL
  | "manual-override" // Hand-verified exception
  | "unknown";

// How — if at all — the DESTINATION was actually confirmed. "none" is the
// honest default and the only correct value for a dog nobody has checked.
export type DestinationVerificationMethod =
  | "official-feed" // the shelter's own availability feed carries this pet
  | "page-content" // we fetched the page and it confirmed this dog
  | "manual-audit" // a person checked it and recorded the result
  | "none";

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
  // NOTE: 200 is not evidence of anything on its own — MOO's dead listing
  // answered 200. Only destinationVerifiedAt means confirmed.
  adoptionProfileUrlHttpStatus: number | null;

  // Verification classification: is this really a dog page, a generic page,
  // dead, or unconfirmed?
  adoptionProfileUrlStatus: AdoptionUrlStatus;

  // Where did this URL come from? (platform + data source)
  adoptionProfileUrlSource: AdoptionUrlSource;

  // When the DESTINATION was genuinely confirmed — never a feed refresh,
  // never a render clock. null means "nobody has checked this destination".
  destinationVerifiedAt: string | null;

  // What kind of confirmation destinationVerifiedAt represents.
  destinationVerificationMethod: DestinationVerificationMethod;

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
    destinationVerifiedAt: null,
    destinationVerificationMethod: "none",
    adoptionProfileUrlDetail: "not yet verified",
    rescueWebsiteUrl: null,
    rescueWebsiteUrlKind: null,
  };
}

// True when the dog has a link that is SHAPED like its own page. This is a
// necessary condition for showing a dog-specific CTA — it is NOT proof the
// destination is alive. Use hasConfirmedDestination for that.
export function hasVerifiedAdoptionProfile(adoption: AdoptionUrl): boolean {
  return adoption.adoptionProfileUrlStatus === "verified-direct-dog-page" &&
    adoption.adoptionProfileUrl !== null;
}

// True when something actually confirmed the destination — the shelter's own
// feed, or the page's own content. The gate for premium placement.
export function hasConfirmedDestination(adoption: AdoptionUrl): boolean {
  return (
    hasVerifiedAdoptionProfile(adoption) &&
    adoption.destinationVerifiedAt !== null &&
    adoption.destinationVerificationMethod !== "none"
  );
}

// True when the destination is KNOWN to be gone — not merely unconfirmed.
export function isConfirmedUnavailable(adoption: AdoptionUrl): boolean {
  return adoption.adoptionProfileUrlStatus === "dead-or-removed";
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

// ---------------------------------------------------------------------------
// The honest freshness line. One function so no surface can invent its own
// wording, and so "Last verified" is impossible to print without a real
// destination confirmation behind it.

export type FreshnessLine = {
  // "Last verified" | "Last seen in source feed" | "Not verified"
  label: string;
  timestamp: string | null;
  // The full sentence a surface should render.
  text: string;
};

export function freshnessLine(
  adoption: AdoptionUrl,
  feedSeenAt: string | null,
  format: (iso: string) => string,
): FreshnessLine {
  // A confirmed-gone listing was genuinely checked, but calling that
  // "verified" would read as "still available". Say what actually happened.
  if (isConfirmedUnavailable(adoption) && adoption.destinationVerifiedAt) {
    const stamp = format(adoption.destinationVerifiedAt);
    return {
      label: "No longer listed",
      timestamp: adoption.destinationVerifiedAt,
      text: `Checked with the shelter ${stamp} — no longer listed for adoption`,
    };
  }
  if (
    hasVerifiedAdoptionProfile(adoption) &&
    adoption.destinationVerifiedAt &&
    adoption.destinationVerificationMethod !== "none"
  ) {
    const stamp = format(adoption.destinationVerifiedAt);
    return {
      label: "Last verified",
      timestamp: adoption.destinationVerifiedAt,
      text: `Last verified with the shelter ${stamp}`,
    };
  }
  if (feedSeenAt) {
    const stamp = format(feedSeenAt);
    return {
      label: "Last seen in source feed",
      timestamp: feedSeenAt,
      text: `Last seen in the source feed ${stamp} — availability not confirmed with the shelter`,
    };
  }
  return {
    label: "Not verified",
    timestamp: null,
    text: "Availability has not been confirmed with the shelter",
  };
}
