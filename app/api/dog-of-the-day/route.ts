import { NextRequest, NextResponse } from "next/server";
import { buildDogOfTheDay, dogCityLabel } from "../../lib/dogOfTheDay";
import { chicagoDateKey } from "../../lib/dailySocialCore";

// Minimal JSON view of today's Dog of the Day for the homepage hero widget.
// Same selection engine as /today (app/lib/dogOfTheDay.ts) — no separate
// logic. Keeps the homepage a client component while still surfacing the
// server-only-fetched featured dog.
//
// `offset` walks the same rotation order the day's pick comes from — the
// homepage "Spin another dog" button reuses it instead of adding new
// selection logic.
//
// `date` is the Chicago date the dog was picked for; the daily history
// recorder (.github/workflows/record-dog-of-the-day.yml) stores it.
export const dynamic = "force-dynamic";

// Seconds left in today's Chicago date, so an edge-cached answer never
// outlives the day it was picked for.
function secondsLeftInChicagoDay(at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Math.max(1, 86400 - (value("hour") * 3600 + value("minute") * 60 + value("second")));
}

export async function GET(req: NextRequest) {
  const rawOffset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  const now = new Date();
  const date = chicagoDateKey(now);

  try {
    const { dog, post } = await buildDogOfTheDay(date, { offset });
    return NextResponse.json(
      {
        date,
        dog: {
          id: dog.id,
          name: dog.name,
          photo: dog.photo,
          org: dog.org,
          city: dogCityLabel(dog),
          // Feed facts the dog tiles already show publicly (breed/age) — the
          // hero teaser line, nothing inferred. Never temperament or medical.
          breed: dog.breed,
          age: dog.age,
          // When the listing went up on RescueGroups — shown only as
          // "Listed since …", never as time in a shelter.
          listedAt: dog.listedAt ?? null,
        },
        pagePath: post.pagePath,
      },
      // Ten minutes at the edge keeps the hero fast without holding a dog
      // past midnight or long after her listing changes.
      { headers: { "Cache-Control": `public, s-maxage=${Math.min(600, secondsLeftInChicagoDay(now))}` } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        date,
        dog: null,
        reason: error instanceof Error ? error.message : "unavailable",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
