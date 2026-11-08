"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "./lib/analytics";
import { resolveDogDestination } from "./lib/dogDestination";
import {
  FILTER_OPTIONS,
  NO_FILTERS,
  cleanPrefs,
  hasFilters,
  matchesFilters,
  sortDogs,
  type FindPrefs,
} from "./lib/dogFilters";
import { listedSinceLabel, listingBadge } from "./lib/listingAge";
import { rescueEmailHref } from "./lib/rescueContact";
import SpinButton from "./components/SpinButton";

const shareLines = [
  "There’s a good dog near you looking for a home.",
  "Adopt if you can. Foster if you can. Share if you can.",
  "Every share helps one more dog get seen.",
  "Rescue first. Real dogs, real homes.",
  "Don’t clone me. Rescue me.",
];

// One look for every action on the page: a solid teal primary and a quiet
// outlined secondary (callers add the secondary's background — the page's
// navy on the page, the inset navy inside cards). Family hexes only, so the
// light theme maps them.
const PRIMARY_BTN =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#2DD4BF] px-6 text-[15px] font-extrabold text-[#0b1220] transition hover:bg-[#5eead4] disabled:cursor-wait disabled:opacity-60";
const SECONDARY_BTN =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#26324c] px-5 text-[15px] font-bold text-[#e8edf5] transition hover:border-[#2DD4BF] disabled:cursor-wait disabled:opacity-60";
const CARD = "rounded-3xl border border-[#26324c] bg-[#141d2e] p-5 sm:p-6";
const SECTION_TITLE = "text-xl font-black tracking-tight text-[#e8edf5] sm:text-2xl";

function ShareCard({ line }: { line: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    copyText(line).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-[#26324c] bg-[#0b1220] px-4 py-3 text-left transition hover:border-[#2DD4BF]"
    >
      <span className="text-sm font-semibold leading-6 text-[#e8edf5]">&ldquo;{line}&rdquo;</span>
      <span className="shrink-0 pt-0.5 text-xs font-bold text-[#94a3b8]">{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

export type Dog = {
  id: string;
  name: string;
  breed: string;
  age: string;
  sex: string;
  size: string;
  ageGroup?: string;
  photo: string | null;
  photos: string[];
  city: string;
  distance: number | null;
  listedAt?: string | null;
  profileUrl: string | null;
  sourceProfileUrl: string | null;
  orgUrl: string | null;
  orgUrlKind: "adoptable-list" | "website" | null;
  url: string;
  org: string;
  orgCity: string;
  email: string | null;
  desc: string;
  facts: string[];
};

// St. Louis-area rescue organizations (Petfinder org IDs) for the optional
// keyless widget below — it is fixed to these orgs and ignores the ZIP.
const LOCAL_RESCUE_ORGS = ["MO519", "MO760", "MO654", "MO603", "MO652"];

const RADIUS_OPTIONS = [50, 100, 250];

// Share = copy-paste + a downloadable social image (square or portrait)
// with the site link on it — CrossHeartPray-style, no app buttons.
const CARD_BG = "#0b1220", CARD_PANEL = "#141d2e", CARD_TEXT = "#e8edf5",
  CARD_SUB = "#94a3b8", CARD_ACCENT = "#2DD4BF", CARD_BORDER = "#26324c";

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const probe = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(probe).width <= maxWidth || !cur) cur = probe;
    else { lines.push(cur); cur = w; if (lines.length === maxLines - 1) break; }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…";
  }
  return lines;
}

async function makeShareCard(kind: "square" | "portrait", o: {
  photo: string | null; heading: string; lines: string[]; fileName: string;
}) {
  const W = 1080, H = kind === "square" ? 1080 : 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, W, H);

  // photo (proxied same-origin) or a big friendly dog panel
  const photoH = Math.round(H * (o.photo ? 0.56 : 0.34));
  let drewPhoto = false;
  if (o.photo) {
    try {
      const img = await new Promise<HTMLImageElement>((ok, err) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = err;
        i.src = `/api/photo?u=${encodeURIComponent(o.photo!)}`;
      });
      const scale = Math.max(W / img.width, photoH / img.height);
      const sw = W / scale, sh = photoH / scale;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.25, sw, sh, 0, 0, W, photoH);
      drewPhoto = true;
    } catch { /* fall through to panel */ }
  }
  if (!drewPhoto) {
    ctx.fillStyle = CARD_PANEL;
    ctx.fillRect(0, 0, W, photoH);
    ctx.font = "220px serif";
    ctx.textAlign = "center";
    ctx.fillText("🐶", W / 2, photoH / 2 + 80);
  }

  // text block
  ctx.textAlign = "left";
  let y = photoH + 92;
  ctx.fillStyle = CARD_TEXT;
  ctx.font = "900 68px system-ui, sans-serif";
  for (const line of wrapLines(ctx, o.heading, W - 128, 2)) {
    ctx.fillText(line, 64, y);
    y += 80;
  }
  y += 8;
  ctx.fillStyle = CARD_SUB;
  ctx.font = "600 40px system-ui, sans-serif";
  for (const raw of o.lines) {
    for (const line of wrapLines(ctx, raw, W - 128, 2)) {
      ctx.fillText(line, 64, y);
      y += 54;
    }
    y += 6;
  }

  // footer with the site link
  const fy = H - 150;
  ctx.strokeStyle = CARD_BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(64, fy); ctx.lineTo(W - 64, fy); ctx.stroke();
  ctx.fillStyle = CARD_ACCENT;
  ctx.font = "900 54px system-ui, sans-serif";
  ctx.fillText("🐶 DontCloneMeTom.com", 64, fy + 74);
  ctx.fillStyle = CARD_SUB;
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText("Real adoptable dogs near you — adopt, foster, share.", 64, fy + 122);

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) throw new Error("card failed");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${o.fileName}-${kind}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); } catch {
    const ta = document.createElement("textarea");
    ta.value = value; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
  }
}

