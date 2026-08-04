# Adoptable-dog link audit — 2026-08-04

Follow-up to `LINK-AUDIT-2026-07-19.md`. That pass split `profileUrl`/`orgUrl`
and added `resolveDogUrl`. This pass makes the **exact dog one tap away
everywhere** and gives every surface typed destination awareness.

## What changed

- **One shared resolver** — `app/lib/dogDestination.ts`. `resolveDogDestination(dog)`
  returns `{ url, type: "exact-dog" | "shelter-fallback" | "none", fallbackKind,
  label, ariaLabel }`. Every dog-link surface (homepage grid + detail,
  `/dogs/[id]`, `/today`, `/cards?dog=`, share actions, card studio) renders
  from it — labels can no longer over-promise.
- **Homepage tiles are direct links.** A dog with its own profile page is a
  real `<a target="_blank" rel="noopener noreferrer">` covering the whole tile
  (photo + name + card): one tap opens that exact dog; middle-click/long-press
  work normally. A visible "Meet [Name] ↗" row signals the exit; a small
  "Details" chip keeps the in-page view (photos, email, share). Dogs without
  their own page open the in-page details, where the fallback link is labeled
  honestly.
- **Honest labels, everywhere:** "Meet [Name]" only for the exact dog;
  "View shelter listings" for an org's adoptable-dogs page;
  "Visit the rescue" for an org website. Aria labels name the dog and say the
  link opens in a new tab.
- **Ingestion guard** — `isGenericAnimalUrl` demotes an animal URL that is
  really the org homepage or a bare adoptable-list/search page, so a generic
  page can never masquerade as a dog's own profile. Query strings are always
  preserved (`?AnimalID=` ids ride there).
- **`orgUrlKind`** recorded at normalization ("adoptable-list" vs "website")
  so fallback labels match what the page actually is.
- Existing protections kept: `ORG_URL_OVERRIDES`, `DEAD_PROFILE_HOSTS`,
  publish-time reachability check, `/dogs/[id]` gone-listing handling.

## Snapshot (ZIP 63040, 50 mi, 222 dogs — live feed, changes daily)

| Destination type | Dogs | Sources |
|---|---|---|
| exact-dog | 9 | Camp Chaos Puppy Rescue (2), Needy Paws Rescue (4), Midwest Doberman Rescue of St. Louis (3) |
| shelter-fallback / adoptable-list | 49 | STRAY PAWS RESCUE (25, dead mini-site → their /animals page), St Charles County Humane Services (24, 24petconnect list) |
| shelter-fallback / website | 164 | Country Acres, 4 Paws 4 Rescue, HSMO (×2 orgs), APA of Missouri, St. Animal Pet Adoptions, All Paws, Advocates 4 Animals, Hope Animal Rescues, St. Clair County, No Time to Spare, Spencer Pet Rescue, Mastino Rescue (6, dead per-dog host — see below) |
| none | 0 | — |

RescueGroups only supplies a per-dog URL when the rescue runs a mini-site;
the 158 website fallbacks have no individual URL anywhere in the feed. Do not
build per-dog URLs from names — names are not unique (two LAYLAs at APA today).

## Verification notes (2026-08-04)

- Camp Chaos, Needy Paws, Midwest Doberman sample pages fetched: HTTP 200 with
  the dog's name confirmed in the page body.
- **Mastino Rescue (demoted 2026-08-04, same day)**: their RescueGroups URLs
  redirect to `mastino-rescue-inc.org/animals/detail.php?AnimalID=…` (id
  preserved) but the Wix page — including their own `/animals` list — renders
  an empty shell (no animal-data requests observed), same wall as the July
  audit. Both hosts are now in `DEAD_PROFILE_HOSTS`, so their 6 dogs resolve
  to the honest "Visit the rescue" fallback (their website; their /animals
  page is equally blank, so no adoptable-list override). The exact source URL
  with the AnimalID is preserved on each dog as `sourceProfileUrl` — remove
  the hosts from `DEAD_PROFILE_HOSTS` once a per-dog page actually loads.

## Tests

`app/lib/__tests__/dogDestination.test.ts` (resolver + generic-URL guard),
`dogLinkSurfaces.test.ts` (every surface uses the resolver; every
`target="_blank"` carries a no-opener rel; the old catch-all label is banned),
plus extended `rescueDogs.test.ts` (demotion, `orgUrlKind`, overrides).
