// Appends today's Dog of the Day to the history file the rotation reads
// (app/lib/featuredHistory.ts). Run by
// .github/workflows/record-dog-of-the-day.yml against the live site, with the
// `dog-of-the-day-history` branch checked out at the path given.
//
//   node scripts/record-dog-of-the-day.mjs history/dog-of-the-day.json
//
// Plain Node, no dependencies. It records only what the live site actually
// shows, once per date, and never fails the job over a quiet day: a missing
// day only means the rotation fills that day in by itself.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
const site = process.env.SITE_URL ?? "https://dontclonemetom.com";
const KEEP_DAYS = 1000;

if (!file) {
  console.error("usage: node scripts/record-dog-of-the-day.mjs <history.json>");
  process.exit(2);
}

let body = null;
try {
  // The query string only skips the edge cache; the route ignores it.
  const res = await fetch(`${site}/api/dog-of-the-day?recorder=${Date.now()}`, {
    headers: { "user-agent": "DontCloneMeTom.com history recorder" },
    signal: AbortSignal.timeout(60_000),
  });
  body = res.ok ? await res.json() : { reason: `HTTP ${res.status}` };
} catch (error) {
  body = { reason: error instanceof Error ? error.message : String(error) };
}

const date = body?.date;
const dog = body?.dog;
if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,12}$/.test(String(dog?.id ?? ""))) {
  console.log(`::warning::No Dog of the Day to record (${body?.reason ?? "no dog"})`);
  process.exit(0);
}

const history = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
const days = Array.isArray(history.days) ? history.days : [];
if (days.some((day) => day?.date === date)) {
  console.log(`Already recorded ${date}`);
  process.exit(0);
}

days.push({ date, id: String(dog.id), name: String(dog.name ?? "") });
days.sort((a, b) => String(a.date).localeCompare(String(b.date)));
history.days = days.slice(-KEEP_DAYS);
writeFileSync(file, `${JSON.stringify(history, null, 2)}\n`);
console.log(`Recorded ${date}: ${dog.name} (${dog.id})`);
