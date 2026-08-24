// Shared "pick another eligible dog" helper for any client Spin control that
// already has a pool of eligible dogs in hand (e.g. from
// /api/adoptable-pets) and just needs to land on a different one than the
// dog currently showing. Pure and dependency-free so it's trivial to test
// without a spun-up dataset.

export function pickSpinCandidate<T extends { id: string }>(
  pool: T[],
  currentId: string,
  random: () => number = Math.random,
): T | null {
  const candidates = pool.filter((dog) => dog.id !== currentId);
  if (!candidates.length) return null;

  const index = Math.floor(random() * candidates.length);
  // Guard the theoretical random() === 1 edge case from overshooting.
  return candidates[Math.min(index, candidates.length - 1)];
}
