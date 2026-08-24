"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SpinButton from "./SpinButton";
import { pickSpinCandidate } from "../lib/spinSelection";

type SpinCandidate = { id: string };

type DogSpinControlProps = {
  currentId: string;
  zip: string;
  miles: number;
  className?: string;
};

// Replaces the dog shown on /dogs/[id] with another eligible dog, in place.
// Reuses the same verified-direct-only dataset the homepage "Find dogs near
// you" grid already fetches (app/api/adoptable-pets → fetchPubliclyEligibleDogs)
// instead of adding a new endpoint or a second eligibility check. A client-side
// route replace swaps the URL and re-renders the page for the new dog without
// a full navigation or a second card on screen.
export default function DogSpinControl({ currentId, zip, miles, className }: DogSpinControlProps) {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  async function handleSpin() {
    if (spinning) return;
    setSpinning(true);

    try {
      const res = await fetch(`/api/adoptable-pets?zip=${zip}&miles=${miles}`);
      const json = await res.json();
      const pool: SpinCandidate[] = Array.isArray(json?.dogs) ? json.dogs : [];
      const next = pickSpinCandidate(pool, currentId);

      if (!next) {
        // Only this one eligible dog nearby right now (or none) — nothing to spin to.
        setSpinning(false);
        return;
      }

      router.replace(`/dogs/${next.id}`);
    } catch {
      setSpinning(false);
    }
  }

  return <SpinButton onSpin={handleSpin} spinning={spinning} className={className} />;
}
