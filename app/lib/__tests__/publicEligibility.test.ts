import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDogDestination } from "../dogDestination";
import { emptyAdoptionUrl } from "../adoptionUrlSchema";
import {
  fetchPubliclyEligibleDogs,
  isPubliclyEligible,
  normalizeDog,
  PUBLIC_DISPLAY_BASELINE,
  type Dog,
} from "../rescueDogs";

// 2026-08-10 P0 follow-up: "every public dog card must have a verified
// direct URL; generic rescue homepages/adoption pages/shelter profiles/
// search pages/org Petfinder pages are NEVER public destinations; the
// publicly displayed count must never decrease — widen the candidate pool
// instead of shrinking the site."

function dog(overrides: Partial<Dog> = {}): Dog {
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
    feedSeenAt: null,
    identityConflict: null,
    adoption: {
      ...emptyAdoptionUrl(),
      adoptionProfileUrl: "https://www.petfinder.com/dog/billy-abc123/mo/wildwood/rescue-mo1/details/",
      adoptionProfileUrlStatus: "verified-direct-dog-page",
      adoptionProfileUrlSource: "petfinder",
    },
    profileUrl: null,
    sourceProfileUrl: null,
    orgUrl: "https://rescue.example.org/",
    orgUrlKind: "website",
    url: "https://rescue.example.org/",
    org: "Wildwood Rescue",
    orgCity: "Wildwood, MO",
    email: null,
    desc: "",
    facts: [],
    ...overrides,
  };
}

describe("isPubliclyEligible — the gate every public selector must apply", () => {
  it("accepts only verified-direct-dog-page with a real URL", () => {
    expect(isPubliclyEligible(dog())).toBe(true);
  });

  it("rejects UNVERIFIED", () => {
    expect(isPubliclyEligible(dog({ adoption: emptyAdoptionUrl() }))).toBe(false);
  });

  it("rejects GENERIC (dead-or-removed status used as the generic/demoted bucket)", () => {
    expect(
      isPubliclyEligible(
        dog({ adoption: { ...emptyAdoptionUrl(), adoptionProfileUrlStatus: "generic-rescue-page" } }),
      ),
    ).toBe(false);
  });

  it("rejects DEAD", () => {
    expect(
      isPubliclyEligible(dog({ adoption: { ...emptyAdoptionUrl(), adoptionProfileUrlStatus: "dead-or-removed" } })),
    ).toBe(false);
  });

  it("rejects DOG_MISMATCH", () => {
    expect(
      isPubliclyEligible(dog({ adoption: { ...emptyAdoptionUrl(), adoptionProfileUrlStatus: "name-mismatch" } })),
    ).toBe(false);
  });

  it("rejects a status of verified-direct-dog-page with no actual URL (fails closed)", () => {
    expect(
      isPubliclyEligible(
        dog({
          adoption: {
            ...emptyAdoptionUrl(),
            adoptionProfileUrlStatus: "verified-direct-dog-page",
            adoptionProfileUrl: null,
          },
        }),
      ),
    ).toBe(false);
  });

  it("every publicly-eligible dog resolves to an individual-dog destination, never a fallback", () => {
    const eligible = dog();
    expect(resolveDogDestination(eligible).type).toBe("exact-dog");
  });
});

// --- fetchPubliclyEligibleDogs: mocked network, real widening logic ---

type FakeAnimal = ReturnType<typeof makeAnimal>;

function makeAnimal(id: string, name: string, verified: boolean) {
  return {
    type: "animals",
    id,
    attributes: {
      name,
      breedString: "Mixed",
      // A verified dog carries a real per-dog id in its RescueGroups url —
      // classifyAdoptionUrl recognizes the AnimalID query param as an
      // individual profile. An unverified dog gets no url at all, so it
      // falls back to the org homepage (never a fabricated link).
      url: verified ? `https://rescue.example.org/animals/detail?AnimalID=${id}` : undefined,
    },
    relationships: { orgs: { data: [{ type: "orgs", id: "900" }] } },
  };
}

function fakeResponseFor(animals: FakeAnimal[]) {
  return {
    ok: true,
    json: async () => ({
      data: animals,
      included: [{ type: "orgs", id: "900", attributes: { name: "Test Rescue", url: "https://rescue.example.org/" } }],
      meta: { pages: 1 },
    }),
  };
}

// Builds a fetch stub that answers RescueGroups radius searches: `atRequested`
// verified+total dogs for the requested-radius body, `atWidest` for the
// 250mi body. Distinguishes by the `miles` value in the request body.
function stubFetch(requestedMiles: number, atRequested: FakeAnimal[], atWidest: FakeAnimal[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body?: string }) => {
      const body = JSON.parse(init.body ?? "{}");
      const miles = body?.data?.filterRadius?.miles;
      if (miles === requestedMiles) return fakeResponseFor(atRequested);
      if (miles === 250) return fakeResponseFor(atWidest);
      throw new Error(`unexpected radius in test: ${miles}`);
    }),
  );
}

