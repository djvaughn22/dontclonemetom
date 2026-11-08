"use client";

// Shared 🔀 Spin control — same label, icon, sizing, and interaction on the
// homepage Dog of the Day widget and on an individual dog's page. Outlined
// and secondary by design: it must never outweigh the solid "Meet [Name]"
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
      className={`inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#26324c] bg-[#0b1220] px-5 text-[15px] font-bold text-[#e8edf5] transition hover:border-[#2DD4BF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DD4BF] disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      <span aria-hidden="true">🔀</span> {spinning ? "Finding another…" : label}
    </button>
  );
}
