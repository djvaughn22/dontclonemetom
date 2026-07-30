import { describe, expect, it } from "vitest";
import { generateCandidates, nearDupKey, onsetOf, rimeOf, shortForm } from "../engine";
import { FAMOUS_SOURCES, PUNNED_FAMOUS } from "../lexicon";
import type { IdentityInput } from "../types";

const input = (extra: Partial<IdentityInput> = {}): IdentityInput => ({
  realName: "Bob",
  existingNickname: "Bobby",
  seed: "test-seed",
  ...extra,
});

describe("name mechanics", () => {
  it("takes the first syllable chunk", () => {
    expect(shortForm("Isaiah")).toBe("Isa");
    expect(shortForm("Biscuit")).toBe("Bis");
  });

  it("splits names into onset and rime for the rhyme swap", () => {
    expect(onsetOf("Bobby")).toBe("B");
    expect(onsetOf("Charlie")).toBe("Ch");
    expect(rimeOf("Patrick")).toBe("atrick");
    expect(rimeOf("Taylor")).toBe("aylor");
  });

  it("normalizes near-duplicate keys past filler and punctuation", () => {
    expect(nearDupKey("The Big Zay!")).toBe(nearDupKey("Zay"));
    expect(nearDupKey("Batrick Swayze")).not.toBe(nearDupKey("Baylor Swift"));
  });
});

describe("the rhyme deck", () => {
  it("is deterministic for the same seed and step, fresh on the next step", () => {
    const a = generateCandidates(input(), 6);
    const b = generateCandidates(input(), 6);
    const c = generateCandidates(input({ step: 1 }), 6);
    expect(a.candidates.map((x) => x.nickname)).toEqual(b.candidates.map((x) => x.nickname));
    expect(a.candidates.map((x) => x.nickname)).not.toEqual(c.candidates.map((x) => x.nickname));
  });

  it("rhymes the dog's name with the stars — Bobby → Batrick Swayze", () => {
    const names: string[] = [];
    const shownIds: string[] = [];
    for (let step = 0; step < 25; step++) {
      const { candidates } = generateCandidates(input({ step, shownIds: [...shownIds] }), 8);
      for (const c of candidates) {
        names.push(c.nickname);
        shownIds.push(c.id);
      }
    }
    expect(names).toContain("Batrick Swayze");
    expect(names).toContain("Baylor Swift");
  });

  it("mixes written puns into the hands — Pawtrick Swayze exists", () => {
    const names: string[] = [];
    for (let step = 0; step < 20; step++) {
      names.push(...generateCandidates(input({ step }), 8).candidates.map((c) => c.nickname));
    }
    expect(names.some((n) => PUNNED_FAMOUS.some((p) => p.pun === n))).toBe(true);
  });

  it("returns structured candidates, not just strings", () => {
    const { candidates } = generateCandidates(input(), 6);
    expect(candidates.length).toBe(6);
    for (const c of candidates) {
      expect(c.id).toBeTruthy();
      expect(c.nickname).toBeTruthy();
      expect(c.lane).toBeTruthy();
      expect(c.archetype).toBeTruthy();
      expect(c.wordplay).toBeTruthy();
      expect(c.shareText).toContain(c.nickname);
      expect(c.posterText).toBe(c.nickname.toUpperCase());
      expect(["playSafe", "manualReview", "blockedForMerch"]).toContain(c.rightsRisk);
      expect(c.rightsReason).toBeTruthy();
    }
  });

  it("every name is short: max 5 words, 26 characters", () => {
    for (let step = 0; step < 10; step++) {
      for (const c of generateCandidates(input({ step }), 8).candidates) {
        expect(c.nickname.length).toBeLessThanOrEqual(26);
        expect(c.nickname.split(/\s+/).length).toBeLessThanOrEqual(5);
      }
    }
  });

  it("requires a real name and never deals near-duplicates in one hand", () => {
    expect(generateCandidates({ realName: "  ", seed: 1 }).candidates).toEqual([]);
    const { candidates } = generateCandidates(input(), 6);
    const keys = candidates.map((c) => nearDupKey(c.nickname));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never outputs a real person's actual full name", () => {
    for (let step = 0; step < 20; step++) {
      for (const c of generateCandidates(input({ step }), 8).candidates) {
        for (const f of FAMOUS_SOURCES) {
          expect(c.nickname.toLowerCase()).not.toBe(`${f.first} ${f.last}`.toLowerCase());
        }
      }
    }
  });
});

describe("filters and boundaries", () => {
  it("filters by a single sport", () => {
    const { candidates } = generateCandidates(input({ lanes: ["football"] }), 6);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) expect(c.lane).toBe("football");
  });

  it("filters by movie-star lanes", () => {
    const { candidates } = generateCandidates(input({ lanes: ["actors", "comedy"] }), 6);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) expect(["actors", "comedy"]).toContain(c.lane);
  });

  it("honors excluded words and dislikes", () => {
    const { candidates } = generateCandidates(input({ excludedWords: ["swayze"], dislikes: ["swift"] }), 20);
    for (const c of candidates) {
      expect(c.nickname.toLowerCase()).not.toContain("swayze");
      expect(c.nickname.toLowerCase()).not.toContain("swift");
    }
  });

  it("locking a word keeps it in every result", () => {
    const { candidates } = generateCandidates(input({ lockedWord: "brady" }), 6);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) expect(c.nickname.toLowerCase()).toContain("brady");
  });
});

describe("rights honesty", () => {
  it("kept surnames carry the manual-review floor", () => {
    const names: { nickname: string; rightsRisk: string }[] = [];
    for (let step = 0; step < 10; step++) {
      names.push(...generateCandidates(input({ step }), 8).candidates);
    }
    const batrick = names.find((c) => c.nickname === "Batrick Swayze");
    if (batrick) expect(batrick.rightsRisk).toBe("manualReview");
    expect(names.some((c) => c.rightsRisk === "manualReview")).toBe(true);
    expect(names.some((c) => c.rightsRisk === "playSafe")).toBe(true);
  });

  it("commercial-safety mode only returns playSafe results", () => {
    const { candidates } = generateCandidates(input({ commercialSafety: true }), 10);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(c.rightsRisk).toBe("playSafe");
      expect(c.merchReviewEligible).toBe(true);
    }
  });
});
