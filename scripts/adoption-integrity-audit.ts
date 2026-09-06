// Full adoption-integrity audit — the truth about what the site is showing.
//
//   RESCUEGROUPS_API_KEY=... npx tsx scripts/adoption-integrity-audit.ts
//   RESCUEGROUPS_API_KEY=... npx tsx scripts/adoption-integrity-audit.ts --full
//
// Default: audits the homepage's own default view (63040 / 50mi, with the
// same radius widening the site itself does), checking every displayed dog's
// destination. --full also checks dogs that are NOT publicly displayed, to
// see whether anything was wrongly excluded.
//
// Reports exactly the categories that matter after the MOO failure:
//   displayed, by provider, CONFIRMED-GOOD, CONFIRMED-BAD, UNVERIFIED,
//   directory-fallback (no dog-specific page at all), and identity conflicts.
//
// The distinction the old pipeline could not make, and the reason this file
// exists: "the feed still lists this dog" is NOT "the destination confirms
// this dog". They are reported as separate columns and never merged.
//
// Exit code 1 when any DISPLAYED dog has a confirmed-bad destination.

import { fetchAdoptableDogs, fetchPubliclyEligibleDogs, isPubliclyEligible, type Dog } from "../app/lib/rescueDogs";
import { verifyDogProfileUrl, type LinkVerdictStatus } from "../app/lib/linkVerification";
import { hasConfirmedDestination } from "../app/lib/adoptionUrlSchema";
import { evaluateProviders, type ProviderSample } from "../app/lib/providerQuarantine";

const ZIP = process.env.AUDIT_ZIP ?? "63040";
const MILES = Number(process.env.AUDIT_MILES ?? 50);
const FULL = process.argv.includes("--full");
// Politeness: how many destination checks may run at once.
const CONCURRENCY = Number(process.env.AUDIT_CONCURRENCY ?? 4);

type Row = {
  dog: Dog;
  displayed: boolean;
  status: LinkVerdictStatus | "no-destination";
  detail: string;
};

function provider(dog: Dog): string {
  const url = dog.adoption.adoptionProfileUrl ?? dog.adoption.adoptionProfileUrlOriginal;
  if (!url) return "(no dog-specific page)";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "(unparseable)";
  }
}

async function check(dog: Dog, displayed: boolean): Promise<Row> {
  if (hasConfirmedDestination(dog.adoption)) {
    return { dog, displayed, status: "exact-dog", detail: dog.adoption.adoptionProfileUrlDetail };
  }
  if (dog.adoption.adoptionProfileUrlStatus === "dead-or-removed") {
    return { dog, displayed, status: "gone", detail: dog.adoption.adoptionProfileUrlDetail };
  }
  const url = dog.adoption.adoptionProfileUrl ?? dog.adoption.adoptionProfileUrlOriginal;
  if (!url) {
    return { dog, displayed, status: "no-destination", detail: "no dog-specific page; falls back to the rescue" };
  }
  const verdict = await verifyDogProfileUrl(url, {
    dogName: dog.name,
    animalId: dog.id,
    sourcePetId: dog.rescueId,
    orgUrl: dog.orgUrl,
  });
  return { dog, displayed, status: verdict.status, detail: verdict.detail };
}

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

function pct(n: number, total: number): string {
  return total ? `${((n / total) * 100).toFixed(1)}%` : "—";
}

