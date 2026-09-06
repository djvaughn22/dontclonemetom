import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DogPhoto } from "../dogs/[id]/page";

// Regression coverage for the production bug: the dog detail page (RYLAND
// and any other live listing) showed name/breed/age/description but no
// photo, because the only <img> on the page lived inside the trading-card
// deck (CardSpinner), which is hidden until a dog's seven names pass
// review. DogPhoto is now rendered unconditionally, independent of that
// review gate.

describe("DogPhoto — the dog detail page always shows a picture", () => {
  it("renders the dog's real photo when one exists", () => {
    const html = renderToStaticMarkup(
      createElement(DogPhoto, { photo: "https://cdn.rescuegroups.org/ryland.jpg", name: "Ryland" }),
    );
    expect(html).toContain("https://cdn.rescuegroups.org/ryland.jpg");
    expect(html).toContain("Ryland, an adoptable dog");
    expect(html).not.toContain("🐶");
  });

  it("renders the site's existing fallback (no broken image) when a dog has no photo", () => {
    const html = renderToStaticMarkup(createElement(DogPhoto, { photo: null, name: "Nameless" }));
    expect(html).not.toContain("<img");
    expect(html).toContain("🐶");
  });
});

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("DogPhoto wiring on the live-listing detail page", () => {
  const src = read("app/dogs/[id]/page.tsx");

  it("passes the dog object's own photo field straight through — no second image lookup", () => {
    expect(src).toMatch(/<DogPhoto\s+photo=\{dog\.photo\}\s+name=\{dog\.name\}\s*\/>/);
  });

  it("places the photo after the header/freshness line and before the breed/age/sex pills and description", () => {
    const headerIdx = src.indexOf("{freshness.text}");
    const photoIdx = src.indexOf("<DogPhoto");
    const pillsIdx = src.indexOf("{details.length ? (");
    const descIdx = src.indexOf("{dog.desc ? (");
    expect(headerIdx).toBeGreaterThan(-1);
    expect(photoIdx).toBeGreaterThan(headerIdx);
    expect(photoIdx).toBeLessThan(pillsIdx);
    expect(photoIdx).toBeLessThan(descIdx);
  });

  it("does not gate the photo behind the trading-card review status (needsReview / deck.length)", () => {
    const photoLine = src.slice(src.indexOf("<DogPhoto") - 5, src.indexOf("<DogPhoto") + 60);
    expect(photoLine).not.toContain("needsReview");
    expect(photoLine).not.toContain("deck.length");
  });

  it("leaves the trading-card feature (CardSpinner) and its review gate untouched", () => {
    expect(src).toContain("!needsReview && deck.length === 7 && (");
    expect(src).toContain("<CardSpinner");
  });
});
