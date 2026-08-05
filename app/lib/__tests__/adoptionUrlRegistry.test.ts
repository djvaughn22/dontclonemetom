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

  it("All 17 Spencer GetBuddy dogs are verified", () => {
    const spencerDogs = {
      "22649636": "Carl",
      "22649637": "Darla",
      "22649640": "Dart",
      "22649644": "Dumpling",
      "22649646": "Holden",
      "22649648": "Jid",
      "22649650": "Lemon",
      "22649652": "Linus",
      "22649657": "Macho Man",
      "22649660": "Macy",
      "22649663": "Paco",
      "22649666": "Raisin",
      "22649668": "Raya",
      "22649671": "Sweetie",
      "22649675": "Tango",
      "22649678": "Tiramisu",
      "22649681": "Vida",
    };

    for (const [id, name] of Object.entries(spencerDogs)) {
      const entry = getAdoptionUrlStatus(id);
      expect(entry?.status).toBe("verified-direct-dog-page");
      expect(entry?.source).toBe("getbuddy");
      expect(entry?.adoptionProfileUrl).toContain("getbuddy.com/pet");
      expect(entry?.notes).toContain("Spencer Pet Rescue");
      expect(entry?.notes).toContain("adoptable");
    }
  });

  it("hasVerifiedAdoptionProfile returns true only for verified dogs", () => {
    expect(hasVerifiedAdoptionProfile("22649663")).toBe(true);
    expect(hasVerifiedAdoptionProfile("22649636")).toBe(false);
  });

  it("getVerifiedAdoptionUrl returns URL only for verified dogs", () => {
    const verifiedUrl = getVerifiedAdoptionUrl("22649663");
    expect(verifiedUrl).toContain("getbuddy.com");

    const unverifiedUrl = getVerifiedAdoptionUrl("22649636");
    expect(unverifiedUrl).toBeNull();
  });

  it("Mastino Rescue dogs are classified as dead-or-removed", () => {
    const mastinoId = "20515053";
    const entry = getAdoptionUrlStatus(mastinoId);
    expect(entry?.status).toBe("dead-or-removed");
    expect(entry?.adoptionProfileUrl).toBeNull();
  });

  it("unverified dogs have no adoptionProfileUrl", () => {
    // Spencer dogs (except Paco) are unverified
    const carlEntry = getAdoptionUrlStatus("22649636");
    expect(carlEntry?.status).toBe("unverified");
    expect(carlEntry?.adoptionProfileUrl).toBeNull();
  });

  it("every dog has either a URL or an honest status", () => {
    let verifiedCount = 0;
    let unverifiedCount = 0;
    let deadCount = 0;

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
      }
    }

    // 17 Spencer dogs verified (all current active dogs)
    expect(verifiedCount).toBe(17);
    expect(deadCount).toBe(6); // Mastino dogs
    expect(unverifiedCount).toBe(199); // Everyone else
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
