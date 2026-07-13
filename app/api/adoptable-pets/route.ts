import { NextRequest, NextResponse } from "next/server";
import { fetchAdoptableDogs, normalizeZip } from "../../lib/rescueDogs";

// RescueGroups.org v5 public API — dogs available for adoption near a ZIP.
// Fetch + normalization live in app/lib/rescueDogs.ts (shared with the
// Dog of the Day engine). The key stays server-side.

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const zip = normalizeZip(p.get("zip"));
  const miles = Math.min(250, Math.max(5, parseInt(p.get("miles") ?? "50", 10) || 50));

  const { dogs, reason } = await fetchAdoptableDogs(zip, miles);
  if (!dogs) return NextResponse.json({ dogs: null, reason });

  return NextResponse.json({ dogs, zip, miles });
}
