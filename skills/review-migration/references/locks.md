# Locks and live traffic

The migration runs against production while every open tab is writing to it. Postgres locks are the whole story of whether that is a few milliseconds of queued writes or a deploy that hangs, deadlocks, or blocks board saves.

## Contents

- Which statement takes which lock
- Held until COMMIT
- The runner's timeouts
- Deriving the app's lock order
- Reader deadlocks and why the migration is the right victim
- Expensive statements
- DML inside a migration
- The 050 story

## Which statement takes which lock

| Statement | Lock on the table | Blocks |
| --- | --- | --- |
| `ALTER TABLE ... ADD/DROP COLUMN`, `SET NOT NULL`, `ALTER TYPE`, `ADD/DROP CONSTRAINT`, `RENAME` | ACCESS EXCLUSIVE | everything, including SELECT |
| `DROP TRIGGER`, `CREATE TRIGGER` | ACCESS EXCLUSIVE | everything |
| `DROP INDEX` | ACCESS EXCLUSIVE | everything |
| `CREATE INDEX` | SHARE | INSERT, UPDATE, DELETE for the whole build |
| `CREATE INDEX CONCURRENTLY` | SHARE UPDATE EXCLUSIVE | other DDL only; needs `-- no-transaction` |
| `ALTER TABLE ... ADD CONSTRAINT ... CHECK ... NOT VALID` | ACCESS EXCLUSIVE, milliseconds | everything, briefly |
| `ALTER TABLE ... VALIDATE CONSTRAINT` | SHARE UPDATE EXCLUSIVE | other DDL only; scans the table |
| `DROP CONSTRAINT` (foreign key) | ACCESS EXCLUSIVE on the referencing table, also locks the referenced table | both |
| `CREATE OR REPLACE FUNCTION`, `DROP FUNCTION` | catalog only | nothing on the table |
| `UPDATE`, `INSERT ... SELECT`, `DELETE` | ROW EXCLUSIVE, plus row locks | other writers of the same rows |
| `LOCK TABLE ... IN ACCESS EXCLUSIVE MODE` | ACCESS EXCLUSIVE | everything |
| `DO $$ ... SELECT ... $$` | ACCESS SHARE | only ACCESS EXCLUSIVE |

## Held until COMMIT

Every lock the migration takes is held until the runner's transaction commits, which is after the last pending file. A `DROP TRIGGER ON "user"` on line 30 holds `user` through a full-table scan on line 165 and through every later file in the same deploy. Order statements so the tables held during the expensive work are the fewest possible: guard checks, then locks, then the scan, then catalog-only work, then the drops that lock further tables.

Writes to a locked table from the app queue until COMMIT. Room persists bump `file."updatedAt"` every few seconds per active room, `initUser` inserts into `user`, and every file open upserts `file_state`, so `file`, `user`, and `file_state` are never idle.

## The runner's timeouts

- `SET LOCAL lock_timeout = '10s'` (`migrate.ts`): bounds how long any single lock acquisition waits. Without it one long reader makes the deploy hang while every room persist queues behind the waiting DDL. It does not bound how long a lock is held once acquired.
- `deadlock_timeout` is the Postgres default of 1s and cannot be raised on Supabase (superuser only). It fires before `lock_timeout`, so a cycle is resolved by deadlock detection, not by the timeout.
- Statement timeout is not set for the migration connection.

A failure from either aborts the transaction, the migrate step exits non-zero, and the deploy stops before Zero, the workers, or the client roll. A rerun of the deploy picks up where it left off because nothing was recorded.

## Deriving the app's lock order

Writers acquire locks in the order they touch tables, and triggers extend that order invisibly. To find the order the migration must respect:

1. List the tables the migration will lock.
2. For each, list the triggers installed on it at the time the migration runs (`git grep -n "ON public.\"<table>\"\|ON <table>" apps/dotcom/zero-cache/migrations/` and take the latest definition) and note which other tables their bodies write. A trigger on `user` that does `UPDATE "file"` means a `user` write holds `user` then takes `file`.
3. For the mutators (`packages/dotcom-shared/src/mutators.ts`), note the order each one reads and writes the tables. Every `file_state` writer reads `file` first; `user.update` touches only `user`.
4. The migration takes its locks in the same order as the writers. If the natural statement order would not, put an explicit `LOCK TABLE a, b IN ACCESS EXCLUSIVE MODE` right after the guard checks. `LOCK TABLE` with several tables acquires them in the listed order.

This eliminates deadlocks with writers, whose order is fixed by code. It does not eliminate deadlocks with readers.

## Reader deadlocks and why the migration is the right victim

