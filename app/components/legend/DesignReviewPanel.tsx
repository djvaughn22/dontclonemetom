"use client";

import { useEffect, useState } from "react";
import { classifyRights } from "../../lib/identity/rights";
import { reviseDesign, type DesignSpecV1 } from "../../lib/identity/designSpec";
import { loadDesigns } from "./LegendStudio";

// Owner review tools for saved design specs: rights classification, poster
// readiness, watermark state, notes, and the revision audit trail. Reads
// designs from THIS device's localStorage (plus pasted JSON) — customer
// browsers keep their own; nothing is ever uploaded.

const NOTES_KEY = "dcmt-design-notes-v1";

function loadNotes(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(NOTES_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function persistAll(designs: DesignSpecV1[]) {
  try {
    window.localStorage.setItem("dcmt-designs-v1", JSON.stringify(designs.slice(0, 20)));
  } catch {
    // storage blocked
  }
}

export default function DesignReviewPanel() {
  const [designs, setDesigns] = useState<DesignSpecV1[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  // localStorage is only readable after mount; reading it during render
  // would break hydration, so this one-time setState is deliberate.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesigns(loadDesigns());
    setNotes(loadNotes());
  }, []);

  function saveNote(id: string, text: string) {
    const next = { ...notes, [id]: text };
    setNotes(next);
    try {
      window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
    } catch {
      // storage blocked
    }
  }

  function importPasted() {
    setPasteError(null);
    try {
      const parsed = JSON.parse(pasted) as DesignSpecV1;
      if (parsed?.version !== 1 || !parsed.designId || !parsed.heroName) {
        setPasteError("Not a valid v1 design spec.");
        return;
      }
      const noted = reviseDesign(parsed, {}, "Imported for owner review");
      const next = [noted, ...designs.filter((d) => d.designId !== noted.designId)];
      setDesigns(next);
      persistAll(next);
      setPasted("");
    } catch {
      setPasteError("Could not parse that JSON.");
    }
  }

  return (
    <>
      <section className="mt-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">Import a design for review</p>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={3}
          placeholder="Paste a design spec JSON here"
          aria-label="Paste a design spec JSON"
          className="w-full rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3 text-xs font-semibold text-[#e8edf5] placeholder-[#94a3b8] focus:border-[#2DD4BF] focus:outline-none"
        />
        {pasteError && <p className="mt-1 text-xs font-bold text-[#94a3b8]">{pasteError}</p>}
        <button type="button" onClick={importPasted} disabled={!pasted.trim()} className="mt-2 rounded-xl border border-[#26324c] px-4 py-2 text-sm font-black text-[#e8edf5] hover:border-[#2DD4BF] disabled:opacity-40">
          Import
        </button>
      </section>

      <section className="mt-6">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">
          Saved designs on this device ({designs.length})
        </p>
        {designs.length === 0 && (
          <p className="text-sm font-semibold text-[#94a3b8]">None yet. Designs made in the Legend Studio on this device appear here.</p>
        )}
        <div className="flex flex-col gap-4">
          {designs.map((d) => {
            const rights = classifyRights(d.heroName);
            const posterReady = !!(d.realName && d.heroName);
            return (
              <div key={d.designId} className="rounded-2xl border border-[#26324c] bg-[#141d2e] p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-base font-black text-[#e8edf5]">{d.heroName}</p>
                  <code className="text-[10px] font-bold text-[#94a3b8]">{d.designId}</code>
                </div>
                <p className="mt-1 text-xs font-semibold text-[#94a3b8]">
                  Real name: <strong className="text-[#e8edf5]">{d.realName}</strong>
                  {d.subtitle ? <> · subtitle: {d.subtitle}</> : null} · watermark: <strong className="text-[#e8edf5]">{d.watermark}</strong> · poster {posterReady ? "ready" : "incomplete"} · products: {d.productIds.length ? d.productIds.join(", ") : "none mapped"}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#94a3b8]">
                  Rights: <strong className="text-[#e8edf5]">{rights.risk}</strong> — {rights.reason}
                </p>
                {d.facts.length > 0 && (
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#94a3b8]">
                    Owner-confirmed facts: {d.facts.map((f) => `${f.text} (${f.source})`).join(" · ")}
                  </p>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-black text-[#94a3b8]">Audit trail ({d.revisions.length})</summary>
                  <ul className="mt-1 space-y-1 text-[11px] font-semibold text-[#94a3b8]">
                    {d.revisions.map((r, i) => (
                      <li key={i}>
                        {new Date(r.at).toLocaleString()} — {r.note}
                      </li>
                    ))}
                  </ul>
                </details>
                <textarea
                  value={notes[d.designId] ?? ""}
                  onChange={(e) => saveNote(d.designId, e.target.value)}
                  rows={2}
                  placeholder="Manual-review notes (kept on this device)"
                  aria-label={`Review notes for ${d.heroName}`}
                  className="mt-3 w-full rounded-xl border border-[#26324c] bg-[#0b1220] px-3 py-2 text-xs font-semibold text-[#e8edf5] placeholder-[#94a3b8] focus:border-[#2DD4BF] focus:outline-none"
                />
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
