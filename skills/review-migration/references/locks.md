# Locks and live traffic

Postgres documents the lock modes and which statement takes which: https://www.postgresql.org/docs/current/explicit-locking.html for the modes, what conflicts with what, and how deadlocks are detected and resolved; https://www.postgresql.org/docs/current/sql-altertable.html for the lock each `ALTER TABLE` form takes and which forms rewrite or scan the table; https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY for `CONCURRENTLY`; https://www.postgresql.org/docs/current/runtime-config-client.html for `lock_timeout` and https://www.postgresql.org/docs/current/runtime-config-locks.html for `deadlock_timeout`. Read those for any statement in the migration. This file is only what those pages cannot know: how the runner holds locks, what our writers do, and what has gone wrong here.

## Contents

- Held until the runner commits
- The runner's timeouts
- Deriving the app's lock order
- Reader deadlocks and why the migration is the right victim
- Statements that need more than one release here
- DML inside a migration
- Worked example: migration 050

## Held until the runner commits

Every lock the migration takes is held until the runner's transaction commits, which is after the last pending file, not the end of the statement or the file. A `DROP TRIGGER ON "user"` on line 30 holds `user` through a full-table scan on line 165 and through every later file in the same deploy. Order statements so the tables held during the expensive work are the fewest possible: guard checks, then locks, then the scan, then catalog-only work, then the drops that lock further tables.

Writes to a locked table from the app queue until COMMIT. Room persists bump `file."updatedAt"` every few seconds per active room, `initUser` inserts into `user`, and every file open upserts `file_state`, so `file`, `user`, and `file_state` are never idle. Those three are the tables to treat as hot.

## The runner's timeouts

- `SET LOCAL lock_timeout = '10s'` (`migrate.ts`): bounds how long any single lock acquisition waits. Without it one long reader makes the deploy hang while every room persist queues behind the waiting DDL. It does not bound how long a lock is held once acquired.
- `deadlock_timeout` is the Postgres default of 1s and cannot be raised on Supabase (superuser only). It fires before `lock_timeout`, so a cycle is resolved by deadlock detection, not by the timeout.
- No statement timeout on the migration connection.

A failure from either aborts the transaction, the migrate step exits non-zero, and the deploy stops before Zero, the workers, or the client roll. A rerun of the deploy picks up where it left off because nothing was recorded.

## Deriving the app's lock order

Writers acquire locks in the order they touch tables, and triggers extend that order invisibly. To find the order the migration must respect:

1. List the tables the migration will lock.
2. For each, list the triggers installed on it at the time the migration runs (`git grep -n "ON public.\"<table>\"\|ON <table>" apps/dotcom/zero-cache/migrations/` and take the latest definition) and note which other tables their bodies write. A trigger on `user` that does `UPDATE "file"` means a `user` write holds `user` then takes `file`.
3. For the mutators (`packages/dotcom-shared/src/mutators.ts`), note the order each one reads and writes the tables. Every `file_state` writer reads `file` first; `user.update` touches only `user`.
4. The migration takes its locks in the same order as the writers. If the natural statement order would not, put an explicit `LOCK TABLE a, b IN ACCESS EXCLUSIVE MODE` right after the guard checks. `LOCK TABLE` with several tables acquires them in the listed order.

This eliminates deadlocks with writers, whose order is fixed by code. It does not eliminate deadlocks with readers.

## Reader deadlocks and why the migration is the right victim

A plain `SELECT` takes ACCESS SHARE on each table as it opens it, and a query joining two tables, or a transaction reading two tables in sequence, can take them in the opposite order to the migration. Then: migration holds AE on A and wants AE on B; reader holds AS on B and wants AS on A. Postgres kills whichever waiter runs the deadlock check, which is the one that has been waiting past `deadlock_timeout`; the migration is often the later waiter, and so the victim.

No lock ordering prevents this, because readers do not agree on an order. The correct response is a retry: the migration rolls back atomically, the reader on the other side finishes in milliseconds, and the second attempt gets through. Until `migrate.ts` retries on SQLSTATE `40P01` (#10725), the retry is `gh run rerun <deploy-run-id> --failed`. The dry run and the real run are separate transactions, so a dry run that passed says nothing about whether the real run will hit a reader.

The window is milliseconds during lock acquisition, so it scales with traffic. Off-peak halves the odds; it does not remove them.

## Statements that need more than one release here

The docs say what each statement locks and scans; the runner's single transaction turns some of them into multi-release changes:

- **`SET NOT NULL` on a large table.** The docs describe the `CHECK (col IS NOT NULL)` route: add it `NOT VALID`, `VALIDATE CONSTRAINT` (a scan that blocks no reads or writes), then `SET NOT NULL` skips its own scan. Here the three cannot share a deploy, because the `NOT VALID` add holds ACCESS EXCLUSIVE through the validate scan when both run in the runner's one transaction. Three migrations in three releases. Zero never sees a CHECK constraint, so the first two cause no pipeline reset.
- **An index on a table with live writers.** `CREATE INDEX CONCURRENTLY` is refused inside a transaction block and the runner wraps every file in one, so it fails the deploy; a plain `CREATE INDEX` holds SHARE for the whole build, blocking every write. #10576 adds a per-file opt-out for this. Until it lands, build such an index out of band or wait for that PR.
- **Anything that rewrites or scans a hot table** (see the `ALTER TABLE` notes for which forms do) runs under ACCESS EXCLUSIVE for the duration, and on production the duration comes from the production row count, not the local one. Size it before it ships.

## DML inside a migration

Row triggers fire per row, so a backfill on `file` runs `file_effect_outbox_fn` for every row it touches. That function compares a fixed list of columns and returns without an outbox row when none of them changed, so a backfill that writes only unlisted columns produces nothing, and one that touches a listed column produces one `effect_outbox` row per file for the sync-worker's effect processor to drain. Every changed row also replicates through Zero and reaches every client that syncs it.

The replication side is the larger cost. A mass update of a published table commits as one transaction, and Zero writes it through its change log as one unit before anything after it can replicate: a full-table update of `group` in migration 036 took long enough to write through that no other write reached clients meanwhile. Batch large updates outside the migration so replication proceeds between batches, or add a column with a default and let Zero's backfill carry the value asynchronously (see `zero.md`). Either way, know the row count and the trigger list before it runs.

## Worked example: migration 050

Migration 050 dropped four legacy columns across `file` and `file_state`, dropped three triggers, redefined four functions, and set `file."owningGroupId"` NOT NULL. The first draft dropped the trigger on `file` before the trigger on `user`, while `update_file_owner_details_trigger` on `user` did `UPDATE "file"`: a user rename in flight holds `user` and waits on `file`, the migration holds `file` and waits on `user`. The recipe in `testing.md` reproduces it with a `pg_sleep` between the two drops and a concurrent rename. The shipped version takes `LOCK TABLE public."user", public."file"` right after the guard check, matching the writer order, and runs the `SET NOT NULL` scan before any trigger drop so `file_state` is never held during it. That removes the writer deadlock; a reader can still force a rerun, as above.
