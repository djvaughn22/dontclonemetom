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

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (DontCloneMeTom rescue awareness)",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          zipCode: zip,
          geoRange: 100,
          limit: 24,
          offset: 0,
          params: { clan_id: [1] }, // clan_id 1 = dogs
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return NextResponse.json({ status: "error", zip, dogs: [] });

    const json = await res.json();
    const pets = json?.data?.pets;
    if (!Array.isArray(pets)) return NextResponse.json({ status: "error", zip, dogs: [] });

    const dogs: Dog[] = pets
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

    return NextResponse.json({ status: dogs.length ? "ok" : "empty", zip, dogs });
  } catch {
    return NextResponse.json({ status: "error", zip, dogs: [] });
  }
}
