import { NextResponse } from "next/server";

// Real adoptable dogs by ZIP.
// Primary source: Petfinder's official API (free, reliable) when PETFINDER_API_KEY
//   + PETFINDER_SECRET are set in the environment.
// Backup source: Adopt-a-Pet's public GraphQL (keyless) if Petfinder isn't
//   configured or is momentarily unavailable.
// If both fail it returns an empty list and the UI shows dog-search links.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Dog = {
  id: string;
  name: string;
  breed: string;
  photo: string;
  miles: number | null;
  city: string | null;
  url: string;
};

// ---- Petfinder (official, keyed) -------------------------------------------

let cachedToken: { token: string; expires: number } | null = null;

async function getPetfinderToken(): Promise<string | null> {
  const id = process.env.PETFINDER_API_KEY;
  const secret = process.env.PETFINDER_SECRET;
  if (!id || !secret) return null;
  if (cachedToken && cachedToken.expires > Date.now() + 30_000) return cachedToken.token;

  const res = await fetch("https://api.petfinder.com/v2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(4500),
  });
  if (!res.ok) return null;
  const j = await res.json();
  if (!j?.access_token) return null;
  cachedToken = { token: j.access_token, expires: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

async function fromPetfinder(zip: string): Promise<Dog[] | null> {
  const token = await getPetfinderToken();
  if (!token) return null;
  const url =
    `https://api.petfinder.com/v2/animals?type=dog&status=adoptable` +
    `&location=${encodeURIComponent(zip)}&distance=100&sort=distance&limit=24`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(4500),
  });
  if (!res.ok) return null;
  const j = await res.json();
  const animals = j?.animals;
  if (!Array.isArray(animals)) return null;
  return animals
    .filter((a: any) => a?.id && a?.photos?.length)
    .map((a: any) => ({
      id: String(a.id),
      name: (a.name || "A good dog").trim(),
      breed:
        [a.breeds?.primary, a.breeds?.secondary].filter(Boolean).join(" / ") || "Dog",
      photo: a.photos?.[0]?.medium || a.photos?.[0]?.small || a.photos?.[0]?.large,
      miles: typeof a.distance === "number" ? Math.round(a.distance) : null,
      city: a.contact?.address?.city
        ? `${a.contact.address.city}, ${a.contact.address.state}`
        : null,
      url: a.url,
    }));
}

// ---- Adopt-a-Pet (keyless backup) ------------------------------------------

const AAP_ENDPOINT = "https://hasura.adoptapet.com/v1/graphql";
const AAP_QUERY = `query pets($zipCode: String!, $geoRange: Int!, $params: json!, $limit: Int, $offset: Int) {
  pets: pet_catalog_search_pets_geo(
    where: { pet_state: { _in: "available" } }
    args: { country_code: "US", geo_range: $geoRange, location: $zipCode, query: $params }
    limit: $limit offset: $offset
    order_by: [{ uploaded_timestamp: desc }, { pet_id: asc }]
  ) {
    petId: pet_id petName: pet_name image: primary_thumb_path distance: distance_km
    sex primary_family { family_name } secondary_family { family_name }
  }
}`;

async function fromAdoptAPet(zip: string): Promise<Dog[] | null> {
  const res = await fetch(AAP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (DontCloneMeTom rescue awareness)",
    },
    body: JSON.stringify({
      query: AAP_QUERY,
      variables: { zipCode: zip, geoRange: 100, limit: 40, offset: 0, params: { clan_id: [1] } },
    }),
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
      photo: /^https?:/.test(p.image) ? p.image : `https://pet-uploads.adoptapet.com${p.image}`,
      miles: typeof p.distance === "number" ? Math.round(p.distance * 0.621371) : null,
      city: null,
      url: `https://www.adoptapet.com/pet/${p.petId}`,
    }));
}

// ---- Handler ---------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.match(/\d{5}/)?.[0] ?? "63040";

  // Try Petfinder first (official/reliable), then Adopt-a-Pet, with a short retry.
  const sources = [fromPetfinder, fromAdoptAPet];
  let dogs: Dog[] | null = null;
  let reached = false;

  for (const source of sources) {
    for (let i = 0; i < 2 && !(dogs && dogs.length); i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 250));
      try {
        const result = await source(zip);
        if (result !== null) reached = true;
        if (result && result.length) dogs = result;
      } catch {
        /* try next attempt / source */
      }
    }
    if (dogs && dogs.length) break;
  }

  if (dogs && dogs.length) {
    return NextResponse.json(
      { status: "ok", zip, dogs },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" } }
    );
  }

  return NextResponse.json(
    { status: reached ? "empty" : "error", zip, dogs: [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
