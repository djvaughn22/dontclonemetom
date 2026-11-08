import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyAdoptionUrl } from "../adoptionUrlSchema";
import { resolveDogDestination } from "../dogDestination";
import { applyShelterPortal, isPubliclyEligible, normalizeDog, withOfficialAvailability, type Dog } from "../rescueDogs";
import {
  __resetPortalCacheForTests,
  loadPortalIndex,
  parsePortalPage,
  portalDogUrl,
  portalListUrl,
  type PortalIndex,
} from "../shelterPortals";

beforeEach(__resetPortalCacheForTests);

// The shape of a 24PetConnect list page, trimmed to what the parser reads.
function listPage(portal: string, dogs: { code: string; id: string; name: string }[], from: number, total: number) {
  const cards = dogs
    .map(
      (d) => `<div class="gridResult" id="Result_${d.id}" onclick="Details('${portal}', '${d.code}', '${d.id}')">
        <img src="/image/1" alt="Image_${d.id}"><div class="line_Name"><span class="column_Name results">Name</span>
        <span class="text_Name results">${d.name} (${d.id})</span></div></div>`,
    )
    .join("\n");
  return `<html><body><div>Animals: ${from} - ${from + dogs.length - 1} of ${total}</div>${cards}
    <button onclick="MoreAnimals('${from + 29}', '${portal}', 'DOG')">More</button></body></html>`;
}

const dogsOn = (count: number, start = 1, code = "MOHS") =>
  Array.from({ length: count }, (_, i) => ({ code, id: `A76${String(start + i).padStart(4, "0")}`, name: `DOG ${start + i}` }));

function servePages(pages: Record<string, string>) {
  return vi.fn(async (url: string | URL | Request) => {
    const body = pages[String(url)];
    return body ? new Response(body, { status: 200, headers: { "content-type": "text/html" } }) : new Response("nope", { status: 404 });
  }) as unknown as typeof fetch;
}

function hsmoDog(overrides: Partial<Dog> = {}): Dog {
  const base = normalizeDog(
    { type: "animals", id: "22889351", attributes: { name: "TIGER", rescueId: "A764812" }, relationships: { orgs: { data: [{ type: "orgs", id: "2034" }] } } },
    new Map([["orgs:2034", { name: "Humane Society of Missouri", url: "http://www.hsmo.org" }]]),
  );
  return { ...base, photo: "https://cdn.rescuegroups.org/tiger.jpg", city: "St Louis, MO", ...overrides };
}

const index = (ids: string[], portal = "MOHSAdopt"): PortalIndex => ({
  portal,
  byId: new Map(ids.map((id) => [id, { code: "MOHS", name: "" }])),
  total: ids.length,
  complete: true,
  fetchedAt: "2026-11-07T23:40:00.000Z",
});

describe("parsePortalPage — the shelter's own list, read by exact id", () => {
  it("reads every dog's shelter code, id and name, plus the list's own total", () => {
    const page = parsePortalPage(listPage("MOHSAdopt", [{ code: "MOHS1", id: "A760243", name: "ROSE" }, { code: "MOHS", id: "A764812", name: "TIGER" }], 1, 41), "MOHSAdopt");
    expect(page.total).toBe(41);
    expect(page.entries).toEqual([
      { code: "MOHS1", id: "A760243", name: "ROSE" },
      { code: "MOHS", id: "A764812", name: "TIGER" },
    ]);
  });

  it("ignores another portal's entries and pages without a list", () => {
    expect(parsePortalPage(listPage("STCHAdopt", dogsOn(2), 1, 2), "MOHSAdopt").entries).toEqual([]);
    expect(parsePortalPage("<html>Maintenance</html>", "MOHSAdopt")).toEqual({ entries: [], total: null });
  });
});

describe("loadPortalIndex", () => {
  it("follows the list's own pages until it has every dog", async () => {
    const fetchImpl = servePages({
      [portalListUrl("MOHSAdopt")]: listPage("MOHSAdopt", dogsOn(30), 1, 32),
      [portalListUrl("MOHSAdopt", 30)]: listPage("MOHSAdopt", dogsOn(2, 31, "MOHS1"), 31, 32),
    });
    const result = await loadPortalIndex("MOHSAdopt", { fetchImpl });
    expect(result?.byId.size).toBe(32);
    expect(result?.complete).toBe(true);
    expect(result?.byId.get("A760031")).toEqual({ code: "MOHS1", name: "DOG 31" });
    expect(vi.mocked(fetchImpl).mock.calls.map(([u]) => String(u))).toEqual([
      "https://24petconnect.com/MOHSAdopt?at=DOG",
      "https://24petconnect.com/MOHSAdopt?index=30&at=DOG",
    ]);
  });

  it("keeps what it read when a later page fails, and marks the list incomplete", async () => {
    const fetchImpl = servePages({ [portalListUrl("MOHSAdopt")]: listPage("MOHSAdopt", dogsOn(30), 1, 41) });
    const result = await loadPortalIndex("MOHSAdopt", { fetchImpl });
    expect(result?.byId.size).toBe(30);
    expect(result?.complete).toBe(false);
  });

  it("treats an unreachable or empty list as unknown, and caches the answer", async () => {
    const down = servePages({});
    expect(await loadPortalIndex("MOHSAdopt", { fetchImpl: down, now: 1_000 })).toBeNull();
    expect(await loadPortalIndex("MOHSAdopt", { fetchImpl: down, now: 2_000 })).toBeNull();
    expect(down).toHaveBeenCalledTimes(1); // backoff, not a request per page render

    const empty = servePages({ [portalListUrl("STCHAdopt")]: "<html>Animals: 0 - 0 of 0</html>" });
    expect(await loadPortalIndex("STCHAdopt", { fetchImpl: empty })).toBeNull();
  });
});

