import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Dog } from "../../../lib/rescueDogs";

// The real selection engine behind the real route: only the RescueGroups
// inventory and the outbound network are stubbed. Guards the 2026-10-08
// Dumpling failure, where the hero card and the page it opened disagreed
// about whether the featured dog could still be adopted.

const inventory = vi.fn<() => Promise<{ dogs: Dog[] | null; reason?: string }>>();

vi.mock("../../../lib/rescueDogs", async (importActual) => ({
  ...(await importActual<typeof import("../../../lib/rescueDogs")>()),
  fetchAdoptableDogs: () => inventory(),
}));

vi.mock("../../../lib/dailySocialCore", async (importActual) => ({
  ...(await importActual<typeof import("../../../lib/dailySocialCore")>()),
  chicagoDateKey: () => "2026-10-08",
}));

async function sourceDog(id: string, name: string): Promise<Dog> {
  const { normalizeDog } = await import("../../../lib/rescueDogs");
  const url = `https://rescue.example.org/pets/${name.toLowerCase()}`;
  const dog = normalizeDog(
    { type: "animals", id, attributes: { name, url, breedString: `${name} breed`, ageString: `${name} age` } },
    new Map(),
  );
  return {
    ...dog,
    org: "Example Rescue",
    city: "Wildwood, MO",
    photo: `https://cdn.example.org/${id}.jpg`,
  };
}

const pages: Record<string, string> = {};

beforeEach(async () => {
  const { resetDestinationCacheForTests } = await import("../../../lib/destinationAvailability");
  resetDestinationCacheForTests();
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
    const body = pages[String(url)];
    return body === undefined ? new Response("", { status: 404 }) : new Response(body);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of Object.keys(pages)) delete pages[key];
});

async function callGet() {
  const { GET } = await import("../route");
  return (await GET(new NextRequest("https://dontclonemetom.com/api/dog-of-the-day"))).json();
}

describe("GET /api/dog-of-the-day — every field is the same dog", () => {
  it("returns one dog's name, photo, details, page and live destination together", async () => {
    const dogs = await Promise.all([
      sourceDog("101", "Biscuit"),
      sourceDog("102", "Pepper"),
      sourceDog("103", "Clover"),
    ]);
    pages["https://rescue.example.org/pets/biscuit"] =
      "<h1>Biscuit</h1><p>Biscuit has been adopted and is no longer available for adoption.</p>";
    pages["https://rescue.example.org/pets/pepper"] = "<h1>Pepper</h1><p>Meet Pepper.</p>";
    pages["https://rescue.example.org/pets/clover"] = "<h1>Clover</h1><p>Meet Clover.</p>";
    inventory.mockResolvedValue({ dogs });

    const json = await callGet();
    const source = dogs.find((d) => d.id === json.dog.id)!;

    expect(source).toBeDefined();
    expect(json.dog.name).not.toBe("Biscuit");
    expect(json.dog).toEqual({
      id: source.id,
      name: source.name,
      photo: source.photo,
      org: source.org,
      city: source.city,
      breed: source.breed,
      age: source.age,
    });
    expect(json.pagePath).toBe(`/dogs/${source.id}`);
    // The destination that earned the slot was this dog's own listing, and
    // that page named this dog.
    const checked = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(checked).toContain(source.adoption.adoptionProfileUrl);
    expect(pages[source.adoption.adoptionProfileUrl!]).toContain(source.name);
  });

  it("returns no dog (the hero's retry state) when every listing is adopted", async () => {
    const dogs = await Promise.all([sourceDog("101", "Biscuit"), sourceDog("102", "Pepper")]);
    for (const dog of dogs) {
      // GetBuddy's wording on Dumpling's page, 2026-10-08.
      pages[dog.adoption.adoptionProfileUrl!] =
        `<p>${dog.name} has found a forever home! ${dog.name} is no longer available for adoption.</p>`;
    }
    inventory.mockResolvedValue({ dogs });

    const json = await callGet();
    expect(json.dog).toBeNull();
    expect(json.reason).toContain("no dog could be confirmed");
  });

  it("returns no dog when the feed itself fails, never a cached or guessed one", async () => {
    inventory.mockResolvedValue({ dogs: null, reason: "rescuegroups 503" });
    const json = await callGet();
    expect(json.dog).toBeNull();
    expect(json.reason).toContain("dog source unavailable");
  });
});
