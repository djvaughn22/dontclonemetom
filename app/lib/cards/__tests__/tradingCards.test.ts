import { describe, expect, it } from "vitest";
import { CLAIM_TERMS } from "../../dogProfiles";
import {
  allCardStrings,
  buildDeck,
  CARD_THEMES,
  CARD_TRAITS,
  cardAt,
  dayLabel,
  isAllowedNickname,
} from "../tradingCards";

describe("deck building", () => {
  it("is deterministic per dog and always deals seven", () => {
    const a = buildDeck("Biscuit");
    expect(a).toEqual(buildDeck("Biscuit"));
    expect(a.length).toBe(7);
    expect(JSON.stringify(a)).not.toContain("{name}");
  });

  it("requires a real name", () => {
    expect(buildDeck("")).toEqual([]);
    expect(buildDeck("   ")).toEqual([]);
  });

  it("keeps the dog's name recognizable across the deck", () => {
    const deck = buildDeck("Biscuit", ["big"]);
    const names = deck.map((p) => p.nickname);
    expect(names.some((n) => n.includes("Biscuit") || n.includes("Bis"))).toBe(true);
    expect(deck.length).toBe(7);
    expect(new Set(names).size).toBe(7); // no duplicates
  });

  it("never deals the same nickname twice", () => {
    const deck = buildDeck("Rex", ["couch", "barks"]);
    const names = deck.map((p) => p.nickname.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("handles messy listing names like a person would", () => {
    // Program codes, aka forms, and shouting caps never reach a card.
    const deck = buildDeck("NO  Kevin");
    expect(deck.length).toBe(7);
    expect(JSON.stringify(deck)).not.toContain("NO ");
    expect(deck[0].nickname).toBe("Kevin the Minion");
  });

  it("refuses the lazy rotating formulas", () => {
    for (const bad of ["Captain Biscuit", "Mayor Biscuit", "Sir Biscuit", "Professor Biscuit", "King Biscuit", "Agent Biscuit", "Biscuitzilla", "Biscuitasaurus", "Doctor Biscuit"]) {
      expect(isAllowedNickname(bad, "Biscuit"), bad).toBe(false);
    }
    const all = JSON.stringify(buildDeck("Biscuit", CARD_TRAITS.map((t) => t.id))).toLowerCase();
    for (const bad of ["captain", "mayor", "sir ", "professor", "zilla", "asaurus", "agent"]) {
      expect(all).not.toContain(bad);
    }
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
  const sampleNames = ["Biscuit", "Rex", "Luna", "Max", "Scout", "Bailey", "Bella", "Charlie", "Tank"];

  it("every saying is short enough to sit on a card", () => {
    for (const s of allCardStrings(sampleNames)) {
      expect(s.length).toBeLessThanOrEqual(70);
    }
  });

  it("no card ever makes a real-world claim", () => {
    for (const s of allCardStrings(sampleNames)) {
      const low = s.toLowerCase();
      for (const term of CLAIM_TERMS) {
        expect(low).not.toContain(term);
      }
    }
  });

  it("no machinery language on any card", () => {
    for (const s of allCardStrings(sampleNames)) {
      const low = s.toLowerCase();
      for (const bad of ["engine", "generated", "algorithm", "intelligen", " ai "]) {
        expect(low).not.toContain(bad);
      }
    }
  });

  it("every trait card is reachable and has a child-friendly label", () => {
    for (const t of CARD_TRAITS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.id.length).toBeGreaterThan(0);
      const pair = t.make("Test", "Tes");
      expect(pair).toBeDefined();
      expect(pair.nickname.length).toBeGreaterThan(0);
      expect(pair.sayings.length).toBeGreaterThanOrEqual(2);
    }
  });
});
