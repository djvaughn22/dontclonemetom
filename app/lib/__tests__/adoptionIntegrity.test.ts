import { beforeEach, describe, expect, it } from "vitest";
import {
  applyOfficialAvailability,
  eligibleDogsForTest,
  isPubliclyEligible,
  type Dog,
} from "./integrityFixtures";
import { normalizeDog } from "../rescueDogs";
import {
  emptyAdoptionUrl,
  freshnessLine,
  hasConfirmedDestination,
  isConfirmedUnavailable,
} from "../adoptionUrlSchema";
import { findUnavailableMarker, visibleText } from "../unavailableListing";
import { findIdentityConflict, isSameNameSpelling } from "../identityIntegrity";
import { isBlockedHost, safeFetch } from "../safeFetch";
import { verifyDogProfileUrl } from "../linkVerification";
import {
  APA_FEED_URL,
  __resetApaCacheForTests,
  checkApaIndex,
  parseApaFeed,
} from "../officialAvailability";
import { evaluateProviders } from "../providerQuarantine";
import {
  __resetFeatureVerdictCacheForTests,
  confirmFeatureEligibility,
  selectConfirmedDogForDate,
} from "../dogOfTheDay";
import { resolveDogDestination } from "../dogDestination";

// ---------------------------------------------------------------------------
// The MOO failure, 2026-09-06.
//
// dontclonemetom.com featured MOO (RescueGroups 22736087, APA of Missouri,
// shelter id A313601) as Dog of the Day and told visitors her listing was
// freshly verified. Her actual APA page answered HTTP 200 and rendered
// "PET NOT FOUND — this pet is no longer available for adoption". A person
// decided to meet a dog and was sent to a dead end.
//
// Every test below locks one of the reasons that was possible.
// ---------------------------------------------------------------------------

function scriptedFetch(
  routes: Record<string, { status: number; location?: string; body?: string }>,
): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const r = routes[url];
    if (!r) throw new TypeError(`fetch failed: ${url}`);
    const headers = new Headers();
    if (r.location) headers.set("location", r.location);
    const nullBody = r.status >= 300 && r.status < 400;
    return new Response(nullBody ? null : (r.body ?? ""), { status: r.status, headers });
  }) as typeof fetch;
}

const hangingFetch: typeof fetch = (async () => {
  throw Object.assign(new Error("aborted"), { name: "AbortError" });
}) as typeof fetch;

// APA's live feed shape, trimmed to the fields that decide availability.
const APA_FEED_AFTER_MIGRATION = JSON.stringify([
  { animal_id: "2480", name: "Cherry Pie", isAdoptable: 1, link: "https://apamo.org/adopt/adoptable-pets/?petID=2480" },
  { animal_id: "17795", name: "Bella", isAdoptable: 1 },
  { animal_id: "4171", name: "Layla", isAdoptable: 1 },
]);

describe("an HTTP-200 page that says the pet is gone is rejected", () => {
  // The whole point: the status code was never the problem.
  it("finds APA's exact wording in a 200 response", () => {
    const marker = findUnavailableMarker(
      "<html><body><h2>PET NOT FOUND</h2><p>We're sorry but it looks like this pet is " +
        "no longer available for adoption.</p></body></html>",
    );
    expect(marker).not.toBeNull();
    expect(marker?.label).toBe("pet not found");
  });

  it("rejects a 200 destination whose content says the listing is over", async () => {
    const url = "https://rescue.example.org/animals/detail?animal_id=99";
    const v = await verifyDogProfileUrl(url, {
      dogName: "Rosie",
      animalId: "99",
      orgUrl: "https://rescue.example.org/",
      fetchImpl: scriptedFetch({
        [url]: { status: 200, body: "<html><body><h1>Pet Not Found</h1></body></html>" },
      }),
    });
    expect(v.status).toBe("gone");
    expect(v.httpStatus).toBe(200);
  });

  it("does not mistake copy inside a script bundle for the page saying it", () => {
    // Every SPA ships all of its strings. APA's own bundle contains
    // "Pet Not Found" on EVERY page, including live ones — reading raw HTML
    // without stripping scripts would condemn every APA dog.
    const html =
      '<html><head><script>const t = {notFound:"Pet Not Found"};</script></head>' +
      "<body><h1>Meet Cherry Pie</h1></body></html>";
    expect(visibleText(html)).not.toMatch(/pet not found/i);
    expect(findUnavailableMarker(html)).toBeNull();
  });
});

