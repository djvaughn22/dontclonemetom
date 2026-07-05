import { NextResponse } from "next/server";

// Real adoptable dogs by ZIP, keyless — Adopt-a-Pet's public GraphQL endpoint.
// Runs server-side so there's no CORS issue and we control the query (dogs only).
// If anything fails it returns an empty list and the UI falls back to search links.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "https://hasura.adoptapet.com/v1/graphql";

const QUERY = `query pets($zipCode: String!, $geoRange: Int!, $params: json!, $limit: Int, $offset: Int) {
  pets: pet_catalog_search_pets_geo(
    where: { pet_state: { _in: "available" } }
    args: { country_code: "US", geo_range: $geoRange, location: $zipCode, query: $params }
    limit: $limit
    offset: $offset
    order_by: [{ uploaded_timestamp: desc }, { pet_id: asc }]
  ) {
    petId: pet_id
    petName: pet_name
    image: primary_thumb_path
    distance: distance_km
    sex
    primary_family { family_name }
    secondary_family { family_name }
  }
}`;

type Dog = {
  id: string;
  name: string;
  breed: string;
  photo: string;
  miles: number | null;
  url: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.match(/\d{5}/)?.[0] ?? "63040";

  const variables = {
    zipCode: zip,
    geoRange: 100,
    limit: 40,
    offset: 0,
    params: { clan_id: [1] }, // clan_id 1 = dogs
  };

  // One attempt against the (unofficial, sometimes-flaky) Adopt-a-Pet endpoint.
  // Returns Dog[] on success, or null if the request failed / shape was bad.
  async function attempt(): Promise<Dog[] | null> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (DontCloneMeTom rescue awareness)",
      },
      body: JSON.stringify({ query: QUERY, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const pets = json?.data?.pets;
    if (!Array.isArray(pets)) return null;
    return pets
      .filter((p: any) => p?.image && p?.petId)
      .map((p: any) => ({
        id: String(p.petId),
        name: (p.petName || "A good dog").trim(),
        breed:
          [p.primary_family?.family_name, p.secondary_family?.family_name]
            .filter(Boolean)
            .join(" / ") || "Dog",
        photo: /^https?:/.test(p.image)
          ? p.image
          : `https://pet-uploads.adoptapet.com${p.image}`,
        miles: typeof p.distance === "number" ? Math.round(p.distance * 0.621371) : null,
        url: `https://www.adoptapet.com/pet/${p.petId}`,
      }));
  }

  // Retry a couple of times (kept short to stay under the serverless timeout),
  // since a single call to this endpoint fails intermittently.
  let dogs: Dog[] | null = null;
  for (let i = 0; i < 2 && !(dogs && dogs.length); i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 250));
    try {
      dogs = await attempt();
    } catch {
      dogs = null;
    }
  }

  if (dogs && dogs.length) {
    // Cache good results at the CDN so a later hiccup still serves dogs.
    return NextResponse.json(
      { status: "ok", zip, dogs },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" } }
    );
  }

  return NextResponse.json(
    { status: dogs ? "empty" : "error", zip, dogs: dogs ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
