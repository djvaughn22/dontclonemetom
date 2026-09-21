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
    expect(detail.adoption.adoptionProfileUrl).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2); // detail shares the selection verdict
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
