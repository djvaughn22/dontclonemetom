// Permanent dog page — the stable archive for every featured or shared dog.
// If the listing disappears, the page stays up, says so clearly, and points
// to other nearby dogs.

import type { Metadata } from "next";
import DogShareActions from "../../components/DogShareActions";
import { fetchDogById } from "../../lib/rescueDogs";
import { dogCityLabel } from "../../lib/dogOfTheDay";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { dog } = await fetchDogById(id);
  if (!dog) return { title: "Adoptable dog" };

  return {
    title: `Meet ${dog.name} — adoptable near ${dogCityLabel(dog)}`,
    description: `${dog.name} is listed by ${dog.org}. Every good boy and girl deserves a good home.`,
    openGraph: dog.photo ? { images: [{ url: dog.photo }] } : undefined,
  };
}

export default async function DogPage({ params }: PageProps) {
  const { id } = await params;
  const { dog, gone, reason } = await fetchDogById(id);
  const verifiedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (!dog) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-[#e8edf5]">
        <h1 className="text-3xl font-black">
          {gone ? "This dog is no longer listed" : "Listings are unavailable right now"}
        </h1>
        <p className="mt-4 font-semibold leading-7 text-[#94a3b8]">
          {gone
            ? "Good news might be the reason — many dogs leave the listings because they found a home. The listing for this dog is no longer available from the rescue."
            : `We couldn't reach the adoption listings (${reason ?? "unknown"}). Please try again soon.`}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[#2DD4BF] px-6 py-3 font-black text-[#0b1220]"
        >
          Meet more adoptable dogs near you →
        </Link>
      </main>
    );
  }

  const city = dogCityLabel(dog);
  const details = [
    dog.breed && `Breed: ${dog.breed}`,
    dog.age && `Age: ${dog.age}`,
    dog.sex && `Sex: ${dog.sex}`,
    dog.size && `Size: ${dog.size}`,
    ...dog.facts,
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[#e8edf5]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">
        Adoptable near {city}
      </p>
      <h1 className="mt-2 text-4xl font-black">{dog.name}</h1>
      <p className="mt-2 text-sm font-semibold text-[#94a3b8]">
        Listed by {dog.org} · via RescueGroups.org · Last verified {verifiedAt} CT
      </p>

      {dog.photo ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-[#26324c]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dog.photo} alt={`${dog.name}, an adoptable dog`} className="block w-full" />
        </div>
      ) : null}

      {details.length ? (
        <ul className="mt-6 flex flex-wrap gap-2">
          {details.map((detail) => (
            <li
              key={detail}
              className="rounded-full border border-[#26324c] bg-[#141d2e] px-4 py-1.5 text-xs font-bold text-[#e8edf5]"
            >
              {detail}
            </li>
          ))}
        </ul>
      ) : null}

      {dog.desc ? (
        <p className="mt-6 whitespace-pre-line font-semibold leading-7 text-[#94a3b8]">
          {dog.desc.slice(0, 900)}
          {dog.desc.length > 900 ? "…" : ""}
        </p>
      ) : null}

      <div className="mt-8">
        <DogShareActions
          dogId={dog.id}
          dogName={dog.name}
          city={city}
          pageUrl={`https://dontclonemetom.com/dogs/${dog.id}`}
          cardPath={`/api/social/dog-card/${dog.id}.png`}
          cardFileName={`dontclonemetom-${dog.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-card.png`}
          adoptionUrl={dog.url}
          viewEvent="dcmt_dog_viewed"
        />
      </div>

      <p className="mt-8 text-xs font-semibold leading-5 text-[#94a3b8]">
        Availability can change at any time — the adoption listing above is the
        source of truth. DontCloneMeTom.com is an independent rescue-first
        campaign and is not affiliated with the rescue or RescueGroups.org.
      </p>

      <Link href="/" className="mt-6 inline-block font-bold text-[#2DD4BF]">
        ← Find more adoptable dogs near you
      </Link>
    </main>
  );
}
