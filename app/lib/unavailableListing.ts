// "This page loaded fine and says the dog is gone."
//
// A 404 is easy. The dangerous case is the one that broke MOO's listing: the
// shelter answers HTTP 200 with a normal-looking page whose content is
// "PET NOT FOUND — this pet is no longer available for adoption". Status
// codes alone can never catch that, so a destination check also has to read
// what the page actually says.
//
// The bar for calling a page dead is deliberately high. These phrases are
// unambiguous statements that the listing is over — not "adopted!" in a
// success-story sidebar, not "no longer available" floating in a newsletter.
// Anything less certain stays UNVERIFIED, because the cost of wrongly hiding
// an adoptable dog is a home that doesn't happen.

// Each marker must be a phrase a shelter platform prints IN PLACE OF a pet.
// Keep them specific: two or more words, and about this pet, not the shelter.
const UNAVAILABLE_MARKERS: { pattern: RegExp; label: string }[] = [
  { pattern: /pet\s+not\s+found/i, label: "pet not found" },
  { pattern: /(?:this\s+)?(?:pet|animal|dog)\s+is\s+no\s+longer\s+available(?:\s+for\s+adoption)?/i, label: "no longer available for adoption" },
  { pattern: /no\s+longer\s+available\s+for\s+adoption/i, label: "no longer available for adoption" },
  { pattern: /(?:this\s+)?(?:pet|animal|dog)\s+(?:has\s+been|was)\s+adopted/i, label: "already adopted" },
  { pattern: /animal\s+not\s+found/i, label: "animal not found" },
  { pattern: /(?:pet|animal)\s+(?:record\s+)?(?:is\s+)?(?:no\s+longer|not)\s+in\s+our\s+system/i, label: "not in shelter system" },
  { pattern: /sorry[,!]?\s+(?:this|that)\s+(?:pet|animal|dog)\s+(?:is|has)\s+(?:gone|been\s+adopted|no\s+longer)/i, label: "shelter says the pet is gone" },
  { pattern: /this\s+listing\s+(?:has\s+)?(?:expired|been\s+removed)/i, label: "listing removed" },
];

export type UnavailableMarker = { label: string; excerpt: string };

// The visible-text-ish view of a page. Scripts and styles are stripped first
// so a marker buried in a JS bundle (every SPA ships all its copy) can't be
// mistaken for the page actually saying it. That is the whole reason APA's
// raw HTML was never usable evidence: the strings live in the bundle.
export function visibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Returns the marker when the page's own visible text says this listing is
// over, or null when it does not. Never guesses.
export function findUnavailableMarker(html: string): UnavailableMarker | null {
  const text = visibleText(html);
  for (const { pattern, label } of UNAVAILABLE_MARKERS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      return {
        label,
        excerpt: text.slice(Math.max(0, match.index - 60), match.index + match[0].length + 60).trim(),
      };
    }
  }
  return null;
}
