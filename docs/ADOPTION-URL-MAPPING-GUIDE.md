# Adoption URL Mapping Guide

**Last updated:** 2026-08-05  
**Status:** CRITICAL — 195 dogs (88%) lack verified individual adoption URLs  
**Priority:** Spencer Pet Rescue (17 dogs) — Paco is the immediate production failure example

---

## Problem

RescueGroups.org API provides individual dog URLs only for rescues with their own "mini-site" on RescueGroups. Most rescues publish adoptable dogs through external platforms (GetBuddy, Petfinder, their own sites) but those URLs aren't in the RescueGroups feed.

**Production impact:** Dogs fall back to generic "Visit the rescue" buttons instead of opening their verified individual pages.

---

## Solution

**`ADOPTION_URL_OVERRIDES`** in `app/lib/rescueDogs.ts` maps RescueGroups animal IDs to verified adoption URLs.

### Format

```typescript
const ADOPTION_URL_OVERRIDES: Record<string, string> = {
  // RescueGroups animal ID → verified individual dog page URL
  "22649663": "https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile",
};
```

**URL must:**
- Load in a browser (HTTP 200)
- Display the specific dog's name, photos, or identifying info
- Be a direct dog page, not a search result or generic listing
- Preserve query parameters (they often carry the dog ID)

---

## Spencer Pet Rescue (17 dogs) — GetBuddy Platform

All 17 are published on **GetBuddy** but absent from RescueGroups feed. Paco (22649663) is the example.

### Spencer Dogs to Map

| RG ID | Dog Name | GetBuddy URL | Verified? |
|-------|----------|--------------|-----------|
| 22649636 | Carl | ? | ❌ |
| 22649637 | Darla | ? | ❌ |
| 22649640 | Dart (from Stranger Things) | ? | ❌ |
| 22649644 | Dumpling | ? | ❌ |
| 22649646 | Holden aka Harlan | ? | ❌ |
| 22649648 | ? | ? | ❌ |
| 22649650 | ? | ? | ❌ |
| 22649652 | ? | ? | ❌ |
| 22649657 | ? | ? | ❌ |
| 22649660 | ? | ? | ❌ |
| 22649663 | **Paco** ✅ | `https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile` | ✅ |
| 22649666 | ? | ? | ❌ |
| 22649668 | ? | ? | ❌ |
| 22649671 | ? | ? | ❌ |
| 22649675 | ? | ? | ❌ |
| 22649678 | ? | ? | ❌ |
| 22649681 | ? | ? | ❌ |

### How to Find GetBuddy URLs

1. **Visit GetBuddy for Spencer Pet Rescue:**
   - Go to `https://www.getbuddy.com` and search "Spencer Pet Rescue"
   - Or navigate to their rescue page directly if known

2. **For each dog:**
   - Search by name (e.g., "Carl")
   - Click through to the individual dog page
   - Copy the URL
   - Format: `https://www.getbuddy.com/pet/{PETID}?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile`

3. **Verify:**
   - Load the URL in a browser
   - Confirm the dog's name appears on the page
   - Check that the `?utm_source=...` parameters stay in the URL (they carry adoption context)

### Implementation Checklist

- [ ] **Find all 16 remaining Spencer dogs on GetBuddy**
- [ ] **Verify each URL loads and shows the dog's name**
- [ ] **Add all 17 mappings to `ADOPTION_URL_OVERRIDES`**
- [ ] **Add test cases to `app/lib/__tests__/rescueDogs.test.ts`**
- [ ] **Run `npm run test -- --run app/lib/__tests__/rescueDogs.test.ts` (all pass)**
- [ ] **Deploy to production**
- [ ] **Verify live: open each dog modal on dontclonemetom.com**
  - Dog photo/name should link directly to GetBuddy
  - Button should say "Meet [Name]" not "Visit the rescue"
  - GetBuddy URL should load with no redirects to generic pages

---

## Other Rescues — Audit Framework

Once Spencer is complete, repeat for the other 14 rescues with 195 dogs:

| Org | Dogs | Platform | Status |
|-----|------|----------|--------|
| No Time to Spare | 29 | ? | ⏳ |
| STRAY PAWS RESCUE | 25 | ? (partial override in ORG_URL_OVERRIDES) | ⏳ |
| Hope Animal Rescues | 24 | ? | ⏳ |
| St Charles County | 20 | 24petconnect (partial override) | ⏳ |
| Spencer Pet Rescue | **17** | **GetBuddy** | 🚧 **IN PROGRESS** |
| Perry County | 13 | ? | ⏳ |
| APA of Missouri | 12 | ? | ⏳ |
| St. Clair County | 12 | ? | ⏳ |
| 4 Paws 4 Rescue | 10 | ? | ⏳ |
| HSMO | 10 | ? | ⏳ |
| Country Acres | 6 | ? | ⏳ |
| Advocates 4 Animals | 6 | ? | ⏳ |
| Mastino Rescue | 6 | Dead host → fallback only | 🔒 |
| St. Animal Pet | 4 | ? | ⏳ |
| All Paws Rescue | 1 | ? | ⏳ |

---

## Testing

### Unit Tests (Spencer example)

```typescript
it("uses GetBuddy URL override for Spencer Pet Rescue dogs", () => {
  const { animal, included } = rgAnimal({
    id: "22649663",
    attributes: { name: "Paco" },
    org: { name: "Spencer Pet Rescue", url: "http://spencerpetrescue.info/" },
  });
  const dog = normalizeDog(animal, included);
  expect(dog.profileUrl).toBe(
    "https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?utm_source=spencer-pet-rescue&utm_medium=embed&utm_content=pet-tile"
  );
  const dest = resolveDogDestination(dog);
  expect(dest.type).toBe("exact-dog");
  expect(dest.label).toBe("Meet Paco");
});
```

### Production Click Test

After deploy:

1. Visit: `https://dontclonemetom.com`
2. Search for dogs near 63040 (or your ZIP)
3. Find Paco
4. Click his photo/name or the adoption CTA
5. **Expected:** Opens `https://www.getbuddy.com/pet/699d5d19e7817824d57fc1de?...` showing Paco
6. **NOT acceptable:** Generic page, "Visit the rescue" button, redirect to homepage

Repeat for all 17 Spencer dogs once all URLs are mapped.

---

## Code Changes Already Made

✅ `ADOPTION_URL_OVERRIDES` infrastructure added to `app/lib/rescueDogs.ts`  
✅ `normalizeDog()` checks override when RG URL is missing  
✅ `ADOPTION_URL_OVERRIDES[a.id]` lookup integrated  
✅ Test cases added for Paco (22649663)  
✅ All 162 existing tests pass  

**Pending:**
- [ ] Map remaining 16 Spencer dogs to GetBuddy URLs
- [ ] Add tests for each mapping
- [ ] Deploy and verify production

---

## Related Files

- `app/lib/rescueDogs.ts` — normalization + overrides
- `app/lib/dogDestination.ts` — URL classification + honest labels
- `app/lib/__tests__/rescueDogs.test.ts` — unit tests
- `scripts/verify-dog-links.ts` — production link verification
- `scripts/audit-adoption-urls.ts` — find unmapped dogs (NEW)
