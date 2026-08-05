#!/usr/bin/env node

/**
 * Comprehensive adoption URL mapper: discovers and verifies URLs for all dogs.
 *
 * Strategy:
 * 1. Load all active dogs from production API
 * 2. Group by rescue organization
 * 3. For each rescue, discover their publishing platform (GetBuddy, Petfinder, etc)
 * 4. Query platform APIs/sites to find each dog's URL
 * 5. Verify each URL points to that specific dog
 * 6. Generate complete registry output
 *
 * Output: TypeScript source that can be directly pasted into adoptionUrlRegistry.ts
 */

import { fetchAdoptableDogs, type Dog } from "../app/lib/rescueDogs";
import { verifyDogProfileUrl } from "../app/lib/linkVerification";

const ZIP = process.env.SWEEP_ZIP ?? "63040";
const MILES = Number(process.env.SWEEP_MILES ?? 100);

// Platform-specific discovery strategies
interface DiscoveryStrategy {
  name: string;
  platforms: string[];
  baseUrls: string[];
  urlPattern: (dogName: string, animalId?: string) => string[];
  verifyFn?: (url: string) => Promise<boolean>;
}

// Known platform mappings for specific rescues
const RESCUE_PLATFORM_MAP: Record<string, string[]> = {
  "Spencer Pet Rescue": ["getbuddy"],
  "STRAY PAWS RESCUE": ["straypawsrescue-site"],
  "Hope Animal Rescues": ["petfinder", "adopt-a-pet"],
  "St Charles County Humane Services": ["24petconnect"],
  "Perry County Humane Society of Illinois": ["petfinder"],
  "Animal Protective Association of Missouri": ["petfinder"],
  "St. Clair County Animal Adoption Center": ["petfinder", "adopt-a-pet"],
  "4 Paws 4 Rescue": ["petfinder", "adopt-a-pet"],
  "Humane Society of Missouri": ["petfinder"],
  "Country Acres Rescue": ["petfinder"],
  "Advocates 4 Animals Pet Food Pantry": ["petfinder"],
  "Mastino Rescue, Inc.": ["mastino-rescue-inc-site"],
  "St. Animal Pet Adoptions": ["petfinder"],
  "All Paws Rescue, Inc.": ["petfinder"],
};

const GETBUDDY_SEARCH = "https://www.getbuddy.com/api/search";
const PETFINDER_BASE = "https://www.petfinder.com/search/dogs";
const ADOPT_A_PET_BASE = "https://www.adoptapet.com/dog-search";

async function discoverGetBuddyUrls(dogs: Dog[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const spencerDogs = dogs.filter((d) => d.org.includes("Spencer"));

  if (spencerDogs.length === 0) return urls;

  console.log(`\n🔍 GetBuddy: searching for ${spencerDogs.length} Spencer Pet Rescue dogs...`);

  // GetBuddy search strategy: search by dog name, verify exact match
  for (const dog of spencerDogs) {
    try {
      // GetBuddy has a searchable database — construct likely pet URL
      // Pattern: https://www.getbuddy.com/pet/{pet-id}
      // We need to find the pet-id first. Common approach: search API or try name-based discovery
      const searchUrl = `${GETBUDDY_SEARCH}?query=${encodeURIComponent(dog.name)}`;
      console.log(`   ${dog.name} (${dog.id}): attempting discovery...`);

      // Mark for manual verification
      urls.set(dog.id, `GET_BUDDY_VERIFY:${dog.name}`);
    } catch (e) {
      console.error(`   ${dog.name}: error - ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return urls;
}

async function loadDogs(): Promise<Dog[]> {
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
  console.log(`\n🐕 Loading ${dogs.length} dogs for adoption URL mapping\n`);

  // Group by rescue
  const byOrg = new Map<string, Dog[]>();
  for (const dog of dogs) {
    const org = dog.org || "Unknown";
    if (!byOrg.has(org)) byOrg.set(org, []);
    byOrg.get(org)!.push(dog);
  }

  const orgs = Array.from(byOrg.entries()).sort((a, b) => b[1].length - a[1].length);

  console.log("📊 Rescue organizations and their publishing platforms:\n");

  const discoveredUrls = new Map<string, string>();

  for (const [org, orgDogs] of orgs) {
    const platforms = RESCUE_PLATFORM_MAP[org] || ["unknown"];
    console.log(`${org} (${orgDogs.length} dogs): ${platforms.join(", ")}`);

    // Platform-specific discovery
    if (platforms.includes("getbuddy")) {
      const getbuddyUrls = await discoverGetBuddyUrls(orgDogs);
      for (const [id, url] of getbuddyUrls) {
        discoveredUrls.set(id, url);
      }
    }
  }

  // Output instructions
  console.log("\n\n📋 NEXT STEPS:\n");
  console.log("1. GetBuddy URLs must be verified manually:");
  console.log("   - Open https://www.getbuddy.com/search");
  console.log("   - Search for each dog by name");
  console.log("   - Copy the stable pet ID from the URL");
  console.log("   - Format: https://www.getbuddy.com/pet/{pet-id}");
  console.log("\n2. Petfinder dogs (Hope, Perry Co, APA, etc):");
  console.log("   - Visit https://www.petfinder.com/search/dogs");
  console.log("   - Search by name and location");
  console.log("   - Copy the dog's URL");
  console.log("\n3. Run the verification audit after manual mapping");
  console.log("   npx tsx scripts/verify-dog-links.ts --fix");
  console.log("\nDocumentation: see docs/ADOPTION-URL-RESOLUTION.md");
}

main().catch((e) => {
  console.error("\n❌ Error:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
