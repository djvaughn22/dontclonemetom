// Shared re-exports for the adoption-integrity tests, so the test file reads
// as one story rather than a wall of imports from five modules.

export {
  applyOfficialAvailability,
  isPubliclyEligible,
  type Dog,
} from "../rescueDogs";

import { isPubliclyEligible, type Dog } from "../rescueDogs";
import { eligibleDogs } from "../dogOfTheDay";

// eligibleDogs() requires the full card-worthy shape (photo, name, rescue,
// city, url). For eligibility assertions we only care about the link-integrity
// gate, so this applies that gate alone.
export function eligibleDogsForTest(dogs: Dog[]): Dog[] {
  return dogs.filter(isPubliclyEligible);
}

export { eligibleDogs };
