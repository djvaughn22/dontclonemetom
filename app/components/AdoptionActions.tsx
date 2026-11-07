"use client";

import { track } from "../lib/analytics";
import type { DogDestination } from "../lib/dogDestination";
import { rescueEmailHref } from "../lib/rescueContact";

// The two ways to act on a dog, right under her photo: open her own listing
// at the rescue, or email the rescue about her. Then one plain line about
// what happens next — the rescue's process, never promised fees or timing.
export default function AdoptionActions({
  dog,
  destination,
}: {
  dog: { id: string; name: string; org: string; email: string | null };
  destination: DogDestination;
}) {
  const rescue = dog.org.trim() || "The rescue";

  return (
    <section
      aria-label={`Adopt ${dog.name}`}
      className="mt-6 rounded-3xl border border-[#2DD4BF]/40 bg-[#141d2e] p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        {destination.type !== "none" && (
          <a
            href={destination.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={destination.ariaLabel}
            onClick={() => track("dcmt_adoption_listing_opened", { dog_id: dog.id })}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#2DD4BF] px-6 py-3 text-base font-black text-[#0b1220] transition hover:opacity-90"
          >
            {destination.type === "exact-dog" ? `Meet ${dog.name}` : destination.label} ↗
          </a>
        )}
        {dog.email && (
          <a
            href={rescueEmailHref(dog, destination)}
            onClick={() => track("dcmt_rescue_email_opened", { dog_id: dog.id })}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#26324c] bg-[#0b1220] px-6 py-3 text-base font-black text-[#e8edf5] transition hover:border-[#2DD4BF]"
          >
            💌 Email the rescue
          </a>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#94a3b8]">
        {rescue} handles the adoption. Most rescues start with a short application, then a call
        or a visit to meet the dog. Ask them about fees and timing.
      </p>
    </section>
  );
}
