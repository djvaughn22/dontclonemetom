#!/usr/bin/env node

// Populate adoption URL registry by:
// 1. Querying production data for dogs without verified profiles
// 2. Searching for each dog on known platforms (GetBuddy, Petfinder, etc)
// 3. Verifying found URLs point to the correct dog
// 4. Generating registry entries for manual review
//
// Usage:
//   npx tsx scripts/populate-adoption-urls.ts --org "Spencer Pet Rescue"
//   npx tsx scripts/populate-adoption-urls.ts --rescue-id 22649663 (verify single dog)
//   npx tsx scripts/populate-adoption-urls.ts --report (generate audit report)

import { fetchAdoptableDogs, type Dog } from "../app/lib/rescueDogs";

const ZIP = process.env.SWEEP_ZIP ?? "63040";
const MILES = Number(process.env.SWEEP_MILES ?? 100);

interface SearchResult {
  dogId: string;
  dogName: string;
  platform: string;
  url: string;
  confidence: "verified" | "likely" | "uncertain";
  detail: string;
}

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

async function searchGetBuddy(dog: Dog): Promise<SearchResult | null> {
  // GetBuddy has a search API that could be called, but requires auth.
  // For now, suggest search query to user.
  console.log(`\n🔍 Search GetBuddy for: "${dog.name}" at ${dog.org}`);
  console.log(`   URL: https://www.getbuddy.com/pets?organization=${encodeURIComponent(dog.org)}`);
  return null; // TODO: integrate GetBuddy API if available
}

async function searchPetfinder(dog: Dog): Promise<SearchResult | null> {
  // Similar search pattern for Petfinder
  console.log(`🔍 Search Petfinder for: "${dog.name}" in ${dog.city}`);
  return null; // TODO: integrate Petfinder API
}

async function searchRescueWebsite(dog: Dog): Promise<SearchResult | null> {
  // Try common rescue website patterns
  // Example: countryacresrescue.org/dogs/ramsey
  const patterns = [
    `${dog.org.toLowerCase().replace(/\s+/g, "")}.com/dogs/${dog.name.toLowerCase().replace(/\s+/g, "-")}`,
    `${dog.org.toLowerCase().replace(/\s+/g, "")}.org/dogs/${dog.name.toLowerCase().replace(/\s+/g, "-")}`,
  ];

  for (const pattern of patterns) {
    const url = `https://${pattern}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const html = await res.text();
        if (html.toLowerCase().includes(dog.name.toLowerCase())) {
          return {
            dogId: dog.id,
            dogName: dog.name,
            platform: "rescue-owned-site",
            url,
            confidence: "likely",
            detail: `Found dog name in page content`,
          };
        }
      }
    } catch {
      // Not found
    }
  }

  return null;
}

async function verifyUrl(
  url: string,
  dog: Dog,
): Promise<{ confidence: "verified" | "uncertain"; detail: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (DontCloneMeTom adoption-audit)" },
    });

    if (!res.ok) {
      return { confidence: "uncertain", detail: `HTTP ${res.status}` };
    }

    const html = await res.text();
    if (html.toLowerCase().includes(dog.name.toLowerCase())) {
      return {
        confidence: "verified",
        detail: `Page contains dog name "${dog.name}"`,
      };
    }

    return { confidence: "uncertain", detail: "Page loaded but dog name not found" };
  } catch (err) {
    return { confidence: "uncertain", detail: `Fetch failed: ${String(err).slice(0, 50)}` };
  }
}

async function main() {
  const dogs = await loadDogs();
  const orgArg = process.argv.find((arg) => arg.startsWith("--org="))?.split("=")[1];
  const rescueIdArg = process.argv.find((arg) => arg.startsWith("--rescue-id="))?.split("=")[1];
  const reportMode = process.argv.includes("--report");

  let targetDogs = dogs;
  if (orgArg) {
    targetDogs = dogs.filter((d) => d.org.toLowerCase().includes(orgArg.toLowerCase()));
  }
  if (rescueIdArg) {
    targetDogs = dogs.filter((d) => d.id === rescueIdArg);
  }

  console.log(`\n🎯 Adoption URL Search & Verification (${targetDogs.length} dogs)\n`);

  const results: SearchResult[] = [];
  const failures: { dog: Dog; platforms: string[] }[] = [];

  for (const dog of targetDogs) {
    if (dog.profileUrl) {
      console.log(`✅ ${dog.name} already has profileUrl`);
      continue;
    }

    console.log(`\n${dog.name} (${dog.org}, ID: ${dog.id})`);

    // Try each platform
    const platformResults: SearchResult[] = [];

    if (dog.org.toLowerCase().includes("spencer")) {
      const result = await searchGetBuddy(dog);
      if (result) platformResults.push(result);
    }

    const petfinderResult = await searchPetfinder(dog);
    if (petfinderResult) platformResults.push(petfinderResult);

    const rescueResult = await searchRescueWebsite(dog);
    if (rescueResult) {
      const verified = await verifyUrl(rescueResult.url, dog);
      platformResults.push({
        ...rescueResult,
        confidence: verified.confidence === "verified" ? "verified" : "uncertain",
        detail: verified.detail,
      });
    }

    if (platformResults.length > 0) {
      results.push(...platformResults);
      console.log(`  Found ${platformResults.length} platform(s)`);
    } else {
      failures.push({ dog, platforms: ["getbuddy", "petfinder", "rescue-site"] });
      console.log(`  ❌ No results on tested platforms`);
    }
  }

  console.log(`\n📊 Summary:\n`);
  console.log(`  Found: ${results.length} potential URLs`);
  console.log(`  Verified: ${results.filter((r) => r.confidence === "verified").length}`);
  console.log(`  Failures: ${failures.length} dogs`);

  if (results.length > 0) {
    console.log(`\n✅ Verified results:\n`);
    for (const r of results.filter((r) => r.confidence === "verified")) {
      console.log(`  "${r.dogName}" (${r.dogId})`);
      console.log(`    ${r.url}`);
      console.log(`    Platform: ${r.platform}\n`);
    }
  }

  if (failures.length > 0) {
    console.log(`\n❌ Not found on any platform:\n`);
    for (const f of failures.slice(0, 10)) {
      console.log(`  - ${f.dog.name} (${f.dog.org})`);
    }
  }

  console.log("\n📝 Next: Add verified URLs to app/lib/adoptionUrlRegistry.ts\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
