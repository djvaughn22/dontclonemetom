import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeDog, isPubliclyEligible, type Dog } from "../rescueDogs";
import { emptyAdoptionUrl } from "../adoptionUrlSchema";
import { resolveDogDestination } from "../dogDestination";
import { candidateRingForDate, selectConfirmedDogForDate } from "../dogOfTheDay";
import { DESTINATION_TTL_MS, refreshDogDestination, resetDestinationCacheForTests } from "../destinationAvailability";

const now = Date.parse("2026-09-17T01:28:07Z");
function auditedDog(id = "111"): Dog {
  const url = `https://rescue.example.org/animals/detail?AnimalID=${id}`;
  return {
    ...normalizeDog({ type: "animals", id, attributes: { name: "Juniper", url } }, new Map()),
    org: "Example Rescue", city: "Wildwood, MO", photo: "https://rescue.example.org/photo.jpg",
    adoption: {
      ...emptyAdoptionUrl(), adoptionProfileUrl: url, adoptionProfileUrlOriginal: url,
      adoptionProfileUrlStatus: "verified-direct-dog-page", destinationVerificationMethod: "manual-audit",
      destinationVerifiedAt: "2026-08-11T01:17:30Z",
    },
  };
}

beforeEach(resetDestinationCacheForTests);

describe("Astrid regression: an old audit is not permanent availability", () => {
  it("withdraws Astrid's removed Petfinder listing even while her source record exists", () => {
    const dog = normalizeDog({ type: "animals", id: "21881216", attributes: { name: "ASTRID", rescueId: "A384760" } }, new Map());
    expect(dog.adoption.adoptionProfileUrlStatus).toBe("dead-or-removed");
    expect(dog.adoption.adoptionProfileUrl).toBeNull();
    expect(dog.adoption.adoptionProfileUrlOriginal).toContain("astrid-41f09fe4-7329-46b5-a36d-1c172b29f135");
    expect(dog.adoption.adoptionProfileUrlHttpStatus).toBe(404);
    expect(isPubliclyEligible(dog)).toBe(false);
    expect(resolveDogDestination(dog).type).not.toBe("exact-dog");
  });

  it("rechecks a stale audit, skips its 404 and features the next confirmed dog", async () => {
    const dogs = [auditedDog("111"), auditedDog("222")];
    const [removed, available] = candidateRingForDate("2026-09-16", dogs, new Set());
    const fetchImpl = vi.fn(async (url) => new Response("<h1>Juniper</h1>", {
      status: String(url) === removed.adoption.adoptionProfileUrl ? 404 : 200,
    })) as unknown as typeof fetch;
    const result = await selectConfirmedDogForDate("2026-09-16", dogs, new Set(), 0, { fetchImpl });
    expect(result.dog?.id).toBe(available.id);
    expect(result.attempts).toBe(2);
    expect(result.rejected[0].detail).toContain("gone");
    const detail = await refreshDogDestination(removed, { fetchImpl });
    expect(detail.adoption.adoptionProfileUrlStatus).toBe("dead-or-removed");
    expect(fetchImpl).toHaveBeenCalledTimes(2); // detail shares the selection verdict
  });
});

