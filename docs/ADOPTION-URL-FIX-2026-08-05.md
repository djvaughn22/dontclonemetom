# Adoption URL Fix — 2026-08-05

**Status:** FOUNDATION COMPLETE, DATA MAPPING IN PROGRESS  
**Blocker:** Production failure — Paco modal shows "Visit the rescue" instead of GetBuddy page  
**Scope:** 195/222 dogs (88%) across 15 rescues need individual adoption URL mapping

---

## What Was Built

### Infrastructure (COMPLETE ✅)

1. **`ADOPTION_URL_OVERRIDES` system** (`app/lib/rescueDogs.ts`)
   - Maps RescueGroups animal IDs to verified individual dog page URLs
   - Takes priority when RG feed lacks URLs, fallback when RG provides bad data
   - Integrates into `normalizeDog()` → sets `dog.profileUrl` correctly

2. **URL Resolution Priority** (in order):
   - RescueGroups per-dog URL (if valid and not demoted as generic)
   - `ADOPTION_URL_OVERRIDES[animalId]` (verified mapping when RG lacks URL)
   - RescueGroups org override (`ORG_URL_OVERRIDES`)
   - Rescue website fallback (`dog.orgUrl`)

3. **Paco Mapping** (COMPLETE ✅)
   - RG ID: `22649663`
   - GetBuddy URL: `https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile`
   - Test added: `app/lib/__tests__/rescueDogs.test.ts` line ~346
   - Verified: Unit test passes; dog modal will show "Meet Paco" linking to GetBuddy (after deploy)

4. **Audit Script** (COMPLETE ✅)
   - `scripts/audit-adoption-urls.ts`
   - Lists all rescues with unmapped dogs
   - Shows priorities (Spencer = 17 dogs, all others)
   - Guides next steps

5. **Mapping Guide** (COMPLETE ✅)
   - `docs/ADOPTION-URL-MAPPING-GUIDE.md`
   - Process to find GetBuddy/Petfinder/other platform URLs
   - Table of Spencer dogs with mapping status
   - Test patterns for each dog
   - Production verification checklist

### Code Changes Summary

**`app/lib/rescueDogs.ts`:**
```typescript
// NEW: adoption URL overrides
const ADOPTION_URL_OVERRIDES: Record<string, string> = {
  "22649663": "https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile",
};

// MODIFIED: normalizeDog() — check override when RG URL missing
const rgProfileUrl = normalizeHttpUrl(at.url) ?? resolveRelativeProfileUrl(at.url, orgUrl);
const overrideUrl = ADOPTION_URL_OVERRIDES[a.id];
const sourceProfileUrl = rgProfileUrl ?? (overrideUrl ? normalizeHttpUrl(overrideUrl) : null);
```

**`app/lib/__tests__/rescueDogs.test.ts`:**
```typescript
// NEW: test that adoption URL override works for Paco
it("uses hand-verified adoption URL overrides when RescueGroups lacks individual dog URLs", () => { ... })

// NEW: test that RG URLs take priority over overrides
it("prioritizes RescueGroups individual URLs over overrides when both exist", () => { ... })
```

---

## What's Needed Next

### Spencer Pet Rescue (16 Remaining Dogs)

Find GetBuddy URLs for each dog and add to `ADOPTION_URL_OVERRIDES`:

| RG ID | Dog Name | GetBuddy URL | Status |
|-------|----------|--------------|--------|
| 22649636 | Carl | `https://www.getbuddy.com/pet/...` | 🔴 TODO |
| 22649637 | Darla | ? | 🔴 TODO |
| 22649640 | Dart (from Stranger Things) | ? | 🔴 TODO |
| 22649644 | Dumpling | ? | 🔴 TODO |
| 22649646 | Holden aka Harlan | ? | 🔴 TODO |
| 22649648 | ? | ? | 🔴 TODO |
| 22649650 | ? | ? | 🔴 TODO |
| 22649652 | ? | ? | 🔴 TODO |
| 22649657 | ? | ? | 🔴 TODO |
| 22649660 | ? | ? | 🔴 TODO |
| 22649663 | **Paco** | `https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?...` | ✅ DONE |
| 22649666 | ? | ? | 🔴 TODO |
| 22649668 | ? | ? | 🔴 TODO |
| 22649671 | ? | ? | 🔴 TODO |
| 22649675 | ? | ? | 🔴 TODO |
| 22649678 | ? | ? | 🔴 TODO |
| 22649681 | ? | ? | 🔴 TODO |

