import { NextResponse } from "next/server";

// Adoptable pets via RescueGroups.org (nonprofit, rescue-first) v5 public API.
// Key is server-side only. Set RESCUEGROUPS_API_KEY in the environment.
// No key present -> { status: "unconfigured" } and the UI shows a friendly note.

const RG_BASE = "https://api.rescuegroups.org/v5/public/animals/search/available";

type IncItem = { type: string; id: string; attributes?: Record<string, unknown> };

type NormPet = {
  id: string;
  name: string;
  age: string | null;
  sex: string | null;
  size: string | null;
  city: string | null;
  state: string | null;
  organizationName: string | null;
  photoUrl: string | null;
  description: string | null;
  adoptionUrl: string | null;
  distance: number | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = (searchParams.get("zip") || "").replace(/[^0-9]/g, "").slice(0, 5);
  const radiusRaw = Number(searchParams.get("radius"));
  const radius = [25, 50, 100].includes(radiusRaw) ? radiusRaw : 50;
  const species = (searchParams.get("species") || "dogs").toLowerCase();

  if (zip.length !== 5) {
    return NextResponse.json(
      { status: "error", message: "Enter a 5-digit ZIP code.", pets: [] },
      { status: 400 },
    );
  }

  // Accept either the conventional name or the shorter one set in Vercel.
  const key = process.env.RESCUEGROUPS_API_KEY || process.env.rescuegroups;
  if (!key) return NextResponse.json({ status: "unconfigured", pets: [] });

  const speciesPath = species === "cats" ? "cats" : species === "any" ? "pets" : "dogs";
  const url = new URL(`${RG_BASE}/${speciesPath}`);
  url.searchParams.set("include", "pictures,orgs");
  url.searchParams.set(
    "fields[animals]",
    "name,ageGroup,sex,sizeGroup,descriptionText,url,cityState,distance",
  );
  url.searchParams.set("fields[pictures]", "large,small,original");
  url.searchParams.set("fields[orgs]", "name,citystate");
  url.searchParams.set("sort", "animals.distance");
  url.searchParams.set("limit", "60");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({ data: { filterRadius: { miles: radius, postalcode: zip } } }),
    });
  } catch {
    return NextResponse.json({ status: "error", pets: [] });
  }
  if (!res.ok) return NextResponse.json({ status: "error", pets: [] });

  const json = await res.json().catch(() => null);
  if (!json) return NextResponse.json({ status: "error", pets: [] });

  const inc: IncItem[] = Array.isArray(json.included) ? json.included : [];
  const picById: Record<string, IncItem> = {};
  const orgById: Record<string, IncItem> = {};
  for (const i of inc) {
    if (i.type === "pictures") picById[i.id] = i;
    else if (i.type === "orgs") orgById[i.id] = i;
  }
  const pick = (o: Record<string, unknown> | undefined, k: string): string | undefined => {
    const v = o?.[k];
    return v && typeof v === "object" ? (v as { url?: string }).url : undefined;
  };

  const data = Array.isArray(json.data) ? json.data : [];
  let pets: NormPet[] = data.map((a: Record<string, any>): NormPet => {
    const at = a.attributes || {};
    const rel = a.relationships || {};
    const pic = rel.pictures?.data?.[0] ? picById[rel.pictures.data[0].id] : undefined;
    const org = rel.orgs?.data?.[0] ? orgById[rel.orgs.data[0].id] : undefined;
    const photoUrl =
      pick(pic?.attributes, "large") ||
      pick(pic?.attributes, "small") ||
      pick(pic?.attributes, "original") ||
      null;
    const [city, state] = String(at.cityState || "").split(",").map((s: string) => s.trim());
    return {
      id: String(a.id),
      name: at.name || "This good pup",
      age: at.ageGroup || null,
      sex: at.sex || null,
      size: at.sizeGroup || null,
      city: city || null,
      state: state || null,
      organizationName: (org?.attributes?.name as string) || null,
      photoUrl,
      description: String(at.descriptionText || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 150) || null,
      adoptionUrl: at.url || null,
      distance: typeof at.distance === "number" ? Math.round(at.distance) : null,
    };
  });

  // Face-first: only pets with a photo. Sort closest, then age, then size.
  const ageOrder: Record<string, number> = { Baby: 0, Young: 1, Adult: 2, Senior: 3 };
  const sizeOrder: Record<string, number> = { Small: 0, Medium: 1, Large: 2, "Extra Large": 3 };
  pets = pets
    .filter((p) => p.photoUrl)
    .sort(
      (x, y) =>
        (x.distance ?? 9999) - (y.distance ?? 9999) ||
        (ageOrder[x.age as string] ?? 9) - (ageOrder[y.age as string] ?? 9) ||
        (sizeOrder[x.size as string] ?? 9) - (sizeOrder[y.size as string] ?? 9),
    );

  return NextResponse.json(
    { status: "ok", zip, count: pets.length, pets },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
