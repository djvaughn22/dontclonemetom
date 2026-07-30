import { describe, expect, it } from "vitest";
import { generateCandidates, nearDupKey, shortForm, syllableTail } from "../engine";
import { FAMOUS_SOURCES } from "../lexicon";
import { factFromCatalog, factFromOwnerText, BEHAVIOR_CATALOG, MOOD_CATALOG } from "../behaviors";
import type { IdentityInput } from "../types";

const isaiahInput = (extra: Partial<IdentityInput> = {}): IdentityInput => ({
  realName: "Isaiah",
  existingNickname: "Zay",
  facts: [
    factFromCatalog(BEHAVIOR_CATALOG.find((b) => b.id === "couch-guardian")!),
    factFromCatalog(MOOD_CATALOG.find((m) => m.id === "sleepy")!),
  ],
  seed: "test-seed",
  ...extra,
});

describe("name mechanics", () => {
  it("takes the first syllable chunk", () => {
    expect(shortForm("Isaiah")).toBe("Isa");
    expect(shortForm("Biscuit")).toBe("Bis");
  });

  it("strips a leading syllable for sound substitution", () => {
    expect(syllableTail("Taylor")).toBe("ylor");
    expect(syllableTail("Swift")).toBe("ft");
  });

  it("normalizes near-duplicate keys past filler and punctuation", () => {
    expect(nearDupKey("The Big Zay!")).toBe(nearDupKey("Zay"));
    expect(nearDupKey("Sir Zay Train")).toBe(nearDupKey("Zay Train"));
    expect(nearDupKey("Zay Thunder")).not.toBe(nearDupKey("Zay Blizzard"));
  });
});

describe("generation basics", () => {
  it("is deterministic for the same seed and step", () => {
    const a = generateCandidates(isaiahInput(), 6);
    const b = generateCandidates(isaiahInput(), 6);
    expect(a.candidates.map((c) => c.nickname)).toEqual(b.candidates.map((c) => c.nickname));
  });

  it("changes with the step (shuffle again)", () => {
    const a = generateCandidates(isaiahInput({ step: 0 }), 6);
    const b = generateCandidates(isaiahInput({ step: 1 }), 6);
    expect(a.candidates.map((c) => c.nickname)).not.toEqual(b.candidates.map((c) => c.nickname));
  });

  it("returns fully structured candidates, not just strings", () => {
    const { candidates } = generateCandidates(isaiahInput(), 6);
    expect(candidates.length).toBe(6);
    for (const c of candidates) {
      expect(c.id).toBeTruthy();
      expect(c.nickname).toBeTruthy();
      expect(typeof c.heroSuitable).toBe("boolean");
      expect(c.lane).toBeTruthy();
      expect(c.archetype).toBeTruthy();
      expect(c.wordplay).toBeTruthy();
      expect(c.shareText).toContain(c.nickname);
      expect(c.posterText).toBe(c.nickname.toUpperCase());
      expect(c.uniqueness).toBeGreaterThanOrEqual(0);
      expect(c.uniqueness).toBeLessThanOrEqual(1);
      expect(["loose", "good", "strong"]).toContain(c.fit);
      expect(c.playEligible).toBe(true);
      expect(["playSafe", "manualReview", "blockedForMerch"]).toContain(c.rightsRisk);
      expect(c.rightsReason).toBeTruthy();
    }
  });

  it("requires a real name", () => {
    expect(generateCandidates({ realName: "  ", facts: [], seed: 1 }).candidates).toEqual([]);
  });

  it("never deals exact or near duplicates in one hand", () => {
    const { candidates } = generateCandidates(isaiahInput(), 6);
    const keys = candidates.map((c) => nearDupKey(c.nickname));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never outputs a real person's full name verbatim", () => {
    for (let step = 0; step < 20; step++) {
      const { candidates } = generateCandidates(isaiahInput({ step }), 8);
      for (const c of candidates) {
        for (const f of FAMOUS_SOURCES) {
          expect(c.nickname.toLowerCase()).not.toContain(`${f.first} ${f.last}`.toLowerCase());
        }
      }
    }
  });
});

describe("owner boundaries", () => {
  it("honors excluded words and dislikes", () => {
    const { candidates } = generateCandidates(isaiahInput({ excludedWords: ["train"], dislikes: ["thunder"] }), 8);
    for (const c of candidates) {
      expect(c.nickname.toLowerCase()).not.toContain("train");
      expect(c.nickname.toLowerCase()).not.toContain("thunder");
    }
  });

  it("only riffs on confirmed facts — matched facts trace back to input", () => {
    const input = isaiahInput();
    const factIds = new Set(input.facts.map((f) => f.id));
    for (let step = 0; step < 10; step++) {
      const { candidates } = generateCandidates({ ...input, step }, 8);
      for (const c of candidates) {
        if (c.matchedFactId) expect(factIds.has(c.matchedFactId)).toBe(true);
      }
    }
  });

  it("owner-entered custom facts carry their source", () => {
    const custom = factFromOwnerText("steals exactly one shoe", "behavior")!;
    expect(custom.source).toBe("owner-entered");
    const { candidates } = generateCandidates(isaiahInput({ facts: [custom] }), 30);
    const matched = candidates.find((c) => c.matchedFactId === custom.id);
    expect(matched?.matchedFactText).toBe("steals exactly one shoe");
  });
});

describe("lanes and filters", () => {
  it("filters by a single sport", () => {
    const { candidates } = generateCandidates(isaiahInput({ lanes: ["football"] }), 6);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) expect(c.lane).toBe("football");
  });

  it("filters by celebrity-inspired lanes", () => {
    const { candidates } = generateCandidates(isaiahInput({ lanes: ["musicians", "actors"] }), 6);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) expect(["musicians", "actors"]).toContain(c.lane);
  });

  it("mood-only facts produce mood-matched identities", () => {
    const sleepy = factFromCatalog(MOOD_CATALOG.find((m) => m.id === "sleepy")!);
    const { candidates } = generateCandidates(isaiahInput({ facts: [sleepy] }), 30);
    expect(candidates.some((c) => c.matchedFactId === "sleepy")).toBe(true);
  });

  it("locking a word keeps it in every result", () => {
    const { candidates } = generateCandidates(isaiahInput({ lockedWord: "zay" }), 6);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) expect(c.nickname.toLowerCase()).toContain("zay");
  });
});

describe("commercial-safety mode", () => {
  it("only returns playSafe results", () => {
    const { candidates } = generateCandidates(isaiahInput({ commercialSafety: true }), 10);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(c.rightsRisk).toBe("playSafe");
      expect(c.merchReviewEligible).toBe(true);
    }
  });

  it("distinguishes play-safe from merch-review results in normal mode", () => {
    const all: string[] = [];
    for (let step = 0; step < 12; step++) {
      all.push(...generateCandidates(isaiahInput({ step }), 8).candidates.map((c) => c.rightsRisk));
    }
    expect(all).toContain("playSafe");
    expect(all).toContain("manualReview");
  });
});
