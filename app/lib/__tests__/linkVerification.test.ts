import { beforeEach, describe, expect, it } from "vitest";
import { verifyDogProfileUrl } from "../linkVerification";
import { APA_FEED_URL, __resetApaCacheForTests } from "../officialAvailability";

// A tiny scripted fetch: URL → response. Unlisted URLs throw like a network
// failure would.
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
    return new Response(nullBody ? null : (r.body ?? ""), {
      status: r.status,
      headers,
    });
  }) as typeof fetch;
}

const ORG = "https://rescue.example.org/";

describe("verifyDogProfileUrl — redirects land where they claim", () => {
  it("accepts a direct 200 on the dog's own id-carrying page", async () => {
    const url = "https://rescue.example.org/animals/detail?AnimalID=555";
    const v = await verifyDogProfileUrl(url, {
      dogName: "Ramsey",
      animalId: "555",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({ [url]: { status: 200, body: "Ramsey's Web Page" } }),
    });
    expect(v.status).toBe("exact-dog");
    expect(v.finalUrl).toBe(url);
  });

  it("accepts a redirect that lands on the same dog's profile", async () => {
    const from = "https://old.example.org/dog/555";
    const to = "https://rescue.example.org/animals/detail.php?AnimalID=555";
    const v = await verifyDogProfileUrl(from, {
      dogName: "Ramsey",
      animalId: "555",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({
        [from]: { status: 302, location: to },
        [to]: { status: 200, body: "Ramsey" },
      }),
    });
    expect(v.status).toBe("exact-dog");
    expect(v.finalUrl).toBe(to);
  });

  it("resolves a relative Location header against the current URL", async () => {
    const from = "https://rescue.example.org/dog/555";
    const to = "https://rescue.example.org/animals/detail?AnimalID=555";
    const v = await verifyDogProfileUrl(from, {
      dogName: "Ramsey",
      animalId: "555",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({
        [from]: { status: 301, location: "/animals/detail?AnimalID=555" },
        [to]: { status: 200, body: "Ramsey" },
      }),
    });
    expect(v.status).toBe("exact-dog");
    expect(v.finalUrl).toBe(to);
  });

  it("rejects a redirect that lands on the rescue homepage — the Country Acres failure mode", async () => {
    const from = "https://rescue.example.org/animals/detail.php?AnimalID=555";
    const v = await verifyDogProfileUrl(from, {
      dogName: "Ramsey",
      animalId: "555",
      orgUrl: "http://countryacresrescue.example.org/",
      fetchImpl: scriptedFetch({
        [from]: { status: 302, location: "https://countryacresrescue.example.org/" },
        "https://countryacresrescue.example.org/": { status: 200, body: "Welcome to our rescue" },
      }),
    });
    expect(v.status).toBe("generic");
    // Landing on the org's own fallback page — generic either way.
    expect(["org-homepage", "org-page"]).toContain(v.classification);
  });

  it("rejects a redirect to the general adoptable-dogs list", async () => {
    const from = "https://rescue.example.org/animals/detail?AnimalID=555";
    const v = await verifyDogProfileUrl(from, {
      dogName: "Ramsey",
      animalId: "555",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({
        [from]: { status: 302, location: "https://rescue.example.org/adoptable-dogs" },
        "https://rescue.example.org/adoptable-dogs": { status: 200, body: "All our dogs" },
      }),
    });
    expect(v.status).toBe("generic");
    expect(v.classification).toBe("animal-list");
  });

  it("rejects a redirect to a search page", async () => {
    const from = "https://rescue.example.org/animals/detail?AnimalID=555";
    const v = await verifyDogProfileUrl(from, {
      dogName: "Ramsey",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({
        [from]: { status: 302, location: "https://rescue.example.org/pet-search?type=dog" },
        "https://rescue.example.org/pet-search?type=dog": { status: 200, body: "Search" },
      }),
    });
    expect(v.status).toBe("generic");
    expect(v.classification).toBe("search");
  });

  it("rejects a redirect to an application/contact page", async () => {
    const from = "https://rescue.example.org/animals/detail?AnimalID=555";
    const v = await verifyDogProfileUrl(from, {
      dogName: "Ramsey",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({
        [from]: { status: 302, location: "https://rescue.example.org/adoption-application" },
        "https://rescue.example.org/adoption-application": { status: 200, body: "Apply here" },
      }),
    });
    expect(v.status).toBe("generic");
    expect(v.classification).toBe("application");
  });

  it("rejects a page that turns out to be a different animal's profile", async () => {
    const from = "https://rescue.example.org/animals/detail?AnimalID=555";
    const other = "https://rescue.example.org/animals/detail?AnimalID=999";
    const v = await verifyDogProfileUrl(from, {
      dogName: "Ramsey",
      animalId: "555",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({
        [from]: { status: 302, location: other },
        [other]: { status: 200, body: "Some other dog" },
      }),
    });
    expect(v.status).toBe("wrong-dog");
  });

  it("marks a 404'd profile as gone (drives the demoted treatment)", async () => {
    const url = "https://rescue.example.org/animals/detail?AnimalID=555";
    const v = await verifyDogProfileUrl(url, {
      dogName: "Ramsey",
      animalId: "555",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({ [url]: { status: 404 } }),
    });
    expect(v.status).toBe("gone");
  });
});

