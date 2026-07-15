// Permanent Instagram bio link: dontclonemetom.com/today — always resolves
// to the current Dog of the Day near 63040. If the dog source is down, the
// page degrades gracefully; it never breaks.

import type { Metadata } from "next";
import DogShareActions from "../components/DogShareActions";
import { buildDogOfTheDay, dogCityLabel } from "../lib/dogOfTheDay";
import { chicagoDateKey } from "../lib/dailySocialCore";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { dog, post } = await buildDogOfTheDay(chicagoDateKey());
    return {
      title: `Dog of the Day — ${dog.name}`,
      description: `${dog.name} is looking for a good home near ${dogCityLabel(dog)}. ${post.fullDate}.`,
      openGraph: dog.photo ? { images: [{ url: dog.photo }] } : undefined,
    };
  } catch {
    return { title: "Dog of the Day" };
  }
}

export default async function TodayPage() {
  const dateKey = chicagoDateKey();

  let featured: Awaited<ReturnType<typeof buildDogOfTheDay>> | null = null;
  let unavailableReason = "";
  try {
    featured = await buildDogOfTheDay(dateKey);
  } catch (error) {
    unavailableReason = error instanceof Error ? error.message : "unavailable";
  }

  if (!featured) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-[#e8edf5]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">
          Dog of the Day
        </p>
        <h1 className="mt-2 text-3xl font-black">Back soon</h1>
        <p className="mt-4 font-semibold leading-7 text-[#94a3b8]">
          Today&apos;s dog can&apos;t be loaded right now ({unavailableReason}).
          The adoptable dogs near you are still one search away.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[#2DD4BF] px-6 py-3 font-black text-[#0b1220]"
        >
          Meet adoptable dogs near you →
        </Link>
      </main>
    );
  }

  const { dog, post } = featured;
  const city = dogCityLabel(dog);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[#e8edf5]">
      <header className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2DD4BF]">
          Dog of the Day
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{post.fullDate}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-[#94a3b8]">
          One real adoptable dog near 63040, verified today. Every good boy and
          girl deserves a good home.
        </p>
      </header>

      {dog.photo ? (
        <div className="mt-8 overflow-hidden rounded-3xl border border-[#26324c]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dog.photo} alt={`${dog.name}, today's adoptable dog`} className="block w-full" />
        </div>
      ) : null}

      <div className="mt-6 text-center">
        <h2 className="text-4xl font-black">{dog.name}</h2>
        <p className="mt-2 text-lg font-bold text-[#2DD4BF]">{city}</p>
        <p className="mt-1 text-sm font-semibold text-[#94a3b8]">
          Listed by {dog.org} · via RescueGroups.org · verified today
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-md">
          <DogShareActions
            dogId={dog.id}
            dogName={dog.name}
            city={city}
            pageUrl={`https://dontclonemetom.com${post.pagePath}`}
            cardPath={post.imagePath}
            cardFileName={post.imageFileName}
            adoptionUrl={dog.url}
            viewEvent="dcmt_today_viewed"
          />
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <a href={post.pagePath} className="font-bold text-[#2DD4BF]">
          {dog.name}&apos;s permanent page →
        </a>
        <Link href="/" className="font-bold text-[#2DD4BF]">
          Find more adoptable dogs near you →
        </Link>
        <p className="max-w-md text-xs font-semibold leading-5 text-[#94a3b8]">
          A new dog is featured every day at midnight Central Time. This page
          always matches the day&apos;s Instagram post.
        </p>
      </div>
    </main>
  );
}
