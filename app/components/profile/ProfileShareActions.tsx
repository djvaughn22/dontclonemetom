"use client";

import { useEffect, useState } from "react";
import { track } from "../../lib/analytics";
import { useHeroIdentity } from "./HeroIdentityContext";

// Share + print controls for structured dog profiles: copy link, native
// share where supported, email, text, Facebook, and a print/PDF view.
// When a hero identity is chosen on the page, the share caption follows it.
export default function ProfileShareActions({
  slug,
  title: baseTitle,
  shareText: baseShareText,
  pageUrl,
}: {
  slug: string;
  title: string;
  shareText: string;
  pageUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const hero = useHeroIdentity();
  const shareText = hero?.shareText ?? baseShareText;
  const title = hero && hero.identity.id !== hero.defaultHeroId ? hero.identity.name : baseTitle;

  useEffect(() => {
    track("dcmt_profile_viewed", { dog_slug: slug });
    // Fire once per page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caption = `${shareText}\n${pageUrl}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      track("dcmt_profile_link_copied", { dog_slug: slug });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked.
    }
  }

  async function share() {
    track("dcmt_profile_share_opened", { dog_slug: slug });
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: pageUrl });
        return;
      } catch {
        // Cancelled — fall through to copy.
      }
    }
    copyLink();
  }

  const btn =
    "inline-flex items-center justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-5 py-2.5 text-sm font-bold text-[#e8edf5] transition hover:border-[#2DD4BF]";

  return (
    <div className="no-print flex flex-wrap gap-2">
      <button type="button" onClick={share} className={btn}>
        Share
      </button>
      <button type="button" onClick={copyLink} className={btn}>
        {copied ? "Link copied" : "Copy link"}
      </button>
      <a
        href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(caption)}`}
        className={btn}
      >
        Email
      </a>
      <a href={`sms:?&body=${encodeURIComponent(`${title} — ${pageUrl}`)}`} className={btn}>
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
      <button
        type="button"
        onClick={() => {
          track("dcmt_profile_printed", { dog_slug: slug });
          window.print();
        }}
        className={btn}
      >
        Print
      </button>
    </div>
  );
}
