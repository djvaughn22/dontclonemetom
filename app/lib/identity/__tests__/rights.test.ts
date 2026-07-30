import { describe, expect, it } from "vitest";
import { classifyRights, containsProtectedMark, containsRealFullName } from "../rights";

describe("rights classification", () => {
  it("blocks a real person's full name for merch", () => {
    const call = classifyRights("Tom Brady");
    expect(call.risk).toBe("blockedForMerch");
    expect(call.reason).toContain("Tom Brady");
  });

  it("blocks team, league, and franchise names", () => {
    expect(classifyRights("Captain of the Chiefs").risk).toBe("blockedForMerch");
    expect(classifyRights("NFL Legend").risk).toBe("blockedForMerch");
    expect(classifyRights("Batman Junior").risk).toBe("blockedForMerch");
  });

  it("flags kept surnames for manual review", () => {
    const call = classifyRights("Zaylor Swift");
    expect(call.risk).toBe("manualReview");
    expect(call.reason.toLowerCase()).toContain("review");
  });

  it("flags near-brand transforms for manual review", () => {
    expect(classifyRights("BatZay", { nearBrand: true }).risk).toBe("manualReview");
  });

  it("passes generic wordplay as play-safe", () => {
    expect(classifyRights("Sir Biscuit of the Laundry Room").risk).toBe("playSafe");
    expect(classifyRights("Captain Zay").risk).toBe("playSafe");
  });

  it("every call carries a human-readable reason", () => {
    for (const name of ["Tom Brady", "Zaylor Swift", "Captain Zay"]) {
      expect(classifyRights(name).reason.length).toBeGreaterThan(10);
    }
  });

  it("detectors match case-insensitively and past punctuation", () => {
    expect(containsRealFullName("the TOM BRADY of naps")).toBe("Tom Brady");
    expect(containsProtectedMark("little Star Wars fan")).toBe("star wars");
    expect(containsProtectedMark("Chief Snack Officer")).toBeNull(); // 'chiefs' only as a word
  });
});