describe("verifyDogProfileUrl — uncertainty never kills a valid profile", () => {
  const url = "https://rescue.example.org/animals/detail?AnimalID=555";
  const opts = { dogName: "Ramsey", animalId: "555", orgUrl: ORG };

  it("a network failure is uncertain, not gone and not generic", async () => {
    const v = await verifyDogProfileUrl(url, { ...opts, fetchImpl: scriptedFetch({}) });
    expect(v.status).toBe("uncertain");
  });

  it("anti-bot blocking (403) is uncertain", async () => {
    const v = await verifyDogProfileUrl(url, {
      ...opts,
      fetchImpl: scriptedFetch({ [url]: { status: 403 } }),
    });
    expect(v.status).toBe("uncertain");
  });

  it("rate limiting (429) and server errors (503) are uncertain", async () => {
    for (const status of [429, 503]) {
      const v = await verifyDogProfileUrl(url, {
        ...opts,
        fetchImpl: scriptedFetch({ [url]: { status } }),
      });
      expect(v.status).toBe("uncertain");
    }
  });

  it("a timeout is uncertain", async () => {
    const hang: typeof fetch = ((_: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      })) as typeof fetch;
    const v = await verifyDogProfileUrl(url, { ...opts, fetchImpl: hang, timeoutMs: 30 });
    expect(v.status).toBe("uncertain");
  });

  it("a redirect loop is uncertain, never a verdict against the dog", async () => {
    const a = "https://rescue.example.org/a";
    const b = "https://rescue.example.org/b";
    const v = await verifyDogProfileUrl(a, {
      ...opts,
      fetchImpl: scriptedFetch({
        [a]: { status: 302, location: b },
        [b]: { status: 302, location: a },
      }),
    });
    expect(v.status).toBe("uncertain");
  });

  it("a profile-shaped page without positive confirmation stays uncertain", async () => {
    const slug = "https://rescue.example.org/dogs/mystery-dog.html";
    const v = await verifyDogProfileUrl(slug, {
      dogName: "Ramsey",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({ [slug]: { status: 200, body: "<title>A dog</title>" } }),
    });
    expect(v.status).toBe("uncertain");
  });

  it("confirms by name in the page when the URL carries no id", async () => {
    const slug = "https://rescue.example.org/dogs/ramsey.html";
    const v = await verifyDogProfileUrl(slug, {
      dogName: "Ramsey",
      orgUrl: ORG,
      fetchImpl: scriptedFetch({
        [slug]: { status: 200, body: "<title>Meet Ramsey!</title>" },
      }),
    });
    expect(v.status).toBe("exact-dog");
  });
});