describe("a confirmed active individual listing is accepted", () => {
  beforeEach(() => __resetApaCacheForTests());

  it("accepts an APA pet the official feed still carries", async () => {
    const v = await verifyDogProfileUrl("https://apamo.org/adopt/adoptable-pets/?petID=2480", {
      dogName: "CHERRY PIE",
      sourcePetId: "2480",
      orgUrl: "https://apamo.org/",
      fetchImpl: scriptedFetch({ [APA_FEED_URL]: { status: 200, body: APA_FEED_AFTER_MIGRATION } }),
    });
    expect(v.status).toBe("exact-dog");
  });

  it("accepts a non-APA page that carries the dog's own listing id", async () => {
    const url = "https://rescue.example.org/animals/detail?animal_id=4242";
    const v = await verifyDogProfileUrl(url, {
      dogName: "Ramsey",
      animalId: "4242",
      orgUrl: "https://rescue.example.org/",
      fetchImpl: scriptedFetch({
        [url]: { status: 200, body: "<html><body><h1>Ramsey</h1></body></html>" },
      }),
    });
    expect(v.status).toBe("exact-dog");
  });
});

describe("a timeout or block is UNVERIFIED, never verified and never dead", () => {
  beforeEach(() => __resetApaCacheForTests());

  it("a timed-out destination is uncertain", async () => {
    const v = await verifyDogProfileUrl("https://rescue.example.org/dogs/rosie.html", {
      dogName: "Rosie",
      orgUrl: "https://rescue.example.org/",
      fetchImpl: hangingFetch,
    });
    expect(v.status).toBe("uncertain");
  });

  it("an anti-bot 403 is uncertain, not gone", async () => {
    const url = "https://rescue.example.org/dogs/rosie.html";
    const v = await verifyDogProfileUrl(url, {
      dogName: "Rosie",
      orgUrl: "https://rescue.example.org/",
      fetchImpl: scriptedFetch({ [url]: { status: 403, body: "blocked" } }),
    });
    expect(v.status).toBe("uncertain");
  });

  it("an unreachable APA feed leaves the dog unverified, not confirmed", () => {
    // A feed we could not read tells us nothing. It must never become
    // "available" (the MOO bug) and must never become "gone" (which would
    // hide adoptable dogs on a bad network day).
    const result = checkApaIndex(null, "A318825");
    expect(result.verdict).toBe("unknown");
  });

  it("refuses to treat an empty feed as 'every APA dog is gone'", () => {
    expect(parseApaFeed([])).toBeNull();
    expect(parseApaFeed("not json")).toBeNull();
  });
});

