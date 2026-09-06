# Adoption integrity — the MOO failure and the fix (2026-09-06)

## What happened

Someone became interested in **MOO** as a friend for Isaiah. dontclonemetom.com
featured MOO as Dog of the Day and her page said she was verified. Her actual
APA listing answered:

> **PET NOT FOUND** — We're sorry but it looks like this pet is no longer
> available for adoption.

The product created real adoption intent and spent it on a dead end. That is a
mission failure, not a bug report.

- internal page: `/dogs/22736087`
- destination: `https://apamo.org/adopt/adoptable-pets/?petID=A313601`

## Root cause

Three things had to be true at once, and all three were.

**1. "Last verified" was the render clock.** `app/dogs/[id]/page.tsx` computed
`const verifiedAt = new Date()` and printed it as "Last verified … CT". The page
is `force-dynamic`, so every request stamped a fresh timestamp. It never
described the destination, the feed, or anything else. It described the moment
you loaded the page.

**2. `verified-direct-dog-page` meant "the URL is shaped like a dog page".**
`normalizeDog()` is synchronous and only screens URL *shape*. APA publishes no
per-dog URL at all, so the URL was **synthesized**: `buildApaPetUrl(rescueId)`
glued the feed's shelter id into a template. `classifyAdoptionUrl` then accepted
any apamo.org URL carrying a `petID`. `adoptionProfileUrlHttpStatus` stayed
`null` and nothing checked that it was null.

**3. The live sweep couldn't catch APA either.** `linkVerification.ts` had a
deliberate APA exemption: return `exact-dog` on petID presence, without reading
the body, because their page is client-rendered. The reasoning was correct — the
raw HTML genuinely proves nothing. The conclusion was not.

**The trigger:** APA migrated shelter software from **PetPoint** (`A313601`) to
**Shelterluv** (plain numeric ids). Every `A#####` id retired at once.
RescueGroups still carries the stale PetPoint ids. So this was never a MOO
problem — **all 29 APA dogs pointed at PET NOT FOUND.**

What the timestamp actually meant: none of "seen in feed", "fetched", "URL
exists", "returned 200", or "confirmed adoptable". It meant "rendered just now".

## The audit (measured 2026-09-06, not carried over)

| | before | after |
|---|---|---|
| dogs displayed (63040, homepage default) | 254 | 204 |
| destination confirmed | — | 204 (100%) |
| confirmed unavailable | 50 | 0 |
| unverified | — | 0 |
| directory/fallback only | — | 0 |
| identity conflicts in pool | 2 | 2 (quarantined) |

The 50 confirmed-bad split into two whole-provider failures:

- **APA of Missouri — 29/29 dead.** Retired PetPoint ids after the Shelterluv
  migration. Every one returns HTTP 200 with "PET NOT FOUND".
- **Stone County Humane Society — 21/21 dead.** Their entire RescueGroups
  mini-site answers **HTTP 410 Gone**, including the site root, while
  RescueGroups still listed all 21 as available.

Identity conflicts found: `22736087` MOO (described as "Abigail") and
`22742515` "TT General" (described as "Handsome").

## The fix

**Freshness is two facts, and they are now two fields.**
`Dog.feedSeenAt` is when the upstream feed last showed the dog. 
`AdoptionUrl.destinationVerifiedAt` is when the destination or the shelter's own
official record actually confirmed her, with
`destinationVerificationMethod` recording how. A feed refresh can only ever
write the first. `freshnessLine()` is the single place any surface gets its
wording, so "Last verified" is impossible to print without a real confirmation
behind it. A dog nobody has checked now says, truthfully, *"Last seen in the
source feed <date> — availability not confirmed with the shelter."*

**APA is decided by APA.** `officialAvailability.ts` reads
`https://apamo.org/pet-finder/data/` — the same public JSON their own pet-finder
widget uses, allowed by their robots.txt. A petID is confirmed only if that feed
carries it and marks it adoptable. Absent → `dead-or-removed`. Feed unreachable
→ `unverified`, never "available" and never "dead". If RescueGroups ever starts
publishing APA's real Shelterluv ids, they simply start matching and APA dogs
return on their own — `normalizeApaPetId` now accepts both id generations
precisely so the recovery isn't a second outage.

**HTTP 200 is not alive.** `unavailableListing.ts` reads a 2xx destination's
*visible* text (scripts stripped — every SPA ships "Pet Not Found" in its
bundle) for unambiguous end-of-listing phrases.

**Featured placement requires confirmation.** Dog of the Day walks a
deterministic ring and takes the first dog whose destination is confirmed, up to
a bounded number of attempts. `uncertain` does not earn the slot. The slot is
never left holding a dead listing.

**Identity conflicts are quarantined, never merged.** `identityIntegrity.ts`
flags a record only when its description opens on a different name, that name
isn't a spelling variant, and the record's own name appears nowhere in the text.
The description is suppressed; the dog keeps her name and photo; she is barred
from public selection. We never guess which name is right.

**Old links fail gracefully.** An unavailable dog's page keeps her name and
photo, says plainly that availability changed, drops the "View adoption page"
button entirely, links the shelter's live adoptable-pets directory, and shows
three dogs you can meet right now. Its `<title>` and share preview no longer say
"adoptable".

**Outbound checks are hardened.** `safeFetch.ts`: http/https only, private and
link-local hosts refused on every hop (including redirect targets), per-provider
host allowlist, one deadline for the whole redirect chain, capped redirects,
capped body read. It identifies itself honestly and never impersonates a browser
to defeat bot protection — a rescue that refuses automated traffic gets
`uncertain`, not a workaround.

**Ongoing protection.** `/api/integrity-audit` runs daily at 11:20 UTC (before
the 13:45 Instagram publish), authorized by `CRON_SECRET` or `SOCIAL_ADMIN_KEY`,
fails closed with neither. It checks the featured ring every run plus a rotating
inventory sample, bounded at 60 checks. `providerQuarantine.ts` flags a whole
integration above 50% confirmed-bad with a minimum sample of 8 — and
`uncertain` results are excluded from both numerator and denominator, so a
rescue that blocks bots is never quarantined for it.

## Running it

```bash
RESCUEGROUPS_API_KEY=... npx tsx scripts/adoption-integrity-audit.ts
```

Exit code 1 when any displayed dog has a confirmed-bad destination.

## Known limitations

- **Only APA has an official availability feed.** Every other provider is
  shape-screened at fetch time and live-checked only for featured placement and
  in the audit sample. The grid tells the truth about this — those dogs say
  "Last seen in the source feed", not "verified".
- **Live confirmations are not persisted.** There is no datastore, so a dog the
  audit or the Dog of the Day check confirmed still shows her registry
  timestamp (or "last seen in feed") on her own page. Honest, but staler than
  what we actually know.
- **Dead-click history is not knowable from here.** The GA4 event
  `dcmt_adoption_listing_opened` carries `dog_id`, so the number of people sent
  to the 50 dead listings is answerable in GA4 by filtering those ids. No
  estimate is given here because inventing one would be the same class of error
  this document exists to fix.
- `PUBLIC_DISPLAY_BASELINE = 222` was measured when 50 of those dogs were dead
  links. It still drives radius widening (reach further for MORE real dogs) but
  must never be met by keeping an unverified dog on the page.
