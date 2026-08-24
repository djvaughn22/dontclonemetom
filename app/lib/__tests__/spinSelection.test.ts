import { describe, expect, it } from "vitest";
import { pickSpinCandidate } from "../spinSelection";

describe("pickSpinCandidate — individual dog page Spin", () => {
  it("never immediately returns the currently displayed dog when another exists", () => {
    const pool = [{ id: "1" }, { id: "2" }, { id: "3" }];
    // Exercise every possible random() draw, not just one.
    for (const r of [0, 0.2, 0.4, 0.6, 0.8, 0.999999]) {
      const next = pickSpinCandidate(pool, "2", () => r);
      expect(next).not.toBeNull();
      expect(next!.id).not.toBe("2");
    }
  });

  it("single-dog edge case: only the current dog is eligible → fails gracefully with null", () => {
    expect(pickSpinCandidate([{ id: "1" }], "1")).toBeNull();
  });

  it("empty-data edge case: no eligible dogs at all → fails gracefully with null", () => {
    expect(pickSpinCandidate([], "1")).toBeNull();
  });

  it("random() === 1 never overshoots the candidate list", () => {
    const pool = [{ id: "1" }, { id: "2" }];
    const next = pickSpinCandidate(pool, "1", () => 1);
    expect(next).not.toBeNull();
    expect(next!.id).toBe("2");
  });
});
