// Dog of the Day hero guard (2026-09-09).
//
// Regression this locks: the homepage hero's featured-dog widget used to
// `return null` whenever the feed was slow or errored, so the "Dog of the
// Day" identity vanished from the hero and the Isaiah/Batdog mascot chip was
// left standing as the site's hero. The hero must always say "Dog of the
// Day", must take its dog from the live selection engine (never a hard-coded
// dog), and its CTA must be a real link to that exact dog's detail page so
// the first click lands — no interstitial, no client-only navigation that
// 404s before hydration.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "..");
const homepage = readFileSync(join(app, "page.tsx"), "utf8");
const dotdRoute = readFileSync(join(app, "api/dog-of-the-day/route.ts"), "utf8");

// The DogOfTheDay component body, so assertions can't be satisfied by some
// unrelated part of the (large) homepage file.
function heroSource() {
  const start = homepage.indexOf("function DogOfTheDay()");
  expect(start, "DogOfTheDay component must exist on the homepage").toBeGreaterThan(-1);
  const end = homepage.indexOf("\nfunction ", start + 1);
  return homepage.slice(start, end === -1 ? undefined : end);
}

describe("homepage hero: Dog of the Day", () => {
  const hero = heroSource();

  it("renders the visible 'Dog of the Day' label", () => {
    expect(hero).toContain(">\n        Dog of the Day\n      <");
  });

  it("mounts inside the hero section, above the mascot chip", () => {
    const heroSection = homepage.slice(
      homepage.indexOf("{/* Hero"),
      homepage.indexOf('{/* Live adoptable dogs by ZIP */}')
    );
    expect(heroSection).toContain("<DogOfTheDay />");
    // Isaiah stays in the hero, but below the featured dog — he must never
    // read as the Dog of the Day.
    expect(heroSection.indexOf("<DogOfTheDay />")).toBeLessThan(
      heroSection.indexOf('href="/dogs/isaiah"')
    );
    expect(heroSection).toContain('href="/dogs/isaiah"');
  });

  it("never disappears: the label survives loading and unavailable states", () => {
    // The old bug, verbatim. If this ever comes back the hero can go blank.
    expect(hero).not.toMatch(/if\s*\(!featured\s*\|\|\s*!pagePath\)\s*return null/);
    expect(hero).not.toMatch(/return null;/);
    for (const state of ['"loading"', '"ready"', '"unavailable"']) {
      expect(hero).toContain(state);
    }
    // The unavailable state still offers a real way through to today's dog.
    expect(hero).toContain('href="/today"');
  });

  it("takes its dog from the live selection engine, never a hard-coded dog", () => {
    expect(hero).toContain("fetch(`/api/dog-of-the-day");
    // No dog is named in the rendered hero — not Isaiah, not anyone.
    // (Comments explaining the regression may name him; code may not.)
    const heroCode = hero
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(heroCode.toLowerCase()).not.toContain("isaiah");
    expect(heroCode).not.toMatch(/name:\s*"[A-Z]/);
    // The route is the same engine /today uses, and is never cached.
    expect(dotdRoute).toContain('from "../../lib/dogOfTheDay"');
    expect(dotdRoute).toContain('export const dynamic = "force-dynamic"');
  });

  it("links the CTA straight to that dog's own detail page", () => {
    // pagePath comes from the selection engine's post, so the href is the
    // exact dog's page — the first click resolves it, no redirect hop.
    expect(hero).toContain("href={pagePath}");
    expect(hero).toContain("setPagePath(j.pagePath)");
    expect(hero).toContain("View {featured.name} →");
    expect(dotdRoute).toContain("pagePath: post.pagePath");
  });

  it("shows the dog's image, name and a feed-fact teaser", () => {
    expect(hero).toContain("src={featured.photo}");
    expect(hero).toContain("{featured.name}");
    expect(hero).toContain("{teaser}");
    // Teaser is built only from breed/age — feed facts the dog tiles already
    // show. Never temperament, medical, or compatibility.
    expect(hero).toContain("featured.breed");
    expect(hero).toContain("featured.age");
    expect(dotdRoute).toContain("breed: dog.breed");
    expect(dotdRoute).toContain("age: dog.age");
  });

  it("keeps the image accessible and falls back when there is no photo", () => {
    expect(hero).toMatch(/alt=\{`\$\{featured\.name\}, an adoptable dog/);
    expect(hero).toContain('role="img"');
    expect(hero).toMatch(/aria-label=\{`No photo available for \$\{featured\.name\}`\}/);
    expect(hero).toMatch(/aria-label=\{`Dog of the Day: meet \$\{featured\.name\}/);
  });

  it("keeps keyboard focus visible and touch targets big enough", () => {
    expect(hero).toContain("focus-visible:outline");
    // Photo card is 112px tall on mobile; the fallback row is min-h-14 (56px).
    expect(hero).toContain("min-h-14");
    expect(hero).toContain("h-28 w-28");
  });
});
