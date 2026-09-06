// Permanent dog page — the stable archive for every featured or shared dog.
// If the listing disappears, the page stays up, says so clearly, and points
// to other nearby dogs.
//
// 2026-09-06 — this page used to print "Last verified <now> CT" from
// `new Date()`. It was the render clock wearing the word "verified": MOO's
// page claimed a fresh verification at the same moment her APA listing said
// "PET NOT FOUND". Freshness now comes from adoptionUrlSchema's
// freshnessLine(), which can only say "Last verified" when something actually
// confirmed the destination, and otherwise says what it really knows — when
// the source feed last showed this dog.

import type { Metadata } from "next";
import CardSpinner from "../../components/cards/CardSpinner";
import DogShareActions from "../../components/DogShareActions";
import DogProfileView from "../../components/profile/DogProfileView";
import DogSpinControl from "../../components/DogSpinControl";
import { buildListingDeckReport, listingDisplayName } from "../../lib/cards/tradingCards";
import { fetchDogById, fetchPubliclyEligibleDogs, type Dog } from "../../lib/rescueDogs";
import { resolveDogDestination } from "../../lib/dogDestination";
import { freshnessLine, isConfirmedUnavailable } from "../../lib/adoptionUrlSchema";
import { getDogProfile } from "../../lib/dogProfiles";
import { dogCityLabel, DOG_OF_THE_DAY_ZIP, DOG_OF_THE_DAY_MILES } from "../../lib/dogOfTheDay";
import Link from "next/link";

export const dynamic = "force-dynamic";

// The dog's own photo — the one thing every visitor came to see. Rendered
// unconditionally (unlike the trading-card deck below, which only appears
// once a dog's seven names pass review), so a dog with no reviewed deck
// yet still shows its picture. Falls back to the same 🐶 placeholder the
// homepage tiles use when a listing has no photo at all.
export function DogPhoto({ photo, name }: { photo: string | null; name: string }) {
  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-[#26324c] bg-[#141d2e]">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={`${name}, an adoptable dog`}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center text-6xl">
          🐶
        </div>
      )}
    </div>
  );
}

type PageProps = { params: Promise<{ id: string }> };

function formatCentral(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return `${at.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  })} CT`;
}

// Current, publicly eligible dogs from the same rescue — the honest next step
// for someone who came for a dog who is no longer there. Never invented: if
// the rescue has none listed right now, the caller falls back to the shelter
// directory link instead of showing an empty shelf.
async function nearbyFromSameRescue(dog: Dog): Promise<Dog[]> {
  const { result } = await fetchPubliclyEligibleDogs(DOG_OF_THE_DAY_ZIP, DOG_OF_THE_DAY_MILES);
  if (!result) return [];
  const sameRescue = result.dogs.filter((d) => d.org === dog.org && d.id !== dog.id);
  const pool = sameRescue.length ? sameRescue : result.dogs.filter((d) => d.id !== dog.id);
  return pool.slice(0, 3);
}

// The listing is over. Say so plainly, keep the dog's name and dignity, and
// put real dogs in front of the visitor immediately. No "View adoption page"
// button is rendered anywhere on this path — resolveDogDestination has
// already withdrawn the dog-specific URL, so the only outbound link is the
// shelter's live adoptable-pets directory.
function ListingEnded({ dog, nearby }: { dog: Dog; nearby: Dog[] }) {
  const directory = dog.adoption.rescueWebsiteUrl;

  return (
    <section className="mt-6 rounded-3xl border border-[#26324c] bg-[#141d2e] p-6">
      <h2 className="text-lg font-black text-[#e8edf5]">
        {dog.name} is no longer listed for adoption
      </h2>
      <p className="mt-2 font-semibold leading-7 text-[#94a3b8]">
        {dog.org} no longer shows {dog.name} among their adoptable pets. Very
        often that means the best thing happened and {dog.name} went home. We
        keep this page so your link still works — but we will not send you to a
        listing that is not there.
      </p>

      {directory ? (
        <a
          href={directory}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center rounded-full border border-[#26324c] bg-[#0b1220] px-5 py-2.5 text-sm font-bold text-[#e8edf5] transition hover:border-[#2DD4BF]"
        >
          See who {dog.org} has now ↗
        </a>
      ) : null}

      {nearby.length ? (
        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">
            Dogs you can meet right now
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {nearby.map((other) => (
              <li key={other.id}>
                <Link
                  href={`/dogs/${other.id}`}
                  className="block overflow-hidden rounded-2xl border border-[#26324c] bg-[#0b1220] transition hover:border-[#2DD4BF]"
                >
                  {other.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={other.photo}
                      alt={`${other.name}, an adoptable dog`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center text-4xl">
                      🐶
                    </div>
                  )}
                  <span className="block px-3 py-2 text-sm font-black text-[#e8edf5]">
                    {other.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

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

  // A shared link's preview card is often the only thing someone reads before
  // they get their hopes up. It must not say "adoptable" about a dog whose
  // listing has ended — that was half of what made the MOO failure land so
  // hard: the link looked alive everywhere it was pasted.
  if (isConfirmedUnavailable(dog.adoption)) {
    return {
      title: `${dog.name} is no longer listed — see dogs you can meet now`,
      description: `${dog.org} no longer shows ${dog.name} among their adoptable pets. Meet the dogs who are still looking.`,
      openGraph: dog.photo ? { images: [{ url: dog.photo }] } : undefined,
    };
  }

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
  const unavailable = isConfirmedUnavailable(dog.adoption);
  const freshness = freshnessLine(dog.adoption, dog.feedSeenAt, formatCentral);
  // Someone following an old shared link to a dog who has been adopted or
  // pulled should land on real dogs from the same rescue, not a dead end.
  const nearby = unavailable ? await nearbyFromSameRescue(dog) : [];
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
        {unavailable ? `Was listed near ${city}` : `Adoptable near ${city}`}
      </p>
      <h1 className="mt-2 text-4xl font-black">{dog.name}</h1>
      <p className="mt-2 text-sm font-semibold text-[#94a3b8]">
        Listed by {dog.org} · via RescueGroups.org · {freshness.text}
      </p>

      {unavailable ? <ListingEnded dog={dog} nearby={nearby} /> : null}

      <DogPhoto photo={dog.photo} name={dog.name} />

      {!unavailable && (
        <div className="mt-3">
          <DogSpinControl currentId={dog.id} zip={DOG_OF_THE_DAY_ZIP} miles={DOG_OF_THE_DAY_MILES} />
        </div>
      )}

      {/* The trading card — real name, real photo; the seven names are
          built for this dog. The rescue's info stays quietly on the card.
          Hidden entirely until all seven cards have passed review. */}
      {!unavailable && !needsReview && deck.length === 7 && (
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
          key={dog.id}
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
          key={dog.id}
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
        {unavailable
          ? `${dog.org} is the source of truth for who is available — always check with them directly. `
          : "Availability can change at any time — the adoption listing above is the source of truth. "}
        dontclonemetom.com is an independent rescue-first campaign and is not
        affiliated with the rescue or RescueGroups.org.
      </p>

      <Link href="/" className="mt-6 inline-block font-bold text-[#2DD4BF]">
        ← Find more adoptable dogs near you
      </Link>
    </main>
  );
}
