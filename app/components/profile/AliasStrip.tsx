"use client";

import { useEffect, useState } from "react";

// Rotating "also known as" line — cycles through the aliases one at a time.
// Renders the first alias on the server so print and no-JS still read fine.
export default function AliasStrip({ aliases, accent }: { aliases: string[]; accent: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (aliases.length < 2) return;
    const iv = setInterval(() => setIdx((i) => (i + 1) % aliases.length), 2000);
    return () => clearInterval(iv);
  }, [aliases.length]);

  if (aliases.length === 0) return null;
  return (
    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#94a3b8]" aria-live="off">
      a.k.a. <span style={{ color: accent }}>{aliases[idx]}</span>
    </p>
  );
}
