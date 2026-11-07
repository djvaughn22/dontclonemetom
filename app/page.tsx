"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

function ShareCard({ line }: { line: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(line).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <button
      onClick={copy}
      className="block w-full text-left rounded-2xl border border-[#26324c] bg-[#141d2e] px-5 py-4 transition hover:border-[#26324c] hover:bg-[#141d2e] group"
    >
      <p className="text-sm font-semibold leading-6 text-[#e8edf5] group-hover:text-[#e8edf5]">
        &ldquo;{line}&rdquo;
      </p>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[#94a3b8] group-hover:text-[#2DD4BF]">
        {copied ? "Copied!" : "Tap to copy"}
      </p>
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
  const itemCls = "flex w-full items-center justify-between rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF]";
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
          <div className="w-full max-w-sm rounded-2xl border border-[#26324c] bg-[#141d2e] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-black text-[#e8edf5]">{title}</p>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b1220] text-sm font-black text-[#94a3b8]">✕</button>
            </div>
            <p className="mb-3 text-xs font-semibold text-[#94a3b8]">
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
            {flash && <p className="mt-3 text-xs font-black text-[#5eead4]">{flash}</p>}
          </div>
        </div>
      )}
    </>
  );
}

// One dog in the results grid. A dog with its own profile page is one tap
// from it: the whole tile — photo, name, everything — is a real external
// link (new-tab and long-press behave normally), with a small Details chip
// for the in-page view. A dog without its own page opens the in-page
// details, where the fallback link is labeled honestly. The card chip hands
// the dog straight to the card maker without replacing the adoption path.
export function DogTile({ dog: d, onOpen }: { dog: Dog; onOpen: () => void }) {
  const dest = resolveDogDestination(d);
  const direct = dest.type === "exact-dog";
  const badge = listingBadge(d.listedAt);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#26324c] bg-[#141d2e] text-left transition hover:border-[#2DD4BF]">
      {direct ? (
        <a
          href={dest.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={dest.ariaLabel}
          className="absolute inset-0 z-10"
        >
          <span className="sr-only">{dest.label}</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open details for ${d.name}`}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}
      {d.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.photo} alt={d.name} loading="lazy" className="aspect-square w-full object-cover" style={{ objectPosition: "50% 25%" }} />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-[#0b1220] text-4xl">🐶</div>
      )}
      {badge && (
        <span
          className={`pointer-events-none absolute left-2 top-2 rounded-full border border-[#26324c] bg-[#0b1220] px-2 py-0.5 text-[11px] font-black ${badge.kind === "new" ? "text-[#2DD4BF]" : "text-amber-300"}`}
        >
          {badge.text}
        </span>
      )}
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-black text-[#e8edf5]">{d.name}</p>
        <p className="truncate text-xs font-semibold text-[#94a3b8]">{d.breed}</p>
        <p className="mt-1 text-xs font-semibold text-[#94a3b8]">
          {[d.age.split(" ").slice(0, 2).join(" "), d.sex].filter(Boolean).join(" · ")}
          {d.distance !== null && (
            <span className="text-[#5eead4]"> · {Math.round(d.distance)} mi</span>
          )}
        </p>
        {d.org && (
          <p className="mt-0.5 truncate text-[11px] font-semibold text-[#94a3b8]">
            {d.org}
          </p>
        )}
        <p className="mt-1.5 truncate text-[11px] font-black text-[#2DD4BF]">
          {direct ? `Meet ${d.name} ↗` : "See details"}
        </p>
        {direct && (
          <div className="relative z-20 mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onOpen}
              className="inline-block cursor-pointer rounded-full border border-[#26324c] bg-[#0b1220] px-3 py-1 text-[11px] font-black text-[#94a3b8] transition hover:border-[#2DD4BF] hover:text-[#e8edf5]"
            >
              Details
            </button>
          </div>
        )}
      </div>
    </div>
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
  listedAt?: string | null;
};

// Today's actual Dog of the Day, reused from the same selection engine as
// /today (see app/api/dog-of-the-day/route.ts → app/lib/dogOfTheDay.ts).
// "Spin another dog" walks the same deterministic ring one step further
// (the `offset` param `selectDogForDate` already supports) instead of
// introducing a second selection path — replaces this widget's content in
// place, never a second card.
function DogOfTheDay() {
  const [featured, setFeatured] = useState<FeaturedDog | null>(null);
  const [pagePath, setPagePath] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [spinning, setSpinning] = useState(false);
  // Keep the daily feature visible while loading or when the feed is unavailable.
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const requestRef = useRef(0);

  useEffect(() => {
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
        if (!j?.dog?.id || !j.dog.name || !j.dog.photo || j.pagePath !== `/dogs/${j.dog.id}`) {
          // The ring ran out of dogs at this offset (spun past every
          // eligible dog) — wrap back to the start of the spin sequence
          // rather than leaving stale content on screen.
          if (offset > 1) {
            setOffset(1);
            return;
          }
          setState("unavailable");
          return;
        }
        setFeatured(j.dog);
        setPagePath(j.pagePath);
        setState("ready");
      })
      .catch(() => {
        if (!dead && requestRef.current === requestId) setState("unavailable");
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!dead && requestRef.current === requestId) setSpinning(false);
      });

    return () => {
      dead = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [offset, retry]);

  // Feed facts the dog tiles already show publicly. Never inferred.
  const teaser = featured
    ? [featured.breed, featured.age?.split(" ").slice(0, 2).join(" ")]
        .filter((s): s is string => Boolean(s && s.trim()))
        .join(" · ")
    : "";
  const where = featured ? [featured.org, featured.city].filter(Boolean).join(" · ") : "";

  return (
    <section aria-labelledby="dog-of-the-day-heading" className="mx-auto mb-6">
      <h2
        id="dog-of-the-day-heading"
        className="text-2xl font-black text-[#e8edf5]"
      >
        Dog of the Day
      </h2>

      {state === "ready" && featured && pagePath ? (
        <>
          <Link
            href={pagePath}
            aria-label={`Dog of the Day: meet ${featured.name}${where ? `, ${where}` : ""}`}
            className="mt-4 flex flex-col items-stretch gap-4 rounded-2xl border border-[#2DD4BF]/40 bg-[#141d2e] p-3 text-left transition hover:border-[#2DD4BF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DD4BF] sm:flex-row sm:items-center sm:gap-5 sm:p-4"
          >
            {featured.photo ? (
              // Face-first portrait crop: same object-fit: cover + top-biased
              // object-position convention as DogTile's photos above (50% 25%),
              // nudged higher since this portrait is meant to read as a close-up
              // rather than a list thumbnail — no per-photo focal-point data exists
              // to crop more precisely than that.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featured.photo}
                alt={`${featured.name}, an adoptable dog${teaser ? ` — ${teaser}` : ""}`}
                className="aspect-square w-full shrink-0 rounded-xl object-cover sm:h-56 sm:w-56"
                style={{ objectPosition: "50% 18%" }}
              />
            ) : (
              <div
                role="img"
                aria-label={`No photo available for ${featured.name}`}
                className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-[#0b1220] text-4xl sm:h-36 sm:w-36 sm:text-5xl"
              >
                🐶
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-black text-[#e8edf5] sm:text-2xl">{featured.name}</p>
              {teaser && (
                <p className="truncate text-xs font-semibold text-[#e8edf5] sm:text-sm">{teaser}</p>
              )}
              {where && (
                <p className="truncate text-xs font-semibold text-[#94a3b8] sm:text-sm">{where}</p>
              )}
              {listedSinceLabel(featured.listedAt) && (
                <p className="truncate text-xs font-black text-amber-300 sm:text-sm">{listedSinceLabel(featured.listedAt)}</p>
              )}
              <p className="mt-1.5 text-xs font-black text-[#2DD4BF] sm:text-sm">View {featured.name} →</p>
            </div>
          </Link>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <ShareMenu
              label="Share this dog"
              title={`Meet ${featured.name}`}
              text={`Meet ${featured.name}, a real adoptable dog looking for a home.`}
              url={`https://dontclonemetom.com${pagePath}`}
              photo={featured.photo}
              imgLines={[teaser, where].filter(Boolean)}
              className="rounded-full border border-[#26324c] px-5 py-3 text-sm font-bold text-[#2DD4BF]"
            />
            <SpinButton
              onSpin={() => {
                setSpinning(true);
                setOffset((o) => o + 1);
              }}
              spinning={spinning}
              label="Spin another dog"
            />
          </div>
        </>
      ) : state === "loading" ? (
        <div
          role="status"
          aria-label="Loading Dog of the Day"
          className="mt-2 flex animate-pulse items-center gap-4 rounded-2xl border border-[#26324c] bg-[#141d2e] p-3 sm:gap-5 sm:p-4"
        >
          <div className="h-28 w-28 shrink-0 rounded-2xl bg-[#0b1220] sm:h-36 sm:w-36" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-2/3 rounded bg-[#0b1220]" />
            <div className="h-3 w-1/2 rounded bg-[#0b1220]" />
            <div className="h-3 w-3/4 rounded bg-[#0b1220]" />
          </div>
        </div>
      ) : (
        <div role="status" className="mt-2 rounded-2xl border border-[#26324c] bg-[#141d2e] p-4">
          <p className="text-sm font-bold text-[#94a3b8]">
            Dog of the Day is temporarily unavailable. We couldn’t confirm a live adoption listing. Please try again.
          </p>
          <button
            type="button"
            onClick={() => { setState("loading"); setOffset(0); setRetry((r) => r + 1); }}
            className="mt-3 min-h-14 rounded-xl border border-[#26324c] px-4 py-3 text-sm font-black text-[#2DD4BF]"
          >
            Retry Dog of the Day
          </button>
          <Link href="/today" className="ml-3 inline-flex min-h-11 items-center text-sm font-bold text-[#2DD4BF]">Open today’s page →</Link>
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-11 w-full rounded-lg border border-[#26324c] bg-[#141d2e] px-3 py-2 text-base font-bold text-[#e8edf5]"
      >
        {options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}
      </select>
    </label>
  );
}

// Search settings come back on a return visit — this device only, never
// the visitor's location.
const FIND_SETTINGS_KEY = "dcmt-find";

function FindDogs() {
  const [zip, setZip] = useState("63040");
  const [miles, setMiles] = useState(50);
  const [picks, setPicks] = useState("222");
  const [prefs, setPrefs] = useState<FindPrefs>(NO_FILTERS);
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
  const matches = dogs ? sortDogs(dogs.filter((d) => matchesFilters(d, prefs)), prefs.sort) : null;
  const visibleDogs = picks === "all" ? matches : matches?.slice(0, Number(picks));
  const detailDest = detail ? resolveDogDestination(detail) : null;
  const petfinderUrl = `https://www.petfinder.com/search/dogs-for-adoption/?location=${clean}&distance=${miles}`;
  const adoptapetUrl = `https://www.adoptapet.com/dog-adoption/${clean}`;
  const setPref = (key: keyof FindPrefs) => (value: string) => setPrefs((current) => ({ ...current, [key]: value }));

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

  // Ask the browser for the visitor's location only when they tap the button.
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
      className="ml-2 inline-flex min-h-11 items-center font-black text-[#2DD4BF] underline-offset-4 hover:underline"
    >
      Clear filters
    </button>
  );

  return (
    <div>
      <form
        aria-label="Find adoptable dogs"
        onSubmit={(event) => { event.preventDefault(); setNear(null); setRefresh((value) => value + 1); }}
        className="grid grid-cols-2 items-end gap-3 rounded-xl border border-[#26324c] bg-[#0b1220] p-3 sm:grid-cols-4"
      >
        <label className="min-w-0 text-xs font-bold text-[#94a3b8]">
          ZIP code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={zip}
            onChange={(e) => { setZip(e.target.value); setNear(null); }}
            pattern="[0-9]{5}"
            required
            maxLength={5}
            aria-label="ZIP code"
            className="mt-1 min-h-11 w-full rounded-lg border border-[#26324c] bg-[#141d2e] px-3 py-2 text-base font-bold text-[#e8edf5]"
          />
        </label>
        <label className="min-w-0 text-xs font-bold text-[#94a3b8]">
          Distance
          <select
            aria-label="Distance"
            value={miles}
            onChange={(e) => setMiles(Number(e.target.value))}
            className="mt-1 min-h-11 w-full rounded-lg border border-[#26324c] bg-[#141d2e] px-3 py-2 text-base font-bold text-[#e8edf5]"
          >
            {RADIUS_OPTIONS.map((m) => <option key={m} value={m}>{m} miles</option>)}
          </select>
        </label>
        <label className="min-w-0 text-xs font-bold text-[#94a3b8]">
          How many dogs
          <select
            aria-label="How many dogs"
            value={picks}
            onChange={(e) => setPicks(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-[#26324c] bg-[#141d2e] px-3 py-2 text-base font-bold text-[#e8edf5]"
          >
            <option value="22">22 dogs</option>
            <option value="222">222 dogs</option>
            <option value="all">All dogs</option>
          </select>
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-[#2DD4BF] px-4 py-2 text-sm font-black text-[#0b1220]"
        >
          Update dogs
        </button>
        <button
          type="button"
          onClick={searchNearMe}
          disabled={locating}
          aria-pressed={Boolean(near)}
          className="col-span-2 min-h-11 rounded-lg border border-[#26324c] bg-[#141d2e] px-4 py-2 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] disabled:opacity-60 sm:col-span-4"
        >
          {locating ? "Finding you…" : near ? "📍 Showing dogs near you" : "📍 Use my location"}
        </button>
      </form>
      {locNote && <p role="status" className="mt-2 text-xs font-bold text-amber-300">{locNote}</p>}

      <div role="group" aria-label="Narrow the list" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <FilterSelect label="Size" value={prefs.size} onChange={setPref("size")} options={FILTER_OPTIONS.size} />
        <FilterSelect label="Age" value={prefs.age} onChange={setPref("age")} options={FILTER_OPTIONS.age} />
        <FilterSelect label="Sex" value={prefs.sex} onChange={setPref("sex")} options={FILTER_OPTIONS.sex} />
        <FilterSelect label="Good with" value={prefs.goodWith} onChange={setPref("goodWith")} options={FILTER_OPTIONS.goodWith} />
        <FilterSelect label="Sort" value={prefs.sort} onChange={setPref("sort")} options={FILTER_OPTIONS.sort} />
      </div>

      <p className="mt-3 text-xs font-semibold text-[#94a3b8]">
        {status === "ok" && widened ? (
          <>
            Every dog below links straight to its own adoption page. That took looking{" "}
            <strong className="text-[#e8edf5]">out to {effectiveMiles} miles</strong> — fewer than {miles} miles had enough dogs with a verified direct link.
          </>
        ) : (
          <>
            Real adoptable dogs <strong className="text-[#e8edf5]">within {miles} miles of {near ? "you" : "your ZIP"}</strong> — live from the rescues themselves, every one linking straight to its own adoption page.
          </>
        )}
        {prefs.goodWith && " “Good with” only shows dogs whose rescue says so."}
      </p>

      {!clean && !near && <p role="status" className="mt-3 text-sm text-[#94a3b8]">Enter a five-digit ZIP code to see nearby dogs.</p>}

      {/* Live adoptable dogs near the ZIP (dogs only). */}
      {status === "loading" && (clean || near) && (
        <p className="mt-5 rounded-2xl border border-[#26324c] bg-[#141d2e] px-5 py-6 text-center text-sm font-bold text-[#94a3b8]">
          Fetching good dogs near {near ? "you" : clean}…
        </p>
      )}
      <section aria-label="Adoptable dogs" aria-live="polite" aria-busy={status === "loading"}>
        {status === "ok" && dogs && matches && visibleDogs && (
          <>
            <p className="mt-4 text-sm font-semibold text-[#94a3b8]">
              {filtered
                ? `${matches.length} of ${dogs.length} dogs match.`
                : `Showing ${visibleDogs.length} of ${dogs.length} dogs.`}
              {visibleDogs.length < matches.length && " Choose All dogs above to see every match."}
              {filtered && clearFilters}
            </p>
            {matches.length === 0 && (
              <p className="mt-3 rounded-2xl border border-[#26324c] bg-[#141d2e] px-5 py-6 text-center text-sm font-bold text-[#94a3b8]">
                No dogs match those filters right now. Try fewer filters or a longer distance.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleDogs.map((d) => (
                <DogTile key={d.id} dog={d} onOpen={() => { setDetail(d); setPhotoIdx(0); }} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* In-page dog detail — meet them without leaving tom.com */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`About ${detail.name}`}
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#26324c] bg-[#141d2e]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {detail.photos.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.photos[photoIdx]} alt={detail.name} className="h-80 w-full bg-[#0b1220] object-contain" />
              ) : (
                <div className="flex h-72 w-full items-center justify-center bg-[#0b1220] text-6xl">🐶</div>
              )}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDetail(null)}
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-lg font-black text-white"
              >
                ✕
              </button>
              {detail.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => setPhotoIdx((photoIdx + detail.photos.length - 1) % detail.photos.length)}
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg font-black text-white"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setPhotoIdx((photoIdx + 1) % detail.photos.length)}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg font-black text-white"
                  >
                    ›
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
                    {photoIdx + 1}/{detail.photos.length}
                  </span>
                </>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-2xl font-black text-[#e8edf5]">
                {detailDest?.type === "exact-dog" ? (
                  <a
                    href={detailDest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={detailDest.ariaLabel}
                    className="transition hover:text-[#5eead4]"
                  >
                    {detail.name} <span className="text-base text-[#2DD4BF]">↗</span>
                  </a>
                ) : (
                  detail.name
                )}
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#94a3b8]">
                {detail.breed}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#94a3b8]">
                {detail.org}{detail.orgCity ? ` · ${detail.orgCity}` : ""}
                {detail.distance !== null && (
                  <span className="text-[#5eead4]"> · {Math.round(detail.distance)} mi away</span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[detail.age, detail.sex, detail.size, ...detail.facts, listedSinceLabel(detail.listedAt)].filter(Boolean).map((f) => (
                  <span key={f} className="rounded-full border border-[#26324c] bg-[#0b1220] px-3 py-1 text-xs font-bold text-[#e8edf5]">
                    {f}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3">
                {detailDest && detailDest.type !== "none" && (
                  <a
                    href={detailDest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={detailDest.ariaLabel}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#2DD4BF] px-6 py-3.5 text-sm font-black text-[#0b1220] transition hover:opacity-90"
                  >
                    {detailDest.type === "exact-dog" ? `Meet ${detail.name}` : detailDest.label} ↗
                  </a>
                )}
                {detail.email && (
                  <a
                    href={rescueEmailHref(detail, detailDest)}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
                  >
                    💌 Email the rescue about {detail.name}
                  </a>
                )}
                <p className="text-xs font-semibold leading-5 text-[#94a3b8]">
                  {detail.org || "The rescue"} handles the adoption. Most rescues start with a short application, then a call or a visit to meet the dog.
                </p>
                {detail.desc && (
                  <p className="mt-1 whitespace-pre-line text-sm font-medium leading-6 text-[#94a3b8]">
                    {detail.desc}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ShareMenu
                    label={`📣 Share ${detail.name}`}
                    title={`Meet ${detail.name} 🐶`}
                    text={`Meet ${detail.name} — ${detail.breed}, ${detail.distance !== null ? `${Math.round(detail.distance)} miles away ` : ""}with ${detail.org}. Real adoptable dog looking for a home!`}
                    url={`https://dontclonemetom.com/dogs/${detail.id}`}
                    photo={detail.photo}
                    imgLines={[detail.breed, [detail.age, detail.sex].filter(Boolean).join(" · ") + (detail.org ? ` · ${detail.org}` : "")]}
                    className="flex w-full items-center justify-center rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
                  />
                  <Link
                    href={`/cards?dog=${detail.id}`}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3.5 text-sm font-black text-[#2DD4BF] transition hover:border-[#2DD4BF]"
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
        <p className="mt-5 rounded-2xl border border-[#26324c] bg-[#141d2e] px-5 py-6 text-center text-sm font-bold text-[#94a3b8]">
          No dogs loaded {near ? "near you" : `for ${clean}`} right now — use the searches below, every dog there is real and nearby.
        </p>
      )}

      {/* Optional: even more dogs without leaving the page (St. Louis widget). */}
      {!showMore ? (
        <button
          onClick={() => setShowMore(true)}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#26324c] bg-[#141d2e] px-5 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
        >
          <span>🐾 Show even more St. Louis rescue dogs — right here</span>
          <span className="text-[#94a3b8]">▼</span>
        </button>
      ) : (
        <div
          className="mt-4 rounded-2xl bg-white p-1"
          dangerouslySetInnerHTML={{
            __html:
              `<pet-scroller s3Url="https://dbw3zep4prcju.cloudfront.net/" apiBase="https://psl.petfinder.com/graphql" organization='${JSON.stringify(LOCAL_RESCUE_ORGS)}' status="adoptable" petfinderUrl="https://www.petfinder.com/" type='["dog"]' hideBreed="false" limit="24" petListTitle=""></pet-scroller>`,
          }}
        />
      )}

      {/* Still looking? Two more national networks (honor the ZIP + radius). */}
      <p className="mb-2 mt-5 text-xs font-black uppercase tracking-[0.12em] text-[#94a3b8]">
        Still looking? Two more big adoption networks:
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <a
          href={petfinderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-[#26324c] bg-[#141d2e] px-5 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
        >
          <span>Petfinder</span>
          <span className="text-[#94a3b8]">→</span>
        </a>
        <a
          href={adoptapetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-[#26324c] bg-[#141d2e] px-5 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
        >
          <span>Adopt-a-Pet</span>
          <span className="text-[#94a3b8]">→</span>
        </a>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="homepage min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <div className="mx-auto max-w-3xl px-5 py-5">

        {/* Isaiah is the compact brand face, followed immediately by the daily feature. */}
        <section aria-labelledby="brand-heading" className="text-center mb-5">
          <Link
            href="/dogs/isaiah"
            aria-label="Isaiah the Batdog, the DontCloneMeTom.com brand dog"
            className="group mx-auto flex w-fit flex-col items-center rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2DD4BF]"
          >
            {/* The established face crop keeps both eyes and ears in frame. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/isaiah-icon.jpg"
              alt="Isaiah, the black-and-white Batdog, looking right at you"
              width={120}
              height={120}
              fetchPriority="high"
              className="h-24 w-24 rounded-full border-[3px] border-[#2DD4BF] object-cover shadow-[0_0_40px_#2dd4bf18] sm:h-[120px] sm:w-[120px]"
              style={{ objectPosition: "50% 25%" }}
            />
            <span className="mt-2 text-base font-black text-[#e8edf5] sm:text-lg">ISAIAH</span>
            <span className="mt-1 text-xs font-bold text-[#2DD4BF]">BATDOG • THE DARK ZAY</span>
          </Link>
          <h1
            id="brand-heading"
            className="mt-3 font-black leading-tight tracking-tight"
            style={{ fontSize: "clamp(1.4rem, 6.2vw, 2.75rem)" }}
          >
            <span className="text-[#e8edf5]">DontCloneMeTom</span>
            <span className="text-[#2DD4BF]">.com</span>
          </h1>
          <p className="mt-2 text-xl font-bold text-[#e8edf5] sm:text-2xl">
            Don’t clone me. Rescue me.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#94a3b8] sm:text-base">
            Real dogs near you need homes today. Each one links straight to its rescue.
          </p>
          <a
            href="#find"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#2DD4BF] px-6 py-2.5 text-sm font-black text-[#0b1220] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DD4BF]"
          >
            Find dogs near me
          </a>
        </section>

        <DogOfTheDay />

        {/* Live adoptable dogs by ZIP */}
        <section id="find" className="mb-6 rounded-2xl border border-[#2DD4BF]/30 bg-[#141d2e] p-4 sm:p-6">
          <h2 className="text-2xl font-black text-[#e8edf5] mb-2">Find a dog near you.</h2>
          <p className="text-sm font-semibold text-[#94a3b8] mb-5">
            Type your ZIP or use your location. Tap any dog to go straight to their rescue.
          </p>
          <FindDogs />
        </section>

        {/* How adopting works */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#2DD4BF] mb-3">How adopting works</h2>
          <ul className="space-y-2 text-sm font-semibold leading-6 text-[#94a3b8]">
            <li>🐾 Every dog here is listed by a <strong className="text-[#e8edf5]">real rescue or shelter</strong>, live from RescueGroups.org. Tap a dog to open their own listing on the rescue&apos;s site.</li>
            <li>🐾 You adopt <strong className="text-[#e8edf5]">through that rescue</strong>. Most start with a short application, then a call or a visit to meet the dog.</li>
            <li>🐾 Fees, timing and the right match are up to each rescue — their listing is the place to check.</li>
            <li>🐾 Want more choices? <strong className="text-[#e8edf5]">Petfinder</strong> and <strong className="text-[#e8edf5]">Adopt-a-Pet</strong> list even more dogs near your ZIP.</li>
          </ul>
          <p className="mt-4 text-xs font-bold text-[#94a3b8]">We don&apos;t replace rescues or shelters. We help people find them. Adopt. Foster. Share.</p>
        </section>

        {/* Thank you, Tom */}
        <section className="mb-10 rounded-2xl border border-[#2DD4BF]/25 bg-[#141d2e] p-8 text-center">
          <div className="mb-3 text-3xl" aria-hidden>🤍🐾</div>
          <h2 className="mb-3 text-2xl font-black text-[#e8edf5] sm:text-3xl">Thank you, Tom Brady.</h2>
          <p className="mx-auto max-w-md text-base font-bold leading-8 text-[#2DD4BF]">
            You showed the world how much a dog can mean.<br />
            We love you for it — now let&apos;s love a few million more.
          </p>
        </section>

        {/* Share */}
        <section
          id="share-real-dogs"
          className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6"
        >
          <h2 className="text-2xl font-black text-[#e8edf5] mb-3">Pass it on.</h2>
          <p className="text-sm font-semibold leading-7 text-[#94a3b8] mb-5">
            Can&apos;t adopt right now? Sharing this helps a dog near someone else get noticed. That counts too.
          </p>
          <ShareMenu
            label="📣 Share"
            title="Good dogs near you 🐶"
            text="Good dogs looking for homes near you — real adoptable dogs, right on the page. Take a look:"
            url="https://dontclonemetom.com"
            imgLines={["Real adoptable dogs by ZIP, right on the page.", "Adopt. Foster. Share."]}
            className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#0b1220] px-5 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-[#2DD4BF] hover:border-[#2DD4BF] transition"
          />
        </section>

        {/* Shareable Lines */}
        <section className="mb-10">
          <h2 className="text-xl font-black text-[#e8edf5] mb-2">Share These Lines</h2>
          <p className="text-sm font-semibold text-[#94a3b8] mb-5">Tap any line to copy it.</p>
          <div className="flex flex-col gap-3">
            {shareLines.map((line) => (
              <ShareCard key={line} line={line} />
            ))}
          </div>
        </section>

        {/* Find Dogs */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <h2 className="text-xl font-black text-[#e8edf5] mb-4">More ways to help.</h2>
          <div className="flex flex-col gap-3">
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
              <details key={cat.label} className="group rounded-xl border border-[#26324c] bg-[#0b1220] px-5 py-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-[#e8edf5]">
                  <span>{cat.emoji} {cat.label}</span>
                  <span className="text-[#94a3b8] transition group-open:rotate-180">▾</span>
                </summary>
                <div className="mt-3 flex flex-col gap-2.5 border-t border-[#26324c] pt-3">
                  {cat.links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-[#2DD4BF] transition hover:text-[#5eead4] hover:underline"
                    >
                      {l.label} →
                    </a>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold text-[#94a3b8]">
            Can&apos;t adopt? Share this page. That counts too.
          </p>
        </section>

        {/* Sources */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <h2 className="text-lg font-black text-[#e8edf5] mb-4">Sources &amp; Context</h2>
          <ul className="space-y-3 text-xs font-semibold text-[#94a3b8] list-disc list-inside leading-6">
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
          <p className="mt-4 text-xs text-[#94a3b8]">
            All information is presented factually and neutrally. No claims are made beyond
            publicly available reporting.
          </p>
        </section>

        {/* Disclaimer */}
        <section className="rounded-2xl border border-[#26324c] bg-[#141d2e] p-5 mb-6">
          <p className="text-xs font-semibold leading-6 text-[#94a3b8]">
            <strong className="text-[#94a3b8]">Disclaimer:</strong> DontCloneMeTom.com is an
            independent dog-rescue awareness project. It is not affiliated with, sponsored by, or
            endorsed by Tom Brady, Colossal Biosciences, ViaGen Pets, the NFL, the New England
            Patriots, the Tampa Bay Buccaneers, or any related trademark owner. No celebrity
            endorsement is claimed or implied.
          </p>
        </section>

      </div>
    </main>
  );
}