function ShareMenu({ label, title, text, url, className, photo = null, imgLines = [] }: {
  label: string; title: string; text: string; url: string; className: string;
  photo?: string | null; imgLines?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const caption = `${text}\n${url}`;
  const fileName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "dontclonemetom";
  const itemCls = "flex w-full items-center justify-between rounded-2xl border border-[#26324c] bg-[#0b1220] px-4 py-3.5 text-sm font-bold text-[#e8edf5] transition hover:border-[#2DD4BF]";
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  function note(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2600);
  }
  async function saveImage(kind: "square" | "portrait") {
    try {
      await makeShareCard(kind, { photo, heading: title.replace(/\s*🐶\s*$/, ""), lines: imgLines, fileName });
      await copyText(caption);
      note("✅ Image saved + caption copied — paste both anywhere.");
    } catch {
      note("Couldn't build the image — Copy still works.");
    }
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-sm rounded-3xl border border-[#26324c] bg-[#141d2e] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-base font-black text-[#e8edf5]">{title}</p>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#26324c] bg-[#0b1220] text-sm font-black text-[#94a3b8]">✕</button>
            </div>
            <p className="mb-3 text-xs font-semibold leading-5 text-[#94a3b8]">
              Save an image for any social app — the caption with the link copies itself. Paste both.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" className={itemCls} onClick={async () => { await copyText(caption); note("✅ Copied — paste anywhere."); }}>
                <span>🔗 Copy text + link</span><span className="text-[#94a3b8]">→</span>
              </button>
              <button type="button" className={itemCls} onClick={() => saveImage("square")}>
                <span>⬜ Square image <span className="text-[#94a3b8]">1080×1080</span></span><span className="text-[#94a3b8]">↓</span>
              </button>
              <button type="button" className={itemCls} onClick={() => saveImage("portrait")}>
                <span>📱 Portrait image <span className="text-[#94a3b8]">1080×1350</span></span><span className="text-[#94a3b8]">↓</span>
              </button>
            </div>
            {flash && <p role="status" className="mt-3 text-xs font-bold text-[#2DD4BF]">{flash}</p>}
          </div>
        </div>
      )}
    </>
  );
}

