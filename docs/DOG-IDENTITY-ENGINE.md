# Dog Identity Engine

The reusable system behind the free Dog Legend experience: real dog + real
behavior + current mood + inspiration lane = fitting identity. The system
suggests names; **the owner confirms which names actually fit.** The
technology stays behind the curtain — nothing public markets this as an AI
product (and the engine is in fact deterministic code, no AI APIs).

## Architecture

Pure engine (no React, no Next, no browser APIs) — `app/lib/identity/`:

| File | Role |
|---|---|
| `types.ts` | All shared types: `IdentityInput`, `NicknameCandidate`, `ConfirmedFact`, lanes, rights levels |
| `random.ts` | Seeded deterministic PRNG (mulberry32), `stableId` hashing |
| `lexicon.ts` | Inspiration DATA: famous-name transform sources, archetype templates, titles, sport roles, lane word banks, behavior vocab, mood archetypes, rhyme bank |
| `engine.ts` | `generateCandidates(input, count)` — pattern families composed over the lexicon |
| `shuffle.ts` | `ShuffleSession` + `deal/save/remove/restore/reset/filters/lockWord` |
| `behaviors.ts` | Owner-confirmation catalogs + `factFromCatalog` / `factFromOwnerText` |
| `rights.ts` | `classifyRights` → `playSafe` / `manualReview` / `blockedForMerch` |
| `designSpec.ts` | `DesignSpecV1` — one approved design reused across products, with revision audit trail |
| `commerce.ts` | Provider abstraction (Shopify / Etsy / Printify / Canva), products, donation gate |
| `heroIdentity.ts` | Hero identity model + safe fallback resolution; canonical Isaiah constants |

UI (DontCloneMeTom-specific, **not** part of the portable engine):

- `/legend` — the free studio (`app/components/legend/LegendStudio.tsx`, `PosterPreview.tsx`)
- Profile hero chooser (`app/components/profile/ProfileHero.tsx`, `HeroIdentityContext.tsx`)
- Owner review (`/admin/designs?key=SOCIAL_ADMIN_KEY`, `DesignReviewPanel.tsx`)

## Input / output schemas

`IdentityInput` (see `types.ts`): realName (required), existingNickname,
pronouns (only when supplied), `facts: ConfirmedFact[]` (behavior / mood /
habit / quirk / situation — each with `source: owner-selected |
owner-entered`), activityLevel, favoriteThings, dislikes, physicalFeatures,
lanes, excludedWords, shownIds/shownKeys, favoriteIds, lockedWord, seed,
step, commercialSafety.

`NicknameCandidate`: stable id, nickname, heroSuitable, lane, archetype,
matchedFactId/Text, wordplay explanation, situational label, shareText,
posterText, uniqueness, repetition, fit, playEligible,
merchReviewEligible, rightsRisk, rightsReason. **Never just strings.**

## Owner-confirmed truth boundary

The engine never invents facts. A `ConfirmedFact` exists only after the
owner tapped a catalog chip (`owner-selected`) or typed it
(`owner-entered`); the source is stored on the fact and flows into the
design spec. Catalog wording is neutral — it never claims any dog does
anything. Profile-side, `findUnverifiedClaims` + `findBannedHeroSpellings`
+ tests keep the same law.

## Generation & shuffle strategy

Pattern families (each capped at 2 per deal so hands stay varied):
`famous-sub` (first-name / surname / double sound substitution),
`archetype-transform` (Bat{Base}, {Base}nator…), `title` (formal + titled
specialist from confirmed facts), `sport-role` (position + behavior),
`vibe` (lane word pairings), `mood-epithet`, `the-title`, `situational`,
`rhyme`. Lane cap: max(2, count/3) per deal.

Dedup: `nearDupKey` normalizes case, punctuation and filler words
("The Big Zay!" ≡ "Zay"). Inside a deal: no repeated keys. Across the
session: shown ids −2.5 score, shown keys −1.5; bounded history
(`HISTORY_LIMIT` 400). Deterministic: same seed + step ⇒ same deal; each
"shuffle again" advances `step`.

Session ops: `resetSession` (keeps favorites), `removeSuggestion` /
`restoreSuggestion`, `setLaneFilter` / `setMoodFilter` /
`setBehaviorFilter`, `lockWord` (part locking), `surpriseMe`.

## Rights-risk classification

- `playSafe` — generic wordplay on the dog's own name and confirmed facts.
- `manualReview` — keeps a real person's surname, or intentionally echoes
  a famous franchise sound (`nearBrand`). Free game OK; **human owner
  review required before any paid use.**
- `blockedForMerch` — contains a real person's full name, a team/league
  name, or an unmodified famous mark. Never sold, ever.

The generator never outputs a real person's full name verbatim
(test-enforced). No celebrity photos, athlete photos, team logos, league
logos, uniforms, or copied branded visual designs exist anywhere in the
system — inspiration is words only. Labels are honest risk labels, not
legal guarantees; nothing auto-publishes to merch from the free game.

## Hero identity lifecycle

