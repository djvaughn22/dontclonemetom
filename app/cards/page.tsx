// Fun Dog Trading Cards — make a card for any real dog. Public, free, no
// account. Photos stay in the visitor's browser.

import type { Metadata } from "next";
import CardMaker from "../components/cards/CardMaker";

export const metadata: Metadata = {
  title: "Make a Dog Card — free",
  description:
    "Fun Dog Trading Cards: add a photo, type the dog's real name, pick a few true things — then spin a new nickname and share today's card.",
  openGraph: {
    title: "Make a Dog Card — free",
    description:
      "One dog, one nickname, one funny saying — spin a new card and share it. Free.",
    url: "https://dontclonemetom.com/cards",
  },
};

export default function CardsPage() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <CardMaker />
    </main>
  );
}
