// Hero identity model — the one identity a dog currently goes by, chosen
// by a human from curated identities, saved favorites, and behavior/mood
// identities. Pure logic; profiles supply the data.
//
// Isaiah's canonical hero identity (owner-corrected, Jul 2026):
//   Real name:  Isaiah
//   Hero name:  Bruzer Zayne   ← the ONLY correct spelling
//   Hero id:    bruzer-zayne
//   Subtitle:   The Dark Zay
// "Bruce Zayne", "Bruze Zayne" and "Bruiser Zayne" are mistakes and must
// never appear anywhere. BANNED_HERO_SPELLINGS is test-enforced.

export const ISAIAH_HERO_NAME = "Bruzer Zayne";
export const ISAIAH_HERO_ID = "bruzer-zayne";
export const ISAIAH_SUBTITLE = "The Dark Zay";

export const BANNED_HERO_SPELLINGS = ["bruce zayne", "bruze zayne", "bruiser"];

export type HeroIdentityKind = "curated" | "favorite" | "behavior" | "mood" | "recent";

export type HeroIdentity = {
  id: string;
  name: string;
  subtitle?: string;
  tagline?: string;
  kind: HeroIdentityKind;
};

export type HeroIdentitySource = {
  /** stable default id — unknown selections fall back here */
  defaultHeroId: string;
  identities: HeroIdentity[];
};

/**
 * Resolve a selected identity id. Unknown, stale, or missing ids fall back
 * safely to the default — a rotating alias strip or an old localStorage
 * value can never break the page or silently change the hero.
 */
export function resolveHeroIdentity(source: HeroIdentitySource, selectedId?: string | null): HeroIdentity {
  const found = selectedId ? source.identities.find((i) => i.id === selectedId) : undefined;
  if (found) return found;
  const fallback = source.identities.find((i) => i.id === source.defaultHeroId);
  return fallback ?? source.identities[0];
}

/** Share text follows the chosen identity; the real name stays separate. */
export function shareTextForIdentity(realName: string, identity: HeroIdentity, missionLine: string): string {
  const sub = identity.subtitle ? ` — ${identity.subtitle}` : "";
  return `Meet ${realName}, known today as ${identity.name}${sub}. ${missionLine}`;
}
