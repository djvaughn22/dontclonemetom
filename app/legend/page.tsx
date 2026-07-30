// The free Dog Legend studio — public, free, no account.
// Server side only assembles TRUTHFUL commerce state from configuration
// that actually exists; no secrets ever reach the client.

import type { Metadata } from "next";
import LegendStudio from "../components/legend/LegendStudio";
import {
  commerceConfigFromEnv,
  donationCopy,
  donationGateFromEnv,
  providerStatuses,
} from "../lib/identity/commerce";

export const metadata: Metadata = {
  title: "Dog Legend Studio — free",
  description:
    "Turn your real dog's real habits into a legend: endless nickname shuffle, a hero identity, and a free poster preview approved by Isaiah himself.",
  openGraph: {
    title: "Dog Legend Studio — free",
    description:
      "Real dog + real habits + today's mood = the fitting identity. Free poster preview, approved by Isaiah.",
    url: "https://dontclonemetom.com/legend",
  },
};

export default function LegendPage() {
  const providers = providerStatuses(commerceConfigFromEnv(process.env));
  const donationLine = donationCopy(donationGateFromEnv(process.env));

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <LegendStudio providers={providers} donationLine={donationLine} />
    </main>
  );
}
