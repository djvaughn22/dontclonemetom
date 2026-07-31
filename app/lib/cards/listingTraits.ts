// Verified listing facts → trait ids for the deck builder. Only what the
// rescue actually published is used — size today, nothing invented.

export function listingTraits(size: string | undefined | null): string[] {
  if (!size) return [];
  if (/x-?large|large|giant/i.test(size)) return ["big"];
  if (/small|tiny|toy/i.test(size)) return ["small"];
  return [];
}
