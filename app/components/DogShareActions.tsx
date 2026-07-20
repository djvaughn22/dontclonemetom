"use client";

import { useEffect, useState } from "react";
import { track } from "../lib/analytics";

type DogShareActionsProps = {
  dogId: string;
  dogName: string;
  city: string;
  pageUrl: string; // absolute permanent dog-page URL
  cardPath: string; // site-relative card PNG path
  cardFileName: string;
  adoptionUrl: string;
  // True when adoptionUrl is this dog's own listing page; false when it is
  // the rescue's site (fallback) — the button must never claim a dog-specific
  // listing it doesn't open.
  isOwnListing: boolean;
  viewEvent: string; // GA page-view event, e.g. "dcmt_today_viewed"
};

// Share / card controls for /today and /dogs/[id] — practical sharing only:
// download, native share, copy caption, copy link, email, SMS, Facebook.
// (Posting to a visitor's own Instagram is manual: download the card, then
// share it from the Instagram app.)
export default function DogShareActions({
  dogId,
  dogName,
  city,
  pageUrl,
  cardPath,
  cardFileName,
  adoptionUrl,
  isOwnListing,
  viewEvent,
}: DogShareActionsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    track(viewEvent, { dog_id: dogId });
    // Fire once per page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caption = [
    `Meet ${dogName} — looking for a good home near ${city}.`,
    "",
    `See the verified listing: ${pageUrl}`,
    "",
    "Every good boy and girl deserves a good home.",
    "DontCloneMeTom.com",
  ].join("\n");

  async function copy(kind: "caption" | "link") {
    try {
      await navigator.clipboard.writeText(kind === "caption" ? caption : pageUrl);
      setCopied(kind);
      track(kind === "caption" ? "dcmt_caption_copied" : "dcmt_link_copied", { dog_id: dogId });
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked.
    }
  }

  async function share() {
    track("dcmt_share_opened", { dog_id: dogId });
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Meet ${dogName}`, text: caption, url: pageUrl });
        return;
      } catch {
        // Cancelled — fall through to copy.
      }
    }
    copy("link");
  }

  const btn =
    "inline-flex items-center justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-5 py-2.5 text-sm font-bold text-[#e8edf5] transition hover:border-[#2DD4BF]";

  return (
    <div className="flex flex-col gap-3">
      {adoptionUrl && (
        <div className="flex flex-wrap gap-2">
          <a
            href={adoptionUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={isOwnListing ? `Open ${dogName}’s adoption listing` : "Visit the rescue that listed this dog"}
            onClick={() => track("dcmt_adoption_listing_opened", { dog_id: dogId })}
            className="inline-flex items-center justify-center rounded-full bg-[#2DD4BF] px-6 py-2.5 text-sm font-black text-[#0b1220] transition hover:opacity-90"
          >
            {isOwnListing ? "Open the adoption listing →" : "Visit the rescue →"}
          </a>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={cardPath}
          download={cardFileName}
          onClick={() => track("dcmt_card_downloaded", { dog_id: dogId })}
          className={btn}
        >
          Download dog card
        </a>
        <button type="button" onClick={share} className={btn}>
          Share
        </button>
        <button type="button" onClick={() => copy("caption")} className={btn}>
          {copied === "caption" ? "Caption copied" : "Copy caption"}
        </button>
        <button type="button" onClick={() => copy("link")} className={btn}>
          {copied === "link" ? "Link copied" : "Copy link"}
        </button>
        <a
          href={`mailto:?subject=${encodeURIComponent(`Meet ${dogName}`)}&body=${encodeURIComponent(caption)}`}
          className={btn}
        >
          Email
        </a>
        <a href={`sms:?&body=${encodeURIComponent(`Meet ${dogName} — ${pageUrl}`)}`} className={btn}>
          Text
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
          target="_blank"
          rel="noreferrer"
          className={btn}
        >
          Facebook
        </a>
      </div>

      <p className="text-xs font-semibold leading-5 text-[#94a3b8]">
        To share on Instagram: download the card, open the Instagram app, make
        a post with the card, and paste the caption.
      </p>
    </div>
  );
}
