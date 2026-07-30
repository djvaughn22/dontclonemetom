"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  resolveHeroIdentity,
  shareTextForIdentity,
  type HeroIdentity,
} from "../../lib/identity/heroIdentity";

// Shared state for the one currently-chosen hero identity on a profile page.
// The choice persists per dog in this browser; unknown or stale stored ids
// fall back to the profile's default. The rotating alias strip is display
// only and never touches this state.

type HeroIdentityValue = {
  identity: HeroIdentity;
  identities: HeroIdentity[];
  defaultHeroId: string;
  realName: string;
  /** share caption that follows the chosen identity */
  shareText: string;
  choose: (id: string) => void;
};

const HeroIdentityCtx = createContext<HeroIdentityValue | null>(null);

export function useHeroIdentity(): HeroIdentityValue | null {
  return useContext(HeroIdentityCtx);
}

const storageKey = (slug: string) => `dcmt-hero-${slug}`;

export default function HeroIdentityProvider({
  slug,
  realName,
  defaultHeroId,
  identities,
  baseShareText,
  children,
}: {
  slug: string;
  realName: string;
  defaultHeroId: string;
  identities: HeroIdentity[];
  /** the profile's own share text — used verbatim while the default is chosen */
  baseShareText: string;
  children: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Restore a previous choice after mount (SSR renders the default).
  // Reading storage during render would cause a hydration mismatch, so the
  // one-time post-mount setState is deliberate.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(slug));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setSelectedId(stored);
    } catch {
      // storage blocked — default stands
    }
  }, [slug]);

  const value = useMemo<HeroIdentityValue>(() => {
    const source = { defaultHeroId, identities };
    const identity = resolveHeroIdentity(source, selectedId);
    const missionLine = "Already home; lots of dogs near you still need one.";
    const shareText =
      identity.id === defaultHeroId
        ? baseShareText
        : shareTextForIdentity(realName, identity, missionLine);
    return {
      identity,
      identities,
      defaultHeroId,
      realName,
      shareText,
      choose: (id: string) => {
        setSelectedId(id);
        try {
          window.localStorage.setItem(storageKey(slug), id);
        } catch {
          // storage blocked — in-memory choice still applies
        }
      },
    };
  }, [selectedId, defaultHeroId, identities, baseShareText, realName, slug]);

  return <HeroIdentityCtx.Provider value={value}>{children}</HeroIdentityCtx.Provider>;
}
