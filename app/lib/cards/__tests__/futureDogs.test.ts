import { describe, expect, it } from "vitest";
import {
  buildDeck,
  buildListingDeckReport,
  findDeckProblems,
  type ListingDog,
} from "../tradingCards";
import { NAME_BOOK, DECK_OVERRIDES } from "../nameBook";
import { parseListingName } from "../dogNames";
import { buildWordplayPool } from "../wordplay";

// The future-dog path: rescue listings change every day, and a brand-new
// dog whose name the Name Book has never seen must still get real,
// sound-based nicknames — never the lazy formulas, never warm filler on
// the public listing pages. These names are chosen precisely because they
// are NOT in the book.

const UNKNOWN_NAMES = ["Turnip", "Sprocket", "Wanda", "Fennel", "Quibble", "Fortuna", "Marbella", "Skips"];

const FILLER = / the One and Only$|^Sweet |^Happy |^Bouncy | Superstar$| the Snuggler$| the Snoozer$|^Big |^Lil |^Baby /;
const TITLES = /^(sir|captain|professor|mayor|king|queen|doctor|agent|chief|super|mighty)\s/i;

function listing(name: string, extra: Partial<ListingDog> = {}): ListingDog {
  return { id: "999000111", name, breed: "Mixed", age: "Adult", size: "Medium", sex: "Female", ...extra };
}

describe("a listing dog the book has never met", () => {
  it("is genuinely unknown to the book", () => {
    for (const name of UNKNOWN_NAMES) {
      const p = parseListingName(name);
      expect(NAME_BOOK[p.display.toLowerCase()] ?? NAME_BOOK[p.primary.toLowerCase()], name).toBeUndefined();
    }
  });

  it("gets only sound-based wordplay — no titles, no traits, no filler", () => {
    for (const name of UNKNOWN_NAMES) {
      const { deck } = buildListingDeckReport(listing(name));
      expect(deck.length, name).toBeGreaterThanOrEqual(2);
      for (const card of deck) {
        expect(FILLER.test(card.nickname), `${name}: ${card.nickname}`).toBe(false);
        expect(TITLES.test(card.nickname), `${name}: ${card.nickname}`).toBe(false);
        expect(card.nickname.toLowerCase()).not.toContain("papaya");
        expect(card.nickname.length).toBeLessThanOrEqual(28);
      }
      // no repeated construction inside one deck: at most two cards may
      // share a first word (name-led rhymes legitimately share the name)
      const leads = deck.map((c) => c.nickname.split(/[\s-]/)[0].toLowerCase());
      for (const lead of new Set(leads)) {
        expect(leads.filter((l) => l === lead).length, `${name}: too many "${lead} …" cards`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("is flagged for review instead of quietly published as complete", () => {
    for (const name of UNKNOWN_NAMES) {
      const report = buildListingDeckReport(listing(name));
      expect(report.needsReview, name).toBe(true);
      expect(report.reasons.join(" ")).toContain("not in the Name Book");
    }
  });

  it("finds real rhymes when the name has one", () => {
    // Fortuna → Tuna, Marbella → Mozzarella/Umbrella, Skips → rhyme tier
    const fortuna = buildListingDeckReport(listing("Fortuna")).deck;
    expect(fortuna.some((c) => c.nickname === "Fortuna Tuna")).toBe(true);
    const marbella = buildListingDeckReport(listing("Marbella")).deck;
    expect(marbella.some((c) => /Mozzarella|Umbrella/.test(c.nickname))).toBe(true);
  });

  it("never adds a category card for age, size, or breed on its own", () => {
    // Age alone does not make a card dog-specific — a senior or puppy
    // listing gets no automatic Grandpa/Grandma/Rookie card.
    const { deck } = buildListingDeckReport(listing("Fortuna", { age: "Senior", sex: "Female", size: "X-Large" }));
    for (const card of deck) {
      expect(card.nickname, card.nickname).not.toMatch(/^(Grandpa|Grandma|Vintage|Mount|Pocket-Size) /);
      expect(card.nickname).not.toMatch(/ the (Rookie|Old Soul)$/);
    }
  });

  it("never produces junk short forms", () => {
    // "Turnip" must not become "Tur", "Tur-Tur", or "Tury".
    const pool = buildWordplayPool(parseListingName("Turnip"));
    for (const c of pool) {
      expect(c.nickname.toLowerCase(), c.nickname).not.toMatch(/^tur(-tur|y)?$/);
    }
  });
});

describe("a booked listing dog", () => {
  it("is served entirely from the hand-written book", () => {
    const { deck, needsReview } = buildListingDeckReport(listing("Bella", { id: "555000222" }));
    expect(needsReview).toBe(false);
    expect(deck.length).toBe(7);
    for (const card of deck) expect(card.basis).toBe("book");
  });

  it("an override dog never falls through to the generic entry", () => {
    for (const id of Object.keys(DECK_OVERRIDES)) {
      const { deck, needsReview } = buildListingDeckReport({ id, name: "Whatever" });
      expect(needsReview).toBe(false);
      expect(deck.length).toBe(7);
    }
  });
});

describe("the visitor maker with an unknown name", () => {
  it("never pads — an incomplete deck stays incomplete until details arrive", () => {
    const fortuna = buildDeck("Fortuna");
    expect(fortuna.length).toBeLessThan(7); // the maker asks for true things instead
    expect(fortuna.some((c) => c.basis === "rhyme")).toBe(true);
    const FILLER_ANY = / the One and Only$|^Sweet |^Happy |^Bouncy | Superstar$| the Snuggler$| the Snoozer$/;
    for (const card of fortuna) expect(FILLER_ANY.test(card.nickname), card.nickname).toBe(false);
    expect(findDeckProblems(fortuna, { realName: "Fortuna" }).filter((p) => !p.startsWith("deck has"))).toEqual([]);
  });

  it("finishes at exactly seven once the family shares true things", () => {
    for (const name of ["Fortuna", "Turnip", "Sprocket", "Wanda", "Quibble"]) {
      const deck = buildDeck(name, ["zoomies", "couch", "naps", "treats", "fetch", "walks", "barks"]);
      expect(deck.length, name).toBe(7);
      expect(new Set(deck.map((c) => c.nickname.toLowerCase())).size, name).toBe(7);
    }
  });

  it("keeps picked true things working for any name", () => {
    const deck = buildDeck("Sprocket", ["zoomies", "couch"]);
    expect(deck.some((c) => c.nickname === "Turbo Sprocket")).toBe(true);
    expect(deck.some((c) => c.nickname === "Sprocket the Couch Potato")).toBe(true);
  });
});
