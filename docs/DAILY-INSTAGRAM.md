# Dog of the Day → Instagram (DontCloneMeTom)

This site runs the shared **Open Mirror Daily Social Engine** (canonical core:
`open-mirror/packages/daily-social-engine`; full Meta setup + operations
guide: `crossheartpray/docs/DAILY-INSTAGRAM.md` — everything there applies
here with this brand's env vars).

Brand specifics:

- **Content**: one verified adoptable dog near ZIP 63040 per day, from the
  RescueGroups.org v5 API (`RESCUEGROUPS_API_KEY`). Eligibility: currently
  available + real photo + real name + identified rescue + working listing
  URL + not featured recently (recent listing IDs are read from the
  account's own captions). Nothing about a dog is ever invented.
- **Selection**: deterministic per date over current listings; the admin's
  "Choose another dog" control steps it with `?offset=N`.
- **Routes**: `/today` (permanent bio link), `/dogs/[id]` (permanent per-dog
  archive; survives delisting with a clear notice),
  `/api/social/dog-of-the-day/<date>.png` (1080×1350 daily card),
  `/api/social/dog-card/<id>.png` (community "Make a Dog Card"),
  `/api/social/instagram/publish`, `/admin/social?key=…`.
- **Cron**: 13:45 UTC daily (vercel.json), publishes only when
  `INSTAGRAM_AUTOPUBLISH_ENABLED=true`.
- **Archive note**: dogs are archived by listing id (`/dogs/[id]`), not by
  date — availability changes over time, so a dated page could not honestly
  reproduce a past day's dog.
- **GA events**: `dcmt_today_viewed`, `dcmt_dog_viewed`,
  `dcmt_adoption_listing_opened`, `dcmt_card_downloaded`,
  `dcmt_caption_copied`, `dcmt_link_copied`, `dcmt_share_opened`.
- **Tests**: `npm test` (eligibility, deterministic selection, recent-dog
  exclusion, caption parity, UTMs).
