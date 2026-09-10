// Brand/copy guard (owner, 2026-09-09 — supersedes the 2026-08-09 lowercase
// lock): the public brand is exactly "DontCloneMeTom.com" — CamelCase, one
// word, always including ".com". No public surface may render the lowercase
// "dontclonemetom.com", a spaced variant, or the bare name without ".com".
// URLs stay lowercase (https://dontclonemetom.com) — this guard is about
// visible branding and metadata, not URL casing.
// The site stays anonymous (no owner name/bio), not for personal profit, and
// never asks Tom Brady for anything.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(app, rel), "utf8");

const layout = read("layout.tsx");
const manifest = read("manifest.ts");
const homepage = read("page.tsx");
const about = read("about/page.tsx");
const dogDetail = read("dogs/[id]/page.tsx");
const shareActions = read("components/DogShareActions.tsx");
const tradingCard = read("components/cards/TradingCard.tsx");
const dogOfTheDayLib = read("lib/dogOfTheDay.ts");

export const BRAND = "DontCloneMeTom.com";

// Banned public-facing brand renderings — case- and space-sensitive.
const BANNED_BRAND_STRINGS = [
  "Dont Clone Me Tom",
  "Don't Clone Me Tom",
  "DontClone Me Tom",
  "DONT CLONE ME TOM",
  "DONTCLONEMETOM.COM",
  "DONTCLONEMETOM",
];

// Every source line that mentions the brand at all. A line is allowed to
// carry a lowercase spelling ONLY when it is a real URL, an npm/package or
// machine key, a filename slug, a hashtag, or a code comment.
function brandLines(src: string) {
  return src.split("\n").filter((l) => /dontclonemetom/i.test(l));
}

function offendingLowercaseLines(src: string) {
  return brandLines(src).filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return false; // comments
    // Strip the legitimate lowercase forms, then see if any lowercase
    // spelling survives — if one does, it is visible copy that was missed.
    const stripped = line
      .replace(/https?:\/\/[a-z0-9.\-/]*dontclonemetom[a-z0-9.\-/]*/gi, "")
      .replace(/#dontclonemetom/g, "")
      .replace(/dontclonemetom-\$?\{?/g, "")
      .replace(/"dontclonemetom"/g, "")
      .replace(/daily-dontclonemetom/g, "")
      .replace(/dontclonemetom\|/g, "");
    return /dontclonemetom/.test(stripped);
  });
}

describe("locked public brand: DontCloneMeTom.com", () => {
  const surfaces: Array<[string, string]> = [
    ["layout.tsx", layout],
    ["manifest.ts", manifest],
    ["page.tsx", homepage],
    ["about/page.tsx", about],
    ["dogs/[id]/page.tsx", dogDetail],
    ["components/DogShareActions.tsx", shareActions],
    ["components/cards/TradingCard.tsx", tradingCard],
    ["lib/dogOfTheDay.ts", dogOfTheDayLib],
  ];

  it("never renders a spaced, shouted, or otherwise mangled brand variant", () => {
    for (const [name, src] of surfaces) {
      for (const banned of BANNED_BRAND_STRINGS) {
        expect(src, `${name} must not contain ${banned}`).not.toContain(banned);
      }
    }
  });

  it("never leaves a lowercase brand in visible copy (URLs, keys and slugs excepted)", () => {
    for (const [name, src] of surfaces) {
      expect(offendingLowercaseLines(src), `${name} has lowercase brand copy`).toEqual([]);
    }
  });

  it("layout metadata, nav brand, and manifest use the exact brand", () => {
    expect(layout).toContain(`default: "${BRAND}"`);
    expect(layout).toContain(`template: "%s | ${BRAND}"`);
    expect(layout).toContain(`applicationName: "${BRAND}"`);
    expect(layout).toContain(`siteName: "${BRAND}"`);
    expect(layout).toContain(`site="${BRAND}"`);
    expect(manifest).toContain(`name: "${BRAND}"`);
    expect(manifest).toContain(`short_name: "${BRAND}"`);
  });

  it("homepage hero renders the wordmark as DontCloneMeTom + .com", () => {
    // The hero splits the wordmark so the ".com" carries the accent color;
    // together the two spans must read exactly "DontCloneMeTom.com".
    expect(homepage).toMatch(
      /<span className="text-\[#e8edf5\]">DontCloneMeTom<\/span>\s*<span className="text-\[#2DD4BF\]">\.com<\/span>/
    );
  });

  it("about page and dog-detail disclaimer name the brand with .com", () => {
    expect(about).toContain(BRAND);
    expect(dogDetail).toContain(`${BRAND} is an independent rescue-first campaign`);
  });

  it("share caption and card footers carry the exact brand", () => {
    expect(shareActions).toContain(`"${BRAND}"`);
    expect(tradingCard).toContain(`🐾 ${BRAND}`);
    expect(dogOfTheDayLib).toContain(`siteName: "${BRAND}"`);
  });

  it("keeps real URLs lowercase — branding changed, addresses did not", () => {
    expect(layout).toContain('new URL("https://dontclonemetom.com")');
    expect(layout).toContain('url: "https://dontclonemetom.com"');
    expect(dogOfTheDayLib).toContain('siteUrl: "https://dontclonemetom.com"');
    // No source may emit a CamelCase host inside an actual URL.
    for (const [name, src] of surfaces) {
      expect(src, `${name} must not put a cased host in a URL`).not.toMatch(
        /https?:\/\/[^\s"'`]*DontCloneMeTom/
      );
    }
  });
});

describe("about page: not for profit, no explained joke, no owner identity", () => {
  it("states the site is not for personal profit", () => {
    expect(about.toLowerCase()).toMatch(/not for profit|not here to make money/);
  });

  it("never claims registered nonprofit/charity status", () => {
    for (const claim of ["nonprofit", "non-profit", "501(c)(3)", "501c3", "registered charity"]) {
      expect(about.toLowerCase()).not.toContain(claim);
    }
  });

  it("never explains the joke or why .com is part of the name", () => {
    expect(about.toLowerCase()).not.toMatch(/point of view|inspired by the public story|not about a dog named tom/);
  });

  it("thanks Tom Brady without asking him for support, promotion, or attention", () => {
    expect(about).toContain("Thank you, Tom");
    // The only "endorsed by" text allowed is the disclaimer's negation.
    expect(about).toContain("not affiliated with, sponsored by, or endorsed by Tom Brady");
    for (const ask of ["we hope tom", "tom, if you", "share this with tom", "tag tom brady", "maybe tom can", "help us get this to tom"]) {
      expect(about.toLowerCase()).not.toContain(ask);
    }
  });

  it("carries no owner name, bio, or first-person founder language", () => {
    for (const phrase of ["i built this", "my project", "my mission", "my story", "founder"]) {
      expect(about.toLowerCase()).not.toContain(phrase);
    }
  });
});

describe("homepage: no judgmental cloning language directed at the reader", () => {
  it("never tells the reader what Tom should have done, or pairs 'don't clone' as an instruction", () => {
    for (const phrase of [
      "instead of cloning",
      "why clone when",
      "tom should have adopted",
      "don't clone, adopt",
      "don’t clone, adopt",
    ]) {
      expect(homepage.toLowerCase()).not.toContain(phrase);
    }
    // The old imperative ending ("Adopt. Foster. Share. Don't clone.") is gone.
    expect(homepage).not.toMatch(/Adopt\.\s*Foster\.\s*Share\.\s*Don.t clone\./);
  });
});
