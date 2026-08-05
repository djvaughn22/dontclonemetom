import { describe, expect, it } from "vitest";
import { classifyAdoptionUrl, isGenericAnimalUrl, resolveDogDestination } from "../dogDestination";
import { resolveDogUrl } from "../rescueDogs";

const base = {
  name: "Bella",
  org: "Wildwood Rescue",
  profileUrl: null as string | null,
  orgUrl: null as string | null,
  orgUrlKind: null as "adoptable-list" | "website" | null,
};

describe("resolveDogDestination — the exact dog always wins", () => {
  it("the dog's own page beats the shelter homepage", () => {
    const dest = resolveDogDestination({
      ...base,
      profileUrl: "https://rescue.example.org/animals/detail?AnimalID=12030390",
      orgUrl: "https://rescue.example.org/",
      orgUrlKind: "website",
    });
    expect(dest.type).toBe("exact-dog");
    expect(dest.url).toBe("https://rescue.example.org/animals/detail?AnimalID=12030390");
  });

  it("the dog's own page beats a broad adoptable-dogs listing", () => {
    const dest = resolveDogDestination({
      ...base,
      profileUrl: "https://www.petfinder.com/dog/bella-12345/mo/st-louis/rescue-mo123/",
      orgUrl: "https://rescue.example.org/adoptable-dogs",
      orgUrlKind: "adoptable-list",
    });
    expect(dest.type).toBe("exact-dog");
    expect(dest.url).toBe("https://www.petfinder.com/dog/bella-12345/mo/st-louis/rescue-mo123/");
  });

  it("preserves the source listing id — query params are never stripped", () => {
    const url = "https://needypaws.rescuegroups.org/animals/detail?AnimalID=21306838";
    const dest = resolveDogDestination({ ...base, profileUrl: url });
    expect(dest.url).toBe(url);
    expect(dest.url).toContain("AnimalID=21306838");
  });

  it("labels the exact dog honestly and says the link leaves the site", () => {
    const dest = resolveDogDestination({ ...base, profileUrl: "https://r.org/a?AnimalID=1" });
    expect(dest.label).toBe("Meet Bella");
    expect(dest.ariaLabel).toContain("Bella");
    expect(dest.ariaLabel).toContain("new tab");
  });

  it("handles names with spaces and punctuation without touching the URL", () => {
    for (const name of ["Beans  *Special Needs*", "Nala aka Bonnie", "Murphy aka WC Babe Pup-Berte", "O'Malley"]) {
      const url = "https://r.org/animals/detail?AnimalID=77";
      const dest = resolveDogDestination({ ...base, name, profileUrl: url });
      expect(dest.url).toBe(url);
      expect(dest.label).toBe(`Meet ${name.trim()}`);
    }
  });
});

describe("resolveDogDestination — two dogs with the same name never share a generated URL", () => {
  it("a same-named dog without its own page falls back, never borrows the other's page", () => {
    const layla1 = resolveDogDestination({
      ...base,
      name: "LAYLA",
      profileUrl: "https://r.org/animals/detail?AnimalID=100",
    });
    const layla2 = resolveDogDestination({
      ...base,
      name: "LAYLA",
      orgUrl: "https://apamo.org/",
      orgUrlKind: "website",
    });
    expect(layla1.type).toBe("exact-dog");
    expect(layla2.type).toBe("shelter-fallback");
    expect(layla2.url).not.toBe(layla1.url);
    // No URL is ever built from a dog's name.
    expect(layla2.url).not.toContain("LAYLA");
    expect(layla2.url.toLowerCase()).not.toContain("layla");
  });

  it("same-named dogs with distinct listing ids keep distinct destinations", () => {
    const a = resolveDogDestination({ ...base, profileUrl: "https://r.org/a?AnimalID=1" });
    const b = resolveDogDestination({ ...base, profileUrl: "https://r.org/a?AnimalID=2" });
    expect(a.url).not.toBe(b.url);
  });
});

describe("resolveDogDestination — fallbacks are identified and labeled honestly", () => {
  it("an adoptable-dogs page is a shelter-fallback labeled as listings, never as the dog", () => {
    const dest = resolveDogDestination({
      ...base,
      orgUrl: "https://www.straypawsrescue.com/animals",
      orgUrlKind: "adoptable-list",
    });
    expect(dest.type).toBe("shelter-fallback");
    expect(dest.fallbackKind).toBe("adoptable-list");
    expect(dest.label).toBe("View shelter listings");
    expect(dest.label).not.toContain("Meet");
    expect(dest.ariaLabel).toContain("look for Bella");
  });

  it("a rescue website is a shelter-fallback labeled as the rescue, never as the dog", () => {
    const dest = resolveDogDestination({
      ...base,
      orgUrl: "https://www.nttsars.com/",
      orgUrlKind: "website",
    });
    expect(dest.type).toBe("shelter-fallback");
    expect(dest.fallbackKind).toBe("website");
    expect(dest.label).toBe("Visit the rescue");
    expect(dest.label).not.toContain("Meet");
  });

  it("no URL at all resolves to type none with empty url — nothing to render, no crash", () => {
    const dest = resolveDogDestination({ ...base });
    expect(dest.type).toBe("none");
    expect(dest.url).toBe("");
    expect(dest.label).toBe("");
  });

  it("missing or blank names still resolve without crashing", () => {
    const dest = resolveDogDestination({ ...base, name: "  ", profileUrl: "https://r.org/a?AnimalID=9" });
    expect(dest.type).toBe("exact-dog");
    expect(dest.label).toBe("Meet this dog");
  });

  it("agrees with resolveDogUrl on the destination URL for every case", () => {
    const cases = [
      { profileUrl: "https://r.org/a?AnimalID=1", orgUrl: "https://r.org/" },
      { profileUrl: null, orgUrl: "https://r.org/" },
      { profileUrl: null, orgUrl: null },
    ];
    for (const c of cases) {
      expect(resolveDogDestination({ ...base, ...c }).url).toBe(resolveDogUrl(c));
    }
  });
});

