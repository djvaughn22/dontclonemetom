import { describe, expect, it } from "vitest";
import {
  apaPetUrlConflictsWithPet,
  buildApaPetUrl,
  isApaPetProfileUrl,
  normalizeApaPetId,
  parseApaPetUrl,
} from "../apaAdoption";
import { classifyAdoptionUrl, isGenericAnimalUrl, resolveDogDestination } from "../dogDestination";
import { normalizeHttpUrl } from "../rescueDogs";
import { emptyAdoptionUrl } from "../adoptionUrlSchema";

// Owner acceptance case: OTTO, APA shelter id A318825.
const OTTO_URL = "https://apamo.org/adopt/adoptable-pets/?petID=A318825";

describe("APA Missouri deep-link rule — Otto acceptance case", () => {
  it("builds Otto's exact APA URL from his shelter id", () => {
    expect(buildApaPetUrl("A318825")).toBe(OTTO_URL);
  });

  it("resolveDogDestination sends Otto to his own APA page, not the homepage", () => {
    const dest = resolveDogDestination({
      name: "OTTO",
      org: "Animal Protective Association of Missouri",
      profileUrl: OTTO_URL,
      orgUrl: "https://apamo.org/",
      orgUrlKind: "website",
    });
    expect(dest.type).toBe("exact-dog");
    expect(dest.url).toBe(OTTO_URL);
    expect(dest.url).not.toBe("https://apamo.org/");
    expect(dest.label).not.toBe("Visit the rescue");
    expect(dest.label).toContain("OTTO");
  });

  it("the petID query parameter survives URL normalization", () => {
    const normalized = normalizeHttpUrl(OTTO_URL);
    expect(normalized).toContain("petID=A318825");
    expect(new URL(normalized as string).searchParams.get("petID")).toBe("A318825");
  });

  it("classifies Otto's petID URL as an individual animal profile", () => {
    expect(classifyAdoptionUrl(OTTO_URL, "https://apamo.org/")).toBe("animal-profile");
    expect(isGenericAnimalUrl(OTTO_URL, "https://apamo.org/")).toBe(false);
  });

  it("does not require the dog's name or id to appear in raw server HTML", () => {
    // classifyAdoptionUrl (and therefore ingestion) never fetches HTML at
    // all — the whole point of the rule is that the URL shape alone decides.
    // This asserts the pure classification needs no page content.
    expect(classifyAdoptionUrl(OTTO_URL, null)).toBe("animal-profile");
  });
});

describe("APA Missouri deep-link rule — guardrails", () => {
  it("apamo.org homepage stays a rescue-level fallback, not a dog-specific link", () => {
    expect(classifyAdoptionUrl("https://apamo.org/", null)).toBe("org-homepage");
    expect(isGenericAnimalUrl("https://apamo.org/", null)).toBe(true);
  });

  it("the adoptable-pets list WITHOUT petID is not a specific dog's page", () => {
    expect(classifyAdoptionUrl("https://apamo.org/adopt/adoptable-pets/", null)).toBe(
      "animal-list",
    );
    expect(isApaPetProfileUrl("https://apamo.org/adopt/adoptable-pets/")).toBe(false);
    expect(parseApaPetUrl("https://apamo.org/adopt/adoptable-pets/")).toEqual({ petId: null });
  });

  it("a mismatched petID is not accepted as this dog's page when the source id is known", () => {
    const wrongDogUrl = "https://apamo.org/adopt/adoptable-pets/?petID=A999999";
    expect(apaPetUrlConflictsWithPet(wrongDogUrl, "A318825")).toBe(true);
    expect(apaPetUrlConflictsWithPet(OTTO_URL, "A318825")).toBe(false);
  });

  it("resolveDogDestination rejects a wrong-dog APA URL via canonical adoption status", () => {
    const dest = resolveDogDestination({
      name: "OTTO",
      org: "Animal Protective Association of Missouri",
      profileUrl: "https://apamo.org/adopt/adoptable-pets/?petID=A999999",
      orgUrl: "https://apamo.org/",
      orgUrlKind: "website",
      adoption: {
        ...emptyAdoptionUrl(),
        adoptionProfileUrlStatus: "name-mismatch",
        rescueWebsiteUrl: "https://apamo.org/",
        rescueWebsiteUrlKind: "website",
      },
    });
    expect(dest.type).toBe("shelter-fallback");
    expect(dest.url).toBe("https://apamo.org/");
  });

  it("normalizeApaPetId accepts both APA id generations and rejects junk", () => {
    // Legacy PetPoint ids — what RescueGroups still publishes.
    expect(normalizeApaPetId("A318825")).toBe("A318825");
    // Current Shelterluv ids — what apamo.org itself uses since the 2026
    // migration. Rejecting these (as this test used to require) would mean
    // that the moment APA's real ids reach us, every one is thrown away.
    // Shape says "this names a pet"; APA's official feed says whether that
    // pet is still there.
    expect(normalizeApaPetId("2480")).toBe("2480");
    expect(normalizeApaPetId("318825")).toBe("318825");
    expect(normalizeApaPetId("")).toBeNull();
    expect(normalizeApaPetId("not-an-id")).toBeNull();
    expect(normalizeApaPetId("A12")).toBeNull();
    expect(normalizeApaPetId(undefined)).toBeNull();
  });

  it("the rule is narrow to apamo.org — a lookalike host is untouched", () => {
    expect(
      classifyAdoptionUrl("https://not-apamo.org/adopt/adoptable-pets/?petID=A318825", null),
    ).not.toBe("animal-list");
    // Falls through to the generic deep-path candidate rule, unaffected by
    // the APA-specific carve-out (still a candidate profile — this is not
    // apamo.org's affected host).
  });
});
