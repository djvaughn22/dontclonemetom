import { describe, expect, it } from "vitest";
import {
  buildDogCaption,
  DCMT_BRAND,
  eligibleDogs,
  listingIdLine,
  selectDogForDate,
} from "../dogOfTheDay";
import {
  captionMarkerForDate,
  chicagoDateKey,
  isValidDateKey,
  validateDailySocialPost,
  withInstagramUtm,
} from "../dailySocialCore";
import type { Dog } from "../rescueDogs";
import { emptyAdoptionUrl } from "../adoptionUrlSchema";

function dog(overrides: Partial<Dog>): Dog {
  return {
    id: "1",
    name: "Billy",
    breed: "Mixed",
    age: "Adult",
    sex: "Male",
    size: "Medium",
    photo: "https://cdn.rescuegroups.org/billy.jpg",
    photos: ["https://cdn.rescuegroups.org/billy.jpg"],
    city: "Wildwood, MO",
    distance: 3,
    rescueId: null,
    adoption: {
      ...emptyAdoptionUrl(),
      adoptionProfileUrl: "https://rescue.example.org/billy",
      adoptionProfileUrlStatus: "verified-direct-dog-page",
      adoptionProfileUrlSource: "rescue-owned-site",
    },
    profileUrl: "https://rescue.example.org/billy",
    sourceProfileUrl: "https://rescue.example.org/billy",
    orgUrl: "https://rescue.example.org/",
    orgUrlKind: "website",
    url: "https://rescue.example.org/billy",
    org: "Wildwood Rescue",
    orgCity: "Wildwood, MO",
    email: null,
    desc: "",
    facts: [],
    ...overrides,
  };
}

describe("eligibility — never publish an incomplete dog", () => {
  it("keeps only dogs with photo, real name, rescue, place, and listing URL", () => {
    const dogs = [
      dog({ id: "1" }),
      dog({ id: "2", photo: null }),
      dog({ id: "3", name: "" }),
      dog({ id: "4", org: "" }),
      dog({ id: "5", city: "", orgCity: "" }),
      dog({ id: "6", url: "" }),
      dog({ id: "1" }), // duplicate id
    ];

    expect(eligibleDogs(dogs).map((d) => d.id)).toEqual(["1"]);
  });

  it("2026-08-10 lock: never features a dog without a verified direct link — unverified, generic, dead, or name-mismatch are all excluded", () => {
    const dogs = [
      dog({ id: "verified" }),
      dog({ id: "unverified", adoption: emptyAdoptionUrl() }),
      dog({
        id: "dead",
        adoption: { ...emptyAdoptionUrl(), adoptionProfileUrlStatus: "dead-or-removed" },
      }),
      dog({
        id: "mismatch",
        adoption: { ...emptyAdoptionUrl(), adoptionProfileUrlStatus: "name-mismatch" },
      }),
      dog({
        id: "no-url-but-marked-verified",
        adoption: { ...emptyAdoptionUrl(), adoptionProfileUrlStatus: "verified-direct-dog-page", adoptionProfileUrl: null },
      }),
    ];

    expect(eligibleDogs(dogs).map((d) => d.id)).toEqual(["verified"]);
  });
});

describe("deterministic daily selection", () => {
  const pool = ["11", "22", "33", "44", "55"].map((id) => dog({ id }));

  it("same date + same pool → same dog", () => {
    const a = selectDogForDate("2026-07-12", pool, new Set());
    const b = selectDogForDate("2026-07-12", pool, new Set());
    expect(a?.id).toBe(b?.id);
  });

  it("skips recently featured dogs", () => {
    const first = selectDogForDate("2026-07-12", pool, new Set());
    const second = selectDogForDate("2026-07-12", pool, new Set([first!.id]));
    expect(second).not.toBeNull();
    expect(second!.id).not.toBe(first!.id);
  });

  it("offset steps to the next eligible dog (admin 'choose another')", () => {
    const first = selectDogForDate("2026-07-12", pool, new Set(), 0);
    const alt = selectDogForDate("2026-07-12", pool, new Set(), 1);
    expect(alt!.id).not.toBe(first!.id);
  });

  it("returns null when nothing is eligible", () => {
    expect(selectDogForDate("2026-07-12", [dog({ photo: null })], new Set())).toBeNull();
    expect(
      selectDogForDate("2026-07-12", pool, new Set(pool.map((d) => d.id))),
    ).toBeNull();
  });

  it("single-dog pool: spinning past the only eligible dog fails gracefully (null), never a crash", () => {
    const single = [dog({ id: "only" })];
    expect(selectDogForDate("2026-07-12", single, new Set(), 0)!.id).toBe("only");
    expect(selectDogForDate("2026-07-12", single, new Set(), 1)).toBeNull();
  });
});

describe("caption parity", () => {
  const billy = dog({ id: "777" });
  const caption = buildDogCaption("2026-07-12", billy);

  it("starts with the duplicate-ledger marker", () => {
    expect(caption.startsWith(captionMarkerForDate(DCMT_BRAND, "2026-07-12"))).toBe(true);
  });

  it("carries only verified facts: name, city, rescue, listing id", () => {
    expect(caption).toContain("Meet Billy.");
    expect(caption).toContain("Wildwood, MO");
    expect(caption).toContain("Wildwood Rescue");
    expect(caption).toContain(listingIdLine(billy));
    expect(caption).toContain("#AdoptDontShop");
  });

  it("passes the engine's parity validation", () => {
    const post = {
      brand: DCMT_BRAND.brand,
      date: "2026-07-12",
      fullDate: "Sunday, July 12, 2026",
      timezone: "America/Chicago",
      version: DCMT_BRAND.version,
      contentId: billy.id,
      typeLabel: "Dog of the Day",
      title: billy.name,
      caption,
      hashtags: DCMT_BRAND.hashtags,
      imagePath: "/api/social/dog-of-the-day/2026-07-12.png",
      imageFileName: "dog-of-the-day-2026-07-12-1080x1350.png",
      pagePath: `/dogs/${billy.id}`,
      parityKeys: [billy.name, billy.city, billy.org, listingIdLine(billy)],
    };

    expect(validateDailySocialPost(DCMT_BRAND, post)).toEqual([]);
  });
});

describe("engine shared utilities", () => {
  it("chicago date key is a valid date key", () => {
    expect(isValidDateKey(chicagoDateKey())).toBe(true);
  });

  it("adds consistent Instagram UTMs", () => {
    const url = withInstagramUtm("https://dontclonemetom.com/dogs/1", "dontclonemetom");
    expect(url).toContain("utm_source=instagram");
    expect(url).toContain("utm_campaign=daily-dontclonemetom");
  });
});
