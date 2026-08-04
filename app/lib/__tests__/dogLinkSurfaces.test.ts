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
