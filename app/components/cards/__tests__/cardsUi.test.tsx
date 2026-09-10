import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDeck, cardAt } from "../../../lib/cards/tradingCards";
import CardSpinner from "../CardSpinner";
import CardMaker from "../CardMaker";
import TradingCard from "../TradingCard";

vi.mock("next/link", () => ({
  default: (props: { href: string; children?: unknown } & Record<string, unknown>) =>
    createElement("a", { ...props, href: props.href }, props.children as never),
}));

describe("CardSpinner", () => {
  const deck = buildDeck("Biscuit");

  it("shows exactly one nickname plus the two buttons", () => {
    const html = renderToStaticMarkup(
      createElement(CardSpinner, {
        realName: "Biscuit",
        photoAlt: "Biscuit",
        deck,
        shareUrl: "https://dontclonemetom.com/cards",
        fileName: "biscuit",
        analyticsId: "test",
      }),
    );
    // Match whole rendered text nodes — a short nickname like "Bis" is a
    // substring of "Biscuit" and must not count as shown.
    const shown = deck.filter((p) => html.includes(`>${p.nickname}<`));
    expect(shown).toHaveLength(1);
    expect(shown[0].nickname).toBe(cardAt(deck, 0, new Date())!.nickname);
    expect(html).toContain("Spin a New Card");
    expect(html).toContain("Share This Card");
    expect(html).toContain("Dog Card"); // the day label
    expect(html).toContain("No. 1");
    expect(html).toContain("DontCloneMeTom.com");
  });

  it("keeps the rescue's attribution quietly on the card", () => {
    const html = renderToStaticMarkup(
      createElement(CardSpinner, {
        realName: "Scout",
        photoAlt: "Scout",
        deck: buildDeck("Scout"),
        shareUrl: "https://dontclonemetom.com/dogs/123",
        fileName: "scout",
        attribution: { org: "Open Door Animal Sanctuary", location: "St. Louis, MO" },
        analyticsId: "test",
      }),
    );
    expect(html).toContain("Open Door Animal Sanctuary");
    expect(html).toContain("St. Louis, MO");
  });
});

describe("TradingCard", () => {
  it("renders a placeholder when there is no photo yet", () => {
    const html = renderToStaticMarkup(
      createElement(TradingCard, {
        realName: "Rex",
        photoAlt: "No photo yet",
        face: { nickname: "Professor Paws", saying: "Professional blanket inspector.", cardNumber: 3, dayLabel: "Monday's Dog Card", themeIndex: 2 },
      }),
    );
    expect(html).toContain("🐶");
    expect(html).toContain("Professor Paws");
    expect(html).toContain("No. 3");
  });
});

describe("CardMaker", () => {
  it("asks for the simple things and never lists the nicknames before name entry", () => {
    const html = renderToStaticMarkup(createElement(CardMaker));
    expect(html).toContain("Make a Dog Card");
    expect(html).toContain("Add a dog photo");
    expect(html).toContain("real name");
    expect(html).toContain("Pick a few");
    // No card until a name is typed, and no nickname pool ever renders.
    for (const p of buildDeck("Rex")) {
      expect(html).not.toContain(p.nickname);
    }
    // The mission links stay.
    expect(html).toContain("/dogs/isaiah");
    expect(html).toContain("/#find");
  });
});
