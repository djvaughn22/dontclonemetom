import { describe, expect, it } from "vitest";
import { verifyDogProfileUrl } from "../linkVerification";

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
