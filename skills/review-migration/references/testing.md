# Testing a migration

Everything in `apps/dotcom/zero-cache/` unless stated. The local dev stack (`yarn dev-app`) runs Postgres in Docker at `postgresql://user:password@localhost:6543/postgres`; there is no local `psql` binary, so use `docker exec -i tldraw_dotcom_dev-zstart_postgres-1 psql -U user -d <db>`.

## Contents

- What CI runs
- The opt-in real-Postgres suites
- Isolation patterns
- Rehearsing locks and concurrency
- Staging, preview, and the dry run

## What CI runs

Without a database:

- `validateMigrationFilenames.test.ts`: `NNN_description.sql`, unique and contiguous numbers. Runs on the merged tree, so it catches two branches choosing the same number.
- `migrationSql.test.ts`: `hasTransactionBlock` over every checked-in file. Case-insensitive, covers `COMMIT WORK`, `START TRANSACTION`, `ROLLBACK`, `END TRANSACTION`; misses bare `END;` (#10722).

That is all. The migration's SQL is not executed in CI.

## The opt-in real-Postgres suites

Set `ZERO_CACHE_TEST_POSTGRES_URL` and the three integration suites run; without it they `describe.skip`:

```bash
cd apps/dotcom/zero-cache && ZERO_CACHE_TEST_POSTGRES_URL='postgresql://user:password@localhost:6543/postgres' yarn test run
```

- `effect_outbox.test.ts` creates a throwaway database, applies the whole migration chain in filename order exactly as `migrate.ts` would, and exercises the outbox trigger and the group-delete cascade. Any new migration runs here for real. A migration that only works on a database with existing data (a guard `DO` block that raises on an empty table, say) will show up here.
- `delete_file_states.test.ts` and `stamp_comment_created_at.test.ts` test one trigger function each, loaded from whichever migration last defined it.

Add a focused suite for any trigger or function the migration defines or changes, in the same shape as those two.

## Isolation patterns

Three, chosen by what the migration SQL can be made to target:

- **Throwaway database** (`effect_outbox.test.ts`): `CREATE DATABASE` on an admin connection, run the chain verbatim, `DROP DATABASE` in `afterAll`. Needed when migration SQL hardcodes `public.` (`CREATE TABLE public.effect_outbox`), because `search_path` cannot redirect a qualified name. Runs the real chain, so it is also the closest thing to a deploy rehearsal.
- **Throwaway schema with `SET LOCAL search_path`** (`stamp_comment_created_at.test.ts`): for migration SQL that uses unqualified names. Everything the test owns is schema-qualified, and the statements that cannot be (the migration SQL and inserts whose trigger body resolves a table at execution time) run inside one transaction with `SET LOCAL search_path`. A transaction is the unit a transaction-mode pooler pins to one backend, and `SET LOCAL` expires with it.
- **Slice the function out of the chain** (`delete_file_states.test.ts`): scan the migrations for the last `CREATE OR REPLACE FUNCTION <name>`, cut from there to the first semicolon after the closing dollar-quote tag, strip the `public.` qualifier so the `CREATE OR REPLACE` lands in the test schema and not in production's `public` when the suite runs against a shared database. The tag varies (`$$` early, `$function$` in 050). A hard-coded filename kept this suite green against a body production no longer ran; scan, do not pin.

## Rehearsing locks and concurrency

`scripts/rehearse.sh` builds a scratch database from the chain up to the migration under review, applies it inside a transaction with a pause injected after a chosen statement, optionally races a concurrent transaction against it, and reports what `pg_locks` shows during the pause and whether either side deadlocked.

```bash
skills/review-migration/scripts/rehearse.sh 050
skills/review-migration/scripts/rehearse.sh 050 --seed seed.sql --concurrent rename.sql
skills/review-migration/scripts/rehearse.sh 050 --pause-after 'DROP TRIGGER IF EXISTS trigger_update_is_file_owner'
skills/review-migration/scripts/rehearse.sh 051 --file /tmp/draft.sql --concurrent rename.sql
```

- `--file <file>`: run this file in place of the checked-in migration. The chain still stops at the first checked-in file numbered at or above `NNN`, so a draft can use the next free number before it exists.
- `--seed <file>`: SQL run after the chain and before the migration, to create the rows the concurrent transaction needs.
- `--concurrent <file>`: a transaction started 0.7s after the migration begins, while it is paused. Write it as the app would: `BEGIN; UPDATE public."user" SET name = 'x' WHERE id = 'u1'; ROLLBACK;`.
- `--pause-after <regex>`: which statement to pause after. Default: the first `LOCK TABLE`, else the first `ALTER`/`DROP`.
- `--url <postgres url>`: default is the local dev stack.

The migration is rolled back at the end and the scratch database dropped. Read the output for `AccessExclusiveLock` rows against tables the migration should not be holding at that point, and for `deadlock detected` on either side. A deadlock here is a deadlock in production; no deadlock here is only evidence against writers, not readers (see `locks.md`).

To pick the concurrent transaction: look at the triggers on the tables the migration locks and at the mutators, and write the write path that touches those tables in the opposite order to the migration. For 050 that was a user rename, because a trigger on `user` wrote `file`.

## Staging, preview, and the dry run

- **Local and test databases run Zero as superuser**, so Postgres event triggers exist and a column add takes Zero's in-place path. On Supabase (staging, preview, production) the change arrives through the manual `update_schemas()` hook and every column add backfills. Nothing local reproduces that window; size it from the production row count instead (see `zero.md`).
- **Staging** runs the migration on the push to `main`, in the same deploy workflow as production. Staging Zero has no connected clients, so it proves the SQL and the runner, not the lock behavior under traffic.
- **Preview** (`dotcom-preview-please` label) creates a fresh Supabase branch and runs the entire chain from 000. A faithful rehearsal of a clean install; not of a migration against production data.
- **Dry run** is part of every deploy: `migrate --dry-run` applies every pending file inside a transaction and rolls back, then the real run applies them. Both appear in the deploy log as `✅ NNN applied`, the first followed by `🧹 Rolling back dry run...`. Two separate transactions, so a green dry run does not mean the real run cannot deadlock. A `-- no-transaction` migration is skipped by the dry run.
- **Production** is the only place with live traffic. The deploy log has the runner output; `zero_sync_pipeline_resets_total{reason="schema-change"}` on `grafanacloud-prom` confirms the commit reached Zero.
