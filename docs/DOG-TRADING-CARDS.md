# Fun Dog Trading Cards

The one simple idea behind the dog pages (Jul 2026, replaced the Dog
Identity Engine + /legend studio — rollback tag `pre-trading-cards-2026-07-30`).

A card shows: the dog's real photo, the dog's real name, ONE nickname, one
short funny saying, the current day ("Thursday's Dog Card") and card number,
and a Share button. One big button — **Spin a New Card** — rotates to the
next nickname + saying with a quick flip. The full nickname list never
renders anywhere.

## Where it lives

- `app/lib/cards/tradingCards.ts` — all card data + pure logic. Small
  curated pools only: `UNIVERSAL_PAIRS` (every dog) and `CARD_TRAITS`
  (true-things chips: big, small, napper, treats, fetch, squirrels, barks,
  couch, walks, zoomies). `buildDeck(name, traits)` fills `{name}`
  templates, dedupes, and rotates deterministically per dog (string hash —
  no randomness). `cardAt(deck, step, date)` deals spin `step`: nicknames
  cycle first, then each lap surfaces each nickname's next saying.
- `app/components/cards/TradingCard.tsx` — the collectible card visual.
  Flat + colorful: 5 rotating theme colors (`CARD_THEMES`, no red).
  `.dcmt-card-flip` in `globals.css` animates each new card.
- `app/components/cards/CardSpinner.tsx` — card + Spin + Share. Share draws
  the exact on-screen card to a 1080×1350 PNG (`app/lib/cards/cardImage.ts`),
  native-shares it as a file where supported, otherwise downloads it and
  copies the caption.
- `app/components/cards/CardMaker.tsx` + `/cards` — the kid flow: photo
  (stays in the browser), real name, a few optional true-thing chips, first
  card, spin/share. `/legend` 308-redirects to `/cards` (next.config.ts).
- `app/components/profile/DogProfileView.tsx` — family profiles
  (`app/lib/dogProfiles.ts`) render card-first; a profile's deck is
  owner-curated in the record (`cards`), featured name = `cards[0]`.
  Isaiah's featured card is **Batdog**.
- Adoptable listings (`/dogs/[numeric-id]`) reuse `CardSpinner` with the
  universal deck only, the dog's real shelter name/photo, and quiet
  attribution (org + location on the card; listing link, verification line,
  and availability disclaimer on the page). Remote photos go through
  `/api/photo` for the share canvas.

## Rules

- Names must feel like something a family would actually call the dog. No
  celebrity mutations, no misspellings, no mechanically generated
  combinations. Small pools, every name worth seeing.
- Cards never invent real-world facts — `CLAIM_TERMS` in `dogProfiles.ts`
  is scanned over every pool string and every profile by the tests.
- Public language stays plain: no "engine", "generated", "algorithm",
  "intelligence", "identity system", "infinite names"
  (`BANNED_PUBLIC_PHRASES`, test-enforced).
- "Bruzer Zayne" is the only correct spelling of that family name
  (`BANNED_HERO_SPELLINGS`, test-enforced).
