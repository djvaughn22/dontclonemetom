import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy for rescue photos so the share-card canvas isn't
// tainted (the RescueGroups CDN sends no CORS headers). Locked to that CDN.
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return new NextResponse("missing u", { status: 400 });
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (parsed.hostname !== "cdn.rescuegroups.org") {
    return new NextResponse("host not allowed", { status: 403 });
  }
  const res = await fetch(parsed.toString(), { cache: "no-store" });
  if (!res.ok || !res.body) return new NextResponse("fetch failed", { status: 502 });
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
