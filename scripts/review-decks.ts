// Nickname deck review — the periodic top-up pass for new listing dogs.
//
//   RESCUEGROUPS_API_KEY=... npx tsx scripts/review-decks.ts
//
// Fetches the live adoptable listings near the default ZIP, builds every
// dog's deck, and prints the ones that need a hand-written Name Book
// entry (plus any cross-dog nickname collisions). A clean run prints a
// one-line summary. Add book entries in app/lib/cards/nameBook.ts until
// the run is clean, then refresh the audit fixture if desired.

import { buildListingDeckReport } from "../app/lib/cards/tradingCards";
import { parseListingName } from "../app/lib/cards/dogNames";
import { fetchAdoptableDogs } from "../app/lib/rescueDogs";
import { DOG_OF_THE_DAY_MILES, DOG_OF_THE_DAY_ZIP } from "../app/lib/dogOfTheDay";

async function main() {
  const { dogs, reason } = await fetchAdoptableDogs(DOG_OF_THE_DAY_ZIP, DOG_OF_THE_DAY_MILES);
  if (!dogs) {
    console.error(`Could not fetch listings (${reason ?? "unknown"}). Set RESCUEGROUPS_API_KEY.`);
    process.exit(1);
  }
  const owner = new Map<string, string>();
  let flagged = 0;
  for (const dog of dogs) {
    const display = parseListingName(dog.name).display;
    const { deck, needsReview, reasons } = buildListingDeckReport(dog);
    const dupes: string[] = [];
    for (const c of deck) {
      const k = c.nickname.toLowerCase();
      if (owner.has(k)) dupes.push(`${c.nickname} (also ${owner.get(k)})`);
      else owner.set(k, `${display}#${dog.id}`);
    }
    if (needsReview || dupes.length) {
      flagged++;
      console.log(`⚠ ${display} #${dog.id} [${dog.breed} | ${dog.size} | ${dog.age} | ${dog.sex}]`);
      console.log(`  deck: ${deck.map((c) => c.nickname).join(" · ")}`);
      if (reasons.length) console.log(`  review: ${reasons.join("; ")}`);
      if (dupes.length) console.log(`  dupes: ${dupes.join(", ")}`);
    }
  }
  console.log(`\n${flagged} of ${dogs.length} dogs need attention; ${owner.size} nicknames in play.`);
}

main();