describe("MOO / A313601 regression", () => {
  beforeEach(() => {
    __resetApaCacheForTests();
    __resetFeatureVerdictCacheForTests();
  });

  const moo = (): Dog =>
    ({
      id: "22736087",
      name: "MOO",
      org: "Animal Protective Association of Missouri",
      rescueId: "A313601",
      feedSeenAt: "2026-08-25T23:47:37Z",
      identityConflict: null,
      photo: "https://cdn.rescuegroups.org/moo.jpg",
      orgUrl: "http://www.apamo.org/",
      city: "Saint Louis, MO",
      adoption: {
        ...emptyAdoptionUrl(),
        adoptionProfileUrl: "https://apamo.org/adopt/adoptable-pets/?petID=A313601",
        adoptionProfileUrlOriginal: "https://apamo.org/adopt/adoptable-pets/?petID=A313601",
        adoptionProfileUrlStatus: "verified-direct-dog-page",
        rescueWebsiteUrl: "http://www.apamo.org/",
        rescueWebsiteUrlKind: "website",
      },
    }) as Dog;

  const liveIndex = parseApaFeed(JSON.parse(APA_FEED_AFTER_MIGRATION));

  it("is marked dead-or-removed once APA's own feed no longer carries her", () => {
    const after = applyOfficialAvailability(moo(), liveIndex);
    expect(after.adoption.adoptionProfileUrlStatus).toBe("dead-or-removed");
    expect(isConfirmedUnavailable(after.adoption)).toBe(true);
  });

  it("loses her dog-specific link entirely — no surface can offer it again", () => {
    const after = applyOfficialAvailability(moo(), liveIndex);
    expect(after.adoption.adoptionProfileUrl).toBeNull();
    expect(after.profileUrl).toBeNull();
  });

  it("never renders a 'View MOO's adoption page' button once she is gone", () => {
    const after = applyOfficialAvailability(moo(), liveIndex);
    const destination = resolveDogDestination(after);
    expect(destination.type).not.toBe("exact-dog");
    expect(destination.label).not.toMatch(/MOO/i);
    expect(destination.label).not.toMatch(/adoption page/i);
  });

  it("says the retired PetPoint id is why, so the cause is not a mystery", () => {
    const after = applyOfficialAvailability(moo(), liveIndex);
    expect(after.adoption.adoptionProfileUrlDetail).toMatch(/retired PetPoint id/i);
  });

  it("is not publicly eligible, so she cannot be chosen for any placement", () => {
    const after = applyOfficialAvailability(moo(), liveIndex);
    expect(eligibleDogsForTest([after])).toHaveLength(0);
  });
});

describe("feedSeenAt never becomes destinationVerifiedAt", () => {
  it("a dog seen in the feed but never checked has no destination timestamp", () => {
    const dog = {
      feedSeenAt: "2026-09-06T04:00:00Z",
      adoption: {
        ...emptyAdoptionUrl(),
        adoptionProfileUrl: "https://rescue.example.org/dogs/rosie.html",
        adoptionProfileUrlStatus: "verified-direct-dog-page" as const,
      },
    };
    expect(dog.adoption.destinationVerifiedAt).toBeNull();
    expect(dog.adoption.destinationVerificationMethod).toBe("none");
    expect(hasConfirmedDestination(dog.adoption)).toBe(false);
  });

  it("a fresh feed refresh does not make an unchecked destination confirmed", () => {
    const before = {
      ...emptyAdoptionUrl(),
      adoptionProfileUrl: "https://rescue.example.org/dogs/rosie.html",
      adoptionProfileUrlStatus: "verified-direct-dog-page" as const,
    };
    // Simulate the only thing a feed refresh may touch.
    const afterRefresh = { adoption: before, feedSeenAt: new Date().toISOString() };
    expect(afterRefresh.adoption.destinationVerifiedAt).toBeNull();
    expect(hasConfirmedDestination(afterRefresh.adoption)).toBe(false);
  });
});

describe("the UI never says 'Last verified' from a feed-only refresh", () => {
  const fmt = (iso: string) => `[${iso}]`;

  it("says 'Last seen in the source feed' when only the feed has spoken", () => {
    const line = freshnessLine(
      { ...emptyAdoptionUrl(), adoptionProfileUrlStatus: "verified-direct-dog-page", adoptionProfileUrl: "https://x.example/d" },
      "2026-09-06T04:00:00Z",
      fmt,
    );
    expect(line.label).toBe("Last seen in source feed");
    expect(line.text).not.toMatch(/last verified/i);
    expect(line.text).toMatch(/not confirmed with the shelter/i);
  });

  it("says 'Last verified' only when the destination was actually confirmed", () => {
    const line = freshnessLine(
      {
        ...emptyAdoptionUrl(),
        adoptionProfileUrl: "https://x.example/d",
        adoptionProfileUrlStatus: "verified-direct-dog-page",
        destinationVerifiedAt: "2026-09-06T05:00:00Z",
        destinationVerificationMethod: "official-feed",
      },
      "2026-09-06T04:00:00Z",
      fmt,
    );
    expect(line.label).toBe("Last verified");
  });

  it("never says 'Last verified' about a dog confirmed to be gone", () => {
    const line = freshnessLine(
      {
        ...emptyAdoptionUrl(),
        adoptionProfileUrlStatus: "dead-or-removed",
        destinationVerifiedAt: "2026-09-06T05:00:00Z",
        destinationVerificationMethod: "official-feed",
      },
      "2026-08-25T23:47:37Z",
      fmt,
    );
    expect(line.label).toBe("No longer listed");
    expect(line.text).not.toMatch(/last verified/i);
  });

  it("admits it plainly when nothing at all is known", () => {
    const line = freshnessLine(emptyAdoptionUrl(), null, fmt);
    expect(line.text).toMatch(/has not been confirmed/i);
  });
});

