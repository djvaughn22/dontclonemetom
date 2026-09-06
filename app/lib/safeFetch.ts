// Bounded, SSRF-safe outbound fetch for destination verification.
//
// Everything this file guards against is reachable from upstream data: a
// rescue feed can publish any URL it likes, and we follow it. So a fetch
// started on a feed-supplied URL must never be able to reach the machine
// we're running on, hang, or pull an unbounded body.
//
// Guarantees:
//   - http/https only; no file:, data:, ftp:, etc.
//   - the host must not be a loopback/private/link-local/reserved address,
//     checked on EVERY hop (a public host may redirect to 127.0.0.1)
//   - optional host allowlist (destination verification passes the expected
//     provider hosts, so a redirect off-provider can't be treated as proof)
//   - a hard overall deadline, not just a per-request one
//   - a capped number of redirects, resolved manually so each hop is screened
//   - a capped response body, read incrementally so a huge page can't be
//     buffered whole
//
// A blocked or failed fetch is NEVER evidence that a listing is dead — the
// caller sees `ok: false` with a reason and must treat it as unknown.

export type SafeFetchOutcome =
  | {
      ok: true;
      status: number;
      finalUrl: string;
      body: string;
      truncated: boolean;
      redirects: number;
    }
  | {
      ok: false;
      reason:
        | "invalid-url"
        | "blocked-protocol"
        | "blocked-host"
        | "off-allowlist"
        | "too-many-redirects"
        | "redirect-without-location"
        | "timeout"
        | "network-error"
        | "body-unreadable";
      finalUrl: string;
      status: number | null;
      detail: string;
    };

export type SafeFetchOptions = {
  // Hosts the request may reach, "www." stripped. Empty/omitted = any public
  // host. Applied to every hop, so an allowlisted URL that redirects off the
  // provider is refused rather than silently followed.
  allowHosts?: string[];
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  userAgent?: string;
  accept?: string;
  fetchImpl?: typeof fetch;
};

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_MAX_BYTES = 512 * 1024;

// Identifies us honestly and points at the site, so a rescue that wants to
// talk to us can. Never impersonates a browser to defeat bot protection.
export const VERIFIER_USER_AGENT =
  "DontCloneMeTom-listing-check/1.0 (+https://dontclonemetom.com; adoption-link integrity)";

function stripWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

// Literal IP hosts that must never be reached from a feed-supplied URL.
// Hostnames are NOT resolved here (no DNS in the edge/runtime contract we
// want) — this blocks the direct-literal and decimal/hex forms, and the
// allowlist is what actually keeps verification on the expected provider.
export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;

  // Unqualified names ("localhost", "intranet") — never a public rescue site.
  if (!host.includes(".") && !host.includes(":")) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home.arpa")) return true;

  // IPv6: block loopback, unspecified, unique-local (fc00::/7) and
  // link-local (fe80::/10), plus IPv4-mapped forms.
  if (host.includes(":")) {
    if (host === "::1" || host === "::") return true;
    if (/^f[cd]/.test(host)) return true;
    if (/^fe[89ab]/.test(host)) return true;
    const mapped = host.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedHost(mapped[1]);
    return false;
  }

  // Dotted-quad IPv4.
  const quad = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (quad) {
    const [a, b] = [Number(quad[1]), Number(quad[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0) return true; // 192.0.0.0/24, 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast + reserved + broadcast
    return false;
  }

  // A bare number ("2130706433") or hex ("0x7f000001") is an IP in disguise.
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) return true;

  return false;
}

function screen(url: string, allow: Set<string> | null): { url: URL } | { fail: SafeFetchOutcome } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      fail: { ok: false, reason: "invalid-url", finalUrl: url, status: null, detail: "unparseable URL" },
    };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      fail: {
        ok: false,
        reason: "blocked-protocol",
        finalUrl: url,
        status: null,
        detail: `refused protocol ${parsed.protocol}`,
      },
    };
  }
  if (isBlockedHost(parsed.hostname)) {
    return {
      fail: {
        ok: false,
        reason: "blocked-host",
        finalUrl: url,
        status: null,
        detail: `refused non-public host ${parsed.hostname}`,
      },
    };
  }
  if (allow && !allow.has(stripWww(parsed.hostname))) {
    return {
      fail: {
        ok: false,
        reason: "off-allowlist",
        finalUrl: url,
        status: null,
        detail: `host ${parsed.hostname} is not an expected destination for this listing`,
      },
    };
  }
  return { url: parsed };
}

// Read at most `maxBytes` of the body. Streams where the runtime supports it
// so a multi-megabyte page is abandoned instead of buffered.
async function readCapped(res: Response, maxBytes: number): Promise<{ body: string; truncated: boolean }> {
  const reader = res.body?.getReader?.();
  if (!reader) {
    const text = await res.text();
    return { body: text.slice(0, maxBytes), truncated: text.length > maxBytes };
  }
  const decoder = new TextDecoder();
  let out = "";
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      out += decoder.decode(value.slice(0, value.byteLength - (total - maxBytes)), { stream: false });
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    out += decoder.decode(value, { stream: true });
  }
  return { body: out, truncated };
}

export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<SafeFetchOutcome> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const allow = options.allowHosts?.length ? new Set(options.allowHosts.map(stripWww)) : null;

  // One deadline for the whole redirect chain — five hops of nine seconds
  // each must not add up to a 45-second hang.
  const deadline = Date.now() + timeoutMs;
  let current = url;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const screened = screen(current, allow);
    if ("fail" in screened) return screened.fail;

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return { ok: false, reason: "timeout", finalUrl: current, status: null, detail: "deadline exceeded" };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    let res: Response;
    try {
      res = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": options.userAgent ?? VERIFIER_USER_AGENT,
          Accept: options.accept ?? "text/html,application/xhtml+xml,*/*",
        },
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        reason: aborted ? "timeout" : "network-error",
        finalUrl: current,
        status: null,
        detail: aborted ? "request timed out" : "network failure",
      };
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        return {
          ok: false,
          reason: "redirect-without-location",
          finalUrl: current,
          status: res.status,
          detail: `${res.status} with no Location header`,
        };
      }
      let next: string;
      try {
        next = new URL(location, current).href;
      } catch {
        return {
          ok: false,
          reason: "invalid-url",
          finalUrl: current,
          status: res.status,
          detail: `unresolvable redirect target: ${location}`,
        };
      }
      current = next;
      continue;
    }

    let read: { body: string; truncated: boolean };
    try {
      read = await readCapped(res, maxBytes);
    } catch {
      return {
        ok: false,
        reason: "body-unreadable",
        finalUrl: current,
        status: res.status,
        detail: "response body could not be read",
      };
    }

    return {
      ok: true,
      status: res.status,
      finalUrl: current,
      body: read.body,
      truncated: read.truncated,
      redirects: hop,
    };
  }

  return {
    ok: false,
    reason: "too-many-redirects",
    finalUrl: current,
    status: null,
    detail: `more than ${maxRedirects} redirects`,
  };
}
