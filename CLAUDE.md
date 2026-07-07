# DontCloneMeTom (dontclonemetom.com)
Real rescue-dog campaign (Tom Brady cloned his dog → adopt originals). Secular. Accent: **#2DD4BF**.
- The `pet-scroller` widget is keyless and scoped to St. Louis rescue org IDs (`LOCAL_RESCUE_ORGS`) — the keyless Petfinder graphql CANNOT filter by location any other way; do not retry.
- No personal names on the site (hero dog alt is "A rescued dog").
- True any-ZIP in-app dogs waits on DJ's free RescueGroups.org API key.

## Open Mirror family rules
- One of 11 Open Mirror LLC sites (hub: openmirrorllc.com, repo djvaughn22/open-mirror). Baseline tag: `mvp-1`.
- **Design:** flat + cool. bg `#0b1220`, surface `#141d2e`, border `#26324c`, text `#e8edf5`, muted `#94a3b8`. No glass, no gradients, **no red**.
- **Shared chrome is SYNCED, not owned here:** `OpenMirrorNav.tsx`, `OpenMirrorFooter.tsx`, `OpenMirrorTheme.tsx` in the app folder are copies from the hub repo `packages/openmirror-ui/`. NEVER edit them here — edit in the hub, run its `scripts/sync-ui.sh`, then rebuild/commit each satellite.
- Nav + footer mount in `layout.tsx`. Footer = OPEN MIRROR LLC · ABOUT · ✝️ ❤️ 🙏 (the icons ARE the CrossHeartPray link — no word).
- ☀️/🌙 family toggle (`om-theme`) lives in the bar; pages that compute JS colors follow the `om-theme` window event.
- **Copy style:** DJ's words. Short, plain, human. Never wordy or AI-sounding.
- **Deploys:** push to `main` = production deploy (Vercel). Batch related edits into one commit.