`DogProfileV1` gained `heroName`, `defaultHeroId`, `heroIdentities`.
The profile hero name is a button → accessible chooser dialog (Escape
closes, focus managed, keyboard operable). Choice persists per dog in
`localStorage["dcmt-hero-<slug>"]`; `resolveHeroIdentity` falls back to
the default for unknown/stale ids. The rotating alias strip is display
only. Choosing an identity updates hero text, subtitle, and the share
caption (`HeroIdentityContext`); the real name always stays separate.

**Isaiah canonical:** real name `Isaiah`, hero `Bruzer Zayne`
(id `bruzer-zayne`), subtitle `The Dark Zay`. The misspellings
"Bruce Zayne" / "Bruze Zayne" / "Bruiser" are test-banned forever
(`BANNED_HERO_SPELLINGS`).

## Free preview lifecycle & watermark

`/legend`: name → confirm facts → shuffle → save favorites → pick a hero →
watermarked poster preview → share/download → truthful purchase links.
Everything free, no account. The poster is drawn on a client canvas
(1080×1350). The photo is a local object URL — **it never leaves the
device**, so there is no uploadable/guessable URL. Only the watermarked
render ever exists in the free flow; there is no clean hi-res file to
leak. Watermark = the Isaiah approval seal ("Approved by Isaiah / a.k.a.
Bruzer Zayne", Isaiah's face at center) + a subtle diagonal
"FREE PREVIEW · DONTCLONEMETOM.COM" strip + the site URL — friendly, not
punitive, and every share points home.

## Design specification

`DesignSpecV1`: designId, dogRef (slug or anon session id), realName,
heroName, subtitle, photoRef (local reference only), crop/focalPoint,
template, facts (with sources), watermark state (`isaiah-approval`;
`none-purchased` only ever from a completed purchase), outputPx,
productIds, revisions (audit trail — every material change appends).
Stored in the visitor's `localStorage["dcmt-designs-v1"]` (max 20).

## Commerce boundary

DontCloneMeTom owns the identity experience + free preview. Intended:
Shopify = cart/checkout/customers; Etsy = extra discovery channel;
Printify = initial print-on-demand; **Canva = owner-facing workbench
only — customers never design in Canva.**

`providerStatuses(commerceConfigFromEnv(env))` derives truthful states:
`not_configured` / `configured_unauthenticated` / `connected` /
`connection_error` / `manual_review_required`. `connected` requires an
explicit `*_AUTH_VERIFIED=1` flag that is only ever set after a real,
human-verified authentication. Env keys: `NEXT_PUBLIC_SHOPIFY_SHOP_URL`,
`NEXT_PUBLIC_ETSY_SHOP_URL` (plain public URLs, not secrets),
`PRINTIFY_API_TOKEN` (server-only). Secrets never appear in client code,
bundles, source control, logs, fixtures, or docs. The `/legend` shop
section renders real links only when a shop URL actually exists;
otherwise it says plainly that the shop isn't open yet.

## Products & revenue allocation

Published: poster-print, poster-digital, mug, tee, tote. Prepared but
unpublished: hoodie, blanket, ornament, sticker, phone-case. Every
published **physical** item carries `siteSupportCents: 100` +
`dogDonationCents: 100`, included in the price (not customer fees).

**Charity claim gate:** `donationCopy` returns `null` until
`CHARITY_CLAIM_READY=1` **and** `CHARITY_NAME` are set — which only
happens once a real organization is selected and written permission is
recorded. Never "tax deductible", never an implied official partnership.

## How to extend

- **New curated alias/identity:** add to `heroIdentities` in the profile
  record in `dogProfiles.ts` (id, name, subtitle, tagline, kind).
- **New behavior category:** add to `BEHAVIOR_CATALOG` (+ optional
  `BEHAVIOR_VOCAB` entry in `lexicon.ts` for richer wordplay).
- **New sport:** add the lane to `INSPIRATION_LANES`/`SPORT_LANES` in
  `types.ts`, then tag `FAMOUS_SOURCES` / `SPORT_ROLES` entries with it.
- **New naming pattern:** add a draft function in `engine.ts` with its own
  `family` tag and include it in `generateCandidates`.

## Privacy & image handling

No accounts, no uploads. Dog photos stay in the visitor's browser as
object URLs. Designs and notes live in localStorage on the device that
made them. The owner review page reviews on-device designs plus pasted
JSON only. No customer upload is ever publicly exposed because none is
ever taken.

## Deployment & rollback

Push to `main` ⇒ Vercel production deploy. Rollback tag for this work:
`pre-identity-engine-2026-07-29`. Full checks: `npm test`,
`npx tsc --noEmit`, `npm run lint`, `npm run build`.

## iDontCry extraction

See `docs/IDONTCRY-HANDOFF.md`. Everything under `app/lib/identity/` is
portable except `commerce.ts` and `designSpec.ts`'s `ProductId` import
(commerce-specific). The UI, routes, watermark, and admin surfaces are
DontCloneMeTom-only.
