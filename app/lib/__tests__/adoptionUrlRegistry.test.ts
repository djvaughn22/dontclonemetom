import { describe, it, expect } from "vitest";
import {
  adoptionUrlRegistry,
  getAdoptionUrlStatus,
  hasVerifiedAdoptionProfile,
  getVerifiedAdoptionUrl,
} from "../adoptionUrlRegistry";

describe("adoptionUrlRegistry", () => {
  it("covers all 222 active dogs", () => {
    const count = Object.keys(adoptionUrlRegistry).length;
    expect(count).toBe(222);
  });

  it("Paco (22649663) is verified with GetBuddy URL", () => {
    const entry = getAdoptionUrlStatus("22649663");
    expect(entry).not.toBeNull();
    expect(entry?.status).toBe("verified-direct-dog-page");
    expect(entry?.source).toBe("getbuddy");
    expect(entry?.adoptionProfileUrl).toBe("https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de");
    expect(entry?.verifiedAt).toBeTruthy();
  });

  it("15 Spencer dogs are verified with GetBuddy pages; Macy and Raya are honestly demoted", () => {
    const spencerVerified = {
      "22649636": "Carl",
      "22649637": "Darla",
      "22649640": "Dart",
      "22649644": "Dumpling",
      "22649646": "Holden",
      "22649648": "Jid",
      "22649650": "Lemon",
      "22649652": "Linus",
      "22649657": "Macho Man",
      "22649663": "Paco",
      "22649666": "Raisin",
      "22649671": "Sweetie",
      "22649675": "Tango",
      "22649678": "Tiramisu",
      "22649681": "Vida",
    };

    for (const [id, name] of Object.entries(spencerVerified)) {
      const entry = getAdoptionUrlStatus(id);
      expect(entry?.status).toBe("verified-direct-dog-page");
      expect(entry?.source).toBe("getbuddy");
      expect(entry?.adoptionProfileUrl).toContain("getbuddy.com/pet");
      expect(entry?.notes).toContain("Spencer Pet Rescue");
      expect(entry?.notes).toContain("adoptable");
    }

    // Macy and Raya were linked to GetBuddy pages that live-checks proved
    // are different dogs (Yasmin, Nino) with no alias evidence. They must
    // stay demoted to the honest rescue-site fallback, not re-verified.
    for (const id of ["22649660", "22649668"]) {
      const entry = getAdoptionUrlStatus(id);
      expect(entry?.status).toBe("name-mismatch");
      expect(entry?.adoptionProfileUrl).toBeNull();
    }
  });

  it("hasVerifiedAdoptionProfile returns true only for verified dogs", () => {
    expect(hasVerifiedAdoptionProfile("22649663")).toBe(true);
    expect(hasVerifiedAdoptionProfile("21648834")).toBe(false);
  });

  it("getVerifiedAdoptionUrl returns URL only for verified dogs", () => {
    const verifiedUrl = getVerifiedAdoptionUrl("22649663");
    expect(verifiedUrl).toContain("getbuddy.com");

    const unverifiedUrl = getVerifiedAdoptionUrl("21648834");
    expect(unverifiedUrl).toBeNull();
  });

  it("Mastino Rescue dogs are classified as dead-or-removed", () => {
    const mastinoId = "20515053";
    const entry = getAdoptionUrlStatus(mastinoId);
    expect(entry?.status).toBe("dead-or-removed");
    expect(entry?.adoptionProfileUrl).toBeNull();
  });

  it("unverified dogs have no adoptionProfileUrl", () => {
    const entry = getAdoptionUrlStatus("21648834");
    expect(entry?.status).toBe("unverified");
    expect(entry?.adoptionProfileUrl).toBeNull();
  });

  it("every dog has either a URL or an honest status", () => {
    let verifiedCount = 0;
    let unverifiedCount = 0;
    let deadCount = 0;
    let nameMismatchCount = 0;

    for (const entry of Object.values(adoptionUrlRegistry)) {
      if (entry.status === "verified-direct-dog-page") {
        verifiedCount++;
        expect(entry.adoptionProfileUrl).toBeTruthy();
      } else if (entry.status === "unverified") {
        unverifiedCount++;
        expect(entry.adoptionProfileUrl).toBeNull();
      } else if (entry.status === "dead-or-removed") {
        deadCount++;
        expect(entry.adoptionProfileUrl).toBeNull();
      } else if (entry.status === "name-mismatch") {
        nameMismatchCount++;
        expect(entry.adoptionProfileUrl).toBeNull();
      }
    }

    // 15 Spencer dogs verified; Macy and Raya demoted to name-mismatch
    // after their GetBuddy links were proven to point at different dogs.
    expect(verifiedCount).toBe(15);
    expect(nameMismatchCount).toBe(2);
    expect(deadCount).toBe(6); // Mastino dogs
    expect(unverifiedCount).toBe(199); // Everyone else
  });

  describe("mapping integrity — regression guards against array-position corruption", () => {
    it("locks the corrected GetBuddy IDs for the Lemon/Tango/Vida three-way swap", () => {
      // Commit 26a21ab paired these three dogs by list position instead of
      // identity, sending each one to a different dog's live GetBuddy page.
      expect(getVerifiedAdoptionUrl("22649650")).toBe(
        "https://www.getbuddy.com/pet/6a399768e87cf5014cec6076" // Lemon
      );
      expect(getVerifiedAdoptionUrl("22649675")).toBe(
        "https://www.getbuddy.com/pet/6a399409e87cf5014cec6072" // Tango
      );
      expect(getVerifiedAdoptionUrl("22649681")).toBe(
        "https://www.getbuddy.com/pet/68e779edd634356c103f77c6" // Vida
      );
    });

    it("Macy does not use Yasmin's profile without proven rename evidence", () => {
      const entry = getAdoptionUrlStatus("22649660");
      expect(entry?.adoptionProfileUrl).not.toBe(
        "https://www.getbuddy.com/pet/681dc6795ab6746988e790ab"
      );
      expect(entry?.adoptionProfileUrl).toBeNull();
    });

    it("Raya does not use Nino's profile — sex mismatch disproves the alias", () => {
      const entry = getAdoptionUrlStatus("22649668");
      expect(entry?.adoptionProfileUrl).not.toBe(
        "https://www.getbuddy.com/pet/69d82a6ffa9cfc803fef5b5e"
      );
      expect(entry?.adoptionProfileUrl).toBeNull();
    });

    it("no two active dogs share one adoptionProfileUrl", () => {
      const seen = new Map<string, string>();
      for (const [id, entry] of Object.entries(adoptionUrlRegistry)) {
        if (!entry.adoptionProfileUrl) continue;
        const prior = seen.get(entry.adoptionProfileUrl);
        expect(
          prior,
          `${entry.adoptionProfileUrl} is used by both ${prior} and ${id}`
        ).toBeUndefined();
        seen.set(entry.adoptionProfileUrl, id);
      }
    });

    it("no two active dogs share one GetBuddy pet ID", () => {
      const petIdOf = (url: string) => url.match(/\/pet\/([a-f0-9]+)/i)?.[1];
      const seen = new Map<string, string>();
      for (const [id, entry] of Object.entries(adoptionUrlRegistry)) {
        if (!entry.adoptionProfileUrl) continue;
        const petId = petIdOf(entry.adoptionProfileUrl);
        if (!petId) continue;
        const prior = seen.get(petId);
        expect(
          prior,
          `GetBuddy pet ${petId} is used by both ${prior} and ${id}`
        ).toBeUndefined();
        seen.set(petId, id);
      }
    });

    it("every verified-direct-dog-page entry identifies Spencer Pet Rescue and Available status in its notes", () => {
      for (const [id, entry] of Object.entries(adoptionUrlRegistry)) {
        if (entry.status !== "verified-direct-dog-page") continue;
        if (entry.source !== "getbuddy") continue;
        // Only Spencer's org block uses GetBuddy today.
        expect(entry.notes, `${id} notes: ${entry.notes}`).toContain("Spencer Pet Rescue");
        expect(entry.notes, `${id} notes: ${entry.notes}`).toContain("adoptable");
      }
    });

    it("name-mismatch entries never carry a live adoptionProfileUrl (fails closed to the honest fallback)", () => {
      for (const [id, entry] of Object.entries(adoptionUrlRegistry)) {
        if (entry.status === "name-mismatch") {
          expect(entry.adoptionProfileUrl, id).toBeNull();
        }
      }
    });
  });

  it("verified entries have proper source and timestamp", () => {
    const verified = Object.values(adoptionUrlRegistry).filter(
      (e) => e.status === "verified-direct-dog-page"
    );

    for (const entry of verified) {
      expect(entry.source).not.toBe("unknown");
      expect(entry.verifiedAt).toBeTruthy();
      expect(entry.notes).toBeTruthy();
    }
  });
});
