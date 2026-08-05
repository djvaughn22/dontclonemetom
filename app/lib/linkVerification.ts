// Server-side verification for per-dog adoption URLs: follow redirects
// safely, classify the final destination, and check that it is reasonably
// associated with the named dog.
//
// The verdict contract (the important part):
//   "exact-dog"  — the final page verifiably belongs to this dog.
//   "generic"    — the URL confirmably lands on a homepage / list / search /
//                  application page. Only this verdict may demote a link.
//   "wrong-dog"  — the final page is an individual profile for a DIFFERENT
//                  animal id. Also demotes.
//   "gone"       — the profile confirmably no longer exists (404/410).
//   "uncertain"  — anti-bot blocking, timeouts, network failures, or a page
//                  we could not positively confirm either way. NEVER treated
//                  as dead or generic; the link keeps its current standing
//                  and gets rechecked later.
//
// Used by scripts/verify-dog-links.ts to sweep every active listing; a host
// whose per-dog URLs confirmably land generic graduates into
// DEAD_PROFILE_HOSTS in rescueDogs.ts (the Mastino/Stray Paws mechanism).

import { classifyAdoptionUrl, type AdoptionUrlClass } from "./dogDestination";

export type LinkVerdictStatus =
  | "exact-dog"
  | "generic"
  | "wrong-dog"
  | "gone"
  | "uncertain";

export type LinkVerdict = {
  status: LinkVerdictStatus;
  finalUrl: string | null;
  httpStatus: number | null;
  classification: AdoptionUrlClass | null;
  detail: string;
};

export type VerifyOptions = {
  dogName: string;
  // The source animal id (e.g. RescueGroups AnimalID) when known.
  animalId?: string | null;
  orgUrl?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRedirects?: number;
};

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) DontCloneMeTom-link-check";

// Statuses that mean "we were blocked or the server hiccuped", not "the
// profile is gone": never demote on these.
const TRANSIENT_STATUS = new Set([401, 403, 408, 425, 429, 500, 502, 503, 504]);

function extractAnimalIds(url: string): string[] {
  const ids: string[] = [];
  try {
    const parsed = new URL(url);
    for (const [key, value] of parsed.searchParams) {
      if (/^(?:animal_?id|pet_?id|dog_?id|aid|id)$/i.test(key) && /^\d+$/.test(value.trim())) {
        ids.push(value.trim());
      }
    }
  } catch {
    // ignore
  }
  return ids;
}

// The dog's first name token, long enough to be meaningful ("Bo" matches too
// much; require 3+ chars before name-matching counts as confirmation).
function nameToken(dogName: string): string | null {
  const first = dogName.trim().split(/\s+/)[0]?.replace(/[^a-z0-9]/gi, "");
  return first && first.length >= 3 ? first.toLowerCase() : null;
}

export async function verifyDogProfileUrl(
  url: string,
  opts: VerifyOptions,
): Promise<LinkVerdict> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const maxRedirects = opts.maxRedirects ?? 5;

  let current = url;
  let res: Response | null = null;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return {
        status: "generic",
        finalUrl: current,
        httpStatus: null,
        classification: "invalid",
        detail: `unparseable URL after ${hop} redirect(s)`,
      };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        status: "generic",
        finalUrl: current,
        httpStatus: null,
        classification: "invalid",
        detail: `non-web protocol ${parsed.protocol} after ${hop} redirect(s)`,
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      res = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": UA, Accept: "text/html,*/*" },
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      return {
        status: "uncertain",
        finalUrl: current,
        httpStatus: null,
        classification: null,
        detail: "network failure or timeout — profile standing unchanged",
      };
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        return {
          status: "uncertain",
          finalUrl: current,
          httpStatus: res.status,
          classification: null,
          detail: "redirect without a Location header",
        };
      }
      try {
        current = new URL(location, current).href;
      } catch {
        return {
          status: "uncertain",
          finalUrl: current,
          httpStatus: res.status,
          classification: null,
          detail: `unresolvable redirect target: ${location}`,
        };
      }
      continue;
    }
    break;
  }

  if (!res) {
    return {
      status: "uncertain",
      finalUrl: current,
      httpStatus: null,
      classification: null,
      detail: "no response",
    };
  }
  if (res.status >= 300 && res.status < 400) {
    return {
      status: "uncertain",
      finalUrl: current,
      httpStatus: res.status,
      classification: null,
      detail: "too many redirects",
    };
  }

  if (res.status === 404 || res.status === 410) {
    return {
      status: "gone",
      finalUrl: current,
      httpStatus: res.status,
      classification: null,
      detail: `listing returns ${res.status}`,
    };
  }
  if (TRANSIENT_STATUS.has(res.status) || res.status >= 400) {
    return {
      status: "uncertain",
      finalUrl: current,
      httpStatus: res.status,
      classification: null,
      detail: `blocked or transient upstream status ${res.status} — never treated as dead`,
    };
  }

  // 2xx — classify where the redirects actually landed.
  const classification = classifyAdoptionUrl(current, opts.orgUrl ?? null);
  if (classification !== "animal-profile") {
    return {
      status: "generic",
      finalUrl: current,
      httpStatus: res.status,
      classification,
      detail: `final destination classifies as ${classification}`,
    };
  }

  // It looks like an individual profile — confirm it is THIS dog's.
  const expectedIds = opts.animalId
    ? [opts.animalId, ...extractAnimalIds(url)]
    : extractAnimalIds(url);
  const finalIds = extractAnimalIds(current);
  if (expectedIds.length && finalIds.length) {
    if (finalIds.some((id) => expectedIds.includes(id))) {
      return {
        status: "exact-dog",
        finalUrl: current,
        httpStatus: res.status,
        classification,
        detail: "final URL carries this dog's listing id",
      };
    }
    return {
      status: "wrong-dog",
      finalUrl: current,
      httpStatus: res.status,
      classification,
      detail: `final URL names a different animal id (${finalIds.join(",")})`,
    };
  }

  // No id to compare — look for the dog's name in the page itself.
  const token = nameToken(opts.dogName);
  let body = "";
  try {
    body = (await res.text()).slice(0, 400_000);
  } catch {
    return {
      status: "uncertain",
      finalUrl: current,
      httpStatus: res.status,
      classification,
      detail: "profile-shaped destination but the page body was unreadable",
    };
  }
  const haystack = body.toLowerCase();
  if (token && haystack.includes(token)) {
    return {
      status: "exact-dog",
      finalUrl: current,
      httpStatus: res.status,
      classification,
      detail: `page mentions "${opts.dogName.trim().split(/\s+/)[0]}"`,
    };
  }
  if (expectedIds.length && haystack.includes(expectedIds[0])) {
    return {
      status: "exact-dog",
      finalUrl: current,
      httpStatus: res.status,
      classification,
      detail: "page carries this dog's listing id",
    };
  }
  return {
    status: "uncertain",
    finalUrl: current,
    httpStatus: res.status,
    classification,
    detail:
      "profile-shaped destination without positive dog confirmation — recheck later, do not demote",
  };
}
