# What Zero does with a migration

Zero's own rules for schema changes are at https://zero.rocicorp.dev/docs/schema#schema-changes: expand changes (adding a column or table) deploy provider first, DB then API then client; contract changes (removing) deploy consumer first, client then API then DB; a new column is not exposed to clients until its backfill has finished, tracked in the `backfilling` table. Read that page first. This file is only what the page cannot know about tldraw.com, verified against `@rocicorp/zero` 1.9.0 (`apps/dotcom/zero-cache/package.json`); re-check the cited source files after a Zero upgrade.

## Contents

- Our deploy runs in the expand order
- The manual `update_schemas()` path
- What is replicated
- How a failure surfaces here
- One transaction, one reset
- Backfill done-checks
- Signals

## Our deploy runs in the expand order

`internal/scripts/deploy-dotcom.ts` runs migrations, then the Zero apps on Fly, then the sync-worker, then the client. That is Zero's expand order, so an additive migration can ship with its code and the deploy sequences it; a contract migration cannot, because the client and sync-worker that stop declaring the column deploy after the column is gone. For a drop or rename, the code half ships in a release before the migration. #10653 then #10591 is the worked example.

Additive changes still need the backfill gate: the deploy does not wait for Zero to finish backfilling before rolling the sync-worker and client, so code that reads a new column or table ships a deploy after the migration, once the backfill is confirmed done.

| Change | Order here | Why |
| --- | --- | --- |
| Add column or table clients read | Migration alone; confirm the backfill done on every serving replica; code a deploy later | The deploy does not wait for the backfill |
| Mass update of a published table | Not in a migration: batch it outside, or add a column and let the backfill carry it | One transaction replicates as one change-log write, and nothing behind it reaches clients until it is through |
| Drop or rename column, drop table | Code that stops declaring it a release earlier; then migration | The consumers deploy after the migration in our pipeline |
| CHECK, trigger, function, FK, server-only table | Any time | Zero does not see them |

## The manual `update_schemas()` path

Supabase does not deliver Postgres event triggers to Zero, so migration 032 turned on `ddlDetection` and `migrate.ts` calls `zero_0.update_schemas()` once after the last file. That works, with one consequence the docs do not mention: Zero's optimisation that adds a column with a simple constant default in place (`db/pg-to-lite.js` `mapPostgresToLiteDefault`) is gated on the change arriving through an event trigger tagged `ALTER TABLE`. The manual path carries no tag and takes the always-backfill branch (`services/change-source/pg/change-source.js`, `alwaysBackfill = ddlTag !== "ALTER TABLE"`). On production every column added to a published table is backfilled, whatever its default, and is invisible to clients and the sync-worker until that finishes on every replica. A query naming it meanwhile fails with `"<table>"."<column>" does not exist or is not one of the replicated columns`.

The local dev stack runs Zero as superuser, so event triggers exist there and the optimised path applies; the throwaway test databases have no Zero at all. A column add looks instant locally, and backfills on staging, preview, and production.

Two rules follow:

- Code that reads a new column ships after the backfill is confirmed done, never in the same deploy as the migration.
- Do not mass-update a published table in a migration. Add a column with a default and let the backfill carry the value; a column can be filled with real values before it is published, since the backfill copies whatever is there when it starts. Where a mass update is unavoidable, batch it outside the migration.

## What is replicated

- Tables: only members of the `zero_data` publication (`ALTER PUBLICATION zero_data ADD TABLE`; created in 016, extended in 023 and 040 to 044). A server-only table must not be added.
- Rows: every column of a published table. There is no column list on the publication, so a private column on a published table reaches every client that syncs the row. That is why `file_visitor` (044) is its own table rather than columns on `file_state`.
- Replica identity: `file` and `file_state` are `REPLICA IDENTITY FULL` (015, 018) so old row values are available on UPDATE and DELETE. A new table with a primary key gets the default identity, which is enough unless a trigger or Zero needs old values of non-key columns.
- Indexes: mirrored into the SQLite replica, so an index on a published table is built on every replica. Zero drops them there before a column drop because SQLite errors where Postgres would cascade.
- Not replicated: CHECK constraints (including `NOT VALID` ones), foreign keys, triggers, functions, views, tables outside the publication. None of these cause a schema change or a pipeline reset, so they can ship in an earlier release, which the `CHECK ... NOT VALID` then `VALIDATE` pattern for a large `SET NOT NULL` relies on (see `locks.md`).

## How a failure surfaces here

- Connected clients: the view-syncer's `checkClientSchema` rejects a client schema that declares a column or table the replica lacks with `SchemaVersionNotSupported`; the client disables its client group and calls `onUpdateNeeded`, which `TldrawApp.ts` routes to the "please reload" modal (`MaybeForceUserRefresh`). A reload serves whatever bundle Vercel has, so in the contract case this is a lockout until the client deploy, the last step, lands.
- Sync-worker: `@rocicorp/zero/server` reads `pg_catalog` and asserts the server schema (`packages/dotcom-shared` `tlaSchema`) before running any mutator, with a `missingColumn` error per declared-but-absent column. Every push on every table fails until the sync-worker redeploys.
- Explicit writes of a dropped column anywhere (`isPinned: false` in a mutator) fail with 42703.

The client type can stay `.optional()` when a column becomes `NOT NULL`: tightening it does not change a value a client already holds from before the migration replicated, and the nullability guards it removes may be load-bearing.

## One transaction, one reset

Every DDL on a published table makes each view-syncer throw `ResetPipelinesSignal("schema for table X has changed")`, tear down every query pipeline for every connected client group, and re-hydrate every query from scratch. That happens once per DDL transaction, whatever the number of statements, and the runner keeps every pending migration in one transaction. Splitting a migration across deploys multiplies the resets; combining unrelated DDL into one deploy does not.

## Backfill done-checks

Completion is per replica. The replication manager streams the backfill, writes a `backfill-completed` change into the change stream, and clears the upstream `backfilling` row; each view-syncer then applies that change to its own replica when it reaches it (`services/change-source/common/backfill-manager.js`, `services/replicator/change-processor.js`). A view-syncer that is behind still lacks the column after the upstream row is gone. So:

- Necessary: `SELECT * FROM "zero_0/cdc"."backfilling" WHERE "schema" = 'public'` on the upstream database returns no rows.
- Then sufficient: every serving replica has applied the completion. Replication lag (`zero_replication_total_lag_millisecond`) back at its baseline after the table empties, and, as Zero's docs suggest, a client observing the column on synced rows. Client connections are pinned to one view-syncer machine by the sticky-session cookie, so one client sees one replica; check from more than one, or wait until lag has been flat for a few minutes.
- Not usable: the `Backfill completed` and `finished backfilling` log lines are INFO, and the Fly apps log at WARN (`ZERO_LOG_LEVEL` in the Fly templates).

## Signals

- A DDL transaction committed on production: `increase(zero_sync_pipeline_resets_total{deployment_environment="production", reason="schema-change"}[15m])` on the `grafanacloud-prom` datasource goes non-zero. `reason="advancement-timeout"` has a high constant baseline (#10726) and is unrelated.
- Clients held: `sum(zero_sync_active_clients{deployment_environment="production"})` does not drop across the deploy. One connection is one open tab of a signed-in user; hidden tabs disconnect after five minutes.
- Replication health during a backfill: `zero_replication_total_lag_millisecond`, and WAL retained per slot from `pg_replication_slots` (`pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)`).
