// Fun Dog Trading Cards — make a card for any real dog. Public, free, no
// account. Photos stay in the visitor's browser.
//
// /cards            → Make One for Your Dog (visitor's own dog, photo upload)
// /cards?dog=<id>   → the maker preloaded with a real dog: a named profile
//                     (isaiah) or a live adoptable listing (numeric id).
//                     The dog's own seven-name deck, photo, framing, and
//                     rescue attribution carry through automatically.
// /cards?...&card=N → open on spin N (0-based) so a card position carries
//                     over from the dog's page.

import type { Metadata } from "next";
import CardMaker from "../components/cards/CardMaker";
import DogCardStudio from "../components/cards/DogCardStudio";
import { buildDeck, DECK_SIZE } from "../lib/cards/tradingCards";
import { getDogProfile } from "../lib/dogProfiles";
import { fetchDogById } from "../lib/rescueDogs";
import { dogCityLabel } from "../lib/dogOfTheDay";
import { listingTraits } from "../lib/cards/listingTraits";

export const metadata: Metadata = {
  title: "Make a Dog Card — free",
  description:
    "Fun Dog Trading Cards: seven names made especially for your dog. Add a photo, spin a new nickname, and share today's card.",
  openGraph: {
    title: "Make a Dog Card — free",
    description:
      "One dog, one nickname, one funny saying — spin a new card and share it. Free.",
    url: "https://dontclonemetom.com/cards",
  },
};

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ dog?: string; card?: string }> };

function cardParam(raw: string | undefined): number {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 && n < DECK_SIZE ? n : 0;
}

export default async function CardsPage({ searchParams }: PageProps) {
  const { dog: dogId, card } = await searchParams;
  const initialStep = cardParam(card);

  if (dogId) {
    // Named slugs are owner-curated profiles with locked decks.
    const profile = getDogProfile(dogId);
    if (profile) {
      return (
        <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
          <DogCardStudio
            realName={profile.realName}
            photoUrl={profile.primaryImage}
            photoAlt={profile.primaryImageAlt}
            deck={profile.cards}
            photoSpec={profile.photoSpec}
            meetHref={`/dogs/${profile.slug}`}
            adoptionUrl={profile.adoptionStatus === "adoptable" ? profile.adoptionUrl : undefined}
            shareUrl={`https://dontclonemetom.com/dogs/${profile.slug}`}
            fileName={profile.slug}
            analyticsId={`studio-${profile.slug}`}
            initialStep={initialStep}
          />
        </main>
      );
    }

    // Numeric ids are live adoptable listings — real name, real photo,
    // rescue attribution, and a seven-name deck built for that dog.
    if (/^\d+$/.test(dogId)) {
      const { dog } = await fetchDogById(dogId);
      if (dog) {
        const city = dogCityLabel(dog);
        return (
          <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
            <DogCardStudio
              realName={dog.name}
              photoUrl={dog.photo ?? undefined}
              photoSrcForImage={dog.photo ? `/api/photo?u=${encodeURIComponent(dog.photo)}` : undefined}
              photoAlt={`${dog.name}, an adoptable dog`}
              deck={buildDeck(dog.name, listingTraits(dog.size))}
              attribution={{ org: dog.org, location: city }}
              meetHref={`/dogs/${dog.id}`}
              adoptionUrl={dog.url || undefined}
              shareUrl={`https://dontclonemetom.com/dogs/${dog.id}`}
              fileName={dog.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "dog"}
              analyticsId="studio-adoptable"
              initialStep={initialStep}
            />
          </main>
        );
      }
    }
    // Unknown or vanished dog — fall through to the regular maker.
  }

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <CardMaker />
    </main>
  );
}
