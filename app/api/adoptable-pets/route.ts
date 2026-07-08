import { NextRequest, NextResponse } from "next/server";

// RescueGroups.org v5 public API — dogs available for adoption near a ZIP.
// The key stays server-side; the client only ever sees trimmed results.

type Dog = {
  id: string;
  name: string;
  breed: string;
  age: string;
  sex: string;
  photo: string | null;
  city: string;
  distance: number | null;
  url: string;
  org: string;
};

type RGResource = {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: { type: string; id: string }[] }>;
};

// Small in-memory cache so repeat visits don't hammer the free API.
const cache = new Map<string, { at: number; dogs: Dog[] }>();
const CACHE_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const key = process.env.RESCUEGROUPS_API_KEY;
  if (!key) return NextResponse.json({ dogs: null, reason: "no-key" });

  const p = req.nextUrl.searchParams;
  const zip = /^\d{5}$/.test(p.get("zip") ?? "") ? (p.get("zip") as string) : "63040";
  const miles = Math.min(250, Math.max(5, parseInt(p.get("miles") ?? "50", 10) || 50));

  const cacheKey = `${zip}:${miles}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json({ dogs: hit.dogs, zip, miles, cached: true });
  }

  try {
    const res = await fetch(
      "https://api.rescuegroups.org/v5/public/animals/search/available/dogs?limit=24&include=pictures,locations,orgs",
      {
        method: "POST",
        headers: { Authorization: key, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({ data: { filterRadius: { miles, postalcode: zip } } }),
        cache: "no-store",
      }
    );
    if (!res.ok) return NextResponse.json({ dogs: null, reason: `upstream-${res.status}` });

    const json = (await res.json()) as { data?: RGResource[]; included?: RGResource[] };
    const included = new Map(
      (json.included ?? []).map((r) => [`${r.type}:${r.id}`, r.attributes])
    );

    const dogs: Dog[] = (json.data ?? []).map((a) => {
      const at = a.attributes;
      const picRef = a.relationships?.pictures?.data?.[0];
      const pic = picRef ? (included.get(`pictures:${picRef.id}`) as Record<string, { url?: string }> | undefined) : undefined;
      const locRef = a.relationships?.locations?.data?.[0];
      const loc = locRef ? (included.get(`locations:${locRef.id}`) as Record<string, string> | undefined) : undefined;
      const orgRef = a.relationships?.orgs?.data?.[0];
      const org = orgRef ? (included.get(`orgs:${orgRef.id}`) as Record<string, string> | undefined) : undefined;
      // Prefer the rescue's real website — the per-animal url points at the
      // org's RescueGroups-hosted mini-site, which some rescues abandoned.
      const orgUrl = typeof org?.url === "string" && org.url.startsWith("http") ? org.url : null;
      return {
        id: a.id,
        name: String(at.name ?? "Good dog"),
        breed: String(at.breedString ?? "Mixed"),
        age: String(at.ageGroup ?? ""),
        sex: String(at.sex ?? ""),
        photo: pic?.large?.url ?? pic?.small?.url ?? pic?.original?.url ?? null,
        city: loc?.citystate ?? "",
        distance: typeof at.distance === "number" ? at.distance : null,
        url: orgUrl ?? String(at.url ?? "https://www.rescuegroups.org"),
        org: String(org?.name ?? ""),
      };
    });
    dogs.sort((x, y) => (x.distance ?? 999) - (y.distance ?? 999));

    cache.set(cacheKey, { at: Date.now(), dogs });
    return NextResponse.json({ dogs, zip, miles });
  } catch {
    return NextResponse.json({ dogs: null, reason: "fetch-failed" });
  }
}
