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

const home = homepage.slice(homepage.indexOf("export default function HomePage"));
const discovery = homepage.slice(homepage.indexOf("function FindDogs("), homepage.indexOf("export default function HomePage"));

describe("homepage hierarchy and Dog of the Day", () => {
  const hero = heroSource();

  it("renders the visible 'Dog of the Day' label", () => {
    expect(hero).toMatch(/>\s*Dog of the Day\s*</);
  });

  it("opens with Isaiah and the slogan, then the daily feature, before search and results", () => {
    const order = [
      'src="/isaiah-icon.jpg"',
      ">Isaiah</span>",
      ">Batdog · The Dark Zay</span>",
      'id="brand-heading"',
      "Don’t clone me.",
      "Rescue me.",
      "</span> Find dogs near me",
      "<DogOfTheDay />",
      'id="find"',
      "<FindDogs ",
      "How adopting works",
    ].map((needle) => {
      const at = home.indexOf(needle);
      expect(at, needle).toBeGreaterThan(-1);
      return at;
    });
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(homepage.match(/<DogOfTheDay \/>/g)).toHaveLength(1);
  });

  it("names the site once, in the header — the hero leads with the slogan", () => {
    // Owner, Nov 7 2026: don't repeat the site name the header already shows.
    expect(home).not.toMatch(/>DontCloneMeTom<\/span>/);
    const h1 = home.slice(home.indexOf("<h1"), home.indexOf("</h1>"));
    expect(h1).toContain("Don’t clone me.");
    expect(h1).toContain("Rescue me.");
    expect(h1).not.toContain("DontCloneMeTom");
  });

  it("makes the intro's main button useful: it runs the location search below", () => {
    expect(home).toContain("setNearMeRequest((n) => n + 1)");
    expect(home).toContain("<FindDogs nearMeRequest={nearMeRequest} />");
    expect(discovery).toContain("if (nearMeRequest > 0) searchNearMe();");
    // Location still never goes in a URL: the search POSTs rounded coordinates.
    expect(discovery).toContain('fetch("/api/adoptable-pets", {');
    expect(discovery).toContain('method: "POST"');
  });

  it("shows the selected picks below the controls with access to every returned dog", () => {
    expect(discovery.indexOf('aria-label="Adoptable dogs"')).toBeGreaterThan(discovery.indexOf("</form>"));
    expect(discovery).toContain("visibleDogs.map((d)");
    expect(discovery).toContain('picks === "all" ? matches : matches?.slice(0, Number(picks))');
    expect(discovery).toContain('<option value="222">222 dogs</option>');
    expect(discovery).toContain('<option value="all">All dogs</option>');
    // The count menu sits with the results, not in the search form.
    expect(discovery.indexOf('aria-label="How many dogs"')).toBeGreaterThan(discovery.indexOf("</form>"));

    expect(discovery).not.toContain("See all dogs");
    expect(discovery).not.toContain("<DogOfTheDay />");
  });

  it("keeps the search simple: ZIP, distance and Search up front; the rest folded into Filters", () => {
    const form = discovery.slice(discovery.indexOf("<form"), discovery.indexOf("</form>"));
    expect(form).toContain('id="find-zip"');
    expect(form).toContain('label="Distance"');
    expect(form).toContain('type="submit"');
    expect(form).toContain("Use my location");
    expect(form).toContain('aria-controls="find-filters"');
    for (const filter of ['label="Size"', 'label="Age"', 'label="Sex"', 'label="Good with"']) {
      expect(form).not.toContain(filter);
      expect(discovery).toContain(filter);
    }
    expect(discovery).toContain('id="find-filters" hidden={!filtersOpen}');
  });

  it("keeps the permanent face crop and one link to Isaiah's page", () => {
    expect(home).toContain('href="/dogs/isaiah"');
    expect(home).toContain("rounded-full border-[3px] border-[#2DD4BF] object-cover");
    expect(home).toContain('objectPosition: "50% 25%"');
    expect(home).toContain('fetchPriority="high"');
    expect(home).toContain("focus-visible:outline");
    expect(home.match(/href="\/dogs\/isaiah"/g)).toHaveLength(1);
    expect(hero).not.toContain('src="/isaiah-icon.jpg"');
  });

  it("retains automatic ZIP results and direct dog sharing", () => {
    expect(homepage).toContain('useState("63040")');
    expect(homepage).toContain('fetch(`/api/adoptable-pets?zip=${clean}&miles=${miles}`,');
    expect(homepage).toContain('<DogTile key={d.id} dog={d}');
    expect(homepage).not.toContain('openNearMe');
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

  it("spinning never replaces the day's pick", () => {
    // Today's dog is held apart from a spun dog, labeled, and one tap back.
    expect(hero).toContain("setToday(pick)");
    expect(hero).toContain("setSpun(pick)");
    expect(hero).toContain("if (offset === 0 && haveToday) return;");
    expect(hero).toContain("not today’s pick");
    expect(hero).toContain("Back to {today.dog.name}");
    // A spun dog is never announced as the Dog of the Day.
    expect(hero).toContain('isSpun ? "Meet" : "Dog of the Day: meet"');
    // Spins ask for ?offset=N; the daily recorder reads offset 0 only.
    expect(hero).toContain("offset > 0 ? `?offset=${offset}` : \"\"");
  });

  it("'Meet [Name]' opens her own rescue page — only when the server confirmed it", () => {
    expect(dotdRoute).toContain('meet: destination.type === "exact-dog" ? { url: destination.url } : null');
    expect(hero).toContain("href={meetUrl}");
    expect(hero).toContain("Meet {featured.name}");
    expect(hero).toContain('rel="noopener noreferrer"');
    // Photo and name still open her page here — the stable link people share.
    expect(hero).toContain("href={pagePath}");
    expect(hero).toContain("pagePath: j.pagePath");
    expect(dotdRoute).toContain("pagePath: post.pagePath");
  });

  it("shows the dog's photo, name and feed facts — nothing inferred, never stretched", () => {
    expect(hero).toContain("src={featured.photo}");
    expect(hero).toContain("{featured.name}");
    // Facts are only breed/age/sex — what the dog tiles already show.
    // Never temperament, medical, or compatibility.
    expect(hero).toContain("featured.breed");
    expect(hero).toMatch(/featured\??\.age/);
    expect(hero).toContain("featured.sex");
    expect(dotdRoute).toContain("breed: dog.breed");
    expect(dotdRoute).toContain("age: dog.age");
    expect(dotdRoute).toContain("sex: dog.sex");
    expect(hero).toContain("object-cover");
    expect(hero).toContain("aspect-[4/3]");
  });

  it("keeps the image accessible and falls back when there is no photo", () => {
    expect(hero).toMatch(/alt=\{`\$\{featured\.name\}, an adoptable dog/);
    expect(hero).toContain('role="img"');
    expect(hero).toMatch(/aria-label=\{`No photo available for \$\{featured\.name\}`\}/);
    expect(hero).toContain("Dog of the Day: meet");
  });

  it("keeps keyboard focus visible and touch targets big enough", () => {
    expect(hero).toContain("focus-visible:outline");
    // The unavailable state's retry button stays a large target.
    expect(hero).toContain("min-h-14");
  });
});
