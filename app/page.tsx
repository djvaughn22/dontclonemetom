"use client";

import { useEffect, useState } from "react";

const shareLines = [
  "There’s a good dog near you looking for a home.",
  "Adopt if you can. Foster if you can. Share if you can.",
  "Every share helps one more dog get seen.",
  "Rescue first. Real dogs, real homes.",
  "Don’t clone me. Adopt me.",
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

type Dog = {
  id: string;
  name: string;
  breed: string;
  age: string;
  sex: string;
  size: string;
  photo: string | null;
  photos: string[];
  city: string;
  distance: number | null;
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

function FindDogs() {
  const [zip, setZip] = useState("63040");
  const [miles, setMiles] = useState(50);
  const [dogs, setDogs] = useState<Dog[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "fallback">("loading");
  const [showMore, setShowMore] = useState(false);
  const [detail, setDetail] = useState<Dog | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [pendingDog, setPendingDog] = useState<string | null>(null);

  // Shared dog links land here: /?zip=63040&miles=50&dog=123 reopens that dog.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const z = sp.get("zip"), m = sp.get("miles"), d = sp.get("dog");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL params are client-only; read after mount so hydration matches
    if (z && /^\d{5}$/.test(z)) setZip(z);
    if (m && RADIUS_OPTIONS.includes(parseInt(m, 10))) setMiles(parseInt(m, 10));
    if (d) setPendingDog(d);
  }, []);
  useEffect(() => {
    if (!pendingDog || !dogs) return;
    const d = dogs.find((x) => x.id === pendingDog);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply the pending deep-linked dog once the list arrives
    if (d) { setDetail(d); setPhotoIdx(0); }
    setPendingDog(null);
  }, [dogs, pendingDog]);

  const clean = zip.match(/\d{5}/)?.[0] ?? "63040";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://dontclonemetom.com";
  const petfinderUrl = `https://www.petfinder.com/search/dogs-for-adoption/?location=${clean}&distance=${miles}`;
  const adoptapetUrl = `https://www.adoptapet.com/dog-adoption/${clean}`;
  const openNearMe = () => window.open(petfinderUrl, "_blank", "noopener,noreferrer");

  // Live dogs near the typed ZIP (RescueGroups.org, chosen radius).
  // Falls back to the search links below if the API is unavailable.
  useEffect(() => {
    let dead = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch effect: show the loading state for the request this effect starts
    setStatus("loading");
    const t = setTimeout(() => {
      fetch(`/api/adoptable-pets?zip=${clean}&miles=${miles}`)
        .then((r) => r.json())
        .then((j) => {
          if (dead) return;
          if (j?.dogs?.length) {
            setDogs(j.dogs);
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
    };
  }, [clean, miles]);

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

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          inputMode="numeric"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") openNearMe(); }}
          maxLength={5}
          aria-label="ZIP code"
          placeholder="ZIP code"
          className="w-full rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3 text-base font-bold text-[#e8edf5] placeholder-[#94a3b8] focus:border-[#2DD4BF] focus:outline-none sm:w-40"
        />
        <button
          onClick={openNearMe}
          className="inline-flex justify-center rounded-xl bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#0b1220] transition hover:opacity-90"
        >
          🐶 Find dogs near me
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-[#94a3b8]">Within</span>
        {RADIUS_OPTIONS.map((m) => (
          <button
            key={m}
            onClick={() => setMiles(m)}
            className={
              "rounded-full border px-3.5 py-1.5 text-xs font-black transition " +
              (miles === m
                ? "border-[#2DD4BF] bg-[#2DD4BF] text-[#0b1220]"
                : "border-[#26324c] bg-[#0b1220] text-[#94a3b8] hover:border-[#2DD4BF]")
            }
          >
            {m} mi
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-[#94a3b8]">
        Real adoptable dogs <strong className="text-[#e8edf5]">within {miles} miles of your ZIP</strong> — live from the rescues themselves. Tap a dog to meet them.
      </p>

      {/* Live adoptable dogs near the ZIP (dogs only). */}
      {status === "loading" && (
        <p className="mt-5 rounded-2xl border border-[#26324c] bg-[#141d2e] px-5 py-6 text-center text-sm font-bold text-[#94a3b8]">
          Fetching good dogs near {clean}…
        </p>
      )}
      {status === "ok" && dogs && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {dogs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => { setDetail(d); setPhotoIdx(0); }}
              className="overflow-hidden rounded-2xl border border-[#26324c] bg-[#141d2e] text-left transition hover:border-[#2DD4BF]"
            >
              {d.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.photo} alt={d.name} loading="lazy" className="h-40 w-full object-cover" style={{ objectPosition: "50% 25%" }} />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-[#0b1220] text-4xl">🐶</div>
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
              </div>
            </button>
          ))}
        </div>
      )}

      {/* In-page dog detail — meet them without leaving tom.com */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setDetail(null)}
        >
          <div
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
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg font-black text-white"
              >
                ✕
              </button>
              {detail.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => setPhotoIdx((photoIdx + detail.photos.length - 1) % detail.photos.length)}
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg font-black text-white"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setPhotoIdx((photoIdx + 1) % detail.photos.length)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-lg font-black text-white"
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
              <h3 className="text-2xl font-black text-[#e8edf5]">{detail.name}</h3>
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
                {[detail.age, detail.sex, detail.size, ...detail.facts].filter(Boolean).map((f) => (
                  <span key={f} className="rounded-full border border-[#26324c] bg-[#0b1220] px-3 py-1 text-xs font-bold text-[#e8edf5]">
                    {f}
                  </span>
                ))}
              </div>
              {detail.desc && (
                <p className="mt-4 whitespace-pre-line text-sm font-medium leading-6 text-[#94a3b8]">
                  {detail.desc}
                </p>
              )}
              <div className="mt-5 flex flex-col gap-3">
                {detail.email && (
                  <a
                    href={`mailto:${detail.email}?subject=${encodeURIComponent(`Asking about ${detail.name} 🐶`)}&body=${encodeURIComponent(`Hi ${detail.org},\n\nI saw ${detail.name} on DontCloneMeTom.com and would love to learn more!\n\nThank you!`)}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#2DD4BF] px-6 py-3.5 text-sm font-black uppercase tracking-[0.12em] text-[#0b1220] transition hover:opacity-90"
                  >
                    💌 Ask about {detail.name}
                  </a>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <ShareMenu
                    label={`📣 Share ${detail.name}`}
                    title={`Meet ${detail.name} 🐶`}
                    text={`Meet ${detail.name} — ${detail.breed}, ${detail.distance !== null ? `${Math.round(detail.distance)} miles away ` : ""}with ${detail.org}. Real adoptable dog looking for a home!`}
                    url={`${origin}/?zip=${clean}&miles=${miles}&dog=${detail.id}`}
                    photo={detail.photo}
                    imgLines={[detail.breed, [detail.age, detail.sex].filter(Boolean).join(" · ") + (detail.org ? ` · ${detail.org}` : "")]}
                    className="flex w-full items-center justify-center rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
                  />
                  <a
                    href={detail.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3.5 text-sm font-black text-[#e8edf5] transition hover:border-[#2DD4BF] hover:text-[#5eead4]"
                  >
                    <span className="truncate">{detail.url.includes("AnimalID=") ? `${detail.name}’s listing` : "Visit the rescue"}</span>
                    <span className="ml-2 text-[#94a3b8]">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {status === "fallback" && (
        <p className="mt-5 rounded-2xl border border-[#26324c] bg-[#141d2e] px-5 py-6 text-center text-sm font-bold text-[#94a3b8]">
          No dogs loaded for {clean} right now — use the searches below, every dog there is real and nearby.
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
      <div className="grid grid-cols-2 gap-3">
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

export default function DontCloneMeTom() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <div className="mx-auto max-w-3xl px-5 py-10">

        {/* Hero — the domain is the whole hook (…Tom.com) */}
        <section className="text-center mb-10">
          <div className="mb-4 flex justify-center">
            <img
              src="/isaiah-icon.jpg"
              alt="A rescued dog"
              width={128}
              height={128}
              className="rounded-full"
              style={{
                width: 128,
                height: 128,
                border: "3px solid #2DD4BF",
                boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              }}
            />
          </div>
          <h1
            className="font-black leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(1.4rem, 7vw, 3.75rem)" }}
          >
            <span className="text-[#e8edf5]">DontCloneMeTom</span>
            <span className="text-[#2DD4BF]">.com</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base font-bold text-[#2DD4BF] sm:text-lg">
            Good boys and girls near you
            <br />
            looking for good homes
          </p>
          <p className="mx-auto mb-8 mt-2 max-w-sm text-sm font-semibold text-[#94a3b8]">
            Real, adoptable, and closer than you think.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#find"
              className="inline-flex justify-center rounded-full bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#0b1220] hover:opacity-90 transition"
            >
              See dogs near me
            </a>
            <a
              href="#share-real-dogs"
              className="inline-flex justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-[#e8edf5] hover:border-[#26324c] transition"
            >
              Share
            </a>
          </div>
          {/* The rescue behind the face above. */}
          <a
            href="https://home2homecanineorphanage.org/adopt"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-4 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-[#2DD4BF]/40 bg-[#141d2e] px-5 py-3.5 text-left transition hover:border-[#2DD4BF]"
          >
            <span className="text-sm font-bold leading-6 text-[#e8edf5]">
              🏠 This good boy came from <strong className="text-[#2DD4BF]">Home 2 Home Canine Orphanage</strong> — near St. Louis? Meet their dogs.
            </span>
            <span className="text-[#2DD4BF] font-black">→</span>
          </a>
        </section>

        {/* Live adoptable dogs by ZIP */}
        <section id="find" className="mb-6 rounded-2xl border border-[#2DD4BF]/30 bg-[#141d2e] p-6">
          <h2 className="text-2xl font-black text-[#e8edf5] mb-2">Find a dog near you.</h2>
          <p className="text-sm font-semibold text-[#94a3b8] mb-5">
            Start at 63040 or type your ZIP to see adoptable dogs nearby.
          </p>
          <FindDogs />
        </section>

        {/* Why this source */}
        <section className="mb-10 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2DD4BF] mb-3">Why these sources?</p>
          <ul className="space-y-2 text-sm font-semibold leading-6 text-[#94a3b8]">
            <li>🐾 We send you to adoptable dogs <strong className="text-[#e8edf5]">within 50, 100, or 250 miles of your ZIP</strong> — you pick — on <strong className="text-[#e8edf5]">Petfinder</strong> and <strong className="text-[#e8edf5]">Adopt-a-Pet</strong>, both original adoption sources, so every dog is one you could actually go meet.</li>
            <li>🐾 Photos and details come from real rescue and shelter partners on those sites.</li>
            <li>🐾 The live dog cards come from <strong className="text-[#e8edf5]">RescueGroups.org</strong>. Each card links to that dog&apos;s own listing when the rescue publishes one; some rescues don&apos;t, so those cards link to the rescue&apos;s adoptable-dogs page or website instead.</li>
            <li>🐾 You adopt through the <strong className="text-[#e8edf5]">original organization</strong> — we just help you find them.</li>
          </ul>
          <p className="mt-4 text-xs font-bold text-[#94a3b8]">We don&apos;t replace rescues or shelters. We help people find them. Adopt. Foster. Share. Don&apos;t clone.</p>
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
            imgLines={["Real adoptable dogs by ZIP, right on the page.", "Adopt. Foster. Share. Don't clone."]}
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
                  { label: "How to foster a dog (Humane Society)", href: "https://www.humanesociety.org/resources/how-foster-dog" },
                  { label: "Foster with Best Friends", href: "https://bestfriends.org/adopt-or-foster/foster" },
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
