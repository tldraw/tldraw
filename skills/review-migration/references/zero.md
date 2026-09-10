# What Zero does with a migration

Verified against `@rocicorp/zero` 1.9.0 (`apps/dotcom/zero-cache/package.json`). Re-check the cited source files after a Zero upgrade.

## Contents

- How a DDL statement reaches a client
- What is replicated
- Shipping order by change type
- Column adds always backfill on production
- Column drops and renames
- New tables and the backfill window
- What Zero never sees
- Signals

## How a DDL statement reaches a client

1. Every DDL statement in the migration fires Zero's event triggers (`zero_ddl_start_0` on `ddl_command_start`, `zero_ddl_end_0` on `ddl_command_end`), which call `zero_0.update_schemas(...)`. That writes the before and after schema as a logical message into the WAL, inside the migration's transaction. Supabase does not fire event triggers for `ALTER PUBLICATION`, which is why migration 032 turned on `ddlDetection` and `migrate.ts` calls `zero_0.update_schemas()` itself after the last file.
2. At COMMIT the replication manager (`production-zero-rm`, one machine, holds the logical replication slot on publication `zero_data`) reads the messages, diffs the two schemas (`services/change-source/pg/change-source.js`, `#makeSchemaChanges`), and applies the result to its SQLite replica. The change-streamer fans the transaction out to every view-syncer machine.
3. Each view-syncer (`production-zero-vs`, several machines) applies it to its own replica, then the snapshotter sees the schema-change row and throws `ResetPipelinesSignal("schema for table X has changed")`. The view-syncer tears down every query pipeline for every connected client group, checks each client's declared schema against the replica (`checkClientSchema`), and re-hydrates every query from scratch. This is one reset per DDL transaction, whatever the number of statements.
4. Clients whose schema still matches get pokes and carry on; usually nothing visible. Clients whose schema names a column or table the replica no longer has get `SchemaVersionNotSupported`, which `TldrawApp.ts` routes to `onUpdateNeeded` and the "please reload" modal (`MaybeForceUserRefresh`).

The sync-worker is the other consumer. `@rocicorp/zero/server` reads `pg_catalog` and asserts the server schema (`packages/dotcom-shared` `tlaSchema`) against it before running any mutator. A sync-worker whose schema declares a column the database lacks rejects every push, on every table, until it is redeployed.

## What is replicated

- Tables: only members of the `zero_data` publication. Added with `ALTER PUBLICATION zero_data ADD TABLE`, first created in 016 and extended in 023, 040 to 044.
- Rows: every column of a published table. There is no column list on the publication, so a private column on a published table reaches every client that syncs the row. That is why `file_visitor` (044) is its own table rather than columns on `file_state`.
- Replica identity: Zero needs old row values on UPDATE and DELETE for tables whose non-key columns matter to change processing. `file` and `file_state` are `REPLICA IDENTITY FULL` (015, 018). A new table with a primary key gets the default identity, which is enough unless a trigger or Zero itself needs old values of non-key columns.
- Indexes: mirrored into the SQLite replica, and dropped there before a column drop because SQLite errors where Postgres would cascade. Primary keys and unique indexes also drive `checkClientSchema`.
- Not replicated: CHECK constraints, foreign keys, triggers, functions, views, tables outside the publication.

## Shipping order by change type

| Change | Order | Why |
| --- | --- | --- |
| Add column to a published table | Migration first; confirm the backfill done on every replica; code a deploy later | On production every added column backfills and is invisible until that finishes; queries that touch it meanwhile error and drop the client |
| Add table clients read | Migrations alone; confirm backfill done on every replica; then code | Table is invisible until every replica finishes; all backfills share one queue |
| Mass update of a published table | Not in a migration: batch it outside, or add a column and let the backfill carry it | One transaction replicates as one change-log write, and nothing behind it reaches clients until it is through |
| Drop column | Code that stops declaring it a release earlier; then migration | Old client and old sync-worker both fail hard when it goes |
| Rename column | Same as drop, plus the add side | Zero applies the rename in place, but every consumer names the old column |
| Drop table | Remove from publication and from every consumer first; then drop | Same failure modes as drop column |
| CHECK, trigger, function, FK, server-only table | Any time | Zero does not see them |

## Column adds always backfill on production

Every column added to a published table on production is backfilled: Zero streams every row of the table again, on the replication manager and then on every view-syncer, and the column stays invisible to view-syncers until that finishes (`change-source.js` `#makeSchemaChanges`, the `addColumn.backfill` branch). A client or sync-worker query that names the column in that window fails with `"<table>"."<column>" does not exist or is not one of the replicated columns`. The window scales with the table: tens of minutes for a million rows.

