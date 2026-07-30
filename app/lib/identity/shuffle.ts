// Endless-shuffle session over the generator. Pure state-in/state-out so it
// runs identically in tests, on the server, and in the browser. The UI holds
// one ShuffleSession and calls deal()/save()/remove()/restore()/reset().

import { generateCandidates, nearDupKey } from "./engine";
import type { IdentityInput, InspirationLane, NicknameCandidate } from "./types";

/** Bounded history so an all-day session never grows without limit. */
export const HISTORY_LIMIT = 400;

export type ShuffleSession = {
  seed: string;
  step: number;
  /** candidate ids already dealt (bounded) */
  shownIds: string[];
  /** near-dup keys already dealt (bounded) */
  shownKeys: string[];
  favorites: NicknameCandidate[];
  removed: NicknameCandidate[];
  /** a word every next deal must contain, when locked */
  lockedWord?: string;
  filters: {
    lanes?: InspirationLane[];
  };
};

export function newSession(seed: string | number): ShuffleSession {
  return { seed: String(seed), step: 0, shownIds: [], shownKeys: [], favorites: [], removed: [], filters: {} };
}

/** Explicit reset: history clears, favorites survive on purpose. */
export function resetSession(s: ShuffleSession): ShuffleSession {
  return { ...newSession(s.seed + "-r"), favorites: s.favorites };
}

const bound = (list: string[]) => (list.length > HISTORY_LIMIT ? list.slice(list.length - HISTORY_LIMIT) : list);

export type DealResult = { session: ShuffleSession; candidates: NicknameCandidate[] };

/**
 * Deal the next hand. Deterministic for a given (session, input) pair; each
 * deal advances `step` so "shuffle again" keeps producing fresh results.
 */
export function deal(session: ShuffleSession, baseInput: Omit<IdentityInput, "seed" | "step" | "shownIds" | "shownKeys" | "lockedWord">, count = 6): DealResult {
  const removedIds = new Set(session.removed.map((c) => c.id));

  const input: IdentityInput = {
    ...baseInput,
    lanes: session.filters.lanes,
    seed: session.seed,
    step: session.step,
    shownIds: session.shownIds,
    shownKeys: session.shownKeys,
    lockedWord: session.lockedWord,
  };

  // Over-generate, then drop removed ones so they stay gone until restored.
  const { candidates } = generateCandidates(input, count + removedIds.size + 4);
  const dealt = candidates.filter((c) => !removedIds.has(c.id)).slice(0, count);

  return {
    session: {
      ...session,
      step: session.step + 1,
      shownIds: bound([...session.shownIds, ...dealt.map((c) => c.id)]),
      shownKeys: bound([...session.shownKeys, ...dealt.map((c) => nearDupKey(c.nickname))]),
    },
    candidates: dealt,
  };
}

export function saveFavorite(s: ShuffleSession, c: NicknameCandidate): ShuffleSession {
  if (s.favorites.some((f) => f.id === c.id)) return s;
  return { ...s, favorites: [...s.favorites, c] };
}

export function unsaveFavorite(s: ShuffleSession, id: string): ShuffleSession {
  return { ...s, favorites: s.favorites.filter((f) => f.id !== id) };
}

export function removeSuggestion(s: ShuffleSession, c: NicknameCandidate): ShuffleSession {
  if (s.removed.some((r) => r.id === c.id)) return s;
  return { ...s, removed: [...s.removed, c] };
}

export function restoreSuggestion(s: ShuffleSession, id: string): ShuffleSession {
  return { ...s, removed: s.removed.filter((r) => r.id !== id) };
}

export function setLaneFilter(s: ShuffleSession, lanes?: InspirationLane[]): ShuffleSession {
  return { ...s, filters: { ...s.filters, lanes: lanes && lanes.length ? lanes : undefined } };
}

export function lockWord(s: ShuffleSession, word?: string): ShuffleSession {
  const w = word?.trim().toLowerCase();
  return { ...s, lockedWord: w || undefined };
}

/** "Surprise me": clear every filter and lock, keep history and favorites. */
export function surpriseMe(s: ShuffleSession): ShuffleSession {
  return { ...s, filters: {}, lockedWord: undefined };
}
