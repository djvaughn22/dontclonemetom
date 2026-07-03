import { NextResponse } from "next/server";

// Live adoptable-dog search via the free Petfinder API.
// Set PETFINDER_KEY and PETFINDER_SECRET (free at petfinder.com/developers) in
// the environment to show real dogs in-site. Until then the UI deep-links to
// Petfinder's own results for the ZIP, so real dogs still show up.

let cachedToken: { token: string; expires: number } | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const key = process.env.PETFINDER_KEY;
  const secret = process.env.PETFINDER_SECRET;
  if (!key || !secret) return null;

  const res = await fetch("https://api.petfinder.com/v2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: key,
      client_secret: secret,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = (searchParams.get("zip") || "").replace(/[^0-9]/g, "").slice(0, 5);

  if (zip.length !== 5) {
    return NextResponse.json(
      { error: "Enter a 5-digit ZIP code.", dogs: [] },
      { status: 400 },
    );
  }

  const token = await getToken();
  if (!token) {
    // No API key configured — the client falls back to a Petfinder deep link.
    return NextResponse.json({ status: "unconfigured", dogs: [] });
  }

  const url = new URL("https://api.petfinder.com/v2/animals");
  url.searchParams.set("type", "Dog");
  url.searchParams.set("status", "adoptable");
  url.searchParams.set("location", zip);
  url.searchParams.set("distance", "100");
  url.searchParams.set("sort", "distance");
  url.searchParams.set("limit", "30");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return NextResponse.json({ status: "error", dogs: [] });
  }

  const data = await res.json();
  const dogs = (data.animals || []).map(
    (a: Record<string, unknown> & { breeds?: { primary?: string }; primary_photo_cropped?: { medium?: string }; photos?: { medium?: string }[]; contact?: { address?: { city?: string; state?: string } } }) => ({
      id: a.id,
      name: a.name,
      breed: a.breeds?.primary || "Lovable mix",
      age: a.age,
      gender: a.gender,
      size: a.size,
      photo:
        a.primary_photo_cropped?.medium ||
        a.photos?.[0]?.medium ||
        null,
      city: a.contact?.address?.city ?? null,
      state: a.contact?.address?.state ?? null,
      distance: typeof a.distance === "number" ? Math.round(a.distance) : null,
      url: a.url,
    }),
  );

  return NextResponse.json({
    status: "ok",
    zip,
    count: data.pagination?.total_count ?? dogs.length,
    dogs,
  });
}
