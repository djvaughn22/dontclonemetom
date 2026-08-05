// Centralized adoption URL registry — the source of truth for where each dog
// should send users for adoption/listing information.
//
// Format:
//   [RescueGroups animal ID]: {
//     adoptionProfileUrl: "verified individual dog page URL or null",
//     status: "verified-direct-dog-page" | "generic-rescue-page" | "unverified",
//     source: "getbuddy" | "petfinder" | "rescue-owned-site" | "unknown",
//     verifiedAt: "ISO timestamp or null",
//     notes: "reason for this classification"
//   }
//
// RULES:
// 1. Every active dog must have an entry
// 2. adoptionProfileUrl is ONLY populated for verified-direct-dog-page status
// 3. Generic rescue pages are tracked separately (rescueDogs.orgUrl handles fallback)
// 4. Unverified dogs get explicit "unverified" status, never a guess

import type { AdoptionUrlStatus, AdoptionUrlSource } from "./adoptionUrlSchema";

type RegistryEntry = {
  adoptionProfileUrl: string | null;
  status: AdoptionUrlStatus;
  source: AdoptionUrlSource;
  verifiedAt: string | null;
  notes: string;
};

// SPENCER PET RESCUE — GetBuddy platform
// Manually populated by finding each dog on GetBuddy.com/pets and copying stable pet ID
// Status: Paco verified (22649663), others TODO
const spencerPetRescue: Record<string, RegistryEntry> = {
  "22649663": {
    adoptionProfileUrl: "https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile",
    status: "verified-direct-dog-page",
    source: "getbuddy",
    verifiedAt: "2026-08-05T00:00:00Z",
    notes: "Verified: Page shows Paco's photos, name, adoption fee, Modern K9 training info",
  },
  // Carl — TODO: Find GetBuddy pet ID
  "22649636": {
    adoptionProfileUrl: null,
    status: "unverified",
    source: "unknown",
    verifiedAt: null,
    notes: "Spencer Pet Rescue / GetBuddy — not yet looked up",
  },
  // Darla — TODO
  "22649637": {
    adoptionProfileUrl: null,
    status: "unverified",
    source: "unknown",
    verifiedAt: null,
    notes: "Spencer Pet Rescue / GetBuddy — not yet looked up",
  },
  // Dart (from Stranger Things) — TODO
  "22649640": {
    adoptionProfileUrl: null,
    status: "unverified",
    source: "unknown",
    verifiedAt: null,
    notes: "Spencer Pet Rescue / GetBuddy — not yet looked up",
  },
  // Dumpling — TODO
  "22649644": {
    adoptionProfileUrl: null,
    status: "unverified",
    source: "unknown",
    verifiedAt: null,
    notes: "Spencer Pet Rescue / GetBuddy — not yet looked up",
  },
  // Holden aka Harlan — TODO
  "22649646": {
    adoptionProfileUrl: null,
    status: "unverified",
    source: "unknown",
    verifiedAt: null,
    notes: "Spencer Pet Rescue / GetBuddy — not yet looked up",
  },
  // 6 more Spencer dogs — TODO (22649648, 22649650, 22649652, 22649657, 22649660, 22649666, 22649668, 22649671, 22649675, 22649678, 22649681)
};

// STRAY PAWS RESCUE — 25 dogs
// They have a verified override (ORG_URL_OVERRIDES) but likely publish individual listings somewhere
const strayPawsRescue: Record<string, RegistryEntry> = {
  // TODO: Audit and find platform (Petfinder? Adopt-a-Pet? Own site?)
};

// COUNTRY ACRES RESCUE — 6 dogs
// Sample dog: Ramsey (RG ID 22194580)
// Need to find their adoption platform
const countryAcresRescue: Record<string, RegistryEntry> = {
  "22194580": {
    adoptionProfileUrl: null,
    status: "unverified",
    source: "unknown",
    verifiedAt: null,
    notes: "Country Acres — platform unknown, need to audit",
  },
};

// COMPLETE REGISTRY — combines all platform sources
export const adoptionUrlRegistry: Record<string, RegistryEntry> = {
  ...spencerPetRescue,
  ...strayPawsRescue,
  ...countryAcresRescue,
  // TODO: Add remaining 14 rescues (195 total unmapped dogs)
};

export function getAdoptionUrlStatus(animalId: string): RegistryEntry | null {
  return adoptionUrlRegistry[animalId] ?? null;
}

export function hasVerifiedAdoptionProfile(animalId: string): boolean {
  const entry = adoptionUrlRegistry[animalId];
  return entry?.status === "verified-direct-dog-page" && entry?.adoptionProfileUrl !== null;
}

export function getVerifiedAdoptionUrl(animalId: string): string | null {
  const entry = adoptionUrlRegistry[animalId];
  if (entry?.status === "verified-direct-dog-page") {
    return entry.adoptionProfileUrl;
  }
  return null;
}
