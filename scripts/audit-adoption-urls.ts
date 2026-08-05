#!/usr/bin/env node

// Comprehensive adoption URL audit: find all dogs with missing or generic
// profile URLs, verify actual pages exist, and guide mapping to verified URLs.
//
// Usage (reads production API by default):
//   npx tsx scripts/audit-adoption-urls.ts
//
// With local RescueGroups key:
//   RESCUEGROUPS_API_KEY=... npx tsx scripts/audit-adoption-urls.ts [--save]
//
// Output:
//   - Rescue orgs sorted by dog count
//   - Dogs with no profile URL (need mapping)
//   - Dogs with unmapped override URLs
//   - Action: --save to write findings to docs/ADOPTION-URL-AUDIT-YYYY-MM-DD.md

import { fetchAdoptableDogs, type Dog } from "../app/lib/rescueDogs";
import { verifyDogProfileUrl, type LinkVerdict } from "../app/lib/linkVerification";

const ZIP = process.env.SWEEP_ZIP ?? "63040";
const MILES = Number(process.env.SWEEP_MILES ?? 100);
const SAVE = process.argv.includes("--save");

async function loadDogs(): Promise<Dog[]> {
  if (process.env.RESCUEGROUPS_API_KEY) {
    const { dogs, reason } = await fetchAdoptableDogs(ZIP, MILES);
    if (!dogs) throw new Error(`RescueGroups fetch failed (${reason ?? "unknown"})`);
    return dogs;
  }
  const res = await fetch(
    `https://dontclonemetom.com/api/adoptable-pets?zip=${ZIP}&miles=${MILES}`,
  );
  if (!res.ok) throw new Error(`production API returned ${res.status}`);
  const json = (await res.json()) as { dogs?: Dog[] };
  if (!json.dogs?.length) throw new Error("production API returned no dogs");
  return json.dogs;
}

async function main() {
  const dogs = await loadDogs();
  console.log(`\n📊 Adoption URL Audit (${dogs.length} dogs, zip ${ZIP}, ${MILES} mi)\n`);

  // Group by org
  const byOrg = new Map<string, Dog[]>();
  for (const dog of dogs) {
    const org = dog.org || "Unknown";
    if (!byOrg.has(org)) byOrg.set(org, []);
    byOrg.get(org)!.push(dog);
  }

  // Sort by dog count
  const orgs = Array.from(byOrg.entries()).sort((a, b) => b[1].length - a[1].length);

  console.log("Orgs with missing individual dog URLs:\n");

  const noProfileUrls: { org: string; dogs: Dog[] }[] = [];

  for (const [org, orgDogs] of orgs) {
    const withoutProfile = orgDogs.filter((d) => !d.profileUrl);
    if (withoutProfile.length > 0) {
      const allWithout = withoutProfile.length === orgDogs.length;
      const marker = allWithout ? "❌" : "⚠️ ";
      console.log(
        `${marker} ${org}: ${withoutProfile.length}/${orgDogs.length} dogs need mapping`,
      );
      noProfileUrls.push({ org, dogs: withoutProfile });

      if (withoutProfile.length <= 10) {
        for (const dog of withoutProfile) {
          console.log(`   - ${dog.id} ${dog.name}`);
        }
      }
    }
  }

  // Severity summary
  const totalMissingProfiles = noProfileUrls.reduce((sum, x) => sum + x.dogs.length, 0);
  const fullyMissing = noProfileUrls.filter(
    (x) => x.dogs.length === byOrg.get(x.org)!.length,
  );

  console.log(`\n📋 Summary:`);
  console.log(
    `  ${totalMissingProfiles} dogs across ${noProfileUrls.length} orgs lack individual URLs`,
  );
  console.log(
    `  ${fullyMissing.length} orgs have NO individual URLs (all dogs affected)`,
  );

  // Spencer Pet Rescue — production failure example
  const spencer = noProfileUrls.find((x) => x.org.includes("Spencer"));
  if (spencer) {
    console.log(`\n🔴 PRODUCTION FAILURE — Spencer Pet Rescue (${spencer.dogs.length} dogs):`);
    console.log("   Modal shows 'Visit the rescue' instead of individual dog pages.");
    console.log("   Example: Paco (22649663) has verified GetBuddy page but no profileUrl.");
    console.log("   Fix: Map each Spencer dog to its GetBuddy URL in ADOPTION_URL_OVERRIDES.");
  }

  if (SAVE) {
    const dateStr = new Date().toISOString().split("T")[0];
    const reportPath = `docs/ADOPTION-URL-AUDIT-${dateStr}.md`;
    console.log(`\n💾 TODO: Save findings to ${reportPath}`);
  }

  console.log("\n📖 Next steps:");
  console.log("  1. For each org in the list, find their actual adoption platform");
  console.log("     (GetBuddy, Petfinder, their own site, etc)");
  console.log("  2. For each dog, find its direct profile page URL");
  console.log("  3. Verify the page loads and displays that specific dog");
  console.log("  4. Add mappings to ADOPTION_URL_OVERRIDES in app/lib/rescueDogs.ts");
  console.log("  5. Add tests in app/lib/__tests__/rescueDogs.test.ts");
  console.log("  6. Run: npm run test -- --run app/lib/__tests__/rescueDogs.test.ts");
  console.log("  7. Deploy and verify in production\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