describe("fetchPubliclyEligibleDogs — never shrinks, never fabricates, never widens past 250mi", () => {
  const OLD_ENV = process.env.RESCUEGROUPS_API_KEY;

  beforeEach(() => {
    process.env.RESCUEGROUPS_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.RESCUEGROUPS_API_KEY = OLD_ENV;
  });

  it("uses the requested radius as-is when it already meets the floor — no widening", async () => {
    const zip = "10001"; // unique per test to dodge the module-level cache
    const atRequested = Array.from({ length: 5 }, (_, i) => makeAnimal(`r${i}`, `Dog${i}`, true));
    stubFetch(50, atRequested, []);

    const { result } = await fetchPubliclyEligibleDogs(zip, 50, 5);
    expect(result).not.toBeNull();
    expect(result!.widened).toBe(false);
    expect(result!.effectiveMiles).toBe(50);
    expect(result!.dogs).toHaveLength(5);
  });

  it("widens to 250mi when the requested radius alone can't hold the floor, and never returns a non-eligible dog", async () => {
    const zip = "10002";
    const atRequested = [
      makeAnimal("only-eligible", "Solo", true),
      makeAnimal("gen1", "Generic1", false),
      makeAnimal("gen2", "Generic2", false),
    ];
    const atWidest = [
      ...Array.from({ length: 10 }, (_, i) => makeAnimal(`w${i}`, `Wide${i}`, true)),
      makeAnimal("gen3", "Generic3", false),
    ];
    stubFetch(50, atRequested, atWidest);

    const { result } = await fetchPubliclyEligibleDogs(zip, 50, 10);
    expect(result).not.toBeNull();
    expect(result!.widened).toBe(true);
    expect(result!.effectiveMiles).toBe(250);
    expect(result!.dogs).toHaveLength(10);
    for (const d of result!.dogs) {
      expect(isPubliclyEligible(d)).toBe(true);
    }
  });

  it("count floor: meets the actual locked PUBLIC_DISPLAY_BASELINE (222) whenever the candidate pool can supply it", async () => {
    const zip = "10003";
    const atRequested = Array.from({ length: 3 }, (_, i) => makeAnimal(`a${i}`, `A${i}`, true));
    const atWidest = Array.from({ length: PUBLIC_DISPLAY_BASELINE + 50 }, (_, i) => makeAnimal(`b${i}`, `B${i}`, true));
    stubFetch(50, atRequested, atWidest);

    const { result } = await fetchPubliclyEligibleDogs(zip, 50);
    expect(result!.dogs.length).toBeGreaterThanOrEqual(PUBLIC_DISPLAY_BASELINE);
  });

  it("backfill on loss: when a previously-sufficient radius loses eligible dogs, the wider radius fills the gap automatically", async () => {
    const zip = "10004";
    // Simulates a dog that was verified going generic/dead — the narrow
    // radius now falls short, but the site backfills from the wider net
    // instead of just showing fewer dogs.
    const atRequestedAfterLoss = [makeAnimal("still-here", "StillHere", true), makeAnimal("now-generic", "NowGeneric", false)];
    const atWidest = Array.from({ length: 8 }, (_, i) => makeAnimal(`fill${i}`, `Fill${i}`, true));
    stubFetch(50, atRequestedAfterLoss, atWidest);

    const { result } = await fetchPubliclyEligibleDogs(zip, 50, 8);
    expect(result!.widened).toBe(true);
    expect(result!.dogs).toHaveLength(8);
    expect(result!.dogs.some((d) => d.id === "still-here")).toBe(false); // came from the widened fetch, not merged with the narrow one
  });

  it("honestly reports whatever it found — never fabricates a dog — when even 250mi can't reach the floor", async () => {
    const zip = "10005";
    const atRequested = [makeAnimal("only1", "Only1", true)];
    const atWidest = [makeAnimal("only1", "Only1", true), makeAnimal("only2", "Only2", true)];
    stubFetch(50, atRequested, atWidest);

    const { result } = await fetchPubliclyEligibleDogs(zip, 50, 1000);
    expect(result).not.toBeNull();
    expect(result!.widened).toBe(true);
    expect(result!.dogs.length).toBe(2); // honest count, not padded to 1000
  });

  it("never invents a URL — an unverified dog in the response never appears in the eligible result", async () => {
    const zip = "10006";
    const atRequested = [makeAnimal("v1", "Verified1", true), makeAnimal("u1", "Unverified1", false)];
    stubFetch(50, atRequested, []);

    const { result } = await fetchPubliclyEligibleDogs(zip, 50, 1);
    expect(result!.dogs.map((d) => d.id)).toEqual(["v1"]);
  });
});

describe("normalizeDog — sanity check that the test's verified/unverified fixtures actually classify as intended", () => {
  it("a dog with an AnimalID query param classifies verified-direct; one with no url classifies unverified", () => {
    const included = new Map<string, Record<string, unknown>>([
      ["orgs:900", { name: "Test Rescue", url: "https://rescue.example.org/" }],
    ]);
    const verified = normalizeDog(makeAnimal("v", "V", true) as never, included);
    const unverified = normalizeDog(makeAnimal("u", "U", false) as never, included);
    expect(isPubliclyEligible(verified)).toBe(true);
    expect(isPubliclyEligible(unverified)).toBe(false);
  });
});