// 2026-10-08: Dumpling was Dog of the Day while GetBuddy said she had been
// adopted. Her August audit made her "confirmed", and selection had stopped
// checking confirmed dogs at all; her own detail page said the listing was over.
describe("Dumpling regression: the featured dog's destination is checked live", () => {
  const ADOPTED = (name: string) =>
    `<h1>${name}</h1><p>${name} has found a forever home! ${name} is no longer available for adoption.</p>`;

  it("walks past audited dogs whose listing now says adopted, even a run longer than one batch", async () => {
    const dogs = Array.from({ length: 12 }, (_, i) => auditedDog(String(111 + i)));
    const ring = candidateRingForDate("2026-10-08", dogs, new Set());
    const adoptedUrls = new Set(ring.slice(0, 6).map((d) => d.adoption.adoptionProfileUrl));
    const fetchImpl = vi.fn(async (url) =>
      new Response(adoptedUrls.has(String(url)) ? ADOPTED("Juniper") : "<h1>Juniper</h1>"),
    ) as unknown as typeof fetch;
    const result = await selectConfirmedDogForDate("2026-10-08", dogs, new Set(), 0, { fetchImpl });
    expect(result.dog?.id).toBe(ring[6].id);
    expect(result.rejected.map((r) => r.dog.id)).toEqual(ring.slice(0, 6).map((d) => d.id));
    expect(result.rejected.every((r) => r.detail.startsWith("gone"))).toBe(true);
    expect(result.dog?.adoption.destinationVerificationMethod).toBe("page-content");
  });

  it("checks previously confirmed dogs first without skipping their check", async () => {
    const dogs = Array.from({ length: 6 }, (_, i) => auditedDog(String(111 + i)));
    const ring = candidateRingForDate("2026-10-08", dogs, new Set());
    for (const dog of ring.slice(0, 3)) {
      dog.adoption.destinationVerifiedAt = null;
      dog.adoption.destinationVerificationMethod = "none";
    }
    const fetchImpl = vi.fn(async () => new Response("<h1>Juniper</h1>")) as unknown as typeof fetch;
    const result = await selectConfirmedDogForDate("2026-10-08", dogs, new Set(), 0, { fetchImpl });
    expect(result.dog?.id).toBe(ring[3].id);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("keeps a confirmed dog through a blocked check without restamping it as verified", async () => {
    const dogs = [auditedDog("111"), auditedDog("222")];
    const [first] = candidateRingForDate("2026-10-08", dogs, new Set());
    const fetchImpl = vi.fn(async () => new Response("", { status: 403 })) as unknown as typeof fetch;
    const result = await selectConfirmedDogForDate("2026-10-08", dogs, new Set(), 0, { fetchImpl });
    expect(result.dog?.id).toBe(first.id);
    expect(result.dog?.adoption.destinationVerifiedAt).toBe("2026-08-11T01:17:30Z");
    expect(result.dog?.adoption.destinationVerificationMethod).toBe("manual-audit");
  });

  it("returns no dog, not a dead one, when every candidate is adopted or unconfirmable", async () => {
    const dogs = [auditedDog("111"), auditedDog("222"), auditedDog("333")];
    dogs[2].adoption.destinationVerifiedAt = null;
    dogs[2].adoption.destinationVerificationMethod = "none";
    const fetchImpl = vi.fn(async (url) =>
      String(url).endsWith("333") ? new Response("", { status: 503 }) : new Response(ADOPTED("Juniper")),
    ) as unknown as typeof fetch;
    const result = await selectConfirmedDogForDate("2026-10-08", dogs, new Set(), 0, { fetchImpl });
    expect(result.dog).toBeNull();
    expect(result.rejected).toHaveLength(3);
  });

  it("rejects a destination that lands on a different dog's listing", async () => {
    const dogs = [auditedDog("111")];
    const fetchImpl = vi.fn(async (url) =>
      String(url).includes("AnimalID=111")
        ? new Response(null, { status: 302, headers: { location: "https://rescue.example.org/animals/detail?AnimalID=999" } })
        : new Response("<h1>Biscuit</h1>"),
    ) as unknown as typeof fetch;
    const result = await selectConfirmedDogForDate("2026-10-08", dogs, new Set(), 0, { fetchImpl });
    expect(result.dog).toBeNull();
  });

  it("shares concurrent checks, retains the exact sourced URL, and expires a successful verdict", async () => {
    const dog = auditedDog();
    const fetchImpl = vi.fn(async () => new Response("<h1>Juniper</h1>"));
    const [checked] = await Promise.all([
      refreshDogDestination(dog, { fetchImpl, now }),
      refreshDogDestination(dog, { fetchImpl, now }),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(checked.adoption.adoptionProfileUrl).toBe(dog.adoption.adoptionProfileUrl);
    await refreshDogDestination(dog, { fetchImpl, now: now + DESTINATION_TTL_MS - 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    fetchImpl.mockImplementation(async () => new Response("", { status: 410 }));
    const expired = await refreshDogDestination(checked, { fetchImpl, now: now + DESTINATION_TTL_MS });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(expired.adoption.adoptionProfileUrlStatus).toBe("dead-or-removed");
  });

  it.each([403, 429, 503, "timeout"])("treats %s as unconfirmed, never as removal, and retries after backoff", async (status) => {
    const dog = auditedDog();
    const fetchImpl = vi.fn(async () => {
      if (status === "timeout") throw Object.assign(new Error("timeout"), { name: "AbortError" });
      return new Response("", { status: Number(status) });
    });
    const result = await refreshDogDestination(dog, { fetchImpl, now });
    expect(result.adoption.adoptionProfileUrlStatus).toBe("verified-direct-dog-page");
    expect(result.adoption.destinationVerifiedAt).toBe(dog.adoption.destinationVerifiedAt);
    expect(result.adoption.adoptionProfileUrlOriginal).toBe(dog.adoption.adoptionProfileUrl);
    await refreshDogDestination(dog, { fetchImpl, now: now + 1000 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    fetchImpl.mockImplementation(async () => new Response("<h1>Juniper</h1>"));
    const retried = await refreshDogDestination(dog, { fetchImpl, now: now + 120001 });
    expect(retried.adoption.adoptionProfileUrlStatus).toBe("verified-direct-dog-page");
  });

  it("does not fetch again for fresh official evidence", async () => {
    const dog = auditedDog();
    dog.adoption.destinationVerifiedAt = new Date(now - 1000).toISOString();
    dog.adoption.destinationVerificationMethod = "official-feed";
    const fetchImpl = vi.fn();
    expect(await refreshDogDestination(dog, { fetchImpl, now })).toBe(dog);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
