import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BANNED_PUBLIC_PHRASES,
  findBannedHeroSpellings,
  findBannedPublicPhrases,
  findUnverifiedClaims,
  getDogProfile,
  listDogProfiles,
  type DogProfileV1,
} from "../dogProfiles";

// next/link needs an app router at render time; the profile page only needs
// the anchor it renders.
vi.mock("next/link", () => ({
  default: (props: { href: string; children?: unknown } & Record<string, unknown>) =>
    createElement("a", { ...props, href: props.href }, props.children as never),
}));

describe("dog profile registry", () => {
  it("resolves isaiah and rejects unknown slugs", () => {
    expect(getDogProfile("isaiah")?.featuredNickname).toBe("Batdog");
    expect(getDogProfile("ISAIAH")?.slug).toBe("isaiah");
    expect(getDogProfile("nope")).toBeNull();
  });

  it("never shadows live numeric rescue listings", () => {
    expect(getDogProfile("12345")).toBeNull();
    for (const p of listDogProfiles()) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.slug).not.toMatch(/^\d+$/);
    }
  });

  it("isaiah is a family dog who is not adoptable", () => {
    const p = getDogProfile("isaiah")!;
    expect(p.profileType).toBe("family");
    expect(p.adoptionStatus).toBe("home");
    expect(p.adoptionUrl).toBeUndefined();
  });

  it("isaiah's featured card is Batdog with the flagship saying", () => {
    const p = getDogProfile("isaiah")!;
    expect(p.realName).toBe("Isaiah"); // real name stays separate
    expect(p.cards[0].nickname).toBe("Batdog");
    expect(p.cards[0].sayings[0]).toBe("Saving the neighborhood after nap time.");
  });

  it("every deck stays small, worth seeing, and leads with the featured name", () => {
    for (const p of listDogProfiles()) {
      expect(p.cards.length).toBeGreaterThanOrEqual(6);
      expect(p.cards.length).toBeLessThanOrEqual(12);
      expect(p.cards[0].nickname).toBe(p.featuredNickname);
      const names = p.cards.map((c) => c.nickname.toLowerCase());
      expect(new Set(names).size).toBe(names.length); // no duplicates
      for (const c of p.cards) expect(c.sayings.length).toBeGreaterThan(0);
    }
  });

  it("the locked deck names are exactly as specified", () => {
    const names = getDogProfile("isaiah")!.cards.map((c) => c.nickname);
    expect(names).toEqual([
      "Batdog",
      "The Dark Zay",
      "Bruce Zayne",
      "Darth Zayder",
      "Isaiah Papaya",
      "Izzy Osbourne",
      "Zayaplaya",
    ]);
  });

  it("the misspellings never appear anywhere in any profile", () => {
    for (const p of listDogProfiles()) {
      expect(findBannedHeroSpellings(p)).toEqual([]);
    }
  });

  it("the spelling detector catches bruze (with z) misspelling", () => {
    const doctored: DogProfileV1 = {
      ...getDogProfile("isaiah")!,
      cards: [{ nickname: "Bruze Zayne", sayings: ["nope"] }],
    };
    expect(findBannedHeroSpellings(doctored)).toEqual(["bruze zayne"]);
  });
});

describe("truth and language boundaries", () => {
  it("every verified fact names its source", () => {
    for (const p of listDogProfiles()) {
      expect(p.verifiedFacts.length).toBeGreaterThan(0);
      for (const f of p.verifiedFacts) {
        expect(["owner", "rescue"]).toContain(f.source);
      }
    }
  });

  it("no profile smuggles real-world claims into the humor", () => {
    for (const p of listDogProfiles()) {
      expect(findUnverifiedClaims(p)).toEqual([]);
    }
  });

  it("the claim detector actually catches violations", () => {
    const doctored: DogProfileV1 = {
      ...getDogProfile("isaiah")!,
      cards: [{ nickname: "Batdog", sayings: ["Good with kids, probably"] }],
    };
    expect(findUnverifiedClaims(doctored)).toHaveLength(1);
  });

  it("no banned public phrasing anywhere in any profile", () => {
    expect(BANNED_PUBLIC_PHRASES).toContain("engine");
    expect(BANNED_PUBLIC_PHRASES).toContain("algorithm");
    for (const p of listDogProfiles()) {
      expect(findBannedPublicPhrases(p)).toEqual([]);
    }
  });
});

describe("profile rendering", () => {
  it("renders isaiah's page as one trading card, never the whole list", async () => {
    const { default: DogProfileView } = await import("../../components/profile/DogProfileView");
    const p = getDogProfile("isaiah")!;
    const html = renderToStaticMarkup(createElement(DogProfileView, { profile: p }));

    // The card: real name, featured nickname, its saying, the day, share.
    expect(html).toContain("Isaiah");
    expect(html).toContain("Batdog");
    expect(html).toContain("Saving the neighborhood after nap time.");
    expect(html).toContain("Dog Card"); // day label
    expect(html).toContain("Spin a New Card");
    expect(html).toContain("Share This Card");
    expect(html).toContain("/isaiah.jpg");

    // One card at a time — no other nickname from the deck may render.
    for (const c of p.cards.slice(1)) {
      expect(html).not.toContain(c.nickname);
    }

    // The rest of the page.
    expect(html).toContain("/cards"); // make-one-for-your-dog CTA
    expect(html).toContain("Isaiah already has a home.");
    expect(html).toContain("Meet a dog who still needs one.");

    const low = html.toLowerCase();
    expect(low).not.toContain("bruce zayne");
    expect(low).not.toContain("bruze zayne");
    expect(low).not.toContain("bruiser");
    for (const phrase of BANNED_PUBLIC_PHRASES) {
      expect(low).not.toContain(phrase);
    }
  });
});
