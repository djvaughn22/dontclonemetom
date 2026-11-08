# Link coverage — Nov 7 2026

## Before

Within 50 miles of 63040, RescueGroups listed ~245 dogs, but only 21 had a
verified page of their own. The Aug 10 2026 rule (locked) hides every dog
without one, so the homepage widened to 250 miles and Dog of the Day rotated
through ~22 dogs.

## What changed

1. **Official shelter lists** (`app/lib/shelterPortals.ts`). The Humane Society
   of Missouri and St. Charles County Humane Services publish every adoptable
   dog on their own 24PetConnect portal, and RescueGroups carries the same
   shelter id (`A764812`) as `rescueId`. A dog on her shelter's live list gets
   her official page there; she loses it the moment she leaves the list. Exact
   id match only. On Nov 7: HSMO St. Louis 16, HSMO Maryland Heights 25,
   St. Charles County 27 — 68 dogs.
2. **Petfinder, read by hand** (`adoptionUrlRegistry.ts`, block
   `verified_2026_11_07_data`). Each rescue's own Petfinder org page, each dog
   page opened, matched by exact name + sex + size + breed: 7 St. Clair County
   (Zaya, Paris, Moo, Squints, Ophelia, Stunna Girl, and Zeke — not listed in
   August) and 2 Country Acres (Venus, Jupiter). Petfinder's age group runs one
   step younger than RescueGroups' at some shelters; each entry notes it.

Result within 50 miles: 98 dogs with a verified page (97 eligible for Dog of
the Day). Link sweep: 0 confirmed-bad, 0 gone.

## Still hidden, and why

- APA of Missouri (27): RescueGroups still carries retired PetPoint ids, so
  APA's official feed can't confirm them (see ADOPTION-INTEGRITY-2026-09-06).
- No Time to Spare (27), Hope Animal Rescues (21), 4 Paws 4 Rescue (8),
  Advocates 4 Animals (8), Heartland (1): no per-dog page found yet.
- Stray Paws (23): their RescueGroups mini-site is down; names on their own
  site only partly match (Jul 19 decision stands).
- Spencer Pet Rescue (8 adopted per GetBuddy, 3 new), Mastino (6, empty Wix
  pages): unchanged decisions.
- HSMO Maryland Heights: 5–6 dogs RescueGroups lists that HSMO's own adoptable
  list does not (likely adopted or on hold) — correctly hidden.
- Penelope (St. Animal) and Kal (St. Clair): not on their rescue's Petfinder page.
- Astrid (St. Clair) has a new Petfinder listing, but her removed August
  listing is a locked regression test; re-verifying her is a separate decision.

## Method notes

- Petfinder's own data API is off-limits: calling it directly was blocked as
  access circumvention. Read its public pages instead.
- 24PetConnect list: `https://24petconnect.com/{portal}?at=DOG`, 30 per page,
  next page `?index=30&at=DOG`; dog page `/{portal}/Details/{code}/{id}`.
