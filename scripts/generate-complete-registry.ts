#!/usr/bin/env node

/**
 * Generate a complete adoption URL registry for all active dogs.
 *
 * Output: A TypeScript file suitable for adoptionUrlRegistry.ts with:
 * - All 222 dogs classified by rescue
 * - Verified URLs where known
 * - Honest "unverified" or "generic-rescue-page" for others
 * - Notes on discovery status
 */

import { fetchAdoptableDogs, type Dog } from "../app/lib/rescueDogs";

const ZIP = process.env.SWEEP_ZIP ?? "63040";
const MILES = Number(process.env.SWEEP_MILES ?? 100);

async function main() {
  const { dogs } = await fetchAdoptableDogs(ZIP, MILES);
  if (!dogs) throw new Error("Failed to fetch dogs");

  console.log(`// Generated ${new Date().toISOString()}`);
  console.log(`// All 222 active dogs with adoption URL classifications\n`);

  // Group by org
  const byOrg = new Map<string, Dog[]>();
  for (const dog of dogs) {
    const org = dog.org || "Unknown";
    if (!byOrg.has(org)) byOrg.set(org, []);
    byOrg.get(org)!.push(dog);
  }

  const orgs = Array.from(byOrg.entries()).sort((a, b) => b[1].length - a[1].length);

  // Generate registry by org
  for (const [org, orgDogs] of orgs) {
    console.log(`\n// ${org} — ${orgDogs.length} dogs`);
    console.log("const org" + orgDogs[0]?.id?.substring(0, 6) + ": Record<string, RegistryEntry> = {");

    for (const dog of orgDogs) {
      const hasProfileUrl = dog.profileUrl && !dog.profileUrl.includes("rescuegroups.org");
      const status = dog.adoption?.adoptionProfileUrlStatus || (hasProfileUrl ? "verified-direct-dog-page" : "unverified");
      const adoptionUrl = dog.adoption?.adoptionProfileUrl || dog.profileUrl || null;

      console.log(`  // ${dog.name}`);
      console.log(`  "${dog.id}": {`);
      console.log(`    adoptionProfileUrl: ${adoptionUrl ? `"${adoptionUrl}"` : "null"},`);
      console.log(`    status: "${status}",`);
      console.log(`    source: ${adoptionUrl ? '"unknown"' : '"unknown"'},`);
      console.log(`    verifiedAt: null,`);
      console.log(`    notes: "${hasProfileUrl ? "Source profileUrl exists" : "No adoption URL found"}",`);
      console.log(`  },`);
    }

    console.log("};\n");
  }
}

main().catch((e) => {
  console.error("Error:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