describe("isGenericAnimalUrl — generic pages cannot masquerade as a dog's own profile", () => {
  it("flags homepages and bare adoptable-list paths", () => {
    expect(isGenericAnimalUrl("https://rescue.example.org/", null)).toBe(true);
    expect(isGenericAnimalUrl("https://rescue.example.org/animals", null)).toBe(true);
    expect(isGenericAnimalUrl("https://rescue.example.org/animals/", null)).toBe(true);
    expect(isGenericAnimalUrl("https://rescue.example.org/adopt", null)).toBe(true);
    expect(isGenericAnimalUrl("https://rescue.example.org/adoptable-dogs", null)).toBe(true);
    expect(isGenericAnimalUrl("https://rescue.example.org/search", null)).toBe(true);
  });

  it("flags a 'profile' URL that is really the same page as the org fallback", () => {
    expect(
      isGenericAnimalUrl("https://rescue.example.org/our-dogs", "https://rescue.example.org/our-dogs/"),
    ).toBe(true);
  });

  it("keeps real individual pages — ids in the query or a deep path", () => {
    expect(
      isGenericAnimalUrl("https://rescue.example.org/animals/detail?AnimalID=12030390", "https://rescue.example.org/"),
    ).toBe(false);
    expect(
      isGenericAnimalUrl("https://www.petfinder.com/dog/bella-12345/mo/st-louis/rescue-mo123/", null),
    ).toBe(false);
    expect(isGenericAnimalUrl("https://24petconnect.com/STCHAdopt?at=DOG&id=55", null)).toBe(false);
  });

  it("treats malformed URLs as generic (never trusted as a profile)", () => {
    expect(isGenericAnimalUrl("not a url", null)).toBe(true);
  });
});

describe("classifyAdoptionUrl — every destination kind is told apart", () => {
  it("individual animal profiles: id params and per-animal paths", () => {
    expect(classifyAdoptionUrl("https://r.org/animals/detail?AnimalID=123", null)).toBe("animal-profile");
    expect(classifyAdoptionUrl("https://r.org/anything?petid=44", null)).toBe("animal-profile");
    expect(classifyAdoptionUrl("https://www.petfinder.com/dog/bella-12345/mo/st-louis/rescue-mo123/", null)).toBe("animal-profile");
    expect(classifyAdoptionUrl("https://r.org/dogs/bella.html", null)).toBe("animal-profile");
  });

  it("organization homepages, with or without tracking params", () => {
    expect(classifyAdoptionUrl("https://countryacresrescue.org/", null)).toBe("org-homepage");
    expect(classifyAdoptionUrl("https://countryacresrescue.org/?fbclid=xyz", null)).toBe("org-homepage");
    expect(classifyAdoptionUrl("https://www.petfinder.com/member/us/mo/st-louis/rescue-mo123/", null)).toBe("org-homepage");
    expect(classifyAdoptionUrl("https://www.facebook.com/countryacresrescue", null)).toBe("org-homepage");
  });

  it("general animal-listing pages", () => {
    expect(classifyAdoptionUrl("https://r.org/adoptable-dogs", null)).toBe("animal-list");
    expect(classifyAdoptionUrl("https://r.org/our-dogs", null)).toBe("animal-list");
    expect(classifyAdoptionUrl("https://r.org/available-pets/", null)).toBe("animal-list");
  });

  it("search pages", () => {
    expect(classifyAdoptionUrl("https://r.org/search", null)).toBe("search");
    expect(classifyAdoptionUrl("https://r.org/pet-search?type=dog", null)).toBe("search");
  });

  it("application and contact pages", () => {
    expect(classifyAdoptionUrl("https://r.org/adoption-application", null)).toBe("application");
    expect(classifyAdoptionUrl("https://r.org/contact-us", null)).toBe("application");
    expect(classifyAdoptionUrl("https://r.org/forms", null)).toBe("application");
  });

  it("the org fallback page itself, and junk", () => {
    expect(classifyAdoptionUrl("https://r.org/our-dogs", "https://r.org/our-dogs/")).toBe("org-page");
    expect(classifyAdoptionUrl("not a url", null)).toBe("invalid");
    expect(classifyAdoptionUrl("javascript:alert(1)", null)).toBe("invalid");
  });
});
