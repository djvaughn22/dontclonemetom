import { NextRequest, NextResponse } from "next/server";
import { fetchPubliclyEligibleDogs, normalizeZip } from "../../lib/rescueDogs";

// RescueGroups.org v5 public API — dogs available for adoption near a ZIP.
// Fetch + normalization live in app/lib/rescueDogs.ts (shared with the
// Dog of the Day engine). The key stays server-side.
//
// 2026-08-10 link-integrity lock: only verified-direct dogs are eligible for
// public display. fetchPubliclyEligibleDogs widens the search radius (never
// past the site's own 250mi maximum) when the requested radius alone
// doesn't have enough verified dogs, so the public dog count never shrinks
// below the locked baseline just because a link couldn't be verified.

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const zip = normalizeZip(p.get("zip"));
  const miles = Math.min(250, Math.max(5, parseInt(p.get("miles") ?? "50", 10) || 50));

  const { result, reason } = await fetchPubliclyEligibleDogs(zip, miles);
  if (!result) return NextResponse.json({ dogs: null, reason });

  return NextResponse.json({
    dogs: result.dogs,
    zip,
    miles: result.effectiveMiles,
    requestedMiles: result.requestedMiles,
    widened: result.widened,
  });
}