**Process:**
1. Visit GetBuddy Spencer Pet Rescue page
2. Search each dog by name
3. Copy the direct dog page URL
4. Format: `https://www.getbuddy.com/pet/{PETID}?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile`
5. Add mapping to `ADOPTION_URL_OVERRIDES` in `app/lib/rescueDogs.ts`
6. Add test case in `app/lib/__tests__/rescueDogs.test.ts`

### Other 14 Rescues (178 Remaining Dogs)

Audit and map by platform:

- **No Time to Spare (29 dogs)** — Find platform
- **STRAY PAWS RESCUE (25 dogs)** — Partial override exists, needs completion
- **Hope Animal Rescues (24 dogs)** — Find platform
- **St Charles County (20 dogs)** — Partial override (24petconnect) exists, may be complete
- **Perry County (13 dogs)** — Find platform
- **APA of Missouri (12 dogs)** — Find platform
- **St. Clair County (12 dogs)** — Find platform
- **4 Paws 4 Rescue (10 dogs)** — Find platform
- **HSMO (10 dogs)** — Find platform
- **Country Acres (6 dogs)** — Find platform (likely their own site)
- **Advocates 4 Animals (6 dogs)** — Find platform
- **Mastino Rescue (6 dogs)** — Currently demoted (dead host), may need recovery check
- **St. Animal Pet (4 dogs)** — Find platform
- **All Paws Rescue (1 dog)** — Find platform

**Use `scripts/audit-adoption-urls.ts` to track progress:**
```bash
npx tsx scripts/audit-adoption-urls.ts
```

---

## Deployment Checklist

- [ ] **Verify locally:** `npm run build && npm run test -- --run` (both pass)
- [ ] **Deploy:** `git push` or `npx vercel --prod`
- [ ] **Check production:** Paco's modal opens GetBuddy page (not "Visit the rescue")
- [ ] **Collect remaining Spencer dog URLs** (from GetBuddy or user)
- [ ] **Add all remaining Spencer mappings + tests**
- [ ] **Deploy update**
- [ ] **Verify all 17 Spencer dogs open individual pages**
- [ ] **Repeat audit loop for other 14 rescues**

---

## Regression Protection

These tests lock in the behavior and will fail if someone accidentally removes or mis-modifies a mapping:

```bash
npm run test -- --run app/lib/__tests__/rescueDogs.test.ts
```

Tests verify:
- Paco (22649663) → GetBuddy URL (not fallback)
- Modal label is "Meet Paco" (not "Visit the rescue")
- RG URLs take priority over overrides
- Override only applies when RG URL missing
- All other dogs' existing behavior unchanged

---

## Files Modified

- ✅ `app/lib/rescueDogs.ts` — ADOPTION_URL_OVERRIDES infrastructure + Paco mapping
- ✅ `app/lib/__tests__/rescueDogs.test.ts` — Tests for override system
- ✅ `scripts/audit-adoption-urls.ts` — NEW audit tool
- ✅ `docs/ADOPTION-URL-MAPPING-GUIDE.md` — NEW mapping guide
- ✅ `docs/ADOPTION-URL-FIX-2026-08-05.md` — NEW this file

**Not modified (still working as of 3e40aee):**
- `app/lib/dogDestination.ts` — URL classification/labels
- `app/lib/linkVerification.ts` — Redirect verification
- All rendering components (use existing `resolveDogDestination()`)

---

## Production Impact Timeline

**Today (2026-08-05):**
- Paco infrastructure ready (tests pass, code builds)
- Waiting for deployment or GitHub Actions

**After deploy:**
- Paco's modal will open GetBuddy instead of falling back to "Visit the rescue"
- Other Spencer dogs still fall back (not yet mapped)
- URL audit runs: `npx tsx scripts/audit-adoption-urls.ts`

**After Spencer mapping complete:**
- All 17 Spencer dogs open individual GetBuddy pages
- 195 other dogs still fall back

**After full audit:**
- Only dogs with genuinely unavailable URLs fall back to rescue homepage
- All verified individual pages open in one tap

---

## Known Issues

- **Production hasn't redeployed yet** — Paco still shows "Visit the rescue" on live site until deploy
- **Remaining 16 Spencer dogs** — GetBuddy URLs not yet found/added
- **14 other rescues** — Platforms and URLs still unknown
- **Mastino Rescue** — Hosts demoted (dead Wix shell); sourceProfileUrl preserved for rechecking
- **STRAY PAWS & St Charles** — Partial org overrides exist; may need individual dog mapping instead

---

## Testing URLs Manually

To verify a GetBuddy URL works:

1. Visit the URL in a browser
2. Confirm page loads (no 404, no redirect to homepage)
3. Confirm dog's name appears on page
4. Confirm URL structure is valid (query params with pet ID)

Example (Paco):
```
https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile
→ Shows Paco's photos, name, adoption fee
→ Ready for button click
```
