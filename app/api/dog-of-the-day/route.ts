import { NextRequest, NextResponse } from "next/server";
import { buildDogOfTheDay, dogCityLabel } from "../../lib/dogOfTheDay";
import { chicagoDateKey } from "../../lib/dailySocialCore";

// Minimal JSON view of today's Dog of the Day for the homepage hero widget.
// Same selection engine as /today (app/lib/dogOfTheDay.ts) — no separate
// logic. Keeps the homepage a client component while still surfacing the
// server-only-fetched featured dog.
//
// `offset` walks the same deterministic ring `selectDogForDate` already
// exposes for the admin "choose another dog" control — the homepage
// "Spin another dog" button reuses it instead of adding new selection logic.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rawOffset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;

  try {
    const { dog, post } = await buildDogOfTheDay(chicagoDateKey(), { offset });
    return NextResponse.json({
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
      },
      pagePath: post.pagePath,
    });
  } catch (error) {
    return NextResponse.json({
      dog: null,
      reason: error instanceof Error ? error.message : "unavailable",
    });
  }
}
