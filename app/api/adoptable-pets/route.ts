import { NextRequest, NextResponse } from "next/server";

// RescueGroups.org v5 public API — dogs available for adoption near a ZIP.
// The key stays server-side; the client only ever sees trimmed results.

type Dog = {
  id: string;
  name: string;
  breed: string;
  age: string;
  sex: string;
  size: string;
  photo: string | null;
  photos: string[];
  city: string;
  distance: number | null;
  url: string;
  org: string;
  orgCity: string;
  email: string | null;
  desc: string;
  facts: string[];
};

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ");
}

function flag(v: unknown, yes: string, no: string): string | null {
  return v === true ? yes : v === false ? no : null;
}

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
      "https://api.rescuegroups.org/v5/public/animals/search/available/dogs?limit=222&include=pictures,locations,orgs",
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
      const pics = (a.relationships?.pictures?.data ?? [])
        .map((ref) => included.get(`pictures:${ref.id}`) as Record<string, { url?: string }> & { order?: number } | undefined)
        .filter(Boolean) as (Record<string, { url?: string }> & { order?: number })[];
      pics.sort((x, y) => (Number(x.order) || 0) - (Number(y.order) || 0));
      const photos = pics
        .map((p) => p.large?.url ?? p.small?.url ?? p.original?.url)
        .filter((u): u is string => typeof u === "string");
      const locRef = a.relationships?.locations?.data?.[0];
      const loc = locRef ? (included.get(`locations:${locRef.id}`) as Record<string, string> | undefined) : undefined;
      const orgRef = a.relationships?.orgs?.data?.[0];
      const org = orgRef ? (included.get(`orgs:${orgRef.id}`) as Record<string, string> | undefined) : undefined;
      // Link to this dog's own listing page. Not every animal record has one
      // (only rescues with a RescueGroups mini-site), so fall back to the
      // rescue's adoptable-dogs page, then its homepage.
      const httpUrl = (v: unknown) =>
        typeof v === "string" && v.startsWith("http") ? v : null;
      const dogUrl = httpUrl(at.url);
      const orgUrl = httpUrl(org?.adoptionUrl) ?? httpUrl(org?.url);
      const email = typeof org?.email === "string" && org.email.includes("@") ? org.email : null;
      return {
        id: a.id,
        name: String(at.name ?? "Good dog"),
        breed: String(at.breedString ?? "Mixed"),
        age: String(at.ageString ?? at.ageGroup ?? ""),
        sex: String(at.sex ?? ""),
        size: String(at.sizeGroup ?? ""),
        photo: photos[0] ?? null,
        photos,
        city: loc?.citystate ?? "",
        distance: typeof at.distance === "number" ? at.distance : null,
        url: dogUrl ?? orgUrl ?? "https://www.rescuegroups.org",
        org: String(org?.name ?? ""),
        orgCity: org?.citystate ?? "",
        email,
        desc: decodeEntities(String(at.descriptionText ?? "")).trim(),
        facts: [
          flag(at.isHousetrained, "Housetrained", "Not housetrained yet"),
          flag(at.isDogsOk, "Good with dogs", "Prefers to be the only dog"),
          flag(at.isCatsOk, "Good with cats", "No cats, please"),
          flag(at.isKidsOk, "Good with kids", "Better without young kids"),
        ].filter((f): f is string => f !== null),
      };
    });
    dogs.sort((x, y) => (x.distance ?? 999) - (y.distance ?? 999));

    cache.set(cacheKey, { at: Date.now(), dogs });
    return NextResponse.json({ dogs, zip, miles });
  } catch {
    return NextResponse.json({ dogs: null, reason: "fetch-failed" });
  }
}
