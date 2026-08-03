import { describe, expect, it } from "vitest";
import {
  buildListingDeck,
  DECK_SIZE,
  findDeckProblems,
  isAllowedNickname,
  type ListingDog,
} from "../tradingCards";
import { NAME_BOOK, DECK_OVERRIDES } from "../nameBook";
import { parseListingName } from "../dogNames";
import { getDogProfile } from "../../dogProfiles";
import listings from "./fixtures/liveListings-2026-08-02.json";

// The full set of adoptable listings near the default ZIP on the day the
// nickname overhaul shipped. Every one of these dogs was reviewed by hand:
// this suite locks in that every published dog gets seven strong,
// dog-specific names — and that no two dogs ever share one.

const dogs = listings as ListingDog[];

describe("every published dog's deck", () => {
  it("fixture matches the live shape", () => {
    expect(dogs.length).toBeGreaterThan(200);
    for (const d of dogs) {
      expect(d.id).toMatch(/^\d+$/);
      expect(d.name.length).toBeGreaterThan(0);
    }
  });

  it("deals exactly seven problem-free cards to every dog", () => {
    for (const d of dogs) {
      const deck = buildListingDeck(d);
      expect(deck.length, `${d.name} (${d.id})`).toBe(DECK_SIZE);
      expect(findDeckProblems(deck, { realName: d.name }), `${d.name} (${d.id})`).toEqual([]);
    }
  });

  it("never repeats a nickname across two different dogs", () => {
    const owner = new Map<string, string>();
    for (const d of dogs) {
      for (const card of buildListingDeck(d)) {
        const key = card.nickname.toLowerCase();
        const prev = owner.get(key);
        expect(prev, `"${card.nickname}" dealt to both ${prev} and ${d.name} (${d.id})`).toBeUndefined();
        owner.set(key, `${d.name} (${d.id})`);
      }
    }
  });

  it("builds every published deck entirely from hand-written cards", () => {
    // Every card on a published dog is either from the Name Book or the
    // senior Grandpa/Grandma card. No engine output, no filler, no
    // Big/Lil/Baby padding — ever.
    for (const d of dogs) {
      for (const card of buildListingDeck(d)) {
        const grand = /^Grand(pa|ma) /.test(card.nickname);
        expect(card.basis === "book" || grand, `${d.name} (${d.id}): ${card.nickname} [${card.basis}]`).toBe(true);
      }
    }
  });

  it("opens every deck with a hand-written hero card", () => {
    for (const d of dogs) {
      const deck = buildListingDeck(d);
      expect(deck[0].basis, `${d.name} (${d.id}) opens with ${deck[0].nickname}`).toBe("book");
    }
  });

  it("never shares a nickname with Isaiah's locked deck", () => {
    const isaiah = getDogProfile("isaiah")!;
    const locked = new Set(isaiah.cards.map((c) => c.nickname.toLowerCase()));
    for (const d of dogs) {
      for (const card of buildListingDeck(d)) {
        expect(locked.has(card.nickname.toLowerCase()), `${d.name}: ${card.nickname}`).toBe(false);
      }
    }
    // Papaya belongs to Isaiah alone — no other deck may rhyme onto it.
    for (const d of dogs) {
      for (const card of buildListingDeck(d)) {
        expect(card.nickname.toLowerCase()).not.toContain("papaya");
      }
    }
  });
});

describe("the banned formulas", () => {
  const probeNames = dogs.map((d) => parseListingName(d.name).display).concat(["Biscuit", "Rover", "Fido"]);

  it("rank-and-title templates never survive the gate", () => {
    for (const name of probeNames) {
      for (const title of ["Captain", "Mayor", "Sir", "Professor", "King", "Queen", "Doctor", "Agent", "Chief", "Super", "Mighty"]) {
        // A dog literally named King is allowed "King ..." — that's its name.
        if (name.toLowerCase().startsWith(title.toLowerCase())) continue;
        expect(isAllowedNickname(`${title} ${name}`, name), `${title} ${name}`).toBe(false);
      }
      expect(isAllowedNickname(`${name}zilla`, name)).toBe(false);
      expect(isAllowedNickname(`${name}asaurus`, name)).toBe(false);
    }
  });

  it("a dog actually named after a title keeps its own name", () => {
    expect(isAllowedNickname("King Size", "DK- King")).toBe(true);
    expect(isAllowedNickname("Princess Peach", "PRINCESS")).toBe(true);
    expect(isAllowedNickname("King Nonsense", "Bella")).toBe(false);
  });

  it("no banned generic ever appears in any published deck", () => {
    const banned = ["sir ", "captain ", "professor ", "mayor ", "agent ", "chief ", "zilla", "asaurus", "doctor ", "queen ", "king "];
    for (const d of dogs) {
      const p = parseListingName(d.name);
      for (const card of buildListingDeck(d)) {
        const low = card.nickname.toLowerCase();
        for (const b of banned) {
          if (low.startsWith(b) && !p.display.toLowerCase().startsWith(b.trim())) {
            throw new Error(`${d.name} (${d.id}) got "${card.nickname}"`);
          }
        }
      }
    }
  });
});

describe("the name book itself", () => {
  it("covers every name on today's listings", () => {
    for (const d of dogs) {
      if (DECK_OVERRIDES[d.id]) continue;
      const p = parseListingName(d.name);
      const entry = NAME_BOOK[p.display.toLowerCase()] ?? NAME_BOOK[p.primary.toLowerCase()];
      expect(entry, `no book entry for ${d.name} → ${p.display}`).toBeDefined();
    }
  });

  it("every override deck is a complete seven", () => {
    for (const [id, deck] of Object.entries(DECK_OVERRIDES)) {
      expect(deck.length, `override ${id}`).toBe(DECK_SIZE);
    }
  });

  it("duplicate-named dogs get fully separate decks", () => {
    const byName = new Map<string, ListingDog[]>();
    for (const d of dogs) {
      const key = parseListingName(d.name).display.toLowerCase();
      byName.set(key, [...(byName.get(key) ?? []), d]);
    }
    for (const [name, group] of byName) {
      if (group.length < 2) continue;
      const decks = group.map((d) => new Set(buildListingDeck(d).map((c) => c.nickname.toLowerCase())));
      for (let i = 0; i < decks.length; i++) {
        for (let j = i + 1; j < decks.length; j++) {
          for (const n of decks[i]) {
            expect(decks[j].has(n), `${name}: shared "${n}"`).toBe(false);
          }
        }
      }
    }
  });
});
