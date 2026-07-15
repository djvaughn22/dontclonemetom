# dontclonemetom

A rescue-dog campaign with a sense of humor. Don't clone me, Tom — adopt an original.

**Live:** https://dontclonemetom.com
**Part of:** [Open Mirror LLC](https://openmirrorllc.com)

## Local dev
```bash
npm install
npm run dev
```

## Deploy
Push to `main` — Vercel auto-deploys production.

## Repo map

- **Production:** https://dontclonemetom.com — branch `main`, auto-deploys on push (Vercel).
- **Framework:** Next.js 16.2.6 (App Router). Build: `npm run build`. No test suite.
- **Routes:** `/` (adoptable dogs), `/dogs/[id]`, `/today` (daily social), `/admin/social`
- **Family chrome:** `OpenMirrorNav.tsx` / `OpenMirrorFooter.tsx` / `OpenMirrorTheme.tsx` are synced copies — canonical source is the hub repo `packages/openmirror-ui/` + `scripts/sync-ui.sh`. Never edit the local copies.
- **Theme:** family ☀️/🌙 toggle; `om-theme` localStorage key; light mode remaps family hexes (see hub `docs/OPEN_MIRROR_PATTERNS.md`).
- **Env vars (names only):** `RESCUEGROUPS_API_KEY`, `SITE_BASE_URL`, `SOCIAL_ADMIN_KEY`, `SOCIAL_HASHTAGS`, `CRON_SECRET`
- **External services:** RescueGroups API (real adoptable dogs)
- **Protected:** the DontCloneMeTom name/spelling, the playful dog-first personality, real-dog data (no fakes).
- **Make changes in:** `app/page.tsx` (home), `app/dogs/[id]/page.tsx` (detail).
