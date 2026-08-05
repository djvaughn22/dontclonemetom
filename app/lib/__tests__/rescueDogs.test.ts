import { describe, expect, it } from "vitest";
import { resolveDogDestination } from "../dogDestination";
import {
  hasOwnListing,
  normalizeDog,
  normalizeHttpUrl,
  resolveDogUrl,
  resolveRelativeProfileUrl,
} from "../rescueDogs";

// Minimal RescueGroups JSON:API animal + org fixtures.
function rgAnimal(overrides: {
  id?: string;
  attributes?: Record<string, unknown>;
  org?: Record<string, unknown> | null;
}) {
  const id = overrides.id ?? "12030390";
  const included = new Map<string, Record<string, unknown>>();
  if (overrides.org !== null) {
    included.set("orgs:900", overrides.org ?? { name: "Wildwood Rescue", url: "http://wildwoodrescue.example.org" });
  }
  const relationships: Record<string, { data?: { type: string; id: string }[] }> =
    overrides.org === null ? {} : { orgs: { data: [{ type: "orgs", id: "900" }] } };
  return {
    animal: {
      type: "animals",
      id,
      attributes: { name: "Dottie", breedString: "Beagle", ...overrides.attributes },
      relationships,
    },
    included,
  };
}

describe("normalizeHttpUrl — only real fetchable web URLs survive", () => {
  it("keeps http and https URLs", () => {
    expect(normalizeHttpUrl("https://rescue.example.org/dogs/bella")).toBe(
      "https://rescue.example.org/dogs/bella",
    );
    expect(normalizeHttpUrl("http://rescue.example.org")).toBe("http://rescue.example.org/");
  });

  it("repairs a scheme-less website instead of discarding it (www.nttsars.com bug)", () => {
    expect(normalizeHttpUrl("www.nttsars.com")).toBe("https://www.nttsars.com/");
    expect(normalizeHttpUrl("example.org/adopt")).toBe("https://example.org/adopt");
  });

  it("rejects empty, placeholder, malformed, and non-http values", () => {
    expect(normalizeHttpUrl("")).toBeNull();
    expect(normalizeHttpUrl("   ")).toBeNull();
    expect(normalizeHttpUrl(null)).toBeNull();
    expect(normalizeHttpUrl(undefined)).toBeNull();
    expect(normalizeHttpUrl(42)).toBeNull();
    expect(normalizeHttpUrl("n/a")).toBeNull();
    expect(normalizeHttpUrl("none")).toBeNull();
    expect(normalizeHttpUrl("not a url")).toBeNull();
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeHttpUrl("mailto:dogs@example.org")).toBeNull();
    expect(normalizeHttpUrl("ftp://example.org")).toBeNull();
    expect(normalizeHttpUrl("http://")).toBeNull();
  });

  it("does not reject shelter-hosted listing pages that share the org domain", () => {
    expect(
      normalizeHttpUrl("https://straypawsrescue.rescuegroups.org/animals/detail?AnimalID=12030390"),
    ).toBe("https://straypawsrescue.rescuegroups.org/animals/detail?AnimalID=12030390");
  });
});

describe("resolveDogUrl — the dog's own page always beats the rescue's page", () => {
  it("an individual shelter-hosted dog page beats the shelter homepage", () => {
    expect(
      resolveDogUrl({
        profileUrl: "https://rescue.example.org/animals/detail?AnimalID=1",
        orgUrl: "https://rescue.example.org/",
      }),
    ).toBe("https://rescue.example.org/animals/detail?AnimalID=1");
  });

  it("a Petfinder dog profile beats the organization homepage", () => {
    expect(
      resolveDogUrl({
        profileUrl: "https://www.petfinder.com/dog/bella-12345/mo/st-louis/rescue-mo123/",
        orgUrl: "https://rescue.example.org/",
      }),
    ).toBe("https://www.petfinder.com/dog/bella-12345/mo/st-louis/rescue-mo123/");
  });

  it("uses the organization URL only when no dog-specific URL exists", () => {
    expect(resolveDogUrl({ profileUrl: null, orgUrl: "https://rescue.example.org/" })).toBe(
      "https://rescue.example.org/",
    );
  });

  it("is empty (never a broken href) when neither exists", () => {
    expect(resolveDogUrl({ profileUrl: null, orgUrl: null })).toBe("");
  });
});

