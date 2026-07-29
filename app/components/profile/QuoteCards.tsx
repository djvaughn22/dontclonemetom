"use client";

import { useState } from "react";

// Tap-to-copy quote cards — same pattern as the homepage share lines.
export default function QuoteCards({ quotes }: { quotes: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(line: string) {
    navigator.clipboard.writeText(line).then(() => {
      setCopied(line);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  if (quotes.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {quotes.map((line) => (
        <button
          key={line}
          type="button"
          onClick={() => copy(line)}
          className="block rounded-2xl border border-[#26324c] bg-[#141d2e] px-5 py-4 text-left transition hover:border-[#2DD4BF]"
        >
          <p className="text-sm font-semibold leading-6 text-[#e8edf5]">&ldquo;{line}&rdquo;</p>
          <p className="no-print mt-2 text-xs font-black uppercase tracking-[0.18em] text-[#94a3b8]">
            {copied === line ? "Copied!" : "Tap to copy"}
          </p>
        </button>
      ))}
    </div>
  );
}
