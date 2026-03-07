# Canonical Member Reset

## Canonical Profiles

These member ids are protected and should remain the stable identities for planner data and team membership:

- `admin` -> `admin@venmebaby.com`
- `jsw` -> `blk911@gmail.com`
- `katie` -> `oreo12798@gmail.com`
- `taylor` -> `taylormanaya@gmail.com`

Legacy aliases currently recognized during reset:

- `mem_c28a3b032e322_19c5283de53` -> `katie`
- `mem_28ee1e04347638_19c5283ae59` -> `taylor`

## Reference Fields That Can Hold Member Ids

The planner reset tool scans and remaps these fields in current browser storage:

- `planner.forceMember`
- `daily_planner.v1*` key suffixes for member workspaces
- `workspaceId`
- `ownerWorkspaceId`
- `memberId`
- `teamMemberId`
- `teamMemberIds`
- `_sharedWithIds`
- `legacyMemId`
- `LegacyMemId`
- `vmb_team[].id`
- `vmb_team[].workspaceId`

## Safe Reset Order

1. Upsert canonical member docs for `admin`, `jsw`, `katie`, `taylor`
2. Preview duplicate `teamMembers` docs and local planner references
3. Remap known legacy ids to canonical ids in local planner storage
4. Delete only duplicate `teamMembers` docs that confidently map to canonical profiles
5. Hold auth-bound duplicate docs for manual review if the duplicate doc id appears to still be the active auth uid record
6. Leave unknown docs untouched for manual review

## Important Scope Note

The admin reset action in this repo can safely repair:

- Firestore `teamMembers` docs
- planner data stored in the current browser's `localStorage`

It does not rewrite planner storage in other browsers or devices. Those require running the reset from the browser that owns that local planner state, or migrating planner state into Firestore first.

It also does not auto-delete auth-bound duplicate member docs when doing so could break a live Firebase uid-based access path. Those are reported and held for manual review.