describe("hasOwnListing — fallback actions are labeled differently", () => {
  it("distinguishes a verified individual listing from a rescue fallback", () => {
    expect(hasOwnListing({ profileUrl: "https://rescue.example.org/dogs/1" })).toBe(true);
    expect(hasOwnListing({ profileUrl: null })).toBe(false);
  });
});

describe("normalizeDog — URL handling from the raw API record", () => {
  it("keeps the animal URL as profileUrl and the org URL separately", () => {
    const { animal, included } = rgAnimal({
      attributes: { url: "https://wildwoodrescue.rescuegroups.org/animals/detail?AnimalID=12030390" },
      org: { name: "Wildwood Rescue", url: "http://www.wildwoodrescue.example.org" },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.profileUrl).toBe(
      "https://wildwoodrescue.rescuegroups.org/animals/detail?AnimalID=12030390",
    );
    expect(dog.orgUrl).toBe("http://www.wildwoodrescue.example.org/");
    // Card destination = the dog's own page, never the org page.
    expect(dog.url).toBe(dog.profileUrl);
  });

  it("never lets an org URL overwrite an existing individual URL", () => {
    const { animal, included } = rgAnimal({
      attributes: { url: "https://rescue.example.org/animals/detail?AnimalID=7" },
      org: {
        name: "Rescue",
        url: "https://rescue.example.org/",
        adoptionUrl: "https://rescue.example.org/adoptable-dogs",
      },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.url).toBe("https://rescue.example.org/animals/detail?AnimalID=7");
  });

  it("prefers the org's adoptable-dogs page over its homepage for the fallback", () => {
    const { animal, included } = rgAnimal({
      org: {
        name: "Rescue",
        url: "https://rescue.example.org/",
        adoptionUrl: "https://rescue.example.org/adoptable-dogs",
      },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.profileUrl).toBeNull();
    expect(dog.orgUrl).toBe("https://rescue.example.org/adoptable-dogs");
    expect(dog.url).toBe("https://rescue.example.org/adoptable-dogs");
  });

  it("repairs a scheme-less org website so the fallback still works", () => {
    const { animal, included } = rgAnimal({
      org: { name: "No Time to Spare", url: "www.nttsars.com" },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.orgUrl).toBe("https://www.nttsars.com/");
    expect(dog.url).toBe("https://www.nttsars.com/");
  });

  it("ignores malformed URLs safely and falls back to the org", () => {
    const { animal, included } = rgAnimal({
      attributes: { url: "not a url" },
      org: { name: "Rescue", url: "https://rescue.example.org/" },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.profileUrl).toBeNull();
    expect(dog.url).toBe("https://rescue.example.org/");
  });

  it("demotes Mastino per-dog URLs (dead host) even though they look dog-specific, keeping the source URL", () => {
    for (const url of [
      "https://mastinorescue.rescuegroups.org/animals/detail?AnimalID=20515053",
      "https://www.mastino-rescue-inc.org/animals/detail.php?AnimalID=20515053",
    ]) {
      const { animal, included } = rgAnimal({
        attributes: { name: "Adolfo", url },
        org: { name: "Mastino Rescue, Inc.", url: "http://www.mastino-rescue-inc.org/" },
      });
      const dog = normalizeDog(animal, included);
      // Never presented as the dog's own page while the host is blocked…
      expect(dog.profileUrl).toBeNull();
      expect(dog.url).toBe("http://www.mastino-rescue-inc.org/");
      // …but the exact source URL (AnimalID included) is preserved for rechecking.
      expect(dog.sourceProfileUrl).toBe(url);
      // The visitor-facing label is the honest rescue fallback, never "Meet".
      const dest = resolveDogDestination(dog);
      expect(dest.type).toBe("shelter-fallback");
      expect(dest.label).toBe("Visit the rescue");
      expect(dest.label).not.toContain("Meet");
    }
  });

  it("drops per-dog URLs on a known-dead mini-site host and falls back to the rescue", () => {
    const { animal, included } = rgAnimal({
      attributes: { url: "https://straypawsrescue.rescuegroups.org/animals/detail?AnimalID=12030390" },
      org: { name: "Stray Paws", url: "http://www.straypawsrescue.com" },
    });
    included.set("orgs:8121", included.get("orgs:900")!);
    animal.relationships = { orgs: { data: [{ type: "orgs", id: "8121" }] } };
    const dog = normalizeDog(animal, included);
    expect(dog.profileUrl).toBeNull();
    // Org override: their verified adoptable-animals page, not the dead mini-site.
    expect(dog.url).toBe("https://www.straypawsrescue.com/animals");
  });

  it("applies verified org URL corrections for dead upstream org sites", () => {
    const { animal, included } = rgAnimal({
      org: { name: "St Charles County Humane Services", url: "http://www.scchealth.org/docs/hs/index.html" },
    });
    included.set("orgs:3085", included.get("orgs:900")!);
    animal.relationships = { orgs: { data: [{ type: "orgs", id: "3085" }] } };
    const dog = normalizeDog(animal, included);
    expect(dog.url).toBe("https://24petconnect.com/STCHAdopt?at=DOG");
  });

  it("demotes an animal URL that is really the org homepage — it never poses as a profile", () => {
    const { animal, included } = rgAnimal({
      attributes: { url: "https://rescue.example.org/" },
      org: { name: "Rescue", url: "https://rescue.example.org/" },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.profileUrl).toBeNull();
    expect(dog.url).toBe("https://rescue.example.org/");
    expect(dog.orgUrlKind).toBe("website");
  });

  it("demotes an animal URL that is a bare adoptable-list page", () => {
    const { animal, included } = rgAnimal({
      attributes: { url: "https://rescue.example.org/animals" },
      org: { name: "Rescue", url: "https://other.example.org/" },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.profileUrl).toBeNull();
    expect(dog.url).toBe("https://other.example.org/");
  });

  it("records whether the fallback is an adoptable-list or just the website", () => {
    const list = rgAnimal({
      org: { name: "Rescue", url: "https://r.org/", adoptionUrl: "https://r.org/adoptable-dogs" },
    });
    expect(normalizeDog(list.animal, list.included).orgUrlKind).toBe("adoptable-list");

    const site = rgAnimal({ org: { name: "Rescue", url: "https://r.org/" } });
    expect(normalizeDog(site.animal, site.included).orgUrlKind).toBe("website");

    const none = rgAnimal({ org: { name: "Rescue", url: "n/a" } });
    expect(normalizeDog(none.animal, none.included).orgUrlKind).toBeNull();
  });

  it("marks verified org overrides as adoptable-list fallbacks", () => {
    const { animal, included } = rgAnimal({
      org: { name: "St Charles County Humane Services", url: "http://www.scchealth.org/" },
    });
    included.set("orgs:3085", included.get("orgs:900")!);
    animal.relationships = { orgs: { data: [{ type: "orgs", id: "3085" }] } };
    const dog = normalizeDog(animal, included);
    expect(dog.url).toBe("https://24petconnect.com/STCHAdopt?at=DOG");
    expect(dog.orgUrlKind).toBe("adoptable-list");
  });

  it("preserves the dog-specific URL end to end: feed → normalize → destination", () => {
    const url = "https://rescue.example.org/animals/detail?AnimalID=22194580";
    const { animal, included } = rgAnimal({
      attributes: { name: "Ramsey", url },
      org: { name: "Country Acres Rescue", url: "http://countryacresrescue.org/" },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.profileUrl).toBe(url);
    expect(dog.sourceProfileUrl).toBe(url);
    const dest = resolveDogDestination(dog);
    expect(dest.type).toBe("exact-dog");
    expect(dest.url).toBe(url);
    expect(dest.label).toBe("Meet Ramsey");
  });

  it("resolves a relative profile path against the rescue's site instead of losing the dog", () => {
    expect(
      resolveRelativeProfileUrl("/animals/detail?AnimalID=5", "https://rescue.example.org/about"),
    ).toBe("https://rescue.example.org/animals/detail?AnimalID=5");
    expect(resolveRelativeProfileUrl("/x", null)).toBeNull();
    expect(resolveRelativeProfileUrl("//evil.example.org/x", "https://rescue.example.org/")).toBeNull();

    const { animal, included } = rgAnimal({
      attributes: { name: "Ramsey", url: "/animals/detail?AnimalID=5" },
      org: { name: "Rescue", url: "https://rescue.example.org/" },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.profileUrl).toBe("https://rescue.example.org/animals/detail?AnimalID=5");
  });

  it("demotes an animal URL that is the homepage wearing tracking params", () => {
    const { animal, included } = rgAnimal({
      attributes: { url: "https://countryacres.example.org/?fbclid=abc123" },
      org: { name: "Country Acres Rescue", url: "https://other.example.org/" },
    });
    const dog = normalizeDog(animal, included);
    expect(dog.profileUrl).toBeNull();
    expect(dog.sourceProfileUrl).toBe("https://countryacres.example.org/?fbclid=abc123");
    expect(resolveDogDestination(dog).type).toBe("shelter-fallback");
  });

  it("demotes search and application 'profile' URLs, keeping the source for rechecks", () => {
    for (const url of [
      "https://rescue.example.org/search",
      "https://rescue.example.org/pet-search",
      "https://rescue.example.org/adoption-application",
      "https://rescue.example.org/contact-us",
    ]) {
      const { animal, included } = rgAnimal({
        attributes: { url },
        org: { name: "Rescue", url: "https://other.example.org/" },
      });
      const dog = normalizeDog(animal, included);
      expect(dog.profileUrl).toBeNull();
      expect(dog.sourceProfileUrl).toBe(url);
      expect(dog.url).toBe("https://other.example.org/");
    }
  });

  it("keeps a dog with no discoverable URL at all — never filtered out", () => {
    const { animal, included } = rgAnimal({ org: { name: "Rescue", url: "n/a" } });
    const dog = normalizeDog(animal, included);
    expect(dog.name).toBe("Dottie");
    expect(dog.profileUrl).toBeNull();
    expect(dog.orgUrl).toBeNull();
    expect(dog.url).toBe("");
  });

  it("uses hand-verified adoption URL overrides when RescueGroups lacks individual dog URLs", () => {
    // Paco (Spencer Pet Rescue) — verified GetBuddy page (2026-08-04 audit)
    const { animal, included } = rgAnimal({
      id: "22649663",
      attributes: { name: "Paco" },
      org: { name: "Spencer Pet Rescue", url: "http://spencerpetrescue.info/" },
    });
    const dog = normalizeDog(animal, included);
    // Verify the override was applied: no individual URL from RG, but GetBuddy
    // from override is now the profileUrl
    expect(dog.profileUrl).toBe(
      "https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile"
    );
    expect(dog.url).toBe(
      "https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile"
    );
    // Verify the modal CTA shows the exact dog, not the generic rescue
    const dest = resolveDogDestination(dog);
    expect(dest.type).toBe("exact-dog");
    expect(dest.label).toBe("Meet Paco");
    expect(dest.url).toContain("getbuddy.com");
    expect(dest.url).toContain("699d5d19e7817824d57fc1de");
  });

  it("prioritizes RescueGroups individual URLs over overrides when both exist", () => {
    // If RG ever provides a URL, it wins. Override is fallback only.
    const rgUrl = "https://rescue.example.org/animals/detail?AnimalID=22649663";
    const { animal, included } = rgAnimal({
      id: "22649663",
      attributes: { name: "Paco", url: rgUrl },
      org: { name: "Spencer Pet Rescue", url: "http://spencerpetrescue.info/" },
    });
    const dog = normalizeDog(animal, included);
    // RG URL wins
    expect(dog.profileUrl).toBe(rgUrl);
    expect(dog.url).toBe(rgUrl);
  });
});
