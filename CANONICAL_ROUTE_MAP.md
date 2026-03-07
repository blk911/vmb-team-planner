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

Routes temporarily proxied to the marketing app:

- `/marketing-decks` -> `https://vmb-mkt.vercel.app/marketing-decks`
- `/marketing-decks/*` -> `https://vmb-mkt.vercel.app/marketing-decks/*`
- `/owner-deck` -> `https://vmb-mkt.vercel.app/owner-deck`
- `/owner-deck/*` -> `https://vmb-mkt.vercel.app/owner-deck/*`
- `/dashboard/targets` -> `https://vmb-mkt.vercel.app/dashboard/targets`
- `/dashboard/*` -> `https://vmb-mkt.vercel.app/dashboard/*`

## Phase Structure

Phase 1: Same-origin shell

- Navigation points to same-origin paths only.
- This repo's Vercel app proxies marketing pages that still live elsewhere.
- Auth stays on the canonical origin for planner and admin pages in this repo.
- Main marketing nav target is now `/marketing-decks`.
- `/owner-deck` remains available as a legacy hold route and is not the primary marketing landing page.

Phase 2: Merge marketing routes locally

- Copy the marketing route implementation into this repo.
- Replace external rewrites with local files or route handlers.
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
- Same-origin navigation is now prepared from this repo side.
- Once the marketing routes are copied in, the external rewrites can be removed without changing public paths.
