import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DogTile } from "../page";
import { emptyAdoptionUrl } from "../lib/adoptionUrlSchema";
import type { Dog } from "../lib/rescueDogs";

vi.mock("next/link", () => ({
  default: (props: { href: string; children?: unknown } & Record<string, unknown>) =>
    createElement("a", { ...props, href: props.href }, props.children as never),
}));

function dog(overrides: Partial<Dog>): Dog {
  return {
    id: "1",
    name: "Billy",
    breed: "Mixed",
    age: "Adult",
    sex: "Male",
    size: "Medium",
    photo: "https://cdn.rescuegroups.org/billy.jpg",
    photos: ["https://cdn.rescuegroups.org/billy.jpg"],
    city: "Wildwood, MO",
    distance: 3,
    rescueId: null,
    feedSeenAt: null,
    identityConflict: null,
    adoption: emptyAdoptionUrl(),
    profileUrl: null,
    sourceProfileUrl: null,
    orgUrl: "https://rescue.example.org/",
    orgUrlKind: "website",
    url: "https://rescue.example.org/billy",
    org: "Wildwood Rescue",
    orgCity: "Wildwood, MO",
    email: null,
    desc: "",
    facts: [],
    ...overrides,
  };
}

const directDog = dog({
  id: "verified",
  adoption: {
    ...emptyAdoptionUrl(),
    adoptionProfileUrl: "https://rescue.example.org/billy",
    adoptionProfileUrlStatus: "verified-direct-dog-page",
    adoptionProfileUrlSource: "rescue-owned-site",
  },
});

const indirectDog = dog({ id: "unverified" });

describe("DogTile — homepage dog picture/card", () => {
  it("never shows 'Make a Dog Card' on a direct (verified-link) tile", () => {
    const html = renderToStaticMarkup(createElement(DogTile, { dog: directDog, onOpen: () => {} }));
    expect(html).not.toContain("Make a Dog Card");
    // The photo/whole-tile link still opens the dog's real page.
    expect(html).toContain("https://rescue.example.org/billy");
    expect(html).toContain("Details");
  });

  it("never shows 'Make a Dog Card' on an indirect (fallback) tile, and adds no replacement CTA", () => {
    const html = renderToStaticMarkup(createElement(DogTile, { dog: indirectDog, onOpen: () => {} }));
    expect(html).not.toContain("Make a Dog Card");
    // No CTA row is added in its place for a fallback tile.
    expect(html).not.toContain("Details");
  });

  it("keeps the tile itself clickable to open details/the dog's page", () => {
    const directHtml = renderToStaticMarkup(createElement(DogTile, { dog: directDog, onOpen: () => {} }));
    expect(directHtml).toContain("Meet Billy");

    const indirectHtml = renderToStaticMarkup(createElement(DogTile, { dog: indirectDog, onOpen: () => {} }));
    expect(indirectHtml).toContain("See details");
  });
});
