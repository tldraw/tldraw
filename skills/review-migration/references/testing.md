# Testing a migration

The Postgres mechanics the suites and the rehearsal lean on are documented upstream: `search_path` and schema-qualified names at https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH, `SET LOCAL` at https://www.postgresql.org/docs/current/sql-set.html, dollar quoting at https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-DOLLAR-QUOTING, the `pg_locks` view at https://www.postgresql.org/docs/current/view-pg-locks.html, and `pg_sleep` at https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-DELAY. Supabase preview branches are at https://supabase.com/docs/guides/deployment/branching. This file is what we run, where, and what each run does and does not prove. Paths are in `apps/dotcom/zero-cache/` unless stated.

The local dev stack (`yarn dev-app`, `apps/dotcom/process-compose.yaml`) runs Postgres in Docker at `postgresql://user:password@localhost:6543/postgres`. There is no local `psql` binary; use `docker exec -i tldraw_dotcom_dev-zstart_postgres-1 psql -U user -d <db>`.

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

- `effect_outbox.test.ts` creates a throwaway database and applies the whole migration chain in filename order, one file per `client.query`, so each file commits on its own where the runner holds every pending file in one transaction. Any new migration runs here for real. A migration that only works on a database with existing data (a guard `DO` block that raises on an empty table, say) shows up here.
- `delete_file_states.test.ts` and `stamp_comment_created_at.test.ts` test one trigger function each, loaded from whichever migration last defined it.

No Zero is attached to these databases. The suites prove the SQL and the trigger bodies, not the runner's transaction and nothing about replication. Add a focused suite for any trigger or function the migration defines or changes, in the same shape as those two.

## Isolation patterns

Three, chosen by what the migration SQL can be made to target:

- **Throwaway database** (`effect_outbox.test.ts`): `CREATE DATABASE` on an admin connection, run the chain verbatim, `DROP DATABASE` in `afterAll`. Needed when migration SQL hardcodes `public.` (`CREATE TABLE public.effect_outbox`), because `search_path` cannot redirect a qualified name.
- **Throwaway schema with `SET LOCAL search_path`** (`stamp_comment_created_at.test.ts`): for migration SQL that uses unqualified names. Everything the test owns is schema-qualified; the statements that cannot be (the migration SQL, and inserts whose trigger body resolves a table at execution time) run inside one transaction with `SET LOCAL search_path`, which is the unit a transaction-mode pooler pins to one backend and the scope `SET LOCAL` expires with.
- **Slice the function out of the chain** (`delete_file_states.test.ts`): scan the migrations for the last `CREATE OR REPLACE FUNCTION <name>`, cut from there to the first semicolon after the closing dollar-quote tag, and strip the `public.` qualifier so the `CREATE OR REPLACE` lands in the test schema and not in production's `public` when the suite runs against a shared database. The tag varies between migrations (`$$`, `$function$`). A hard-coded filename kept this suite green against a body production no longer ran; scan, do not pin.

## Rehearsing locks and concurrency

Build a scratch database from the chain, run the migration inside a transaction with a pause after its lock statement, and race the app's write path against it. Ten minutes with the local dev stack; every step is one `docker exec ... psql` call.

1. `CREATE DATABASE rehearse;` on the admin connection, then apply every migration below the one under review in filename order.
2. Seed the rows the concurrent transaction needs (a `user` row for a rename, say).
3. Copy the migration and insert `SELECT pg_sleep(3);` after the statement whose lock you want to watch: the `LOCK TABLE`, or the first `ALTER`/`DROP`. Wrap the copy in `BEGIN; SET LOCAL lock_timeout = '10s'; ... ROLLBACK;` and, just before the sleep, read `pg_locks` for the current backend (`pid = pg_backend_pid()`, `locktype = 'relation'`, joined to `pg_class` for the name, `mode <> 'AccessShareLock'`).
4. Start the copy in the background; 0.7s later start the concurrent transaction, written the way the app writes: `BEGIN; UPDATE public."user" SET name = 'x' WHERE id = 'u1'; ROLLBACK;`.
5. Read both outputs. `deadlock detected` on either side is a deadlock in production. Locks held against tables the migration should not be holding at that point mean the statement order is wrong. `DROP DATABASE rehearse;` when done.

To pick the concurrent transaction: look at the triggers on the tables the migration locks and at the mutators, and write the write path that touches those tables in the opposite order to the migration. For 050 that was a user rename, because a trigger on `user` wrote `file`; with the shipped ordering both sides complete, and with the `LOCK TABLE` removed and the pause between the two trigger drops the migration side reports `deadlock detected`.

No deadlock here is evidence against writers, whose order is fixed by code. It says nothing about readers (see `locks.md`).

## Staging, preview, and the dry run

- **The local dev stack runs Zero as superuser**, so Postgres event triggers exist there and a column add takes Zero's in-place path; the throwaway test databases have no Zero at all. On Supabase (staging, preview, production) the change arrives through the manual `update_schemas()` hook and every column add backfills. Nothing local reproduces that window; size it from the production row count instead (see `zero.md`).
- **Staging** runs the migration on the push to `main`, in the same deploy workflow as production (`.github/workflows/deploy-dotcom.yml`, `internal/scripts/deploy-dotcom.ts`). Staging Zero has no connected clients, so it proves the SQL and the runner, not the lock behavior under traffic.
- **Preview** (`dotcom-preview-please` label) creates a fresh Supabase branch and runs the entire chain from 000. A faithful rehearsal of a clean install; not of a migration against production data.
- **Dry run** is part of every deploy: `migrate --dry-run` applies every pending file inside a transaction and rolls back, then the real run applies them. Both appear in the deploy log as `✅ NNN applied`, the first followed by `🧹 Rolling back dry run...`. Two separate transactions, so a green dry run does not mean the real run cannot deadlock.
- **Production** is the only place with live traffic. The deploy log has the runner output; `zero_sync_pipeline_resets_total{reason="schema-change"}` on the `grafanacloud-prom` datasource confirms the commit reached Zero.