describe("Dog of the Day: a stale dog cannot take the slot, and is replaced", () => {
  beforeEach(() => {
    __resetApaCacheForTests();
    __resetFeatureVerdictCacheForTests();
  });

  function candidate(id: string, name: string, url: string): Dog {
    return {
      id,
      name,
      org: "Example Rescue",
      orgCity: "Wildwood, MO",
      city: "Wildwood, MO",
      rescueId: null,
      feedSeenAt: "2026-09-06T04:00:00Z",
      identityConflict: null,
      photo: "https://cdn.example.org/p.jpg",
      photos: [],
      orgUrl: "https://rescue.example.org/",
      orgUrlKind: "website",
      url,
      profileUrl: url,
      sourceProfileUrl: url,
      breed: "Mixed",
      age: "Adult",
      sex: "Female",
      size: "Medium",
      distance: 4,
      email: null,
      desc: "",
      facts: [],
      adoption: {
        ...emptyAdoptionUrl(),
        adoptionProfileUrl: url,
        adoptionProfileUrlOriginal: url,
        adoptionProfileUrlStatus: "verified-direct-dog-page",
        rescueWebsiteUrl: "https://rescue.example.org/",
        rescueWebsiteUrlKind: "website",
      },
    } as Dog;
  }

  const DEAD = "https://rescue.example.org/animals/detail?animal_id=111";
  const LIVE = "https://rescue.example.org/animals/detail?animal_id=222";

  const feed = scriptedFetch({
    [DEAD]: { status: 200, body: "<html><body><h1>PET NOT FOUND</h1></body></html>" },
    [LIVE]: { status: 200, body: "<html><body><h1>Juniper</h1></body></html>" },
  });

  it("refuses to feature a dog whose destination says the listing is over", async () => {
    const check = await confirmFeatureEligibility(candidate("111", "Gone", DEAD), { fetchImpl: feed });
    expect(check.confirmed).toBe(false);
    expect(check.detail).toMatch(/gone/);
  });

  it("replaces the unavailable dog with a confirmed one instead of leaving the slot dead", async () => {
    const dogs = [candidate("111", "Gone", DEAD), candidate("222", "Juniper", LIVE)];
    const { dog, rejected } = await selectConfirmedDogForDate("2026-09-06", dogs, new Set(), 0, {
      fetchImpl: feed,
    });
    expect(dog).not.toBeNull();
    expect(dog?.adoption.adoptionProfileUrl).toBe(LIVE);
    expect(rejected.map((r) => r.dog.id)).not.toContain(dog?.id);
  });

  it("leaves the slot empty rather than featuring an unconfirmed dog", async () => {
    const dogs = [candidate("111", "Gone", DEAD)];
    const { dog } = await selectConfirmedDogForDate("2026-09-06", dogs, new Set(), 0, {
      fetchImpl: feed,
    });
    expect(dog).toBeNull();
  });

  it("does not promote a dog whose destination merely could not be reached", async () => {
    const check = await confirmFeatureEligibility(candidate("333", "Quiet", LIVE), {
      fetchImpl: hangingFetch,
    });
    expect(check.confirmed).toBe(false);
    expect(check.detail).toMatch(/uncertain/);
  });

  it("stops after a bounded number of attempts instead of checking every dog", async () => {
    const dogs = Array.from({ length: 40 }, (_, i) => candidate(String(500 + i), `Gone${i}`, DEAD));
    const { attempts } = await selectConfirmedDogForDate("2026-09-06", dogs, new Set(), 0, {
      fetchImpl: feed,
      maxAttempts: 5,
    });
    expect(attempts).toBe(5);
  });
});

