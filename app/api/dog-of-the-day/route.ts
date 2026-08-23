import { NextResponse } from "next/server";
import { buildDogOfTheDay, dogCityLabel } from "../../lib/dogOfTheDay";
import { chicagoDateKey } from "../../lib/dailySocialCore";

// Minimal JSON view of today's Dog of the Day for the homepage hero widget.
// Same selection engine as /today (app/lib/dogOfTheDay.ts) — no separate
// logic. Keeps the homepage a client component while still surfacing the
// server-only-fetched featured dog.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { dog, post } = await buildDogOfTheDay(chicagoDateKey());
    return NextResponse.json({
      dog: {
        id: dog.id,
        name: dog.name,
        photo: dog.photo,
        org: dog.org,
        city: dogCityLabel(dog),
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
