// Platform-specific URL discovery and verification adapters.
// Each adapter knows how to:
// 1. Extract or discover a dog's adoption URL from its platform
// 2. Verify that the URL points to the correct dog
// 3. Return the canonical form with stable identifiers

import type { AdoptionUrl, AdoptionUrlSource } from "./adoptionUrlSchema";

export interface PlatformAdapter {
  // Platform name (used in logs and source tracking)
  name: AdoptionUrlSource;

  // Given a dog's available metadata, attempt to build/discover the dog's URL.
  // Returns null if the platform is not applicable or URL cannot be discovered.
  discoverUrl(dog: {
    name: string;
    id: string;
    org: string;
    orgCity: string;
  }): Promise<string | null>;

  // Verify that a URL actually points to this dog.
  // Returns the classification and verification detail.
  verify(url: string, dog: { name: string; id: string }): Promise<{
    status: "verified" | "generic" | "wrong-dog" | "dead" | "uncertain";
    detail: string;
  }>;
}

// GetBuddy adapter — Spencer Pet Rescue and others use GetBuddy
export const getbuddyAdapter: PlatformAdapter = {
  name: "getbuddy",

  async discoverUrl(dog) {
    // GetBuddy URLs have stable pet IDs: /pet/{PETID}
    // Without platform API access, discovery requires:
    // 1. Org search on GetBuddy
    // 2. Dog name search within org
    // 3. Extract stable pet ID from URL
    // For now, return null — must be manually populated in ADOPTION_URL_OVERRIDES.
    // TODO: Integrate GetBuddy API if available, or build web scraper.
    return null;
  },

  async verify(url, dog) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (DontCloneMeTom adoption-url-verifier)" },
        redirect: "follow",
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          return { status: "dead", detail: `HTTP ${res.status}` };
        }
        return { status: "uncertain", detail: `HTTP ${res.status}` };
      }

      const html = await res.text();
      const lower = html.toLowerCase();

      // GetBuddy pages show dog name in page title and content
      if (lower.includes(dog.name.toLowerCase())) {
        return { status: "verified", detail: "Page contains dog's name" };
      }

      // Check for generic pages (homepage, search, etc)
      if (lower.includes("all pets") || lower.includes("search pets") ||
          url.includes("/search") || url.endsWith("/")) {
        return { status: "generic", detail: "Generic pets page, not individual dog" };
      }

      return { status: "uncertain", detail: "Page loaded but could not confirm dog identity" };
    } catch (err) {
      return { status: "uncertain", detail: `Verification failed: ${String(err)}` };
    }
  },
};

// Petfinder adapter
export const petfinderAdapter: PlatformAdapter = {
  name: "petfinder",

  async discoverUrl(dog) {
    // Petfinder URLs: /dog/{name}-{id}/...
    // Requires Petfinder API or web search
    return null; // TODO: implement
  },

  async verify(url, dog) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        return { status: res.status === 404 ? "dead" : "uncertain", detail: `HTTP ${res.status}` };
      }

      const html = await res.text();
      const lower = html.toLowerCase();

      // Petfinder shows dog name prominently
      if (lower.includes(dog.name.toLowerCase())) {
        return { status: "verified", detail: "Petfinder page shows dog's name" };
      }

      if (lower.includes("available pets") || url.includes("/search")) {
        return { status: "generic", detail: "Petfinder search/listing page" };
      }

      return { status: "uncertain", detail: "Could not confirm dog on Petfinder page" };
    } catch {
      return { status: "uncertain", detail: "Fetch failed" };
    }
  },
};

// Rescue-owned websites (Country Acres, etc.)
export const rescueOwnedSiteAdapter: PlatformAdapter = {
  name: "rescue-owned-site",

  async discoverUrl(dog) {
    // Rescue websites often have patterns like /dogs/{name} or /adopt/{dog-id}
    // Without knowing the specific rescue's site structure, discovery is not generic.
    return null; // Must be manually populated for each rescue
  },

  async verify(url, dog) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        return { status: res.status === 404 ? "dead" : "uncertain", detail: `HTTP ${res.status}` };
      }

      const html = await res.text();
      const lower = html.toLowerCase();

      if (lower.includes(dog.name.toLowerCase())) {
        return { status: "verified", detail: "Page mentions dog's name" };
      }

      // Check for red flags
      if (lower.includes("available dogs") || lower.includes("adoptable pets")) {
        return { status: "generic", detail: "Generic rescue listing page" };
      }

      return { status: "uncertain", detail: "Could not confirm dog identity" };
    } catch {
      return { status: "uncertain", detail: "Fetch failed" };
    }
  },
};

// RescueGroups mini-site adapter
export const rescueGroupsAdapter: PlatformAdapter = {
  name: "rescuegroups-mini-site",

  async discoverUrl() {
    // URLs come from RescueGroups API directly
    return null;
  },

  async verify(url, dog) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        return { status: res.status === 404 ? "dead" : "uncertain", detail: `HTTP ${res.status}` };
      }

      const html = await res.text();
      if (html.toLowerCase().includes(dog.name.toLowerCase())) {
        return { status: "verified", detail: "RescueGroups page shows dog" };
      }

      return { status: "uncertain", detail: "Could not verify dog on RescueGroups page" };
    } catch {
      return { status: "uncertain", detail: "Fetch failed" };
    }
  },
};

export const allAdapters = [
  getbuddyAdapter,
  petfinderAdapter,
  rescueOwnedSiteAdapter,
  rescueGroupsAdapter,
];

export async function verifyAdoptionUrl(
  url: string,
  dog: { name: string; id: string },
): Promise<{ status: string; detail: string; platform?: string }> {
  // Try each adapter's verification logic
  for (const adapter of allAdapters) {
    const result = await adapter.verify(url, dog);
    if (result.status !== "uncertain") {
      return { ...result, platform: adapter.name };
    }
  }

  return { status: "uncertain", detail: "No adapter could verify this URL" };
}
