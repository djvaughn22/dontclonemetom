"use client";

import { useEffect, useState } from "react";
import { track } from "../../lib/analytics";
import { cardAt, type CardPair } from "../../lib/cards/tradingCards";
import { renderCardImage } from "../../lib/cards/cardImage";
import TradingCard, { type CardAttribution } from "./TradingCard";

// The whole interaction: one card, one big Spin button, one Share button.
// Spin walks the deck one nickname at a time — the list itself never shows.
// Share sends the exact card on screen as an image (native share where the
// device supports it, otherwise download + caption copy).

export default function CardSpinner({
  realName,
  photoUrl,
  photoSrcForImage,
  photoAlt,
  deck,
  shareUrl,
  fileName,
  attribution,
  analyticsId,
}: {
  realName: string;
  /** what the on-page card displays */
  photoUrl?: string;
  /** canvas-safe source for the share image (proxied for remote photos) */
  photoSrcForImage?: string;
  photoAlt: string;
  deck: CardPair[];
  shareUrl: string;
  fileName: string;
  attribution?: CardAttribution;
  analyticsId: string;
}) {
  const [step, setStep] = useState(0);
  const [note, setNote] = useState("");
  const face = cardAt(deck, step, new Date());

  useEffect(() => {
    track("dcmt_card_viewed", { id: analyticsId });
    // Fire once per page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!face) return null;

  function flash(msg: string) {
    setNote(msg);
    window.setTimeout(() => setNote(""), 2600);
  }

  function spin() {
    setStep((s) => s + 1);
    track("dcmt_card_spun", { id: analyticsId });
  }

  async function share() {
    track("dcmt_card_shared", { id: analyticsId });
    const caption = `${realName} — a.k.a. ${face!.nickname}. “${face!.saying}” Make one for your dog: ${shareUrl}`;
    try {
      const blob = await renderCardImage({
        realName,
        face: face!,
        photoSrc: photoSrcForImage ?? photoUrl,
        attribution,
      });
      const file = new File([blob], `${fileName}-card-${face!.cardNumber}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: caption });
          return;
        } catch {
          return; // user closed the share sheet — nothing to clean up
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      try { await navigator.clipboard.writeText(caption); } catch { /* clipboard blocked */ }
      flash("Card saved + caption copied — paste both anywhere.");
    } catch {
      // canvas failed (rare) — share the words and the link instead
      if (navigator.share) {
        try { await navigator.share({ text: caption }); return; } catch { /* closed */ }
      }
      try {
        await navigator.clipboard.writeText(caption);
        flash("Caption copied — paste it anywhere.");
      } catch {
        flash("Sharing is blocked here — try copying the page link.");
      }
    }
  }

  return (
    <div>
      <TradingCard realName={realName} photoUrl={photoUrl} photoAlt={photoAlt} face={face} attribution={attribution} />
      <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2.5">
        <button
          type="button"
          onClick={spin}
          className="w-full rounded-2xl bg-[#2DD4BF] px-6 py-4 text-base font-black uppercase tracking-[0.12em] text-[#0b1220] transition hover:opacity-90"
        >
          🃏 Spin a New Card
        </button>
        <button
          type="button"
          onClick={share}
          className="w-full rounded-2xl border border-[#26324c] bg-[#141d2e] px-6 py-3.5 text-sm font-black uppercase tracking-[0.12em] text-[#e8edf5] transition hover:border-[#2DD4BF]"
        >
          Share This Card
        </button>
        {note && <p className="text-center text-xs font-black text-[#5eead4]">{note}</p>}
      </div>
    </div>
  );
}