describe("identity mismatch regression — MOO's record describes Abigail", () => {
  it("flags a record named for one dog and written about another", () => {
    const conflict = findIdentityConflict(
      "MOO",
      "Abigail is a bouncy, happy dog with a heart full of joy! She walks wonderfully on the leash.",
    );
    expect(conflict).not.toBeNull();
    expect(conflict?.describedName).toBe("Abigail");
  });

  it("leaves a normal description alone", () => {
    expect(findIdentityConflict("Ramsey", "Ramsey is a sweet boy who loves a long walk.")).toBeNull();
  });

  it("does not flag a shelter's own spelling drift as a different dog", () => {
    // Live inventory case: the record says "Micky", the story says "Mickey".
    expect(isSameNameSpelling("Micky", "Mickey")).toBe(true);
    expect(findIdentityConflict("Micky", "Mickey is a happy little guy.")).toBeNull();
  });

  it("does not flag a description that opens on someone else but names the dog", () => {
    expect(
      findIdentityConflict("Ramsey", "Sarah is fostering, and Ramsey has loved every minute of it."),
    ).toBeNull();
  });

  it("suppresses nothing when there is no description to judge", () => {
    expect(findIdentityConflict("MOO", "")).toBeNull();
  });
});

describe("old shared links fail gracefully", () => {
  it("an unavailable dog still resolves to the shelter's live adoptable directory", () => {
    const destination = resolveDogDestination({
      name: "MOO",
      org: "Animal Protective Association of Missouri",
      profileUrl: null,
      orgUrl: "http://www.apamo.org/",
      adoption: {
        ...emptyAdoptionUrl(),
        adoptionProfileUrlStatus: "dead-or-removed",
        rescueWebsiteUrl: "https://apamo.org/adopt/adoptable-pets/",
        rescueWebsiteUrlKind: "adoptable-list",
      },
    });
    expect(destination.type).toBe("shelter-fallback");
    expect(destination.url).toBe("https://apamo.org/adopt/adoptable-pets/");
    expect(destination.label).toBe("View shelter listings");
  });

  it("never claims to open the exact dog's page after she is gone", () => {
    const destination = resolveDogDestination({
      name: "MOO",
      org: "APA",
      profileUrl: null,
      orgUrl: "https://apamo.org/",
      adoption: { ...emptyAdoptionUrl(), adoptionProfileUrlStatus: "dead-or-removed" },
    });
    expect(destination.ariaLabel).not.toMatch(/MOO's adoption page/);
  });
});

describe("a whole provider going dark is caught, not just one dog", () => {
  // Found by the same audit that confirmed MOO: Stone County Humane Society's
  // entire RescueGroups mini-site answers HTTP 410 Gone — every per-dog URL
  // and the site root — while RescueGroups still listed 21 of their dogs as
  // available. The feed and the destination flatly disagreed, and the feed
  // was winning by default.
  it("treats a retired mini-site's per-dog URL as no listing at all", () => {
    const dog = normalizeDog(
      {
        type: "animals",
        id: "22668752",
        attributes: {
          name: "Stella",
          url: "https://stonecountyhumanesociety.rescuegroups.org/animals/detail?AnimalID=22668752",
          updatedDate: "2026-07-30T21:16:07Z",
        },
      },
      new Map(),
    );
    expect(dog.profileUrl).toBeNull();
    expect(isPubliclyEligible(dog)).toBe(false);
  });

  it("a 410 destination is confirmed gone, never merely uncertain", async () => {
    const url = "https://stonecountyhumanesociety.rescuegroups.org/animals/detail?AnimalID=22668752";
    const v = await verifyDogProfileUrl(url, {
      dogName: "Stella",
      animalId: "22668752",
      orgUrl: "https://stonecountyhumanesociety.rescuegroups.org/",
      fetchImpl: scriptedFetch({ [url]: { status: 410, body: "" } }),
    });
    expect(v.status).toBe("gone");
  });
});

describe("provider quarantine is scoped to the failing provider", () => {
  it("quarantines a provider whose links are dead as a group", () => {
    const [apa] = evaluateProviders([
      { provider: "apamo.org", confirmedBad: 29, confirmedGood: 0, unverified: 0 },
    ]);
    expect(apa.quarantined).toBe(true);
    expect(apa.failureRate).toBe(1);
  });

  it("does not quarantine unrelated providers, and does not touch their dogs", () => {
    const decisions = evaluateProviders([
      { provider: "apamo.org", confirmedBad: 29, confirmedGood: 0, unverified: 0 },
      { provider: "petfinder.com", confirmedBad: 0, confirmedGood: 19, unverified: 0 },
      { provider: "getbuddy.com", confirmedBad: 1, confirmedGood: 11, unverified: 0 },
    ]);
    const byProvider = Object.fromEntries(decisions.map((d) => [d.provider, d.quarantined]));
    expect(byProvider["apamo.org"]).toBe(true);
    expect(byProvider["petfinder.com"]).toBe(false);
    expect(byProvider["getbuddy.com"]).toBe(false);
  });

  it("will not condemn an integration on a handful of adopted dogs", () => {
    const [small] = evaluateProviders([
      { provider: "tinyrescue.org", confirmedBad: 3, confirmedGood: 0, unverified: 0 },
    ]);
    expect(small.quarantined).toBe(false);
    expect(small.reason).toMatch(/needed before judging/);
  });

  it("does not let anti-bot blocking drag a provider toward quarantine", () => {
    const [blocked] = evaluateProviders([
      { provider: "shy.example.org", confirmedBad: 0, confirmedGood: 9, unverified: 40 },
    ]);
    expect(blocked.quarantined).toBe(false);
  });
});

describe("URL validation and SSRF safeguards", () => {
  it("refuses loopback, private, link-local and metadata addresses", () => {
    for (const host of [
      "127.0.0.1",
      "localhost",
      "10.0.0.5",
      "192.168.1.1",
      "172.16.0.1",
      "169.254.169.254", // cloud metadata
      "0.0.0.0",
      "::1",
      "fd00::1",
      "internal.local",
      "2130706433", // 127.0.0.1 as a decimal
      "0x7f000001",
    ]) {
      expect(isBlockedHost(host)).toBe(true);
    }
  });

  it("allows ordinary public rescue hosts", () => {
    for (const host of ["apamo.org", "www.petfinder.com", "rescue.example.org", "8.8.8.8"]) {
      expect(isBlockedHost(host)).toBe(false);
    }
  });

  it("blocks a non-web protocol outright", async () => {
    const outcome = await safeFetch("file:///etc/passwd");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("blocked-protocol");
  });

  it("blocks a public URL that redirects to a private address", async () => {
    const start = "https://rescue.example.org/dogs/1";
    const outcome = await safeFetch(start, {
      fetchImpl: scriptedFetch({
        [start]: { status: 302, location: "http://169.254.169.254/latest/meta-data/" },
      }),
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("blocked-host");
  });

  it("refuses to follow a link off its own provider", async () => {
    const start = "https://rescue.example.org/dogs/1";
    const outcome = await safeFetch(start, {
      allowHosts: ["rescue.example.org"],
      fetchImpl: scriptedFetch({
        [start]: { status: 302, location: "https://somewhere-else.example.com/" },
      }),
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("off-allowlist");
  });

  it("stops after the redirect cap instead of looping", async () => {
    const a = "https://rescue.example.org/a";
    const b = "https://rescue.example.org/b";
    const outcome = await safeFetch(a, {
      maxRedirects: 3,
      fetchImpl: scriptedFetch({ [a]: { status: 302, location: b }, [b]: { status: 302, location: a } }),
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("too-many-redirects");
  });

  it("caps the response body it will read", async () => {
    const url = "https://rescue.example.org/huge";
    const outcome = await safeFetch(url, {
      maxBytes: 100,
      fetchImpl: scriptedFetch({ [url]: { status: 200, body: "x".repeat(10_000) } }),
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.body.length).toBeLessThanOrEqual(100);
      expect(outcome.truncated).toBe(true);
    }
  });

  it("reports a timeout as a timeout, never as a result", async () => {
    const outcome = await safeFetch("https://rescue.example.org/slow", { fetchImpl: hangingFetch });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("timeout");
  });
});
