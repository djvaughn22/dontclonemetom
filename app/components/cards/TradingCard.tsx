import { CARD_THEMES, type DogCardFace } from "../../lib/cards/tradingCards";

// One collectible dog trading card. Presentational only — the spinner
// decides which face to show. Flat and colorful: the frame + nickname take
// the card's theme color, everything else stays the site's dark panel.

export type CardAttribution = {
  org: string;
  location?: string;
};

export default function TradingCard({
  realName,
  photoUrl,
  photoAlt,
  face,
  attribution,
}: {
  realName: string;
  photoUrl?: string;
  photoAlt: string;
  face: DogCardFace;
  attribution?: CardAttribution;
}) {
  const color = CARD_THEMES[face.themeIndex % CARD_THEMES.length];
  return (
    <div
      key={face.cardNumber}
      className="dcmt-card-flip mx-auto w-full max-w-sm rounded-3xl border-4 bg-[#141d2e] p-4 text-center shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
      style={{ borderColor: color }}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="truncate text-left text-xl font-black uppercase tracking-[0.14em] text-[#e8edf5]">{realName}</p>
        <span
          className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide"
          style={{ borderColor: color, color }}
        >
          No. {face.cardNumber}
        </span>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border-2" style={{ borderColor: color }}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={photoAlt} className="block aspect-square w-full bg-[#0b1220] object-cover" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-[#0b1220] text-7xl" aria-label={photoAlt}>
            🐶
          </div>
        )}
      </div>
      <p
        className="mt-4 font-black uppercase leading-none tracking-tight"
        style={{ color, fontSize: "clamp(1.6rem, 8vw, 2.2rem)" }}
      >
        {face.nickname}
      </p>
      <p className="mx-auto mt-2.5 max-w-[18rem] text-sm font-bold italic leading-6 text-[#e8edf5]">
        &ldquo;{face.saying}&rdquo;
      </p>
      {attribution && (
        <p className="mt-2.5 text-[11px] font-semibold leading-4 text-[#94a3b8]">
          {attribution.org}
          {attribution.location ? ` · ${attribution.location}` : ""}
        </p>
      )}
      <div className="mt-3.5 flex items-center justify-between border-t border-[#26324c] px-1 pt-3 text-[11px] font-black uppercase tracking-[0.12em]">
        <span className="text-[#94a3b8]">{face.dayLabel}</span>
        <span style={{ color }}>🐾 DontCloneMeTom.com</span>
      </div>
    </div>
  );
}