A plain `SELECT` takes ACCESS SHARE on each table as it opens it, and a query joining two tables, or a transaction reading two tables in sequence, can take them in the opposite order to the migration. Then: migration holds AE on A and wants AE on B; reader holds AS on B and wants AS on A. Neither can proceed. Postgres runs the deadlock check on whichever waiter has been waiting longer than `deadlock_timeout`, and that backend is the one killed. The migration is often the later waiter, and so the victim.

No lock ordering prevents this, because readers do not agree on an order. The correct response is a retry: the migration rolls back atomically, the reader on the other side finishes in milliseconds, and the second attempt gets through. Until `migrate.ts` retries on SQLSTATE `40P01` (#10725), the retry is `gh run rerun <deploy-run-id> --failed`. The dry run and the real run are separate transactions, so a dry run that passed says nothing about whether the real run will hit a reader.

The window is milliseconds during lock acquisition, so it scales with traffic. Off-peak halves the odds; it does not remove them.

## Expensive statements

- `ALTER COLUMN ... SET NOT NULL` scans the whole table under ACCESS EXCLUSIVE. On a large table, add `CHECK (col IS NOT NULL) NOT VALID` in one release (milliseconds), `VALIDATE CONSTRAINT` in the next (scans under SHARE UPDATE EXCLUSIVE, blocks nothing), then `SET NOT NULL` and `DROP CONSTRAINT` in the third: Postgres 12+ uses the validated CHECK to skip the scan. The three cannot share a transaction because the NOT VALID add holds its lock through the VALIDATE scan and the runner puts every pending file in one transaction. Zero never sees a CHECK constraint, so the first two releases cause no pipeline reset.
- `ADD COLUMN ... DEFAULT <volatile>` (`now()`, a function call) rewrites the table. A constant default is metadata-only in Postgres but may still be a Zero backfill (see `zero.md`).
- `ALTER COLUMN ... TYPE` rewrites the table unless the change is binary-compatible.
- `CREATE INDEX` without `CONCURRENTLY` holds SHARE for the whole build, blocking every write to the table. Use the `-- no-transaction` marker and `CONCURRENTLY` on any table with live writers.
- A backfill `UPDATE` or `INSERT ... SELECT` over a large table holds row locks on every row it touches until COMMIT and fires every row trigger. Migration 044's `INSERT ... SELECT` over ~746k `file_state` rows was seconds; check the current count before assuming.

Size against production, not the local dev stack: `SELECT count(*) FROM <table>` and `SELECT pg_size_pretty(pg_total_relation_size('<table>'))` on staging are a floor, production is the number that matters.

## DML inside a migration

Row triggers fire per row, so a backfill on `file` runs `file_effect_outbox_fn` for every row it touches. That function skips no-op updates by comparing a fixed list of columns; a backfill that writes a column outside that list produces one `effect_outbox` row per file and the sync-worker's effect processor drains them all. Every changed row also replicates through Zero and reaches every client that syncs it.

The replication side is the larger cost. A mass update of a published table commits as one transaction, and Zero writes it through its change log as one unit before anything after it can replicate: migration 036's update of ~980k `group` rows took 15.5 minutes to write through and blocked every other write from reaching clients for that long (Rocicorp's report on the 2026-06-18 incident). Batch large updates outside the migration so replication proceeds between batches, or add a column with a default and let Zero's backfill carry the value asynchronously (see `zero.md`). Either way, know the row count and the trigger list before it runs.

## The 050 story

Migration 050 (#10591, September 2026) dropped four legacy columns across `file` and `file_state`, dropped three triggers, redefined four functions, and set `file."owningGroupId"` NOT NULL. Three things went wrong or nearly did, in order:

1. Review found the statement order took `file` (a `DROP TRIGGER` on it) before `user` (another `DROP TRIGGER`), while `update_file_owner_details_trigger` on `user` did `UPDATE "file"`. A user rename in flight held `user` and waited on `file`; the migration held `file` and waited on `user`. Reproduced locally with a `pg_sleep` between the two drops and a concurrent rename: `deadlock detected`. Fix: `LOCK TABLE public."user", public."file"` right after the guard check, matching the writer order, and the `SET NOT NULL` scan moved up so `file_state` was never held during it.
2. Staging applied it first time. Production's dry run applied it first time. Production's real run, five seconds later, deadlocked against a reader: `Process A waits for AccessExclusiveLock on relation X; Process B waits for AccessShareLock on relation Y`. The deploy aborted with nothing else rolled.
3. `gh run rerun --failed` applied it in about nine seconds. One `schema-change` pipeline reset per client group, connected clients level through the deploy.

`scripts/rehearse.sh` is the local reproduction of step 1, generalised.
