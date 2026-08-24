import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Architecture guard for the "Make a Dog Card" cleanup + Spin feature, in
// the same source-grep style as dogLinkSurfaces.test.ts — some of this is
// client-interaction behavior (route replace, no new tab, no state leak)
// that isn't practical to exercise without a DOM environment this project
// doesn't otherwise carry, so it's locked structurally instead.

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("'Make a Dog Card' is gone from the repeated homepage tiles only", () => {
  it("app/page.tsx no longer shows the bare CTA on every dog picture — only the single detail-panel action survives", () => {
    const src = read("app/page.tsx");
    // Any surviving occurrence must be the one detail-panel CTA
    // ("Make a Dog Card for {name}"), never the bare repeated-card label.
    expect(src).not.toMatch(/🃏 Make a Dog Card(?!\s+for\s)/);
    expect(src).toContain("🃏 Make a Dog Card for");
  });

  it("the trading-card feature itself still exists and is still reachable", () => {
    expect(read("app/cards/page.tsx")).toBeTruthy();
    expect(read("app/components/cards/CardSpinner.tsx")).toContain("Make a Dog Card");
    // The homepage detail panel and the dog page both still hand off to it.
    expect(read("app/page.tsx")).toContain("/cards?dog=");
    expect(read("app/dogs/[id]/page.tsx")).toContain("makerHref=");
  });
});

describe("Spin another dog — shared control", () => {
  it("Home and the individual dog page use the same SpinButton (same label, icon, sizing, behavior)", () => {
    expect(read("app/page.tsx")).toContain("SpinButton");
    expect(read("app/components/DogSpinControl.tsx")).toContain("SpinButton");
    expect(read("app/dogs/[id]/page.tsx")).toContain("DogSpinControl");
  });

  it("individual dog page Spin never replaces the permanent Isaiah brand page", () => {
    // DogSpinControl is only rendered for live rescue listings, never for
    // structured profiles (Isaiah), and DogProfileView must not import it.
    const dogPage = read("app/dogs/[id]/page.tsx");
    expect(dogPage).toContain("if (profile) return <DogProfileView profile={profile} />;");
    expect(read("app/components/profile/DogProfileView.tsx")).not.toContain("DogSpinControl");
  });

  it("individual dog page Spin stays in place: client-side route replace, no new tab, no navigation back to Home", () => {
    const src = read("app/components/DogSpinControl.tsx");
    expect(src).toContain("useRouter");
    expect(src).toContain("router.replace(`/dogs/");
    expect(src).not.toContain("router.push(");
    expect(src).not.toContain("window.open");
    expect(src).not.toContain('target="_blank"');
    expect(src).not.toContain('href="/"');
  });

  it("individual dog page Spin reuses the existing eligible-dogs endpoint, introducing no new API route", () => {
    expect(read("app/components/DogSpinControl.tsx")).toContain("/api/adoptable-pets");
  });

  it("per-dog UI state does not leak across a spin on the individual dog page", () => {
    const src = read("app/dogs/[id]/page.tsx");
    expect(src).toMatch(/<CardSpinner\s+key=\{dog\.id\}/);
    expect(src).toMatch(/<DogShareActions\s+key=\{dog\.id\}/);
  });
});