Zero does have an optimisation that adds a column with a simple constant default in place (`db/pg-to-lite.js` `mapPostgresToLiteDefault`: a numeric literal, `true`/`false`, a quoted string with a cast, an empty array), but it is gated on the schema change arriving through Postgres event triggers with the tag `ALTER TABLE`. Supabase does not deliver those, so tldraw's changes arrive through the manual `zero_0.update_schemas()` hook that `migrate.ts` calls, which carries no tag and takes the always-backfill branch (`alwaysBackfill = ddlTag !== "ALTER TABLE"`). Until a Zero release extends the optimisation to the manual path, assume the backfill.

The local dev stack and the throwaway test databases run Zero as superuser, so event triggers exist there and the optimised path applies. A migration that adds a column will look instant locally and in tests, and backfill on staging, preview, and production.

Postgres itself adds a column with a non-volatile default as a metadata-only change since version 11. The migration's own timing says nothing about the Zero cost.

Two rules follow:

- Gate the code that reads a new column on the backfill finishing, not on the deploy finishing. Ship the migration first; ship the code a deploy later.
- Do not mass-update a published table in a migration. Add a column with a default instead, and let the backfill carry the value asynchronously; a column can even be filled with real values before it is published, since the backfill copies whatever is there when it starts.
- Where a mass update is unavoidable, throttle it in batches outside the migration so replication proceeds between them.

## Column drops and renames

Three consumers name the column and all fail at the moment it changes:

- Connected clients: `checkClientSchema` rejects a client schema that declares a missing column, the client disables its client group and calls `onUpdateNeeded`, the app shows the reload modal. A reload serves whatever bundle Vercel has, so this is a lockout until the SPA deploy lands, and the SPA is the last step of the deploy.
- Sync-worker: `zero-server` asserts the server schema against `pg_catalog` before any mutator, with a `missingColumn` error per declared-but-absent column, so every push fails until the sync-worker redeploys.
- Explicit writes of the column anywhere (`isPinned: false` in a mutator) fail with 42703.

So the code half ships a release earlier: remove the column from `tlaSchema.ts`, the mutators, fixtures and tests, deploy, then the migration. Migration 021 (`RENAME COLUMN`) shipped with its schema change in one PR and bounded the outage to the deploy duration; #10653 then #10591 is the split done properly.

The client type can stay `.optional()` when a column becomes `NOT NULL`: tightening the client type does not change the runtime value a client already holds from before the migration replicated, and the nullability guards it removes may be load-bearing.

## New tables and the backfill window

A newly published table is invisible to view-syncers until Zero has backfilled it on the replication manager and on every view-syncer machine. A query that touches it in that window errors and can kill the client's Zero connection. All pending backfills share one queue, so an empty table can wait behind a large one.

When several new tables ship together (040 to 044 did, including a `file_visitor` backfilled from `file_state`), ship the migrations in one deploy, wait for the backfill, then ship the code a deploy later. Done-checks:

- Authoritative and scriptable, for columns and tables alike: `SELECT * FROM "zero_0/cdc"."backfilling" WHERE "schema" = 'public'` on the upstream database returns no rows.
- RM logs (`fly logs -a production-zero-rm`): `Finished streaming <N> rows` per table, and `Backfill completed: <source>` at INFO. Production logs at WARN, so the log lines may be absent; the table is the reliable check.
- Each VS machine: `finished backfilling <table>`. This per-replica line is the visibility gate.
- `pg_stat_activity` has no `backfill-stream` or `backfill-replication-session` sessions.
- From a client: once the backfill is done, the new column appears on each synced row's value regardless of the client schema.

## What Zero never sees

CHECK constraints (including `NOT VALID` ones), triggers, functions, foreign keys, and tables outside the publication produce no schema change and no pipeline reset. That makes them free to ship in a separate earlier release, which is what the `CHECK ... NOT VALID` then `VALIDATE` pattern for a large `SET NOT NULL` relies on (see `locks.md`).

## Signals

- A DDL transaction committed on production: `increase(zero_sync_pipeline_resets_total{deployment_environment="production", reason="schema-change"}[15m])` on `grafanacloud-prom` goes non-zero. `reason="advancement-timeout"` runs constantly at a high baseline (#10726) and is unrelated.
- Clients held: `sum(zero_sync_active_clients{deployment_environment="production"})` does not drop across the deploy. One connection is one open tab of a signed-in user; hidden tabs disconnect after five minutes.
- Replication health during a backfill: `zero_replication_total_lag_millisecond`, WAL retained per slot (`pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)` from `pg_replication_slots`), both on the Zero health dashboard.
