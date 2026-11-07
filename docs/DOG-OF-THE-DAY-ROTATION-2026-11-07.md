# Dog of the Day rotation — Nov 7 2026

## Why the same dogs kept appearing

`selectConfirmedDogForDate` put every dog with an already-confirmed destination
(the hand-audited Petfinder dogs) at the front, then took the first one after a
date-seeded starting point in listing-id order. Near 63040 only 12 of the 23
eligible dogs had an audit, and the ones sitting after long gaps in id order won
most days. Recomputed over the 60 days before Nov 7: 12 distinct dogs, Karma 18
times, and the 11 dogs without an audit never once. Nothing remembered who had
already had a turn — the Instagram-caption history it could read was empty
(no Meta credentials).

## How it picks now (`app/lib/rotation.ts`)

- **Rounds.** Every eligible dog gets one turn per round before any dog repeats.
  A new listing joins the round in progress.
- **Modest nudge for longer listings.** Inside a round the order is a weighted
  shuffle. Weight is 1.0 for a new listing, rising to 1.5 at one year
  (`listedAt` = RescueGroups `createdDate`; missing or future dates count as new).
- **No near repeats.** A dog featured in the last 7 days waits behind everyone else.
- **Live checks still decide eligibility, not order.** Candidates are checked in
  rotation order, 4 at a time, at most 8; the first confirmed one gets the day.
- **Switch-over.** `FEATURED_BEFORE_ROTATION` marks the 12 dogs the old pick
  featured as having had their round-one turn, so the neglected dogs go first.

## Memory across deploys

- `.github/workflows/record-dog-of-the-day.yml` runs at 06:20 UTC (just after
  midnight in Chicago) and 15:20 UTC. It asks the live site for today's dog and
  appends `{date, id, name}` to `dog-of-the-day.json` on the
  `dog-of-the-day-history` branch. That branch holds data only; its own
  `vercel.json` turns deployments off.
- `app/lib/featuredHistory.ts` reads the file from raw.githubusercontent.com
  (10-minute cache, 2.5 s timeout, strict validation).
- The rotation pins every recorded day and fills any unrecorded day by running
  its own rule forward from `ROTATION_EPOCH`, so a missed run or an unreachable
  file means less memory, never a broken page. Adoptions don't move anyone's
  turn: a recorded dog who has left the listings keeps her day.

## Turning it off or rolling back

- Pause recording: GitHub → Actions → Record Dog of the Day → Disable workflow.
- The history branch is harmless to keep; delete it with
  `git push origin --delete dog-of-the-day-history` (the site falls back to
  recomputing the rotation).