// One dog in the results grid, photo first. A dog with its own profile page
// is one tap from it: the whole tile — photo, name, everything — is a real
// external link (new-tab and long-press behave normally), with a small
// Details button for the in-page view. A dog without its own page opens the
// in-page details, where the fallback link is labeled honestly.
export function DogTile({ dog: d, onOpen }: { dog: Dog; onOpen: () => void }) {
  const dest = resolveDogDestination(d);
  const direct = dest.type === "exact-dog";
  const badge = listingBadge(d.listedAt);
  const facts = [d.age.split(" ").slice(0, 2).join(" "), d.sex].filter(Boolean).join(" · ");
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-[#26324c] bg-[#141d2e] text-left transition hover:border-[#2DD4BF] focus-within:border-[#2DD4BF]">
      {direct ? (
        <a
          href={dest.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Meet ${d.name} — ${d.org || "the rescue"}’s page, opens in a new tab`}
          onClick={() => track("dcmt_adoption_listing_opened", { dog_id: d.id, from: "grid" })}
          className="absolute inset-0 z-10 rounded-2xl"
          style={{ transform: "none" }}
        >
          <span className="sr-only">{dest.label}</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open details for ${d.name}`}
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl"
          style={{ transform: "none" }}
        />
      )}
      <div className="relative aspect-square bg-[#0b1220]">
        {d.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.photo} alt={d.name} loading="lazy" decoding="async" className="h-full w-full object-cover" style={{ objectPosition: "50% 30%" }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden="true">🐶</div>
        )}
        {badge && (
          <span
            className={`pointer-events-none absolute left-2 top-2 rounded-full border border-[#26324c] bg-[#0b1220] px-2 py-0.5 text-[11px] font-bold ${badge.kind === "new" ? "text-[#2DD4BF]" : "text-amber-300"}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-3 pt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="min-w-0 truncate text-[15px] font-extrabold text-[#e8edf5]">{d.name}</h3>
          {d.distance !== null && (
            <span className="shrink-0 text-xs font-bold text-[#2DD4BF]">{Math.round(d.distance)} mi</span>
          )}
        </div>
        {facts && <p className="truncate text-[13px] font-semibold text-[#e8edf5]">{facts}</p>}
        <p className="truncate text-[13px] text-[#94a3b8]">{d.breed}</p>
        {d.org && <p className="truncate text-xs text-[#94a3b8]">{d.org}</p>}
        <div className="mt-auto flex items-center justify-between gap-2">
          {/* Phones show the short form so names never cut off mid-tile. */}
          <span className="min-w-0 truncate text-[13px] font-extrabold text-[#2DD4BF]">
            {direct ? (
              <>
                <span className="sm:hidden">Meet ↗︎</span>
                <span className="hidden sm:inline">Meet {d.name} ↗︎</span>
              </>
            ) : (
              "See details"
            )}
          </span>
          {direct && (
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Details about ${d.name}`}
              className="relative z-20 shrink-0 text-[13px] font-bold text-[#94a3b8] underline decoration-[#26324c] underline-offset-4 hover:decoration-[#2DD4BF]"
            >
              Details
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

type FeaturedDog = {
  id: string;
  name: string;
  photo: string | null;
  org: string;
  city: string;
  breed?: string;
  age?: string;
  sex?: string;
  listedAt?: string | null;
};

// One answer from /api/dog-of-the-day: the dog, her page here, and — only
// when the server confirmed it is her exact listing — her rescue's page.
type DayPick = { dog: FeaturedDog; pagePath: string; meetUrl: string | null };

// Today's actual Dog of the Day, reused from the same selection engine as
// /today (see app/api/dog-of-the-day/route.ts → app/lib/dogOfTheDay.ts).
// "Spin another dog" walks the same deterministic ring one step further
// (the `offset` param `selectDogForDate` already supports) and shows that
// dog in the card. The day's own pick is kept apart in `today`: a spun dog
// is labeled as another dog, today's dog is one tap back, and nothing here
// changes what the day featured (the history recorder only reads offset 0).
function DogOfTheDay() {
  const [today, setToday] = useState<DayPick | null>(null);
  const [spun, setSpun] = useState<DayPick | null>(null);
  const [view, setView] = useState<"today" | "spun">("today");
  const [date, setDate] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinNote, setSpinNote] = useState("");
  // Keep the daily feature visible while loading or when the feed is unavailable.
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const requestRef = useRef(0);
  const haveToday = today !== null;

  useEffect(() => {
    // Today's dog is already here — going back to her never asks again.
    if (offset === 0 && haveToday) return;
    let dead = false;
    const requestId = ++requestRef.current;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    fetch(`/api/dog-of-the-day${offset > 0 ? `?offset=${offset}` : ""}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Daily dog unavailable");
        return r.json();
      })
      .then((j) => {
        if (dead || requestRef.current !== requestId) return;
        setSpinning(false);
        if (!j?.dog?.id || !j.dog.name || !j.dog.photo || j.pagePath !== `/dogs/${j.dog.id}`) {
          // The ring ran out of dogs at this offset (spun past every
          // eligible dog) — wrap back to the first spin, or to today's dog
          // when there is no other, rather than leaving stale content.
          if (offset > 1) {
            setOffset(1);
          } else if (offset === 1 && haveToday) {
            setOffset(0);
            setView("today");
            setSpinNote("No other dogs to show right now.");
          } else {
            setState("unavailable");
          }
          return;
        }
        const pick: DayPick = {
          dog: j.dog,
          pagePath: j.pagePath,
          meetUrl: typeof j.meet?.url === "string" ? j.meet.url : null,
        };
        if (offset > 0) {
          setSpun(pick);
        } else {
          setToday(pick);
          setDate(typeof j.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(j.date) ? j.date : null);
        }
        setState("ready");
      })
      .catch(() => {
        if (dead || requestRef.current !== requestId) return;
        setSpinning(false);
        if (offset > 0 && haveToday) {
          setOffset(0);
          setView("today");
          setSpinNote("Couldn’t load another dog. Try again.");
          return;
        }
        setState("unavailable");
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      dead = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [offset, retry, haveToday]);

  function spin() {
    // From today's dog, start fresh so an older spin never flashes by.
    if (view === "today") setSpun(null);
    setSpinNote("");
    setSpinning(true);
    setView("spun");
    setOffset((o) => o + 1);
    track("dcmt_dog_of_the_day_spun");
  }

  const isSpun = view === "spun" && spun !== null;
  const shown = isSpun ? spun : today;
  const featured = shown?.dog ?? null;
  const pagePath = shown?.pagePath ?? null;
  const meetUrl = shown?.meetUrl ?? null;

  // Feed facts the dog tiles already show publicly. Never inferred.
  const ageText = featured?.age?.split(" ").slice(0, 2).join(" ") ?? "";
  const teaser = featured
    ? [featured.breed, ageText]
        .filter((s): s is string => Boolean(s && s.trim()))
        .join(" · ")
    : "";
  const facts = featured
    ? [ageText, featured.sex].filter((s): s is string => Boolean(s && s.trim())).join(" · ")
    : "";
  const where = featured ? [featured.org, featured.city].filter(Boolean).join(" · ") : "";
  const listedSince = featured ? listedSinceLabel(featured.listedAt) : null;
  const dayLabel = date
    ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    : null;

  return (
    <section aria-labelledby="dog-of-the-day-heading" className="min-w-0">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2
          id="dog-of-the-day-heading"
          className="text-xl font-black tracking-tight text-[#e8edf5] sm:text-2xl"
        >
          Dog of the Day
        </h2>
        {dayLabel && <p className="truncate text-sm font-semibold text-[#94a3b8]">{dayLabel}</p>}
      </div>

      {state === "ready" && featured && pagePath ? (
        <div className="overflow-hidden rounded-3xl border border-[#26324c] bg-[#141d2e]">
          {isSpun && today && (
            <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-[#26324c] bg-[#0b1220] px-4">
              <p role="status" className="py-2 text-sm font-semibold text-[#94a3b8]">
                <span aria-hidden="true">🔀</span> Another dog nearby, not today’s pick.
              </p>
              <button
                type="button"
                onClick={() => { setView("today"); setSpinNote(""); }}
                className="inline-flex min-h-11 items-center text-sm font-bold text-[#2DD4BF] underline-offset-4 hover:underline"
              >
                Back to {today.dog.name}
              </button>
            </div>
          )}
          <div className="sm:flex lg:block">
            <Link
              href={pagePath}
              aria-label={`${isSpun ? "Meet" : "Dog of the Day: meet"} ${featured.name}${where ? `, ${where}` : ""}`}
              className="block shrink-0 bg-[#0b1220] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#2DD4BF] sm:w-1/2 lg:w-full"
              style={{ transform: "none" }}
            >
              {featured.photo ? (
                // Dogs are never stretched: object-fit cover crops to the
                // frame, biased toward the top where faces usually are — no
                // per-photo focal-point data exists to crop more precisely.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.photo}
                  alt={`${featured.name}, an adoptable dog${teaser ? ` — ${teaser}` : ""}`}
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-[4/3] h-full w-full object-cover sm:aspect-auto sm:min-h-[18rem] lg:aspect-[4/3] lg:min-h-0"
                  style={{ objectPosition: "50% 30%" }}
                />
              ) : (
                <div
                  role="img"
                  aria-label={`No photo available for ${featured.name}`}
                  className="flex aspect-[4/3] w-full items-center justify-center text-6xl"
                >
                  🐶
                </div>
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
              <h3 className="text-3xl font-black leading-tight tracking-tight text-[#e8edf5]">
                <Link href={pagePath} className="underline-offset-4 hover:underline" style={{ transform: "none" }}>
                  {featured.name}
                </Link>
              </h3>
              {facts && <p className="mt-1 text-base font-bold text-[#e8edf5]">{facts}</p>}
              {featured.breed && <p className="text-sm font-semibold text-[#94a3b8]">{featured.breed}</p>}
              {where && <p className="mt-1.5 text-sm font-semibold text-[#94a3b8]">{where}</p>}
              {listedSince && <p className="mt-0.5 text-sm font-bold text-amber-300">{listedSince}</p>}
              <div className="mt-3.5 flex flex-wrap gap-2 sm:mt-auto sm:pt-4 lg:mt-3.5 lg:pt-0">
                {meetUrl ? (
                  <a
                    href={meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Meet ${featured.name} — ${featured.org || "the rescue"}’s page, opens in a new tab`}
                    onClick={() => track("dcmt_adoption_listing_opened", { dog_id: featured.id, from: "dog_of_the_day" })}
                    className={`${PRIMARY_BTN} w-full`}
                  >
                    Meet {featured.name} <span aria-hidden="true">↗︎</span>
                  </a>
                ) : (
                  <Link href={pagePath} className={`${PRIMARY_BTN} w-full`}>
                    Meet {featured.name} →
                  </Link>
                )}
                <ShareMenu
                  label="📣 Share"
                  title={`Meet ${featured.name}`}
                  text={`Meet ${featured.name}, a real adoptable dog looking for a home.`}
                  url={`https://dontclonemetom.com${pagePath}`}
                  photo={featured.photo}
                  imgLines={[teaser, where].filter(Boolean)}
                  className={`${SECONDARY_BTN} flex-auto bg-[#0b1220]`}
                />
                <SpinButton onSpin={spin} spinning={spinning} label="Spin another dog" className="flex-auto" />
              </div>
              {spinNote && <p role="status" className="mt-2 text-sm font-semibold text-amber-300">{spinNote}</p>}
            </div>
          </div>
        </div>
      ) : state === "loading" ? (
        <div
          role="status"
          aria-label="Loading Dog of the Day"
          className="overflow-hidden rounded-3xl border border-[#26324c] bg-[#141d2e] sm:flex lg:block"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-[#0b1220] sm:aspect-auto sm:min-h-[18rem] sm:w-1/2 lg:aspect-[4/3] lg:min-h-0 lg:w-full" />
          <div className="flex-1 space-y-3 p-5">
            <div className="h-7 w-1/2 rounded-full bg-[#0b1220]" />
            <div className="h-4 w-2/3 rounded-full bg-[#0b1220]" />
            <div className="h-4 w-3/4 rounded-full bg-[#0b1220]" />
            <div className="h-12 w-full rounded-full bg-[#0b1220]" />
          </div>
        </div>
      ) : (
        <div role="status" className="rounded-3xl border border-[#26324c] bg-[#141d2e] p-5">
          <p className="text-sm font-semibold leading-6 text-[#94a3b8]">
            Dog of the Day is temporarily unavailable. We couldn’t confirm a live adoption listing. Please try again.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() => { setState("loading"); setOffset(0); setView("today"); setRetry((r) => r + 1); }}
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#26324c] bg-[#0b1220] px-5 text-sm font-bold text-[#2DD4BF] transition hover:border-[#2DD4BF]"
            >
              Retry Dog of the Day
            </button>
            <Link href="/today" className="inline-flex min-h-11 items-center text-sm font-bold text-[#2DD4BF] underline-offset-4 hover:underline">
              Open today’s page →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="min-w-0 text-xs font-bold text-[#94a3b8]">
      {label}
      <span className="relative mt-1 block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 w-full appearance-none rounded-xl border border-[#26324c] bg-[#0b1220] py-2 pl-3 pr-9 text-base font-bold text-[#e8edf5]"
        >
          {options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}
        </select>
        <Chevron />
      </span>
    </label>
  );
}

// A compact select shaped like the page's buttons. 16px text so iPhones
// don't zoom in when it opens.
function PillSelect({ label, value, onChange, options, tall = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  tall?: boolean;
}) {
  return (
    <span className="relative inline-flex min-w-0">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${tall ? "min-h-12" : "min-h-11"} w-full min-w-0 appearance-none rounded-full border border-[#26324c] bg-[#141d2e] py-2 pl-4 pr-9 text-base font-bold text-[#e8edf5]`}
      >
        {options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}
      </select>
      <Chevron />
    </span>
  );
}

function Chevron({ className = "pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

// Search settings come back on a return visit — this device only, never
// the visitor's location.
const FIND_SETTINGS_KEY = "dcmt-find";

function FindDogs({ nearMeRequest }: { nearMeRequest: number }) {
  const [zip, setZip] = useState("63040");
  const [miles, setMiles] = useState(50);
  const [picks, setPicks] = useState("222");
  const [prefs, setPrefs] = useState<FindPrefs>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // "Use my location": rounded coordinates, kept in memory for this visit only.
  const [near, setNear] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locNote, setLocNote] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [dogs, setDogs] = useState<Dog[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "fallback">("loading");
  // When the requested radius doesn't have enough dogs with a verified
  // direct link, the API widens the search (never past 250mi, the site's
  // own existing maximum) so the count never shrinks — effectiveMiles keeps
  // the on-page copy honest about how far it actually had to look.
  const [effectiveMiles, setEffectiveMiles] = useState(50);
  const [widened, setWidened] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [detail, setDetail] = useState<Dog | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [pendingDog, setPendingDog] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Shared dog links land here: /?zip=63040&miles=50&dog=123 reopens that
  // dog. A shared link's own settings win over the ones saved on this device.
  useEffect(() => {
    let saved: Record<string, unknown> = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(FIND_SETTINGS_KEY) ?? "{}") ?? {};
    } catch {
      // Storage blocked or unreadable — start fresh.
    }
    const sp = new URLSearchParams(window.location.search);
    const z = sp.get("zip") ?? (typeof saved.zip === "string" ? saved.zip : null);
    const m = sp.get("miles") ?? (typeof saved.miles === "number" ? String(saved.miles) : null);
    const p = sp.get("picks") ?? (typeof saved.picks === "string" ? saved.picks : null);
    const d = sp.get("dog");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL params and saved settings are client-only; read after mount so hydration matches
    if (z && /^\d{5}$/.test(z)) setZip(z);
    if (m && RADIUS_OPTIONS.includes(parseInt(m, 10))) setMiles(parseInt(m, 10));
    if (p && ["22", "222", "all"].includes(p)) setPicks(p);
    setPrefs(cleanPrefs(saved));
    if (d) setPendingDog(d);
    setInitialized(true);
  }, []);
  useEffect(() => {
    if (!pendingDog || !dogs) return;
    const d = dogs.find((x) => x.id === pendingDog);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply the pending deep-linked dog once the list arrives
    if (d) { setDetail(d); setPhotoIdx(0); }
    setPendingDog(null);
  }, [dogs, pendingDog]);

  const clean = /^\d{5}$/.test(zip) ? zip : "";
  const filtered = hasFilters(prefs);
  const filterCount = [prefs.size, prefs.age, prefs.sex, prefs.goodWith].filter(Boolean).length;
  const matches = dogs ? sortDogs(dogs.filter((d) => matchesFilters(d, prefs)), prefs.sort) : null;
  const visibleDogs = picks === "all" ? matches : matches?.slice(0, Number(picks));
  const detailDest = detail ? resolveDogDestination(detail) : null;
  const petfinderUrl = `https://www.petfinder.com/search/dogs-for-adoption/?location=${clean}&distance=${miles}`;
  const adoptapetUrl = `https://www.adoptapet.com/dog-adoption/${clean}`;
  const setPref = (key: keyof FindPrefs) => (value: string) => setPrefs((current) => ({ ...current, [key]: value }));
  const place = near ? "you" : clean;

  // Keep valid settings in the URL so reloads and shared links retain them.
  // A location search leaves the URL alone: coordinates never go in a link.
  useEffect(() => {
    if (!initialized || !clean || near) return;
    const url = new URL(window.location.href);
    url.searchParams.set("zip", clean);
    url.searchParams.set("miles", String(miles));
    url.searchParams.set("picks", picks);
    window.history.replaceState(null, "", url);
  }, [initialized, clean, miles, picks, near]);

  useEffect(() => {
    if (!initialized) return;
    try {
      window.localStorage.setItem(FIND_SETTINGS_KEY, JSON.stringify({ zip: clean || undefined, miles, picks, ...prefs }));
    } catch {
      // Private mode or storage full — settings just won't come back.
    }
  }, [initialized, clean, miles, picks, prefs]);

  // Live dogs near the typed ZIP or the visitor's location (RescueGroups.org,
  // chosen radius). Falls back to the search links below if the API is
  // unavailable.
  useEffect(() => {
    if (!initialized) return;
    let dead = false;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch effect: show the loading state for the request this effect starts
    setStatus("loading");
    setDogs(null);
    if (!clean && !near) return;
    const t = setTimeout(() => {
      // Coordinates travel in the request body, never in a URL.
      const request = near
        ? fetch("/api/adoptable-pets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: near.lat, lon: near.lon, miles }),
            signal: controller.signal,
          })
        : fetch(`/api/adoptable-pets?zip=${clean}&miles=${miles}`, { signal: controller.signal });
      request
        .then((r) => {
          if (!r.ok) throw new Error("Dogs unavailable");
          return r.json();
        })
        .then((j) => {
          if (dead) return;
          if (j?.dogs?.length) {
            setDogs(j.dogs);
            setEffectiveMiles(typeof j.miles === "number" ? j.miles : miles);
            setWidened(Boolean(j.widened));
            setStatus("ok");
          } else {
            setDogs(null);
            setStatus("fallback");
          }
        })
        .catch(() => {
          if (!dead) setStatus("fallback");
        });
    }, 400);
    return () => {
      dead = true;
      clearTimeout(t);
      controller.abort();
    };
  }, [initialized, clean, miles, refresh, near]);

  // Ask the browser for the visitor's location only when they tap a button.
  function searchNearMe() {
    if (!("geolocation" in navigator)) {
      setLocNote("This browser can’t share a location. Type a ZIP instead.");
      return;
    }
    setLocating(true);
    setLocNote("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setNear({
          lat: Math.round(position.coords.latitude * 100) / 100,
          lon: Math.round(position.coords.longitude * 100) / 100,
        });
      },
      () => {
        setLocating(false);
        setLocNote("Location is turned off for this site. Type a ZIP instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }

  // The intro's "Find dogs near me" runs this same location search.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- answers a tap in the intro: shows "Finding you…" for the request this starts
    if (nearMeRequest > 0) searchNearMe();
  }, [nearMeRequest]);

  // The details dialog: Escape closes it; focus moves in, then back out.
  useEffect(() => {
    if (!detail) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDetail(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [detail]);

  // The optional Petfinder widget mounts only when expanded: load its script,
  // then style its shadow DOM (2-per-row on desktop; readable dropdowns).
  useEffect(() => {
    if (!showMore) return;
    if (!document.querySelector("script[data-pet-scroller]")) {
      const s = document.createElement("script");
      s.src = "https://www.petfinder.com/pet-scroller.bundle.js";
      s.async = true;
      s.setAttribute("data-pet-scroller", "true");
      document.body.appendChild(s);
    }
    let tries = 0;
    const iv = setInterval(() => {
      const el = document.querySelector("pet-scroller") as
        | (HTMLElement & { shadowRoot: ShadowRoot | null })
        | null;
      const sr = el?.shadowRoot;
      if (sr && !sr.getElementById("dcmt-2col")) {
        const st = document.createElement("style");
        st.id = "dcmt-2col";
        st.textContent =
          "@media(min-width:640px){.grid-col_result{flex:0 0 48% !important;max-width:48% !important;box-sizing:border-box}}" +
          ".multiselect-popup,.multiselect-popup-list,.multiselect-popup-list_single{background:#ffffff !important;}" +
          ".multiselect-popup,.multiselect-popup *,.multiselect-popup-list,.multiselect-popup-list *,.multiselect-listItem,.multiselect-listItem *{color:#111827 !important;}" +
          ".multiselect-listItem:hover,.multiselect-listItem[aria-selected=\"true\"]{background:#f1f5f9 !important;}" +
          ".multiselect-field,.multiselect-field-selection,.multiselect-field-selection *,.multiselectLabel{color:#111827 !important;}" +
          ".pagination,.pagination .grid,.pagination .grid-col{overflow:visible !important;}" +
          ".multiselect-popup{z-index:50 !important;}";
        sr.appendChild(st);
      }
      if (sr || ++tries > 40) clearInterval(iv);
    }, 500);
    return () => clearInterval(iv);
  }, [showMore]);

  const clearFilters = (
    <button
      type="button"
      onClick={() => setPrefs((current) => ({ ...NO_FILTERS, sort: current.sort }))}
      className="ml-2 inline-flex min-h-11 items-center font-bold text-[#2DD4BF] underline-offset-4 hover:underline"
    >
      Clear filters
    </button>
  );

  // Plain count line. When the API had to look past the chosen distance to
  // reach the locked baseline, say how many are close and how many are farther.
  let summary = "";
  if (dogs && matches && visibleDogs) {
    const within = matches.filter((d) => d.distance !== null && d.distance <= miles).length;
    if (filtered) summary = `${matches.length} of ${dogs.length} dogs match.`;
    else if (widened) summary = `${within} ${within === 1 ? "dog" : "dogs"} within ${miles} miles of ${place}, and ${dogs.length - within} more up to ${effectiveMiles} miles away.`;
    else summary = `${dogs.length} ${dogs.length === 1 ? "dog" : "dogs"} within ${miles} miles of ${place}.`;
    if (visibleDogs.length < matches.length) summary += ` Showing ${visibleDogs.length}.`;
  }

  return (
    <div>
      <form
        role="search"
        aria-label="Find adoptable dogs"
        onSubmit={(event) => { event.preventDefault(); setNear(null); setRefresh((value) => value + 1); }}
        className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-2 sm:w-[30rem]">
          <span className="relative min-w-0">
            <label htmlFor="find-zip" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#94a3b8]">
              ZIP
            </label>
            <input
              id="find-zip"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              value={zip}
              onChange={(e) => { setZip(e.target.value); setNear(null); }}
              pattern="[0-9]{5}"
              required
              maxLength={5}
              aria-label="ZIP code"
              className="min-h-12 w-full rounded-full border border-[#26324c] bg-[#141d2e] py-2 pl-12 pr-3 text-base font-bold text-[#e8edf5]"
            />
          </span>
          <PillSelect
            label="Distance"
            value={String(miles)}
            onChange={(value) => setMiles(Number(value))}
            options={RADIUS_OPTIONS.map((m) => [String(m), `${m} mi`] as const)}
            tall
          />
          <button type="submit" className={PRIMARY_BTN}>
            Search
          </button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
          <button
            type="button"
            onClick={searchNearMe}
            disabled={locating}
            aria-pressed={Boolean(near)}
            className={`${SECONDARY_BTN} bg-[#141d2e]`}
          >
            <span aria-hidden="true">📍</span> {locating ? "Finding you…" : near ? "Showing dogs near you" : "Use my location"}
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="find-filters"
            className={`${SECONDARY_BTN} bg-[#141d2e]`}
          >
            Filters
            {filterCount > 0 && (
              <span className="rounded-full bg-[#2DD4BF] px-2 text-xs font-extrabold leading-5 text-[#0b1220]">{filterCount}</span>
            )}
            <Chevron className={`h-4 w-4 text-[#94a3b8] ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </form>
      {locNote && <p role="status" className="mt-2 text-sm font-bold text-amber-300">{locNote}</p>}

      <div id="find-filters" hidden={!filtersOpen} className="mt-3 rounded-3xl border border-[#26324c] bg-[#141d2e] p-4">
        <div role="group" aria-label="Narrow the list" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FilterSelect label="Size" value={prefs.size} onChange={setPref("size")} options={FILTER_OPTIONS.size} />
          <FilterSelect label="Age" value={prefs.age} onChange={setPref("age")} options={FILTER_OPTIONS.age} />
          <FilterSelect label="Sex" value={prefs.sex} onChange={setPref("sex")} options={FILTER_OPTIONS.sex} />
          <FilterSelect label="Good with" value={prefs.goodWith} onChange={setPref("goodWith")} options={FILTER_OPTIONS.goodWith} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4">
          <p className="py-2 text-xs font-semibold text-[#94a3b8]">“Good with” only shows dogs whose rescue says so.</p>
          {filtered && clearFilters}
        </div>
      </div>

      {!clean && !near && <p role="status" className="mt-5 text-sm font-semibold text-[#94a3b8]">Enter a five-digit ZIP code to see nearby dogs.</p>}

      {(clean || near) && status !== "fallback" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p aria-live="polite" className="min-w-0 text-sm font-semibold leading-6 text-[#94a3b8]">
            {status === "loading" ? `Finding good dogs near ${place}…` : summary}
            {status === "ok" && filtered && clearFilters}
          </p>
          <div className="flex items-center gap-2">
            <PillSelect label="Sort" value={prefs.sort} onChange={setPref("sort")} options={FILTER_OPTIONS.sort} />
            <label className="flex items-center gap-2 text-sm font-semibold text-[#94a3b8]">
              Show
              <span className="relative inline-flex">
                <select
                  aria-label="How many dogs"
                  value={picks}
                  onChange={(e) => setPicks(e.target.value)}
                  className="min-h-11 appearance-none rounded-full border border-[#26324c] bg-[#141d2e] py-2 pl-4 pr-9 text-base font-bold text-[#e8edf5]"
                >
                  <option value="22">22 dogs</option>
                  <option value="222">222 dogs</option>
                  <option value="all">All dogs</option>
                </select>
                <Chevron />
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Live adoptable dogs near the ZIP (dogs only). */}
      <section aria-label="Adoptable dogs" aria-busy={status === "loading"} className="mt-3">
        {status === "loading" && (clean || near) && (
          <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-[#26324c] bg-[#141d2e]">
                <div className="aspect-square animate-pulse bg-[#0b1220]" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-2/3 rounded-full bg-[#0b1220]" />
                  <div className="h-3 w-1/2 rounded-full bg-[#0b1220]" />
                  <div className="h-3 w-3/4 rounded-full bg-[#0b1220]" />
                </div>
              </div>
            ))}
          </div>
        )}
        {status === "ok" && dogs && matches && visibleDogs && (
          matches.length === 0 ? (
            <div className="rounded-3xl border border-[#26324c] bg-[#141d2e] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-[#94a3b8]">
                No dogs match those filters right now. Try fewer filters or a longer distance.
              </p>
              {clearFilters}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {visibleDogs.map((d) => (
                  <DogTile key={d.id} dog={d} onOpen={() => { setDetail(d); setPhotoIdx(0); }} />
                ))}
              </div>
              {visibleDogs.length < matches.length && (
                <div className="mt-5 text-center">
                  <button type="button" onClick={() => setPicks("all")} className={`${SECONDARY_BTN} bg-[#141d2e]`}>
                    Show all {matches.length} dogs
                  </button>
                </div>
              )}
            </>
          )
        )}
      </section>

      {/* In-page dog detail — meet them without leaving the page */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
          onClick={() => setDetail(null)}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`About ${detail.name}`}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#26324c] bg-[#141d2e] outline-none sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#0b1220]">
              {detail.photos.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.photos[photoIdx]} alt={detail.name} className="h-80 w-full object-contain" />
              ) : (
                <div className="flex h-72 w-full items-center justify-center text-6xl">🐶</div>
              )}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDetail(null)}
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#26324c] bg-[#141d2e] text-lg font-black text-[#e8edf5]"
              >
                ✕
              </button>
              {detail.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => setPhotoIdx((photoIdx + detail.photos.length - 1) % detail.photos.length)}
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#26324c] bg-[#141d2e] text-xl font-black text-[#e8edf5]"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setPhotoIdx((photoIdx + 1) % detail.photos.length)}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#26324c] bg-[#141d2e] text-xl font-black text-[#e8edf5]"
                  >
                    ›
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full border border-[#26324c] bg-[#141d2e] px-2.5 py-1 text-xs font-bold text-[#e8edf5]">
                    {photoIdx + 1}/{detail.photos.length}
                  </span>
                </>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-2xl font-black text-[#e8edf5]">{detail.name}</h3>
              <p className="mt-1 text-sm font-semibold text-[#94a3b8]">
                {detail.breed}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#94a3b8]">
                {detail.org}{detail.orgCity ? ` · ${detail.orgCity}` : ""}
                {detail.distance !== null && (
                  <span className="text-[#2DD4BF]"> · {Math.round(detail.distance)} mi away</span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[detail.age, detail.sex, detail.size, ...detail.facts, listedSinceLabel(detail.listedAt)].filter(Boolean).map((f) => (
                  <span key={f} className="rounded-full border border-[#26324c] bg-[#0b1220] px-3 py-1 text-xs font-bold text-[#e8edf5]">
                    {f}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {detailDest && detailDest.type !== "none" && (
                  <a
                    href={detailDest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={detailDest.ariaLabel}
                    onClick={() => track("dcmt_adoption_listing_opened", { dog_id: detail.id, from: "details" })}
                    className={`${PRIMARY_BTN} w-full`}
                  >
                    {detailDest.type === "exact-dog" ? `Meet ${detail.name}` : detailDest.label} ↗︎
                  </a>
                )}
                {detail.email && (
                  <a
                    href={rescueEmailHref(detail, detailDest)}
                    className={`${SECONDARY_BTN} w-full bg-[#0b1220]`}
                  >
                    💌 Email the rescue about {detail.name}
                  </a>
                )}
                <p className="mt-1 text-xs font-semibold leading-5 text-[#94a3b8]">
                  {detail.org || "The rescue"} handles the adoption. Most rescues start with a short application, then a call or a visit to meet the dog.
                </p>
                {detail.desc && (
                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-[#94a3b8]">
                    {detail.desc}
                  </p>
                )}
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ShareMenu
                    label={`📣 Share ${detail.name}`}
                    title={`Meet ${detail.name} 🐶`}
                    text={`Meet ${detail.name} — ${detail.breed}, ${detail.distance !== null ? `${Math.round(detail.distance)} miles away ` : ""}with ${detail.org}. Real adoptable dog looking for a home!`}
                    url={`https://dontclonemetom.com/dogs/${detail.id}`}
                    photo={detail.photo}
                    imgLines={[detail.breed, [detail.age, detail.sex].filter(Boolean).join(" · ") + (detail.org ? ` · ${detail.org}` : "")]}
                    className={`${SECONDARY_BTN} w-full bg-[#0b1220]`}
                  />
                  <Link
                    href={`/cards?dog=${detail.id}`}
                    className={`${SECONDARY_BTN} w-full bg-[#0b1220]`}
                  >
                    🃏 Make a Dog Card for {detail.name}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {status === "fallback" && (
        <p className="mt-6 rounded-3xl border border-[#26324c] bg-[#141d2e] px-5 py-6 text-center text-sm font-semibold text-[#94a3b8]">
          No dogs loaded {near ? "near you" : `for ${clean}`} right now — use the searches below, every dog there is real and nearby.
        </p>
      )}

      {/* Still looking? More St. Louis dogs right here, and two big national
          networks (they honor the ZIP + radius). */}
      <div className="mt-8 rounded-3xl border border-[#26324c] bg-[#141d2e] p-4 sm:p-5">
        <h3 className="text-base font-black text-[#e8edf5]">Still looking?</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setShowMore((open) => !open)}
            aria-expanded={showMore}
            className={`${SECONDARY_BTN} bg-[#0b1220]`}
          >
            🐾 More St. Louis rescue dogs
          </button>
          <a href={petfinderUrl} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_BTN} bg-[#0b1220]`}>
            Petfinder <span aria-hidden="true">↗︎</span>
          </a>
          <a href={adoptapetUrl} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_BTN} bg-[#0b1220]`}>
            Adopt-a-Pet <span aria-hidden="true">↗︎</span>
          </a>
        </div>
        {showMore && (
          <div
            className="mt-4 rounded-2xl bg-white p-1"
            dangerouslySetInnerHTML={{
              __html:
                `<pet-scroller s3Url="https://dbw3zep4prcju.cloudfront.net/" apiBase="https://psl.petfinder.com/graphql" organization='${JSON.stringify(LOCAL_RESCUE_ORGS)}' status="adoptable" petfinderUrl="https://www.petfinder.com/" type='["dog"]' hideBreed="false" limit="24" petListTitle=""></pet-scroller>`,
            }}
          />
        )}
      </div>
    </div>
  );
}

// The intro's actions land on the search below the Dog of the Day; "search
// by ZIP" also puts the cursor in the ZIP field.
function scrollToFind(focusZip = false) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("find")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  if (focusZip) document.getElementById("find-zip")?.focus({ preventScroll: true });
}

export default function HomePage() {
  // "Find dogs near me" asks the search below to use the visitor's location.
  const [nearMeRequest, setNearMeRequest] = useState(0);

  return (
    <main className="homepage min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <div className="mx-auto max-w-5xl px-4 pb-12 pt-5 sm:px-6 sm:pt-8 lg:pt-12">

        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-12">
          {/* Isaiah introduces the site — his face and name, then the line —
              with today's real dog right beside (or below) him. */}
          <section aria-labelledby="brand-heading">
            <Link
              href="/dogs/isaiah"
              aria-label="Isaiah, Batdog · The Dark Zay — the DontCloneMeTom.com brand dog"
              className="inline-flex min-h-11 items-center gap-3 rounded-full pr-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2DD4BF]"
            >
              {/* The established face crop keeps both eyes and ears in frame. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/isaiah-icon.jpg"
                alt="Isaiah, the black-and-white Batdog, looking right at you"
                width={120}
                height={120}
                fetchPriority="high"
                className="h-14 w-14 rounded-full border-[3px] border-[#2DD4BF] object-cover sm:h-20 sm:w-20"
                style={{ objectPosition: "50% 25%" }}
              />
              <span className="flex flex-col leading-tight">
                <span className="text-base font-black text-[#e8edf5] sm:text-lg">Isaiah</span>
                <span className="text-sm font-bold text-[#2DD4BF]">Batdog · The Dark Zay</span>
              </span>
            </Link>
            <h1
              id="brand-heading"
              className="mt-3 font-black leading-[1.04] tracking-tight text-[#e8edf5]"
              style={{ fontSize: "clamp(2rem, 8vw, 3.25rem)" }}
            >
              <span className="block whitespace-nowrap">Don’t clone me.</span>
              <span className="block whitespace-nowrap text-[#2DD4BF]">Rescue me.</span>
            </h1>
            <p className="mt-2 max-w-md text-[15px] leading-6 text-[#94a3b8] sm:text-lg sm:leading-8">
              Real dogs near you need homes today. Each one links straight to its rescue.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={() => {
                  track("dcmt_find_near_me_clicked");
                  setNearMeRequest((n) => n + 1);
                  scrollToFind();
                }}
                className={PRIMARY_BTN}
              >
                <span aria-hidden="true">📍</span> Find dogs near me
              </button>
              <a
                href="#find"
                onClick={(e) => { e.preventDefault(); scrollToFind(true); }}
                className="inline-flex min-h-11 items-center text-[15px] font-bold text-[#2DD4BF] underline-offset-4 hover:underline"
              >
                or enter a ZIP
              </a>
            </div>
          </section>

          <DogOfTheDay />
        </div>

        {/* Live adoptable dogs by ZIP */}
        <section id="find" aria-labelledby="find-heading" className="mt-14 scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="find-heading" className="text-2xl font-black tracking-tight text-[#e8edf5] sm:text-3xl">
              Find a dog near you.
            </h2>
            <p className="text-sm font-semibold text-[#94a3b8]">Tap any dog to go straight to their rescue.</p>
          </div>
          <FindDogs nearMeRequest={nearMeRequest} />
        </section>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {/* How adopting works */}
          <section aria-labelledby="how-heading" className={CARD}>
            <h2 id="how-heading" className={SECTION_TITLE}>How adopting works</h2>
            <ul className="mt-3 space-y-2.5 text-sm font-medium leading-6 text-[#94a3b8]">
              <li>🐾 Every dog here is listed by a <strong className="text-[#e8edf5]">real rescue or shelter</strong>, live from RescueGroups.org. Tap a dog to open their own listing on the rescue&apos;s site.</li>
              <li>🐾 You adopt <strong className="text-[#e8edf5]">through that rescue</strong>. Most start with a short application, then a call or a visit to meet the dog.</li>
              <li>🐾 Fees, timing and the right match are up to each rescue — their listing is the place to check.</li>
              <li>🐾 Want more choices? <strong className="text-[#e8edf5]">Petfinder</strong> and <strong className="text-[#e8edf5]">Adopt-a-Pet</strong> list even more dogs near your ZIP.</li>
            </ul>
            <p className="mt-4 text-xs font-bold text-[#94a3b8]">We don&apos;t replace rescues or shelters. We help people find them. Adopt. Foster. Share.</p>
          </section>

          {/* More ways to help */}
          <section aria-labelledby="help-heading" className={CARD}>
            <h2 id="help-heading" className={SECTION_TITLE}>More ways to help.</h2>
            <div className="mt-4 flex flex-col gap-2">
              {[
                {
                  emoji: "🏠",
                  label: "Local shelters (St. Louis area)",
                  links: [
                    { label: "Home 2 Home Canine Orphanage", href: "https://home2homecanineorphanage.org/adopt" },
                    { label: "Open Door Animal Sanctuary", href: "https://odas.org/" },
                    { label: "APA Adoption Center", href: "https://apamo.org/" },
                    { label: "Humane Society of Missouri", href: "https://hsmo.org/adopt/" },
                  ],
                },
                {
                  emoji: "🔎",
                  label: "Adoption agencies",
                  links: [
                    { label: "Petfinder", href: "https://www.petfinder.com/" },
                    { label: "Adopt-a-Pet", href: "https://www.adoptapet.com/" },
                    { label: "ASPCA — Adopt a Pet", href: "https://www.aspca.org/adopt-pet" },
                    { label: "Best Friends Animal Society", href: "https://bestfriends.org/" },
                  ],
                },
                {
                  emoji: "❤️",
                  label: "Support a pet",
                  links: [
                    { label: "ASPCA — Donate", href: "https://www.aspca.org/donate" },
                    { label: "Best Friends — Donate", href: "https://bestfriends.org/donate" },
                    { label: "The Humane Society of the United States", href: "https://www.humanesociety.org/" },
                  ],
                },
                {
                  emoji: "🐾",
                  label: "Foster, if you can",
                  links: [
                    { label: "Foster with the Humane Society of Missouri", href: "https://hsmo.org/foster/" },
                    { label: "Foster with Best Friends", href: "https://bestfriends.org/foster" },
                  ],
                },
              ].map((cat) => (
                <details key={cat.label} className="group rounded-2xl border border-[#26324c] bg-[#0b1220] px-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-bold text-[#e8edf5]">
                    <span>{cat.emoji} {cat.label}</span>
                    <Chevron className="h-4 w-4 shrink-0 text-[#94a3b8] transition group-open:rotate-180" />
                  </summary>
                  <div className="flex flex-col border-t border-[#26324c] py-2">
                    {cat.links.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm font-semibold text-[#2DD4BF] underline-offset-4 hover:underline"
                      >
                        {l.label} →
                      </a>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Share */}
        <section id="share-real-dogs" aria-labelledby="share-heading" className={`mt-4 ${CARD}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <h2 id="share-heading" className={SECTION_TITLE}>Pass it on.</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#94a3b8]">
                Can&apos;t adopt right now? Sharing this helps a dog near someone else get noticed. That counts too.
              </p>
            </div>
            <ShareMenu
              label="📣 Share"
              title="Good dogs near you 🐶"
              text="Good dogs looking for homes near you — real adoptable dogs, right on the page. Take a look:"
              url="https://dontclonemetom.com"
              imgLines={["Real adoptable dogs by ZIP, right on the page.", "Adopt. Foster. Share."]}
              className={`${PRIMARY_BTN} shrink-0 self-start`}
            />
          </div>
          <p className="mt-5 text-xs font-bold text-[#94a3b8]">Or tap a line to copy it:</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shareLines.map((line) => (
              <ShareCard key={line} line={line} />
            ))}
          </div>
        </section>

        {/* Thank you, Tom */}
        <section aria-labelledby="thanks-heading" className="mt-4 rounded-3xl border border-[#26324c] bg-[#141d2e] px-5 py-6 text-center sm:px-8">
          <h2 id="thanks-heading" className={SECTION_TITLE}>
            <span aria-hidden="true">🤍🐾 </span>Thank you, Tom Brady.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-base font-bold leading-7 text-[#2DD4BF]">
            You showed the world how much a dog can mean.<br />
            We love you for it — now let&apos;s love a few million more.
          </p>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* Sources */}
          <section aria-labelledby="sources-heading" className={CARD}>
            <h2 id="sources-heading" className="text-base font-black text-[#e8edf5]">Sources &amp; Context</h2>
            <ul className="mt-3 list-inside list-disc space-y-2 text-xs font-semibold leading-6 text-[#94a3b8]">
              <li>
                Public reporting on Tom Brady confirming his dog Junie is a clone of his late dog
                Lua — widely covered by major news outlets in 2025.
              </li>
              <li>
                ViaGen Pets publicly lists dog cloning services. Pricing is publicly reported as
                approximately $50,000 USD, subject to change.
              </li>
              <li>
                ASPCA and Shelter Animals Count track shelter intake, adoption, and euthanasia
                statistics. Millions of dogs enter U.S. shelters annually.
              </li>
            </ul>
            <p className="mt-3 text-xs text-[#94a3b8]">
              All information is presented factually and neutrally. No claims are made beyond
              publicly available reporting.
            </p>
          </section>

          {/* Disclaimer */}
          <section aria-label="Disclaimer" className={CARD}>
            <p className="text-xs font-semibold leading-6 text-[#94a3b8]">
              <strong className="text-[#94a3b8]">Disclaimer:</strong> DontCloneMeTom.com is an
              independent dog-rescue awareness project. It is not affiliated with, sponsored by, or
              endorsed by Tom Brady, Colossal Biosciences, ViaGen Pets, the NFL, the New England
              Patriots, the Tampa Bay Buccaneers, or any related trademark owner. No celebrity
              endorsement is claimed or implied.
            </p>
          </section>
        </div>

      </div>
    </main>
  );
}