async function main() {
  const { result } = await fetchPubliclyEligibleDogs(ZIP, MILES);
  if (!result) throw new Error("could not load the public inventory");

  const { dogs: pool } = await fetchAdoptableDogs(ZIP, result.effectiveMiles);
  const displayedIds = new Set(result.dogs.map((d) => d.id));
  const hidden = (pool ?? []).filter((d) => !displayedIds.has(d.id));

  console.log("=".repeat(78));
  console.log("DONTCLONEMETOM — ADOPTION INTEGRITY AUDIT");
  console.log("=".repeat(78));
  console.log(`ran at            ${new Date().toISOString()}`);
  console.log(`search            ZIP ${ZIP}, requested ${MILES}mi, effective ${result.effectiveMiles}mi (widened: ${result.widened})`);
  console.log(`candidates seen   ${result.candidatesConsidered}`);
  console.log(`DOGS DISPLAYED    ${result.dogs.length}`);
  console.log(`not displayed     ${hidden.length}`);

  console.log("\n--- displayed by provider (destination host) ---");
  const byProvider = new Map<string, number>();
  for (const d of result.dogs) byProvider.set(provider(d), (byProvider.get(provider(d)) ?? 0) + 1);
  for (const [host, n] of [...byProvider].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(n).padStart(5)}  ${host}`);
  }

  console.log("\n--- displayed by rescue ---");
  const byRescue = new Map<string, number>();
  for (const d of result.dogs) byRescue.set(d.org, (byRescue.get(d.org) ?? 0) + 1);
  for (const [org, n] of [...byRescue].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(n).padStart(5)}  ${org}`);
  }

  const targets: { dog: Dog; displayed: boolean }[] = [
    ...result.dogs.map((dog) => ({ dog, displayed: true })),
    ...(FULL ? hidden.map((dog) => ({ dog, displayed: false })) : []),
  ];
  console.log(`\nchecking ${targets.length} destination(s) at concurrency ${CONCURRENCY}…\n`);

  const rows = await mapLimited(targets, CONCURRENCY, (t) => check(t.dog, t.displayed));
  const shown = rows.filter((r) => r.displayed);

  const good = shown.filter((r) => r.status === "exact-dog");
  const bad = shown.filter((r) => r.status === "gone" || r.status === "wrong-dog" || r.status === "generic");
  const unknown = shown.filter((r) => r.status === "uncertain");
  const noDest = shown.filter((r) => r.status === "no-destination");
  const conflicts = (pool ?? []).filter((d) => d.identityConflict);

  console.log("=".repeat(78));
  console.log("VERDICT — DISPLAYED DOGS");
  console.log("=".repeat(78));
  console.log(`total displayed                       ${shown.length}`);
  console.log(`CONFIRMED available (destination)     ${good.length}  ${pct(good.length, shown.length)}`);
  console.log(`CONFIRMED unavailable / wrong / bad   ${bad.length}  ${pct(bad.length, shown.length)}`);
  console.log(`UNVERIFIED (blocked, timeout, quiet)  ${unknown.length}  ${pct(unknown.length, shown.length)}`);
  console.log(`directory/fallback link only          ${noDest.length}  ${pct(noDest.length, shown.length)}`);
  console.log(`identity conflicts in the pool        ${conflicts.length}`);

  console.log("\n--- FEED-SEEN vs DESTINATION-CONFIRMED (these are different facts) ---");
  const feedSeen = shown.filter((r) => r.dog.feedSeenAt).length;
  const destConfirmed = shown.filter((r) => r.dog.adoption.destinationVerifiedAt).length;
  console.log(`in the source feed with a timestamp   ${feedSeen}`);
  console.log(`destination actually confirmed        ${destConfirmed}`);

  if (bad.length) {
    console.log("\n" + "=".repeat(78));
    console.log("CONFIRMED FAILURES (displayed dogs whose destination is bad)");
    console.log("=".repeat(78));
    for (const r of bad) {
      console.log(
        [
          `name        ${r.dog.name}`,
          `internal id ${r.dog.id}`,
          `rescue      ${r.dog.org}`,
          `provider    ${provider(r.dog)}`,
          `url         ${r.dog.adoption.adoptionProfileUrl ?? r.dog.adoption.adoptionProfileUrlOriginal}`,
          `feed seen   ${r.dog.feedSeenAt ?? "(none)"}`,
          `dest check  ${r.status} — ${r.detail}`,
        ].join("\n") + "\n",
      );
    }
  }

  if (conflicts.length) {
    console.log("=".repeat(78));
    console.log("IDENTITY CONFLICTS (record names one dog, describes another)");
    console.log("=".repeat(78));
    for (const d of conflicts) {
      console.log(`${d.id}  ${d.org}  ${d.identityConflict?.detail}`);
    }
    console.log("");
  }

  const samples = new Map<string, ProviderSample>();
  for (const r of rows) {
    const key = provider(r.dog);
    const entry = samples.get(key) ?? { provider: key, confirmedBad: 0, confirmedGood: 0, unverified: 0 };
    if (r.status === "exact-dog") entry.confirmedGood += 1;
    else if (r.status === "gone" || r.status === "wrong-dog" || r.status === "generic") entry.confirmedBad += 1;
    else entry.unverified += 1;
    samples.set(key, entry);
  }
  console.log("=".repeat(78));
  console.log("PROVIDER HEALTH");
  console.log("=".repeat(78));
  for (const d of evaluateProviders([...samples.values()])) {
    console.log(`${d.quarantined ? "QUARANTINE" : "ok        "}  ${d.provider.padEnd(42)} ${d.reason}`);
  }

  if (bad.length) {
    console.log(`\nFAIL: ${bad.length} displayed dog(s) have a confirmed-bad destination.`);
    process.exitCode = 1;
  } else {
    console.log("\nPASS: no displayed dog has a confirmed-bad destination.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
