import Link from "next/link";
import { countWord, type CardPair } from "../../lib/cards/tradingCards";
import type { PhotoSpec } from "../../lib/cards/photoFraming";
import CardSpinner from "./CardSpinner";
import type { CardAttribution } from "./TradingCard";

// The card maker, already loaded with a real dog — reached from the
// homepage dog cards and the dog pages via /cards?dog=<id>. The dog's real
// name, photo, framing, attribution, and its own seven-name deck all carry
// through; nothing has to be re-entered. Verified dogs never mix with
// visitor-uploaded dogs — Make One for Your Dog is its own path.

export default function DogCardStudio({
  realName,
  photoUrl,
  photoSrcForImage,
  photoAlt,
  deck,
  photoSpec,
  attribution,
  meetHref,
  adoptionUrl,
  shareUrl,
  fileName,
  analyticsId,
  initialStep,
}: {
  realName: string;
  photoUrl?: string;
  photoSrcForImage?: string;
  photoAlt: string;
  deck: CardPair[];
  photoSpec?: PhotoSpec;
  attribution?: CardAttribution;
  /** back to the dog's own page */
  meetHref: string;
  /** the real adoption listing, kept quietly present for adoptable dogs */
  adoptionUrl?: string;
  shareUrl: string;
  fileName: string;
  analyticsId: string;
  initialStep?: number;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <section className="mb-8 text-center">
        <h1 className="text-xs font-black uppercase tracking-[0.3em] text-[#94a3b8]">Fun Dog Trading Cards</h1>
        <p className="mt-2 font-black leading-[1.05] tracking-tight text-[#2DD4BF]" style={{ fontSize: "clamp(1.8rem, 7vw, 3rem)" }}>
          {realName}&apos;s cards
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[#94a3b8]">
          {countWord(deck.length)} names made especially for {realName}. Spin
          through them and share your favorite card.
        </p>
      </section>

      <section className="mb-8">
        <CardSpinner
          realName={realName}
          photoUrl={photoUrl}
          photoSrcForImage={photoSrcForImage}
          photoAlt={photoAlt}
          deck={deck}
          photoSpec={photoSpec}
          shareUrl={shareUrl}
          fileName={fileName}
          attribution={attribution}
          analyticsId={analyticsId}
          initialStep={initialStep}
        />
      </section>

      <div className="flex flex-col items-center gap-2.5 text-center">
        <Link href={meetHref} className="text-sm font-bold text-[#2DD4BF]">
          Meet {realName} →
        </Link>
        {adoptionUrl && (
          <a
            href={adoptionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#94a3b8] underline decoration-[#26324c] underline-offset-4"
          >
            {realName} is a real adoptable dog — open the adoption listing
          </a>
        )}
        <Link href="/cards" className="mt-2 text-sm font-bold text-[#2DD4BF]">
          Make One for Your Dog →
        </Link>
      </div>
    </div>
  );
}