describe("verifyDogProfileUrl — APA of Missouri is decided by APA's own feed", () => {
  beforeEach(() => __resetApaCacheForTests());
  const OTTO_URL = "https://apamo.org/adopt/adoptable-pets/?petID=A318825";

  // SUPERSEDED RULE (2026-09-06). This block used to assert that a petID in
  // the URL was itself proof — "APA petID pages need no HTML evidence" — on
  // the reasoning that their pet page is client-rendered so its HTML can
  // never confirm anything. The reasoning was right; the conclusion was not.
  // When APA migrated from PetPoint to Shelterluv, every A#####-shaped id
  // retired at once and that rule certified 29 dead links as "exact-dog",
  // MOO's among them, while she held the Dog of the Day slot.
  //
  // The page still cannot be read. So the question is put to the only source
  // that can answer it: APA's own adoptable-pets feed.

  it("confirms a petID the official APA feed still carries", async () => {
    const v = await verifyDogProfileUrl(OTTO_URL, {
      dogName: "OTTO",
      sourcePetId: "A318825",
      orgUrl: "https://apamo.org/",
      fetchImpl: scriptedFetch({
        [APA_FEED_URL]: {
          status: 200,
          body: JSON.stringify([{ animal_id: "A318825", name: "Otto", isAdoptable: 1 }]),
        },
      }),
    });
    expect(v.status).toBe("exact-dog");
    expect(v.detail).not.toMatch(/page mentions|carries this dog's listing id/);
  });

  it("calls a petID the official feed no longer carries GONE — the MOO regression", async () => {
    const mooUrl = "https://apamo.org/adopt/adoptable-pets/?petID=A313601";
    const v = await verifyDogProfileUrl(mooUrl, {
      dogName: "MOO",
      sourcePetId: "A313601",
      orgUrl: "https://apamo.org/",
      // APA's live feed after the Shelterluv migration: numeric ids only.
      // A313601 is simply not in it, and her page renders "PET NOT FOUND".
      fetchImpl: scriptedFetch({
        [APA_FEED_URL]: {
          status: 200,
          body: JSON.stringify([
            { animal_id: "2480", name: "Cherry Pie", isAdoptable: 1 },
            { animal_id: "17795", name: "Bella", isAdoptable: 1 },
          ]),
        },
      }),
    });
    expect(v.status).toBe("gone");
    expect(v.status).not.toBe("exact-dog");
  });

  it("treats a pet the feed carries but marks not adoptable as gone", async () => {
    const v = await verifyDogProfileUrl(OTTO_URL, {
      dogName: "OTTO",
      sourcePetId: "A318825",
      orgUrl: "https://apamo.org/",
      fetchImpl: scriptedFetch({
        [APA_FEED_URL]: {
          status: 200,
          body: JSON.stringify([{ animal_id: "A318825", name: "Otto", isAdoptable: 0 }]),
        },
      }),
    });
    expect(v.status).toBe("gone");
  });

  it("stays UNCERTAIN — never exact-dog, never gone — when the feed is unreachable", async () => {
    const v = await verifyDogProfileUrl(OTTO_URL, {
      dogName: "OTTO",
      sourcePetId: "A318825",
      orgUrl: "https://apamo.org/",
      // Nothing scripted for the feed: the fetch fails.
      fetchImpl: scriptedFetch({}),
    });
    expect(v.status).toBe("uncertain");
  });

  it("rejects a mismatched petID as this dog's page when the source id is known", async () => {
    const wrongDogUrl = "https://apamo.org/adopt/adoptable-pets/?petID=A999999";
    const v = await verifyDogProfileUrl(wrongDogUrl, {
      dogName: "OTTO",
      sourcePetId: "A318825",
      orgUrl: "https://apamo.org/",
      fetchImpl: scriptedFetch({
        [wrongDogUrl]: { status: 200, body: "<html><body>Adoptable Pets</body></html>" },
      }),
    });
    expect(v.status).toBe("wrong-dog");
  });

  it("demotes the bare adoptable-pets list (no petID) instead of treating it as a dog page", async () => {
    const listUrl = "https://apamo.org/adopt/adoptable-pets/";
    const v = await verifyDogProfileUrl(listUrl, {
      dogName: "OTTO",
      sourcePetId: "A318825",
      orgUrl: "https://apamo.org/",
      fetchImpl: scriptedFetch({
        [listUrl]: { status: 200, body: "<html><body>Adoptable Pets</body></html>" },
      }),
    });
    expect(v.status).toBe("generic");
  });
});
