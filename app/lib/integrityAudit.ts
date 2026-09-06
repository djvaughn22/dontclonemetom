// The recurring integrity audit — the thing that would have caught MOO.
//
// Shared core for the scheduled route (app/api/integrity-audit/route.ts) and
// the on-demand sweep (scripts/adoption-integrity-audit.ts), so what runs
// nightly and what a person runs by hand are the same code.
//
// Two tiers, because featured placement earns the most scrutiny and the full
// inventory is too big to check on every pass:
//
//   featured — the Dog of the Day ring's leading candidates. Small, checked
//              every run. This is the tier that protects the highest-value
//              placement on the site.
//   sample   — a bounded slice of the wider inventory, so provider-wide
//              breakage (an entire shelter migrating software) surfaces
//              within days instead of never.
//
// Bounded by construction: a fixed cap on how many destinations any single
// run will check, and every check goes through the same SSRF-screened,
// timeout-bounded fetch the rest of the site uses.

import { verifyDogProfileUrl, type LinkVerdictStatus } from "./linkVerification";
import { hasConfirmedDestination } from "./adoptionUrlSchema";
import { evaluateProviders, type ProviderSample, type QuarantineDecision } from "./providerQuarantine";
import { candidateRingForDate, DOG_OF_THE_DAY_MILES, DOG_OF_THE_DAY_ZIP } from "./dogOfTheDay";
import { chicagoDateKey } from "./dailySocialCore";
import { fetchAdoptableDogs, fetchPubliclyEligibleDogs, type Dog } from "./rescueDogs";

export type DogAuditRow = {
  id: string;
  name: string;
  org: string;
  url: string | null;
  feedSeenAt: string | null;
  destinationVerifiedAt: string | null;
  status: LinkVerdictStatus | "not-checked";
  detail: string;
  featured: boolean;
  identityConflict: string | null;
};

export type IntegrityAuditReport = {
  ranAt: string;
  zip: string;
  miles: number;
  displayed: number;
  checked: number;
  confirmedGood: number;
  confirmedBad: number;
  unverified: number;
  identityConflicts: number;
  byProvider: Record<string, number>;
  quarantine: QuarantineDecision[];
  failures: DogAuditRow[];
  featured: DogAuditRow[];
};

// How many destinations one run may check. Keeps a scheduled run polite and
// its cost predictable.
export const AUDIT_MAX_CHECKS = 60;
// Of that budget, how many go to the featured ring (checked every run).
export const AUDIT_FEATURED_CHECKS = 12;

function providerOf(dog: Dog): string {
  const url = dog.adoption.adoptionProfileUrl ?? dog.adoption.adoptionProfileUrlOriginal;
  if (!url) return dog.org || "unknown";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return dog.org || "unknown";
  }
}

// Rotate the sampled slice by date so the whole inventory is covered over
// time rather than the same dogs being rechecked forever.
function rotatingSample(dogs: Dog[], size: number, dateKey: string): Dog[] {
  if (dogs.length <= size) return dogs;
  const seed = [...dateKey].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const start = seed % dogs.length;
  return Array.from({ length: size }, (_, i) => dogs[(start + i) % dogs.length]);
}

async function auditOne(dog: Dog, featured: boolean): Promise<DogAuditRow> {
  const base = {
    id: dog.id,
    name: dog.name,
    org: dog.org,
    url: dog.adoption.adoptionProfileUrl ?? dog.adoption.adoptionProfileUrlOriginal,
    feedSeenAt: dog.feedSeenAt,
    destinationVerifiedAt: dog.adoption.destinationVerifiedAt,
    featured,
    identityConflict: dog.identityConflict?.detail ?? null,
  };

  // Already settled against the shelter's own official record during the
  // inventory fetch — no reason to spend a request re-asking.
  if (hasConfirmedDestination(dog.adoption)) {
    return { ...base, status: "exact-dog", detail: dog.adoption.adoptionProfileUrlDetail };
  }
  if (dog.adoption.adoptionProfileUrlStatus === "dead-or-removed") {
    return { ...base, status: "gone", detail: dog.adoption.adoptionProfileUrlDetail };
  }

  const url = dog.adoption.adoptionProfileUrl ?? dog.adoption.adoptionProfileUrlOriginal;
  if (!url) {
    return { ...base, status: "not-checked", detail: "no individual destination to check" };
  }

  const verdict = await verifyDogProfileUrl(url, {
    dogName: dog.name,
    animalId: dog.id,
    sourcePetId: dog.rescueId,
    orgUrl: dog.orgUrl,
  });
  return { ...base, status: verdict.status, detail: verdict.detail };
}

