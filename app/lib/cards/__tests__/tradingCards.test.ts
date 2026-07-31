import { describe, expect, it } from "vitest";
import { CLAIM_TERMS } from "../../dogProfiles";
import {
  allCardStrings,
  buildDeck,
  CARD_THEMES,
  CARD_TRAITS,
  cardAt,
  dayLabel,
  UNIVERSAL_PAIRS,
} from "../tradingCards";

describe("deck building", () => {
  it("is deterministic per dog and fills in the real name", () => {
    const a = buildDeck("Biscuit");
    expect(a).toEqual(buildDeck("Biscuit"));
    const names = a.map((p) => p.nickname);
    expect(names).toContain("Biscuit Jones");
    expect(JSON.stringify(a)).not.toContain("{name}");
  });

  it("requires a real name", () => {
    expect(buildDeck("")).toEqual([]);
    expect(buildDeck("   ")).toEqual([]);
  });

  it("true things about the dog lead the deck", () => {
    const deck = buildDeck("Biscuit", ["big", "zoomies"]);
    const names = deck.map((p) => p.nickname);
    expect(names[0]).toBe("Big Biscuit");
    expect(names).toContain("The Biscuit Express");
    // and every universal card is still in there
    expect(deck.length).toBe(2 + UNIVERSAL_PAIRS.length);
  });

  it("never deals the same nickname twice", () => {
    // couch + barks traits overlap with universal cards by design
    const deck = buildDeck("Rex", ["couch", "barks"]);
    const names = deck.map((p) => p.nickname.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("spinning", () => {
  const date = new Date(2026, 6, 30); // a Thursday

  it("labels the day", () => {
    expect(dayLabel(date)).toBe("Thursday's Dog Card");
  });

  it("walks every nickname before repeating, then rotates the sayings", () => {
    const deck = buildDeck("Biscuit");
    const firstPass = Array.from({ length: deck.length }, (_, i) => cardAt(deck, i, date)!);
    expect(new Set(firstPass.map((f) => f.nickname)).size).toBe(deck.length);

    const again = cardAt(deck, deck.length, date)!;
    expect(again.nickname).toBe(firstPass[0].nickname);
    expect(again.saying).not.toBe(firstPass[0].saying); // fresh saying on the second lap
    expect(again.cardNumber).toBe(deck.length + 1);
  });

  it("numbers cards from 1 and cycles the themes", () => {
    const deck = buildDeck("Rex");
    const first = cardAt(deck, 0, date)!;
    expect(first.cardNumber).toBe(1);
    expect(first.themeIndex).toBe(0);
    expect(cardAt(deck, CARD_THEMES.length, date)!.themeIndex).toBe(0);
    expect(cardAt([], 0, date)).toBeNull();
  });
});

describe("card quality and safety", () => {
  it("every saying is short enough to sit on a card", () => {
    for (const s of allCardStrings()) {
      expect(s.length).toBeLessThanOrEqual(70);
    }
  });

  it("no pool card ever makes a real-world claim", () => {
    for (const s of allCardStrings()) {
      const low = s.toLowerCase();
      for (const term of CLAIM_TERMS) {
        expect(low).not.toContain(term);
      }
    }
  });

  it("no machinery language on any card", () => {
    for (const s of allCardStrings()) {
      const low = s.toLowerCase();
      for (const bad of ["engine", "generated", "algorithm", "intelligen", " ai "]) {
        expect(low).not.toContain(bad);
      }
    }
  });

  it("every trait card is reachable and named for a kid", () => {
    for (const t of CARD_TRAITS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.pairs.length).toBeGreaterThan(0);
      for (const p of t.pairs) expect(p.sayings.length).toBeGreaterThanOrEqual(2);
    }
  });
});
