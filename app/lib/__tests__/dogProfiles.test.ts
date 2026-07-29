import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BANNED_PUBLIC_PHRASES,
  findBannedPublicPhrases,
  findUnverifiedClaims,
  getDogProfile,
  listDogProfiles,
  type DogProfileV1,
} from "../dogProfiles";
import { nameIdeas } from "../nameIdeas";

// next/link needs an app router at render time; the profile page only needs
// the anchor it renders.
vi.mock("next/link", () => ({
  default: (props: { href: string; children?: unknown } & Record<string, unknown>) =>
    createElement("a", { ...props, href: props.href }, props.children as never),
}));

describe("dog profile registry", () => {
  it("resolves isaiah and rejects unknown slugs", () => {
    expect(getDogProfile("isaiah")?.displayTitle).toBe("The Dark Zay");
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

  it("carries the full 18-alias universe", () => {
    const p = getDogProfile("isaiah")!;
    expect(p.aliases).toHaveLength(18);
    for (const name of ["The Dark Zay", "Bruce Zayne", "DarthZayder", "Isaiah Papaya", "Izzy Smalls"]) {
      expect(p.aliases).toContain(name);
    }
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
      funnyCharges: ["Good with kids, probably"],
    };
    expect(findUnverifiedClaims(doctored)).toHaveLength(1);
  });

  it("no banned public phrasing anywhere in any profile", () => {
    expect(BANNED_PUBLIC_PHRASES.length).toBeGreaterThan(0);
    for (const p of listDogProfiles()) {
      expect(findBannedPublicPhrases(p)).toEqual([]);
    }
  });
});

describe("profile rendering", () => {
  it("renders isaiah's page from the record alone", async () => {
    const { default: DogProfileView } = await import("../../components/profile/DogProfileView");
    const html = renderToStaticMarkup(
      createElement(DogProfileView, { profile: getDogProfile("isaiah")! }),
    );
    expect(html).toContain("The Dark Zay");
    expect(html).toContain("Isaiah already has a home.");
    expect(html).toContain("Meet a dog who still needs one.");
    expect(html).toContain("/isaiah.jpg");
    // Empty owner sections stay hidden until real facts exist.
    expect(html).not.toContain("Special abilities");
    expect(html).not.toContain("Weaknesses");
    const low = html.toLowerCase();
    for (const phrase of BANNED_PUBLIC_PHRASES) {
      expect(low).not.toContain(phrase);
    }
  });
});

describe("name ideas", () => {
  it("riffs deterministically on supplied words only", () => {
    const ideas = nameIdeas({ realName: "Biscuit", existingNickname: "Biz", words: ["thunder"] });
    expect(ideas).toContain("Big Biz");
    expect(ideas).toContain("Biz Thunder");
    expect(ideas).toEqual(nameIdeas({ realName: "Biscuit", existingNickname: "Biz", words: ["thunder"] }));
  });

  it("requires a real name and never echoes it as an idea", () => {
    expect(nameIdeas({ realName: "  " })).toEqual([]);
    expect(nameIdeas({ realName: "Rex" })).not.toContain("Rex");
  });
});