export async function runIntegrityAudit(
  options: { zip?: string; miles?: number; maxChecks?: number; dateKey?: string } = {},
): Promise<IntegrityAuditReport> {
  const zip = options.zip ?? DOG_OF_THE_DAY_ZIP;
  const miles = options.miles ?? DOG_OF_THE_DAY_MILES;
  const maxChecks = options.maxChecks ?? AUDIT_MAX_CHECKS;
  const dateKey = options.dateKey ?? chicagoDateKey();

  // Audit what the site ACTUALLY displays — including the radius widening the
  // homepage does — so "displayed" in this report means the same thing it
  // means to a visitor. Auditing a narrower slice and calling it "displayed"
  // would be its own small dishonesty.
  const { result, reason } = await fetchPubliclyEligibleDogs(zip, miles);
  if (!result) throw new Error(`dog source unavailable (${reason ?? "unknown"})`);
  const displayed = result.dogs;

  const { dogs } = await fetchAdoptableDogs(zip, result.effectiveMiles);
  if (!dogs) throw new Error("dog source unavailable while re-reading the candidate pool");

  const featuredRing = candidateRingForDate(dateKey, dogs, new Set()).slice(
    0,
    Math.min(AUDIT_FEATURED_CHECKS, maxChecks),
  );
  const featuredIds = new Set(featuredRing.map((d) => d.id));
  const sample = rotatingSample(
    displayed.filter((d) => !featuredIds.has(d.id)),
    Math.max(0, maxChecks - featuredRing.length),
    dateKey,
  );

  const rows: DogAuditRow[] = [];
  for (const dog of featuredRing) rows.push(await auditOne(dog, true));
  for (const dog of sample) rows.push(await auditOne(dog, false));

  const samples = new Map<string, ProviderSample>();
  for (const [index, row] of rows.entries()) {
    const dog = index < featuredRing.length ? featuredRing[index] : sample[index - featuredRing.length];
    const provider = providerOf(dog);
    const entry = samples.get(provider) ?? { provider, confirmedBad: 0, confirmedGood: 0, unverified: 0 };
    if (row.status === "exact-dog") entry.confirmedGood += 1;
    else if (row.status === "gone" || row.status === "wrong-dog" || row.status === "generic") entry.confirmedBad += 1;
    else entry.unverified += 1;
    samples.set(provider, entry);
  }

  const byProvider: Record<string, number> = {};
  for (const dog of displayed) {
    const provider = providerOf(dog);
    byProvider[provider] = (byProvider[provider] ?? 0) + 1;
  }

  return {
    ranAt: new Date().toISOString(),
    zip,
    miles: result.effectiveMiles,
    displayed: displayed.length,
    checked: rows.length,
    confirmedGood: rows.filter((r) => r.status === "exact-dog").length,
    confirmedBad: rows.filter((r) => r.status === "gone" || r.status === "wrong-dog" || r.status === "generic").length,
    unverified: rows.filter((r) => r.status === "uncertain" || r.status === "not-checked").length,
    identityConflicts: dogs.filter((d) => d.identityConflict).length,
    byProvider,
    quarantine: evaluateProviders([...samples.values()]),
    failures: rows.filter((r) => r.status === "gone" || r.status === "wrong-dog" || r.status === "generic"),
    featured: rows.filter((r) => r.featured),
  };
}
