// Live link-truth sweep — the recheck pass for every adoptable listing.
//
//   RESCUEGROUPS_API_KEY=... npx tsx scripts/verify-dog-links.ts
//   (or with no key: sweeps the production API instead)
//
// For every active dog it follows the profile URL's redirects and classifies
// the final destination (exact-dog / generic / wrong-dog / gone / uncertain).
// Demoted dogs' preserved sourceProfileUrls are rechecked too, so a host
// that comes back to life is noticed.
//
// Only CONFIRMED bad destinations demand action (add the host to
// DEAD_PROFILE_HOSTS in app/lib/rescueDogs.ts, or fix classification).
// "uncertain" (anti-bot, timeouts) never demotes a link — it just stays on
// the recheck list. Exit code 1 = at least one active link confirmably lands
// on a generic page or the wrong dog.

import { fetchAdoptableDogs, type Dog } from "../app/lib/rescueDogs";
import { verifyDogProfileUrl, type LinkVerdict } from "../app/lib/linkVerification";

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
  console.log(`Sweeping ${dogs.length} active listings (zip ${ZIP}, ${MILES} mi)…\n`);

  const rows: {
    dog: Dog;
    kind: "active" | "demoted";
    url: string;
    verdict: LinkVerdict;
  }[] = [];
  const seen = new Map<string, LinkVerdict>();

  for (const dog of dogs) {
    const url = dog.profileUrl ?? dog.sourceProfileUrl;
    if (!url) continue;
    const kind = dog.profileUrl ? ("active" as const) : ("demoted" as const);
    let verdict = seen.get(url);
    if (!verdict) {
      verdict = await verifyDogProfileUrl(url, {
        dogName: dog.name,
        animalId: dog.id,
        orgUrl: dog.orgUrl,
      });
      seen.set(url, verdict);
    }
    rows.push({ dog, kind, url, verdict });
  }

  const noUrl = dogs.filter((d) => !d.profileUrl && !d.sourceProfileUrl);

  for (const { dog, kind, url, verdict } of rows) {
    const flag =
      kind === "active" && (verdict.status === "generic" || verdict.status === "wrong-dog")
        ? "❌"
        : kind === "active" && verdict.status === "gone"
          ? "⚠️ "
          : kind === "demoted" && verdict.status === "exact-dog"
            ? "🔁"
            : "  ";
    console.log(
      `${flag} [${kind}] ${dog.name} (${dog.org}) — ${verdict.status}` +
        `${verdict.httpStatus ? ` http=${verdict.httpStatus}` : ""} :: ${verdict.detail}` +
        `\n     ${url}${verdict.finalUrl && verdict.finalUrl !== url ? `\n     → ${verdict.finalUrl}` : ""}`,
    );
  }

  const activeBad = rows.filter(
    (r) => r.kind === "active" && (r.verdict.status === "generic" || r.verdict.status === "wrong-dog"),
  );
  const activeGone = rows.filter((r) => r.kind === "active" && r.verdict.status === "gone");
  const recovered = rows.filter((r) => r.kind === "demoted" && r.verdict.status === "exact-dog");
  const uncertain = rows.filter((r) => r.verdict.status === "uncertain");

  console.log(
    `\nSummary: ${rows.filter((r) => r.kind === "active").length} active links, ` +
      `${rows.filter((r) => r.kind === "demoted").length} demoted (source preserved), ` +
      `${noUrl.length} dogs with no per-dog URL from the feed (honest fallback only).`,
  );
  console.log(
    `  confirmed-bad active: ${activeBad.length} | gone: ${activeGone.length} | ` +
      `uncertain (recheck later, never demote): ${uncertain.length} | ` +
      `demoted-but-recovered hosts: ${recovered.length}`,
  );
  if (recovered.length) {
    console.log(
      "  🔁 A demoted URL now verifies at the URL level. Confirm the page truly RENDERS the dog" +
        " in a real browser (Wix shells return 200 with an empty page) before removing its host" +
        " from DEAD_PROFILE_HOSTS.",
    );
  }
  if (activeBad.length) {
    console.log(
      "\n❌ Active links confirmably landing generic/wrong-dog — add their hosts to DEAD_PROFILE_HOSTS:",
    );
    for (const r of activeBad) console.log(`   ${new URL(r.url).hostname}  (${r.dog.name})`);
    process.exit(1);
  }
  console.log("\n✅ Every active per-dog link verifiably lands on its exact dog.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
