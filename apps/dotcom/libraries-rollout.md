# Libraries rollout

How libraries goes from merged to available to everyone on tldraw.com, and how it is turned off again if something goes wrong.

Every stage is run from the admin page (`/admin` → Feature flags → `libraries`). Nothing in the rollout needs a deploy, and nobody is let in by code: there is no `@tldraw.com` bypass, so staff see libraries only once they are on the list.

## The flag

`libraries` is an `allowlist` flag. It starts with an empty list and **Allow everyone** off, so nobody sees libraries until they are added.

It gates two things:

- **The client.** `TldrawApp` only creates the libraries source when the flag is on, so a user without it runs no libraries queries and sees no libraries UI.
- **The server.** The library routes (`libraryItems.ts`, `copyLibrary.ts`) return `404` and the library mutators refuse with `forbidden` for a user without it. Both read the flag through `canUseLibraries`, which skips the stale cached value, so a removal from the list lands within about 90 seconds even while KV is failing.

Board libraries (libraries kept in a file's own document) are not gated: a file that already has one stays readable, and shapes placed from a library are ordinary shapes.

The client reads flags once per page load. A change reaches the server within about 90 seconds, and an open tab when it next reloads.

## Stages

### 1. Merge, off for everyone

The stack lands with the list empty. Migrations 055–058 deploy with the next release and are inert until someone is on the list: they create tables and a trigger and add a column, with no backfill.

Before merging:

- Run the libraries Zero queries (`library`, `library_item` by workspace) and the `effect_outbox` trigger against production-sized data, and check their plans with `EXPLAIN`. Staging has too few rows to show a slow query.
- Check that no other branch has claimed migration numbers from 055.

### 2. The libraries team

Add the people building and reviewing libraries to the list by email.

One person owns the list for the whole rollout. Two admins saving the same list overwrite each other.

### 3. All staff

Add every staff member. Stay here for at least a week of real use, across one release that has no libraries changes in it.

Watch:

- **PostHog**, events with `source: 'libraries'`: `toggle-libraries-panel`, `open-browse-libraries`, `place-library-item`, `create-library`, `add-to-library`, and `library-error` broken down by `reason`.
- **Sentry**, issues tagged with a library operation. Only failures with no known reason are reported there.
- **Zero**, view-syncer hydration time and slow queries for the library queries.
- **Postgres**, row growth in `library`, `library_item` and `library_item_object`, and `effect_outbox` depth and `last_error`.
- **R2**, object count and bytes for library items. Adding a starter pack copies its items, thumbnails and assets into the workspace.

### 4. Named outside users

Add design partners and friendly teams by email. Add whole teams rather than single members of a workspace: libraries belong to workspaces, so a member who isn't on the list can't see a library that a member on the list has made in their shared workspace.

### 5. Everyone

Turn on **Allow everyone**. Keep the list as it is, so turning **Allow everyone** off again returns to stage 4 rather than to nobody.

Make each change outside the 2–4 PM peak.

### 6. Remove the flag

A few weeks after stage 5, once the metrics above have been quiet:

- Remove the client gate, `canUseLibraries` and the mutators' flag check together. The workspace membership and `manageLibraries` checks are then the only authorization on the library routes and mutators, so the removal PR confirms they are enough on their own.
- Keep `libraries` in the feature-flags response, always on, so a tab still running an older bundle doesn't read the missing flag as off.

## Turning it off

Take users off the list, or turn **Allow everyone** off. Within about 90 seconds the routes and mutators refuse their writes, and the UI goes when each tab reloads. Until then, a tab that still shows libraries reports its rejected changes as `library-error` with `reason: 'rejected'`.

What turning it off doesn't undo:

- **Migrations** only go forward. A code revert has to leave the tables, and the Zero schema that names them, in place.
- **Data.** Libraries, items and their R2 objects made during the rollout stay. Deletions queued in `effect_outbox` still run.
- **Starter pack copies** are ordinary libraries in their workspace once added.

Libraries saved in the browser by the earlier local-only version are not migrated and aren't read. Tell anyone who used it before stage 2.

## The SDK

`@tldraw/libraries` ships separately from the tldraw.com rollout, on the SDK's own release schedule:

1. Make the package public, with its licence feature (`libraries`).
2. Release it in an SDK release, with release notes covering the new package, its UI events, headless hooks and record types.
3. Only then add libraries to the licence key generator, so keys don't list a feature no release has.
4. Reissue keys for anyone trialling it before announcing, since the licence gate fails closed.
