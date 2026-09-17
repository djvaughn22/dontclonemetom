// Check only featured candidates and individual detail pages, never the grid.
// A historical audit is evidence of identity, not permanent availability.
import type { Dog } from "./rescueDogs";
import { hasConfirmedDestination } from "./adoptionUrlSchema";
import { verifyDogProfileUrl, type LinkVerdict } from "./linkVerification";

export const DESTINATION_TTL_MS = 30 * 60 * 1000;
const RETRY_MS = 2 * 60 * 1000;
type Checked = { at: number; verdict: LinkVerdict };
const cache = new Map<string, Checked>();
const pending = new Map<string, Promise<Checked>>();

export function resetDestinationCacheForTests() {
  cache.clear();
  pending.clear();
}

export async function refreshDogDestination(
  dog: Dog,
  options: { fetchImpl?: typeof fetch; now?: number } = {},
): Promise<Dog> {
  const url = dog.adoption.adoptionProfileUrl;
  if (!url || dog.adoption.adoptionProfileUrlStatus !== "verified-direct-dog-page") return dog;
  const now = options.now ?? Date.now();
  const key = `${dog.id}|${url}`;
  let checked = cache.get(key);
  const ttl = checked?.verdict.status === "uncertain" ? RETRY_MS : DESTINATION_TTL_MS;
  if (checked && now - checked.at >= ttl) checked = undefined;

  // A newer failed check takes precedence over a previously successful audit.
  if (!checked) {
    const verifiedAt = Date.parse(dog.adoption.destinationVerifiedAt ?? "");
    if (hasConfirmedDestination(dog.adoption) && verifiedAt <= now && now - verifiedAt < DESTINATION_TTL_MS) {
      return dog;
    }
    let request = pending.get(key);
    if (!request) {
      request = verifyDogProfileUrl(url, {
        dogName: dog.name,
        animalId: dog.id,
        sourcePetId: dog.rescueId,
        orgUrl: dog.orgUrl,
        fetchImpl: options.fetchImpl,
      }).then((verdict) => {
        const result = { at: options.now ?? Date.now(), verdict };
        cache.set(key, result);
        // Bound memory in long-lived workers; expiry still governs reuse.
        if (cache.size > 500) cache.delete(cache.keys().next().value!);
        return result;
      }).finally(() => pending.delete(key));
      pending.set(key, request);
    }
    checked = await request;
  }

  const { verdict, at } = checked;
  const confirmed = verdict.status === "exact-dog";
  const status = confirmed ? "verified-direct-dog-page"
    : verdict.status === "gone" ? "dead-or-removed"
    : verdict.status === "wrong-dog" ? "name-mismatch"
    : verdict.status === "generic" ? "generic-rescue-page" : "unverified";
  return {
    ...dog,
    profileUrl: confirmed ? url : null,
    adoption: {
      ...dog.adoption,
      // Retain the exact sourced URL. Redirect resolution is evidence only;
      // never construct or substitute a Petfinder URL from a name or id.
      adoptionProfileUrl: confirmed ? url : null,
      adoptionProfileUrlOriginal: dog.adoption.adoptionProfileUrlOriginal ?? url,
      adoptionProfileUrlResolved: verdict.finalUrl,
      adoptionProfileUrlHttpStatus: verdict.httpStatus,
      adoptionProfileUrlStatus: status,
      destinationVerifiedAt: verdict.status === "uncertain" ? null : new Date(at).toISOString(),
      destinationVerificationMethod: verdict.status === "uncertain" ? "none" : "page-content",
      adoptionProfileUrlDetail: `${verdict.status}: ${verdict.detail}`,
    },
  };
}
