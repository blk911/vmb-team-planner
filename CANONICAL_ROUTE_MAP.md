# Canonical Route Map

## Goal

Run the VMB app from a single canonical origin while Firebase remains the shared backend for auth and data.

Current canonical host target:

- `app root on this repo's Vercel project`

## Route Ownership

Routes already owned locally in this repo:

- `/` -> planner UI
- `/admin` -> planner admin
- `/member` -> planner member handoff
- `/auth.js` -> shared auth helper
- `/global-nav.js` -> shared nav helper

Routes currently hosted in the marketing app:

- `https://vmb-mkt.vercel.app/marketing-decks`
- `https://vmb-mkt.vercel.app/owner-deck`
- `https://vmb-mkt.vercel.app/dashboard/targets`

## Phase Structure

Phase 1: Same-origin shell

- Navigation points to same-origin paths only.
- Planner/admin stay on this repo's canonical app host.
- Marketing/data links stay on the real marketing host until those routes are merged locally.
- Auth stays on the canonical origin for planner and admin pages in this repo.
- Main marketing nav target is now `https://vmb-mkt.vercel.app/marketing-decks`.
- `/owner-deck` remains available on the marketing host as a legacy hold route and is not the primary marketing landing page.

Phase 2: Merge marketing routes locally

- Copy the marketing route implementation into this repo.
- Replace external marketing-host links with local files or route handlers.
- Keep the same public URLs so navigation and auth do not change again.

Phase 3: Remove legacy split-host assumptions

- Remove hardcoded cross-origin URLs.
- Remove any remaining duplicated auth logic in split apps.
- Keep one canonical route map and one auth authority.

## Merge Targets

When the marketing repo is ready to merge, these are the first local route targets to create in this repo:

- `/marketing-decks`
- `/owner-deck`
- `/dashboard/targets`

If those routes depend on shared nested assets or child routes, keep these local subtrees aligned:

- `/owner-deck/*`
- `/dashboard/*`

## Notes

- The current proxy structure is a bridge, not the final architecture.
- Direct cross-origin links are temporarily restored because the marketing app does not render correctly through the planner-host rewrite path.
- Once the marketing routes are copied in, the nav can switch back to local same-origin paths.
