# iDontCry handoff — Dog Nickname Picker

For the next dedicated iDontCry session. **This session did not touch the
iDontCry repo.** The engine was built to port cleanly.

## The product

**Dog Nickname Picker** — completely free, colorful, fast,
family-friendly, endlessly shuffleable, saves favorites: the dog's real
name rhymed with movie stars and sports legends. A real standalone game that links quietly to
the richer DontCloneMeTom profile + poster experience
(`https://dontclonemetom.com/legend`) — iDontCry is NOT a storefront.

## What to copy (pure, portable)

From `~/DontCloneMeTom/dont-clone-me-tom/app/lib/identity/`:

- `types.ts` — exported types: `IdentityInput`, `NicknameCandidate`,
  `InspirationLane`, `INSPIRATION_LANES`, `SPORT_LANES`, `PEOPLE_LANES`,
  `RightsRisk`, `FitLevel`
- `random.ts` — `makeRng`, `seedToState`, `pick`, `shuffled`, `stableId`
- `lexicon.ts` — `FAMOUS_SOURCES` (stars + legends) and `PUNNED_FAMOUS`
  (hand-written dog puns) — the whole inspiration surface, data-only
- `engine.ts` — `generateCandidates`, `nearDupKey`, `shortForm`,
  `onsetOf`, `rimeOf`
- `shuffle.ts` — `newSession`, `deal`, `resetSession`, `saveFavorite`,
  `unsaveFavorite`, `removeSuggestion`, `restoreSuggestion`,
  `setLaneFilter`, `lockWord`, `surpriseMe`, `HISTORY_LIMIT`
- `rights.ts` — `classifyRights` (keep it: honest badges even in a free
  game; iDontCry only needs `playEligible`/badge display)

Copy the matching tests from `app/lib/identity/__tests__/`
(`engine.test.ts`, `shuffle.test.ts`, `rights.test.ts`) — they run
unchanged (vitest, plain node env, no DOM).

## What NOT to copy (DontCloneMeTom-specific)

- `commerce.ts`, `designSpec.ts` — commerce/poster boundary; iDontCry has
  no shop, no watermark, no design specs
- `heroIdentity.ts` — profile hero-identity model (Isaiah constants live
  here); not needed for the picker
- Everything under `app/components/legend/` and
  `app/components/profile/` — DCMT UI, watermarking, admin review
- The Isaiah approval seal / watermark — that is DCMT's brand device

## Dependencies & assumptions

- Zero runtime dependencies. Pure TypeScript, deterministic, no AI APIs.
- No browser APIs in the engine. The UI supplies: localStorage for
  favorites persistence (optional), a seed (e.g. `Date.now()` or a fixed
  seed in tests).
- Engine cost: `generateCandidates` builds a few thousand drafts per
  call — fine on mobile (sub-ms to low-ms); call once per shuffle tap.

## API in one glance

```ts
let session = newSession(Date.now());
const base = { realName: "Biscuit" };
({ session, candidates } = deal(session, base, 6));   // shuffle again = call again
session = saveFavorite(session, candidates[0]);        // favorites API
session = removeSuggestion(session, candidates[1]);    // stays gone until restore
session = setLaneFilter(session, ["basketball"]);      // sport/celebrity/mood lanes
session = lockWord(session, "Biscuit");                // keep a word while reshuffling
session = resetSession(session);                       // clears history, keeps favorites
```

The game is name-in → rhymes-out ("Bobby" → "Batrick Swayze",
"Baylor Swift"); there is no behavior picker anymore (owner decision,
Jul 29 2026 — simplicity won).

## Recommended iDontCry UI & integration

- Route `/games/dog-nickname-picker` (or the current games arcade
  convention) + a game card on `/games` with procedural card art like the
  other Family Arcade cards.
- One screen, mobile-first: name input → chips → big shuffle button →
  card deck → favorites row. Colorful; respect the games doctrine (board
  explains itself, records/local bests optional: e.g. "names met this
  session").
- A quiet link under the favorites: "Want a poster of the winner? →
  dontclonemetom.com/legend".
- Accessibility: all chips/buttons real `<button>`s with `aria-pressed`;
  deck cards readable order; 44px touch targets; no horizontal overflow
  at 375px; keyboard operable throughout.

## Tests to recreate (minimum)

Deterministic seed ⇒ deterministic deal; step advances change the deal;
no exact dupes in a hand; near-dup suppression across a session; bounded
history; reset keeps favorites; removed stays removed until restored;
lane filters (sport + movie-star) narrow deals; locked word appears in
every result; excluded words never appear; no real person's full name is
ever emitted; every name ≤ 5 words / 26 chars; structured candidate
fields all present.
