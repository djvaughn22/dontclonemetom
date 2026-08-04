// Permanent dog page — the stable archive for every featured or shared dog.
// If the listing disappears, the page stays up, says so clearly, and points
// to other nearby dogs.

import type { Metadata } from "next";
import CardSpinner from "../../components/cards/CardSpinner";
import DogShareActions from "../../components/DogShareActions";
import DogProfileView from "../../components/profile/DogProfileView";
import { buildListingDeckReport, listingDisplayName } from "../../lib/cards/tradingCards";
import { fetchDogById } from "../../lib/rescueDogs";
import { resolveDogDestination } from "../../lib/dogDestination";
import { getDogProfile } from "../../lib/dogProfiles";
import { dogCityLabel } from "../../lib/dogOfTheDay";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  // Structured profiles (named slugs) own their own metadata.
  const profile = getDogProfile(id);
  if (profile) {
    const image = { url: profile.primaryImage, width: 805, height: 1038 };
    return {
      title: profile.seoTitle,
      description: profile.seoDescription,
      openGraph: {
        title: profile.seoTitle,
        description: profile.seoDescription,
        url: `https://dontclonemetom.com/dogs/${profile.slug}`,
        type: "article",
        images: [image],
      },
      twitter: {
        card: "summary_large_image",
        title: profile.seoTitle,
        description: profile.seoDescription,
        images: [profile.primaryImage],
      },
    };
  }

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

  // Named slugs are permanent structured profiles; numeric ids stay live
  // rescue listings.
  const profile = getDogProfile(id);
  if (profile) return <DogProfileView profile={profile} />;

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
  // A dog whose seven cards haven't all passed review keeps its normal
  // adoption listing — the card maker simply isn't activated for it yet.
  const { deck, needsReview } = buildListingDeckReport(dog);
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

      {/* The trading card — real name, real photo; the seven names are
          built for this dog. The rescue's info stays quietly on the card.
          Hidden entirely until all seven cards have passed review. */}
      {!needsReview && deck.length === 7 && (
      <div className="mt-8">
        <div className="mb-5 text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#94a3b8]">
            Fun Dog Trading Cards
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#e8edf5]">What would you nickname me?</h2>
          <p className="mx-auto mt-1 max-w-md text-sm font-semibold leading-6 text-[#94a3b8]">
            Spin through seven names made especially
            for {listingDisplayName(dog.name)} and share your
            favorite card.
          </p>
        </div>
        <CardSpinner
          realName={listingDisplayName(dog.name)}
          photoUrl={dog.photo ?? undefined}
          photoSrcForImage={dog.photo ? `/api/photo?u=${encodeURIComponent(dog.photo)}` : undefined}
          photoAlt={`${listingDisplayName(dog.name)}, an adoptable dog`}
          deck={deck}
          shareUrl={`https://dontclonemetom.com/dogs/${dog.id}`}
          fileName={dog.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "dog"}
          attribution={{ org: dog.org, location: city }}
          analyticsId="adoptable"
          makerHref={`/cards?dog=${dog.id}`}
        />
      </div>
      )}

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
          destination={resolveDogDestination(dog)}
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
