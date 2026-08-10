// Brand/copy guard (owner, 2026-08-09): the public brand is exactly
// "dontclonemetom.com" — lowercase, one word, including ".com". No public
// surface may render "DontCloneMeTom", "Dont Clone Me Tom", or any other
// cased/spaced variant. The site stays anonymous (no owner name/bio), not
// for personal profit, and never asks Tom Brady for anything.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(app, rel), "utf8");

const layout = read("layout.tsx");
const manifest = read("manifest.ts");
const homepage = read("page.tsx");
const about = read("about/page.tsx");

// Banned public-facing brand renderings — case- and space-sensitive.
const BANNED_BRAND_STRINGS = [
  "Dont Clone Me Tom",
  "Don't Clone Me Tom",
  "DontCloneMeTom",
  "DONT CLONE ME TOM",
  "DontCloneMeTom.com",
  "DONTCLONEMETOM.COM",
];

describe("locked public brand: dontclonemetom.com", () => {
  it("layout metadata, nav brand, and manifest use only the lowercase brand", () => {
    for (const banned of BANNED_BRAND_STRINGS) {
      expect(layout).not.toContain(banned);
      expect(manifest).not.toContain(banned);
    }
    expect(layout).toContain('site="dontclonemetom.com"');
    expect(manifest).toContain('name: "dontclonemetom.com"');
  });

  it("homepage hero and about page render the brand lowercase, never the old CamelCase form", () => {
    for (const banned of BANNED_BRAND_STRINGS) {
      expect(homepage).not.toContain(banned);
      expect(about).not.toContain(banned);
    }
    expect(homepage).toContain("dontclonemetom");
    expect(about).toContain("dontclonemetom.com");
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
