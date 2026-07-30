// Honest rights-risk classification for generated identities.
//
// The free game can play broadly with inspiration; paid merchandise cannot.
// This module labels every result truthfully:
//   playSafe        — generic wordplay, fine to play with and reasonable to
//                     consider for merch after normal owner review
//   manualReview    — leans on a real person's surname or a famous-franchise
//                     sound; a human owner must review before any paid use
//   blockedForMerch — contains a real person's full name, a team/league
//                     name, or an unmodified famous mark; never sell this
//
// Nothing here is a legal guarantee — these are honest risk labels, and a
// human review step always sits between the game and any commercial use.

import { FAMOUS_SOURCES } from "./lexicon";
import type { RightsRisk } from "./types";

export type RightsCall = { risk: RightsRisk; reason: string };

/** Team / league / franchise words that must never reach merchandise. */
const PROTECTED_MARKS = [
  // leagues
  "nfl", "nba", "mlb", "nhl", "mls", "wnba", "fifa", "uefa", "pga", "nascar",
  "formula 1", "formula one", "ufc", "wwe", "olympics", "olympic games",
  // example team names (detection list, never generation material)
  "chiefs", "cowboys", "packers", "lakers", "celtics", "yankees", "dodgers",
  "cardinals", "blues", "real madrid", "barcelona", "manchester united",
  // franchise titles
  "star wars", "batman", "superman", "spider-man", "spiderman", "marvel",
  "avengers", "jurassic park", "harry potter", "godzilla", "terminator",
  "james bond", "mission impossible", "top gun",
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

/** Does the text contain a real person's full name, verbatim? */
export function containsRealFullName(text: string): string | null {
  const t = norm(text);
  for (const f of FAMOUS_SOURCES) {
    if (!f.real) continue;
    if (t.includes(norm(`${f.first} ${f.last}`))) return `${f.first} ${f.last}`;
  }
  return null;
}

/** Does the text contain a real person's surname (any famous source)? */
export function containsRealSurname(text: string): string | null {
  const words = norm(text).split(" ");
  for (const f of FAMOUS_SOURCES) {
    if (!f.real) continue;
    if (words.includes(norm(f.last))) return f.last;
  }
  return null;
}

export function containsProtectedMark(text: string): string | null {
  const t = ` ${norm(text)} `;
  for (const mark of PROTECTED_MARKS) {
    if (t.includes(` ${mark} `)) return mark;
  }
  return null;
}

/**
 * Classify a generated nickname. `nearBrand` marks results built from a
 * transform that intentionally echoes a famous franchise sound.
 */
export function classifyRights(nickname: string, opts?: { nearBrand?: boolean }): RightsCall {
  const fullName = containsRealFullName(nickname);
  if (fullName) {
    return { risk: "blockedForMerch", reason: `Contains a real person's full name (${fullName}). Never for sale.` };
  }
  const mark = containsProtectedMark(nickname);
  if (mark) {
    return { risk: "blockedForMerch", reason: `Contains a protected team, league, or franchise name ("${mark}"). Never for sale.` };
  }
  const surname = containsRealSurname(nickname);
  if (surname) {
    return {
      risk: "manualReview",
      reason: `Keeps a real person's surname (${surname}) — fun to play with, but a human review is required before any paid use.`,
    };
  }
  if (opts?.nearBrand) {
    return {
      risk: "manualReview",
      reason: "Echoes a famous franchise sound — fine in the free game, human review required before any paid use.",
    };
  }
  return { risk: "playSafe", reason: "Generic wordplay on the dog's own name and owner-confirmed facts." };
}
