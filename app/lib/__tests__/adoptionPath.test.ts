import { describe, expect, it } from "vitest";
import { cleanPrefs, hasFilters, matchesFilters, NO_FILTERS, sortDogs } from "../dogFilters";
import { listedSinceLabel, listingAgeDays, listingBadge } from "../listingAge";
import { rescueEmailHref } from "../rescueContact";

const now = Date.parse("2026-11-07T18:00:00Z");
const dog = (over: Partial<{ id: string; size: string; sex: string; ageGroup: string; facts: string[]; listedAt: string | null }> = {}) => ({
  id: "1",
  size: "Medium",
  sex: "Female",
  ageGroup: "Adult",
  facts: [] as string[],
  listedAt: "2025-03-01T12:00:00Z" as string | null,
  ...over,
});

describe("homepage filters — only what the rescue reported", () => {
  it("matches size, age, sex and good-with on the feed's own values", () => {
    const prefs = { ...NO_FILTERS, size: "Medium", age: "Adult", sex: "Female", goodWith: "kids" };
    expect(matchesFilters(dog({ facts: ["Good with kids"] }), prefs)).toBe(true);
    expect(matchesFilters(dog({ facts: [] }), prefs)).toBe(false); // the rescue didn't say
    expect(matchesFilters(dog({ facts: ["Better without young kids"] }), prefs)).toBe(false);
    expect(matchesFilters(dog({ size: "", facts: ["Good with kids"] }), prefs)).toBe(false);
    expect(matchesFilters(dog(), NO_FILTERS)).toBe(true);
  });

  it("ignores saved settings it doesn't recognize instead of hiding every dog", () => {
    expect(cleanPrefs({ size: "Huge", age: "Senior", sort: "random", goodWith: "cats" })).toEqual({
      ...NO_FILTERS,
      age: "Senior",
      goodWith: "cats",
    });
    expect(cleanPrefs("garbage")).toEqual(NO_FILTERS);
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, sort: "long" })).toBe(false); // sorting isn't filtering
  });

  it("sorts by listing date both ways, keeps the feed's distance order by default, and puts unknown dates last", () => {
    const dogs = [
      dog({ id: "mid", listedAt: "2025-06-01T00:00:00Z" }),
      dog({ id: "none", listedAt: null }),
      dog({ id: "old", listedAt: "2022-02-28T00:00:00Z" }),
      dog({ id: "new", listedAt: "2026-11-01T00:00:00Z" }),
    ];
    expect(sortDogs(dogs, "near").map((d) => d.id)).toEqual(["mid", "none", "old", "new"]);
    expect(sortDogs(dogs, "long").map((d) => d.id)).toEqual(["old", "mid", "new", "none"]);
    expect(sortDogs(dogs, "new").map((d) => d.id)).toEqual(["new", "mid", "old", "none"]);
  });
});

describe("listing dates — 'Listed since', never time in a shelter", () => {
  it("labels the month and year in Chicago time", () => {
    // 03:09 UTC on Mar 1 is still Feb 28 in St. Louis.
    expect(listedSinceLabel("2022-03-01T03:09:18Z", now)).toBe("Listed since Feb 2022");
    expect(listedSinceLabel(null, now)).toBeNull();
    expect(listedSinceLabel("not a date", now)).toBeNull();
    expect(listedSinceLabel("2026-12-01T00:00:00Z", now)).toBeNull(); // future date: say nothing
  });

  it("tags only new listings and listings over a year old", () => {
    expect(listingBadge("2026-11-01T12:00:00Z", now)).toEqual({ kind: "new", text: "New listing" });
    expect(listingBadge("2026-06-01T12:00:00Z", now)).toBeNull();
    expect(listingBadge("2024-08-10T12:00:00Z", now)).toEqual({ kind: "long", text: "Listed since 2024" });
    expect(listingAgeDays("2026-11-06T18:00:00Z", now)).toBe(1);
  });
});

describe("Email the rescue", () => {
  it("names the dog, links her listing and gives her listing id, without promising anything", () => {
    const href = rescueEmailHref(
      { id: "22780465", name: "Chianti", org: "Camp Chaos Puppy Rescue", email: "adopt@example.org" },
      { type: "exact-dog", url: "https://campchaospuppyrescue.rescuegroups.org/animals/detail?AnimalID=22780465" },
    );
    expect(href.startsWith("mailto:adopt@example.org?subject=Asking%20about%20Chianti&body=")).toBe(true);
    const body = decodeURIComponent(href.split("&body=")[1]);
    expect(body).toContain("Hi Camp Chaos Puppy Rescue,");
    expect(body).toContain("Chianti's listing: https://campchaospuppyrescue.rescuegroups.org/animals/detail?AnimalID=22780465");
    expect(body).toContain("RescueGroups listing ID: 22780465");
    expect(body).not.toMatch(/fee|guarantee|today|hours/i);
  });

  it("leaves out the listing link when it isn't the dog's own page", () => {
    const href = rescueEmailHref(
      { id: "5", name: "Billy", org: "", email: "a@b.org" },
      { type: "shelter-fallback", url: "https://rescue.example.org/" },
    );
    const body = decodeURIComponent(href.split("&body=")[1]);
    expect(body).toContain("Hi there,");
    expect(body).not.toContain("rescue.example.org");
  });
});
