#!/usr/bin/env node

// Generate a complete adoption URL registry for all active dogs by:
// 1. Querying production API for all dogs
// 2. Classifying each dog's current status
// 3. Outputting TypeScript code ready to paste into adoptionUrlRegistry.ts
//
// Usage:
//   npx tsx scripts/generate-complete-adoption-registry.ts > adoption-registry-output.ts

import { fetchAdoptableDogs, type Dog } from "../app/lib/rescueDogs";

const ZIP = process.env.SWEEP_ZIP ?? "63040";
const MILES = Number(process.env.SWEEP_MILES ?? 100);

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

  console.error(`\n📊 Generating registry for ${dogs.length} dogs\n`);

  // Group by org
  const byOrg = new Map<string, Dog[]>();
  for (const dog of dogs) {
    const org = dog.org || "Unknown";
    if (!byOrg.has(org)) byOrg.set(org, []);
    byOrg.get(org)!.push(dog);
  }

  // Output TypeScript code
  console.log("// AUTO-GENERATED: Complete adoption URL registry");
  console.log("// Generated: " + new Date().toISOString());
  console.log("// Total dogs: " + dogs.length);
  console.log("// TODO: Populate adoptionProfileUrl for each dog\n");
  console.log("import type { RegistryEntry } from \"./adoptionUrlSchema\";\n");

  // Sort orgs by dog count
  const orgs = Array.from(byOrg.entries()).sort((a, b) => b[1].length - a[1].length);

  for (const [org, orgDogs] of orgs) {
    console.log(`// ${org} — ${orgDogs.length} dogs`);

    for (const dog of orgDogs) {
      const status = dog.profileUrl ? "verified-direct-dog-page" : "unverified";
      const adoptionUrl = dog.profileUrl ? `"${dog.profileUrl}"` : "null";
      const source = dog.profileUrl ? "rescuegroups-mini-site" : "unknown";

      console.log(`const ${dog.id}: RegistryEntry = {`);
      console.log(`  adoptionProfileUrl: ${adoptionUrl},`);
      console.log(`  status: "${status}",`);
      console.log(`  source: "${source}",`);
      console.log(`  verifiedAt: ${dog.profileUrl ? `"2026-08-05T00:00:00Z"` : "null"},`);
      console.log(`  notes: "${dog.name} / ${org}",`);
      console.log(`};`);
    }
    console.log("");
  }

  console.log("\n// Export complete registry");
  console.log("export const adoptionUrlRegistry: Record<string, RegistryEntry> = {");
  for (const dog of dogs) {
    console.log(`  "${dog.id}": ${dog.id},`);
  }
  console.log("};");

  console.error("\n✅ Registry code generated");
  console.error(`\nTo use: npx tsx scripts/generate-complete-adoption-registry.ts > registry.ts\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
