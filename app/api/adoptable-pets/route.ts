import { NextRequest, NextResponse } from "next/server";
import {
  fetchPubliclyEligibleDogs,
  normalizePlace,
  normalizeZip,
  type SearchPlace,
} from "../../lib/rescueDogs";

// RescueGroups.org v5 public API — dogs available for adoption near a ZIP
// (GET) or near a visitor's own location (POST, "Use my location").
// Fetch + normalization live in app/lib/rescueDogs.ts (shared with the
// Dog of the Day engine). The key stays server-side.
//
// 2026-08-10 link-integrity lock: only verified-direct dogs are eligible for
// public display. fetchPubliclyEligibleDogs widens the search radius (never
// past the site's own 250mi maximum) when the requested radius alone
// doesn't have enough verified dogs, so the public dog count never shrinks
// below the locked baseline just because a link couldn't be verified.

function clampMiles(value: unknown): number {
  return Math.min(250, Math.max(5, parseInt(String(value ?? "50"), 10) || 50));
}

async function respond(place: SearchPlace, miles: number) {
  const { result, reason } = await fetchPubliclyEligibleDogs(place, miles);
  if (!result) return NextResponse.json({ dogs: null, reason });

  return NextResponse.json({
    dogs: result.dogs,
    zip: typeof place === "string" ? place : null,
    near: typeof place !== "string",
    miles: result.effectiveMiles,
    requestedMiles: result.requestedMiles,
    widened: result.widened,
  });
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  return respond(normalizeZip(p.get("zip")), clampMiles(p.get("miles")));
}

// "Use my location" sends rounded coordinates in the request body, so a
// visitor's location never lands in a URL, a request log, or a shared link.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { lat?: unknown; lon?: unknown; miles?: unknown }
    | null;
  const near = normalizePlace(body?.lat, body?.lon);
  if (!near) return NextResponse.json({ dogs: null, reason: "bad-location" }, { status: 400 });
  return respond(near, clampMiles(body?.miles));
}
