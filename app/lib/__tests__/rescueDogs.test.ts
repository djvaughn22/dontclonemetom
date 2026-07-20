import { describe, expect, it } from "vitest";
import {
  hasOwnListing,
  normalizeDog,
  normalizeHttpUrl,
  resolveDogUrl,
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

  it("keeps a dog with no discoverable URL at all — never filtered out", () => {
    const { animal, included } = rgAnimal({ org: { name: "Rescue", url: "n/a" } });
    const dog = normalizeDog(animal, included);
    expect(dog.name).toBe("Dottie");
    expect(dog.profileUrl).toBeNull();
    expect(dog.orgUrl).toBeNull();
    expect(dog.url).toBe("");
  });
});