describe("applyShelterPortal — a verified link only for a dog on her shelter's list", () => {
  it("gives a dog on the list her own page on the shelter's portal", () => {
    const dog = applyShelterPortal(hsmoDog(), index(["A764812"]));
    expect(dog.adoption.adoptionProfileUrl).toBe("https://24petconnect.com/MOHSAdopt/Details/MOHS/A764812");
    expect(dog.adoption.adoptionProfileUrlStatus).toBe("verified-direct-dog-page");
    expect(dog.adoption.destinationVerificationMethod).toBe("official-feed");
    expect(dog.adoption.destinationVerifiedAt).toBe("2026-11-07T23:40:00.000Z");
    expect(isPubliclyEligible(dog)).toBe(true);
    expect(resolveDogDestination(dog)).toMatchObject({ type: "exact-dog", url: portalDogUrl("MOHSAdopt", "MOHS", "A764812") });
  });

  it("matches the shelter id regardless of case, never by name", () => {
    expect(applyShelterPortal(hsmoDog({ rescueId: "a764812" }), index(["A764812"])).adoption.adoptionProfileUrl).toContain("A764812");
    expect(applyShelterPortal(hsmoDog({ name: "DOG 1" }), index(["A760001"])).adoption.adoptionProfileUrl).toBeNull();
  });

  it("leaves the dog alone when she isn't on the list, the list is unreachable, or her rescue has no portal", () => {
    expect(isPubliclyEligible(applyShelterPortal(hsmoDog(), index(["A700000"])))).toBe(false);
    expect(isPubliclyEligible(applyShelterPortal(hsmoDog(), null))).toBe(false);
    expect(applyShelterPortal(hsmoDog({ orgId: "9999" }), index(["A764812"])).adoption.adoptionProfileUrl).toBeNull();
    expect(applyShelterPortal(hsmoDog({ rescueId: null }), index(["A764812"])).adoption.adoptionProfileUrl).toBeNull();
  });

  it("never overrides a decision already made about the dog's destination", () => {
    const removed = hsmoDog({ adoption: { ...emptyAdoptionUrl(), adoptionProfileUrlStatus: "dead-or-removed" } });
    expect(applyShelterPortal(removed, index(["A764812"])).adoption.adoptionProfileUrlStatus).toBe("dead-or-removed");
    const audited = hsmoDog({
      adoption: {
        ...emptyAdoptionUrl(),
        adoptionProfileUrl: "https://www.petfinder.com/dog/tiger-1/mo/saint-louis/humane-society-of-missouri-mo179/details/",
        adoptionProfileUrlStatus: "verified-direct-dog-page",
      },
    });
    expect(applyShelterPortal(audited, index(["A764812"])).adoption.adoptionProfileUrl).toContain("petfinder.com");
  });
});

describe("withOfficialAvailability reads each shelter list once per batch", () => {
  it("links the dogs on their shelter's list and leaves the rest hidden", async () => {
    const fetchImpl = servePages({
      [portalListUrl("MOHSAdopt")]: listPage("MOHSAdopt", [{ code: "MOHS", id: "A764812", name: "TIGER" }], 1, 1),
      [portalListUrl("STCHAdopt")]: listPage("STCHAdopt", [{ code: "STCH", id: "A530655", name: "REMI" }], 1, 1),
    });
    const stCharles = (id: string, rescueId: string) =>
      normalizeDog({ type: "animals", id, attributes: { name: "X", rescueId }, relationships: { orgs: { data: [{ type: "orgs", id: "3085" }] } } }, new Map());
    const [tiger, remi, gone] = await withOfficialAvailability(
      [hsmoDog(), stCharles("1", "A530655"), stCharles("2", "A111111")],
      { fetchImpl },
    );
    expect(tiger.adoption.adoptionProfileUrl).toBe("https://24petconnect.com/MOHSAdopt/Details/MOHS/A764812");
    expect(remi.adoption.adoptionProfileUrl).toBe("https://24petconnect.com/STCHAdopt/Details/STCH/A530655");
    expect(gone.adoption.adoptionProfileUrl).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
