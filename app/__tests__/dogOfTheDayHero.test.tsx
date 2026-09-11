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

describe("homepage hierarchy and Dog of the Day", () => {
  const hero = heroSource();

  it("renders the visible 'Dog of the Day' label", () => {
    expect(hero).toContain(">\n        Dog of the Day\n      <");
  });

  it("puts Isaiah, the rescue message, and real-dog discovery before the daily feature", () => {
    const home = homepage.slice(homepage.indexOf("export default function HomePage"));
    const order = [
      'src="/isaiah-icon.jpg"',
      '>ISAIAH</span>',
      'BATDOG • THE DARK ZAY',
      'id="brand-heading"',
      '<span className="text-[#2DD4BF]">.com</span>',
      'Don’t clone me. Adopt me.',
      'id="find"',
      '<FindDogs />',
      'Why these sources?',
    ].map((needle) => {
      const at = home.indexOf(needle);
      expect(at, needle).toBeGreaterThan(-1);
      return at;
    });
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(homepage.match(/<DogOfTheDay \/>/g)).toHaveLength(1);
  });

  it("bounds the preview before the daily feature and puts expansion afterwards", () => {
    const discovery = homepage.slice(homepage.indexOf("function FindDogs()"), homepage.indexOf("export default function HomePage"));
    const preview = discovery.indexOf('aria-label="Adoptable dog preview"');
    const daily = discovery.indexOf("<DogOfTheDay />");
    const additional = discovery.indexOf('aria-label="Additional adoptable dogs"');
    expect(preview).toBeGreaterThan(-1);
    expect(daily).toBeGreaterThan(preview);
    expect(additional).toBeGreaterThan(daily);
    expect(discovery.slice(preview, daily)).toContain("dogs.slice(0, 3).map");
    expect(discovery.slice(preview, daily)).not.toContain("dogs.map");
    expect(discovery.slice(daily)).toContain("dogs.slice(2).map");
    expect(discovery.slice(daily)).toContain("See all dogs ({dogs.length})");
  });

  it("keeps the permanent face crop prominent on mobile and desktop", () => {
    const home = homepage.slice(homepage.indexOf("export default function HomePage"));
    expect(home).toContain('href="/dogs/isaiah"');
    expect(home).toContain('h-48 w-48');
    expect(home).toContain('lg:h-[280px] lg:w-[280px]');
    expect(home).toContain('rounded-full border-[3px] border-[#2DD4BF] object-cover');
    expect(home).toContain('fetchPriority="high"');
    expect(home).toContain('focus-visible:outline');
    expect(home.match(/href="\/dogs\/isaiah"/g)).toHaveLength(1);
    expect(hero).not.toContain('src="/isaiah-icon.jpg"');
  });

  it("retains automatic ZIP results and direct dog sharing", () => {
    expect(homepage).toContain('useState("63040")');
    expect(homepage).toContain('fetch(`/api/adoptable-pets?zip=${clean}&miles=${miles}`)');
    expect(homepage).toContain('<DogTile dog={d}');
    expect(homepage).toContain('Find Dogs Near Me');
    expect(hero).toContain('url={`https://dontclonemetom.com${pagePath}`}');
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
    // The featured portrait is 224px on desktop; the fallback row is 56px.
    expect(hero).toContain("min-h-14");
    expect(hero).toContain("sm:h-56 sm:w-56");
  });
});
