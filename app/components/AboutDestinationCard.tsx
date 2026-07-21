"use client";

import { useState, type CSSProperties } from "react";
import {
  liveDestinations,
  type DestinationCardContent,
  type ProjectDestination,
} from "../lib/destinations";

// ─────────────────────────────────────────────────────────────────────────────
// AboutDestinationCard — the one quiet destination container for the lower
// part of the About page. Generic by design: it renders whatever configured
// content it is given; nothing site- or destination-specific may be
// hard-coded here (configuration lives in src/lib/destinations.ts).
//
// Share behavior: native Web Share first; a canceled share is quiet, never an
// error. Fallback copies the message and link; if copying is blocked the
// address itself is shown, so an action always works. Results are announced
// through an aria-live region.
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = "#2DD4BF";

function isShareCancel(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: unknown }).name;
  return name === "AbortError" || name === "NotAllowedError";
}

const actionBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  borderRadius: 999,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
};

function DestinationLink({
  destination,
  primary,
}: {
  destination: ProjectDestination;
  primary: boolean;
}) {
  const style: CSSProperties = primary
    ? { ...actionBase, background: ACCENT, color: "#06231e", textDecoration: "none" }
    : {
        ...actionBase,
        padding: "10px 4px",
        color: ACCENT,
        textDecoration: "underline",
        textUnderlineOffset: 4,
      };
  return (
    <a
      href={destination.href}
      {...(destination.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      style={style}
    >
      <span style={{ minWidth: 0, overflowWrap: "break-word" }}>
        {destination.label}
      </span>
    </a>
  );
}

export default function AboutDestinationCard({
  card,
}: {
  card: DestinationCardContent;
}) {
  const [status, setStatus] = useState("");
  const destinations = liveDestinations(card.destinations);
  if (destinations.length === 0) return null;
  const [primary, ...secondary] = destinations;

  async function onShare() {
    const share = card.share;
    if (!share) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: share.title,
          text: share.text,
          url: share.url,
        });
        setStatus("");
        return;
      } catch (error) {
        // Backing out of the native share sheet is a choice, not a failure.
        if (isShareCancel(error)) return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${share.text}\n${share.url}`);
      setStatus("Copied — paste it anywhere.");
    } catch {
      setStatus(`Copying is blocked here. The address is ${share.url}`);
    }
  }

  return (
    <section
      aria-label={card.heading}
      style={{
        background: "#141d2e",
        border: "1px solid #26324c",
        borderRadius: 14,
        padding: "18px 16px",
      }}
    >
      {card.eyebrow && (
        <p
          style={{
            fontSize: 11,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: ACCENT,
            margin: 0,
          }}
        >
          {card.emblem && (
            <span aria-hidden style={{ marginRight: 8 }}>
              {card.emblem}
            </span>
          )}
          {card.eyebrow}
        </p>
      )}
      <h2 style={{ fontSize: 17, fontWeight: 900, margin: "8px 0 0" }}>
        {card.heading}
      </h2>
      {card.body.map((line) => (
        <p
          key={line}
          style={{
            fontSize: 15,
            lineHeight: 1.65,
            color: "#94a3b8",
            margin: "12px 0 0",
          }}
        >
          {line}
        </p>
      ))}
      {card.closing && (
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.65,
            fontWeight: 700,
            color: "#e8edf5",
            margin: "12px 0 0",
          }}
        >
          {card.closing}
        </p>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginTop: 18,
        }}
      >
        <DestinationLink destination={primary} primary />
        {card.share && (
          <button
            type="button"
            onClick={onShare}
            style={{
              ...actionBase,
              background: "#0b1220",
              border: "1px solid #26324c",
              color: "#e8edf5",
            }}
          >
            {card.share.label}
          </button>
        )}
        {secondary.map((d) => (
          <DestinationLink key={d.href} destination={d} primary={false} />
        ))}
      </div>
      <p
        aria-live="polite"
        role="status"
        style={{
          fontSize: 13,
          color: "#94a3b8",
          minHeight: 20,
          margin: "12px 0 0",
        }}
      >
        {status}
      </p>
      {card.attribution && (
        <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
          {card.attribution}
        </p>
      )}
    </section>
  );
}
