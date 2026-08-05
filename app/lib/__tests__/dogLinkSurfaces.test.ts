import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guard: every surface that renders an adoptable-dog link goes through the
// one shared resolver, external links carry secure attributes, and no
// surface re-introduces a label that claims a dog page it doesn't open.

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const DOG_LINK_SURFACES = [
  "app/page.tsx",
  "app/dogs/[id]/page.tsx",
  "app/today/page.tsx",
  "app/cards/page.tsx",
];

const EXTERNAL_LINK_FILES = [
  ...DOG_LINK_SURFACES,
  "app/components/DogShareActions.tsx",
  "app/components/cards/DogCardStudio.tsx",
  "app/components/profile/DogProfileView.tsx",
];

describe("dog-link surfaces use the shared destination resolver", () => {
  for (const file of DOG_LINK_SURFACES) {
    it(`${file} resolves dog links through resolveDogDestination`, () => {
      expect(read(file)).toContain("resolveDogDestination");
    });
  }

  it("share/card components take the resolved destination, not a bare URL + flag", () => {
    expect(read("app/components/DogShareActions.tsx")).toContain("DogDestination");
    expect(read("app/components/cards/DogCardStudio.tsx")).toContain("DogDestination");
  });
});

describe("a generic destination never gets an active exact-dog treatment", () => {
  it("the results-grid tile only renders an external link for an exact-dog destination", () => {
    const src = read("app/page.tsx");
    // The full-tile overlay anchor exists only in the exact-dog branch;
    // fallback dogs get an in-page details button instead.
    expect(src).toContain('dest.type === "exact-dog"');
    // "See details" is the in-page button label — it must never sit on an
    // anchor, and no surface links a raw dog.url around the resolver.
    expect(src).not.toMatch(/href=\{d\.url\}|href=\{dog\.url\}|href=\{detail\.url\}/);
  });

  for (const file of EXTERNAL_LINK_FILES) {
    it(`${file}: never builds an href from the unresolved dog.url field`, () => {
      expect(read(file)).not.toMatch(/href=\{(?:d|dog|detail)\.url\}/);
    });
  }
});

describe("external dog links are secure and honest", () => {
  for (const file of EXTERNAL_LINK_FILES) {
    it(`${file}: every target="_blank" link carries a no-opener rel`, () => {
      const src = read(file);
      const blanks = (src.match(/target="_blank"/g) ?? []).length;
      const secured = (src.match(/rel="[^"]*no(?:opener|referrer)[^"]*"/g) ?? []).length;
      expect(secured).toBeGreaterThanOrEqual(blanks);
    });

    it(`${file}: never claims "the adoption listing" generically`, () => {
      // The old catch-all label; labels now come from the resolver so a
      // fallback can never read like the dog's own page.
      expect(read(file)).not.toContain("Open the adoption listing");
    });
  }
});
