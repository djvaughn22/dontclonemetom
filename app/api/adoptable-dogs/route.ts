// Local adoptable-dog faces via the official Petfinder API (v2).
//
// The public pet-scroller widget CANNOT filter by location (its keyless backend
// ignores location and blocks custom queries), so real "dogs within 30 miles of
// a ZIP" requires the official API. It's free: create a key at
// https://www.petfinder.com/developers/ and set two env vars on the deployment:
//   PETFINDER_KEY     = your API Key (Client ID)
//   PETFINDER_SECRET  = your Secret
// Until those are set, this route returns { configured: false } and the page
// falls back to location-filtered search links.

import { NextRequest, NextResponse } from "next/server";

type PetfinderPhoto = { small?: string; medium?: string; large?: string; full?: string };
type PetfinderAnimal = {
  id: number;
  name: string;
  url: string;
  distance?: number | null;
  age?: string;
  gender?: string;
  primary_photo_cropped?: PetfinderPhoto | null;
  photos?: PetfinderPhoto[];
  breeds?: { primary?: string | null; mixed?: boolean };
  contact?: { address?: { city?: string | null; state?: string | null } };
};

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

async function getAccessToken(key: string, secret: string): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const res = await fetch("https://api.petfinder.com/v2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: key,
      client_secret: secret,
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
  return cachedToken.token;
}

function pickPhoto(a: PetfinderAnimal): string | null {
  const p = a.primary_photo_cropped || (a.photos && a.photos[0]);
  return p?.medium || p?.large || p?.full || p?.small || null;
}

export async function GET(request: NextRequest) {
  const key = process.env.PETFINDER_KEY;
  const secret = process.env.PETFINDER_SECRET;

  if (!key || !secret) {
    return NextResponse.json({ configured: false, dogs: [] });
  }

  const zipRaw = request.nextUrl.searchParams.get("zip") || "63040";
  const zip = (zipRaw.match(/\d{5}/)?.[0]) ?? "63040";

  try {
    const token = await getAccessToken(key, secret);
    if (!token) {
      return NextResponse.json({ configured: true, dogs: [], error: "auth_failed" });
    }

    const url = new URL("https://api.petfinder.com/v2/animals");
    url.searchParams.set("type", "dog");
    url.searchParams.set("status", "adoptable");
    url.searchParams.set("location", zip);
    url.searchParams.set("distance", "30"); // within 30 miles
    url.searchParams.set("sort", "distance"); // nearest first
    url.searchParams.set("limit", "24");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ configured: true, dogs: [], error: `petfinder_${res.status}` });
    }

    const data = await res.json();
    const animals: PetfinderAnimal[] = Array.isArray(data.animals) ? data.animals : [];

    const dogs = animals
      .map((a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        photo: pickPhoto(a),
        city: a.contact?.address?.city ?? null,
        state: a.contact?.address?.state ?? null,
        breed: a.breeds?.primary ?? null,
        age: a.age ?? null,
        distance: a.distance != null ? Math.round(a.distance) : null,
      }))
      .filter((d) => d.photo); // only show dogs with a face

    return NextResponse.json({ configured: true, zip, dogs });
  } catch {
    return NextResponse.json({ configured: true, dogs: [], error: "request_failed" });
  }
}
