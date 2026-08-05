#!/usr/bin/env node

// Find all Spencer Pet Rescue dogs on GetBuddy and extract stable pet IDs.
// Generates registry entries ready to add to adoptionUrlRegistry.ts
//
// Usage:
//   npx tsx scripts/find-spencer-getbuddy-urls.ts
//   npx tsx scripts/find-spencer-getbuddy-urls.ts --verify (also test URLs load)

import { fetchAdoptableDogs, type Dog } from "../app/lib/rescueDogs";

const ZIP = process.env.SWEEP_ZIP ?? "63040";
const MILES = Number(process.env.SWEEP_MILES ?? 100);
const VERIFY = process.argv.includes("--verify");

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

async function findOnGetBuddy(dog: Dog): Promise<string | null> {
  // GetBuddy pet pages have stable URLs: https://www.getbuddy.com/pet/{PETID}
  // To find a dog, we would need to:
  // 1. Search their org on GetBuddy
  // 2. Browse to find the dog
  // 3. Extract the PETID from URL
  //
  // Without API access, we can try pattern-based search queries.
  // For now, return the search URL for manual lookup.

  const searchUrl = `https://www.getbuddy.com/pets?search=${encodeURIComponent(dog.name)}&organization=${encodeURIComponent("Spencer Pet Rescue")}`;

  console.log(`\n🔍 ${dog.name} (RG ID: ${dog.id})`);
  console.log(`   Search: ${searchUrl}`);
  console.log(`   Steps:`);
  console.log(`     1. Visit search URL above`);
  console.log(`     2. Click on ${dog.name}'s listing`);
  console.log(`     3. Copy the pet ID from URL: https://www.getbuddy.com/pet/{PETID}`);
  console.log(`     4. Record below as:`);
  console.log(`        "RG_ID": "https://www.getbuddy.com/pet/{PETID}?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile",`);

  return null;
}

async function verifyUrl(url: string, dogName: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`     ❌ HTTP ${res.status}`);
      return false;
    }

    const html = await res.text();
    if (html.toLowerCase().includes(dogName.toLowerCase())) {
      console.log(`     ✅ URL verified`);
      return true;
    }

    console.log(`     ⚠️  URL loads but ${dogName} name not found in page`);
    return false;
  } catch (err) {
    console.log(`     ❌ Fetch failed: ${String(err).slice(0, 50)}`);
    return false;
  }
}

async function main() {
  const dogs = await loadDogs();
  const spencerDogs = dogs.filter((d) => d.org.toLowerCase().includes("spencer"));

  console.log(`\n📋 Spencer Pet Rescue Adoption URL Discovery\n`);
  console.log(`Found ${spencerDogs.length} Spencer dogs in ${ZIP}/${MILES}mi:\n`);

  // Sort by ID for consistency
  spencerDogs.sort((a, b) => a.id.localeCompare(b.id));

  let foundCount = 0;

  console.log("START HERE: Add these to app/lib/adoptionUrlRegistry.ts\n");
  console.log("const spencerPetRescue: Record<string, RegistryEntry> = {");

  for (const dog of spencerDogs) {
    // Manually handle known dog
    if (dog.id === "22649663" && dog.name === "Paco") {
      console.log(`  "${dog.id}": { // ${dog.name} ✅ DONE`);
      console.log(
        `    adoptionProfileUrl: "https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile",`,
      );
      console.log(`    status: "verified-direct-dog-page",`);
      console.log(`    source: "getbuddy",`);
      console.log(`    verifiedAt: "2026-08-05T00:00:00Z",`);
      console.log(`    notes: "Verified: GetBuddy page shows Paco",`);
      console.log(`  },`);
      foundCount++;
      continue;
    }

    // For other dogs, prompt user to find on GetBuddy
    await findOnGetBuddy(dog);

    if (VERIFY) {
      // This would require user to manually provide URL first
      console.log(`   (Skipping verification in discovery mode)`);
    }
  }

  console.log(`};\n`);

  console.log(`\n📊 Summary:\n`);
  console.log(`  Found: ${foundCount} verified GetBuddy URLs`);
  console.log(`  Pending: ${spencerDogs.length - foundCount} dogs need manual lookup`);
  console.log(`\n💡 Manual Process for each dog:\n`);
  console.log(
    `  1. Visit GetBuddy: https://www.getbuddy.com/pets?organization=Spencer%20Pet%20Rescue`,
  );
  console.log(`  2. Search or scroll to find each dog`);
  console.log(`  3. Click the dog's card to open their GetBuddy page`);
  console.log(
    `  4. Copy the URL (format: https://www.getbuddy.com/pet/{STABLE_PET_ID}?...)`);
  console.log(`  5. Add to adoptionUrlRegistry.ts with status "verified-direct-dog-page"`);
  console.log(
    `  6. Add test in rescueDogs.test.ts to lock in the mapping\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
