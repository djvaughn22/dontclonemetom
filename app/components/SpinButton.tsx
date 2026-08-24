"use client";

// Shared 🔀 Spin control — same label, icon, sizing, and interaction on the
// homepage Dog of the Day widget and on an individual dog's page. Small and
// secondary by design: it must never outweigh the primary "meet this dog"
// action next to it.

type SpinButtonProps = {
  onSpin: () => void;
  spinning: boolean;
  label?: string;
  className?: string;
};

export default function SpinButton({
  onSpin,
  spinning,
  label = "Spin another dog",
  className = "",
}: SpinButtonProps) {
  return (
    <button
      type="button"
      onClick={onSpin}
      disabled={spinning}
      aria-label={spinning ? "Finding another dog" : label}
      aria-busy={spinning}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#26324c] bg-[#0b1220] px-3 py-1.5 text-[11px] font-black text-[#94a3b8] transition hover:border-[#2DD4BF] hover:text-[#e8edf5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DD4BF] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span aria-hidden="true">🔀</span> {spinning ? "Finding another…" : label}
    </button>
  );
}
