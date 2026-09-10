---
name: review-migration
description: Review a tldraw.com Postgres migration before it ships. Use whenever a diff, branch, or PR adds or changes a file under apps/dotcom/zero-cache/migrations/, when asked to review a migration, or as one of the review lenses in the pr skill's pre-review pass. Covers the migrate.ts runner contract, what Zero replicates and when a change becomes visible to clients, lock behavior under live production traffic, plpgsql function bodies that Postgres does not check, and the evidence and deploy notes a migration PR needs.
---

# Review a migration

TL;DR: a tldraw.com migration runs once, inside one transaction, against a live database that Zero is replicating to every open tab. Review it for four things Postgres and CI will not catch: the runner contract, what Zero will do with the change, what the locks do to live traffic, and function bodies that still name columns that are gone.

## Scope

Review every file the diff adds or changes under `apps/dotcom/zero-cache/migrations/`. For each one also read:

- the last definition of every function and trigger it replaces or drops (`git grep -n "FUNCTION <name>" apps/dotcom/zero-cache/migrations/`; definitions chain through `CREATE OR REPLACE`, so the latest file wins, not the first)
- the client schema in `packages/dotcom-shared/src/tlaSchema.ts` and the mutators in `packages/dotcom-shared/src/mutators.ts` for every table touched
- `apps/dotcom/zero-cache/migrate.ts`, if the diff changes it

Report findings as `file:line`, what breaks, and the fix. Then check the PR body against the deploy notes section below. A migration that passes every check can still be the wrong deploy shape, and the PR body is where that shows.

## Runner contract

`migrate.ts` runs every pending file, in filename order, inside one transaction with `SET LOCAL lock_timeout = '10s'`, records each filename in `migrations.applied_migrations`, then calls `zero_0.update_schemas()` once. `--dry-run` does all of it and rolls back. The deploy runs the dry run and then the real run, before Zero, the sync-worker, or the client deploy.

- **Filename** is `NNN_description.sql`, three digits, the next contiguous number. Two branches can pick the same number; `validateMigrationFilenames.test.ts` catches the collision after merge, so check `main` when the branch is old.
- **No transaction statements** in the file: `BEGIN`, `COMMIT`, `ROLLBACK`, `END`, with or without `WORK`/`TRANSACTION`. `migrationSql.ts` refuses the common forms, but `END;` and `END WORK;` slip through (#10722), and a stray commit ends the runner's transaction mid-file so the dry run applies the rest for real.
- **Applied files are frozen.** A file that has run on staging or production never runs again, so editing it changes nothing there and desyncs every other environment. Fix forward with a new file.
- **`CREATE INDEX CONCURRENTLY` cannot run here yet.** The runner puts every file inside its transaction and Postgres refuses `CONCURRENTLY` inside one, so the deploy fails. A plain `CREATE INDEX` holds SHARE on the table for the whole build, blocking every write. #10576 adds a per-file opt-out for exactly this; until it lands, an index on a hot table is built out of band or waits for that PR.
- **Order within the file matters** and so does order across files in the same deploy: they share the transaction, so a later file sees the earlier one's work but any failure rolls all of them back together.

## Zero coupling

Zero's own schema-change rules are at https://zero.rocicorp.dev/docs/schema#schema-changes; `references/zero.md` has only what is specific to tldraw.com: our deploy order, the manual `update_schemas()` path, what we publish, and how a failure surfaces. The checks:

- **Published table?** Only tables in the `zero_data` publication reach clients. A new table that clients will read needs `ALTER PUBLICATION zero_data ADD TABLE`, a primary key, and a replica identity decision (see the reference). A server-only table must not be added.
- **Column add.** On production every column added to a published table is backfilled: Zero re-streams the whole table and the column is invisible to clients and the sync-worker until that finishes on every replica (tens of minutes on a table of a million rows). The default makes no difference here: Zero's in-place optimisation for simple defaults only works on the event-trigger path, and Supabase delivers our schema changes through the manual `update_schemas()` hook. Locally it looks instant, which is the trap. Code that reads the column ships a deploy after the backfill is confirmed done, never in the same deploy as the migration.
- **Mass update.** A migration that updates every row of a published table replicates as one change-log transaction and blocks all replication to clients while Zero writes it through. Add a column and let the backfill carry the value instead, or batch the update outside the migration.
- **Column drop or rename.** The connected client's schema and the sync-worker's server schema both still declare the old name, and both fail hard the moment the column goes: clients get `SchemaVersionNotSupported` and the reload modal, the sync-worker rejects every push. The code that stops declaring the column ships a release before the migration. #10653 then #10591 is the worked example. The PR must say which release carried the code half.
- **New table read by clients.** It is invisible until every replica (RM plus every VS machine) has backfilled it, and all backfills share one queue. Ship the migrations alone, confirm the backfill is done on every serving replica, then ship the code.
- **One transaction, one reset.** Every DDL on a published table resets every view-syncer pipeline and re-hydrates every query for every connected client once per transaction. Splitting a migration into several deploys multiplies that; combining unrelated DDL into one deploy does not.
- **Invisible to Zero**, so free to ship any time: CHECK constraints, triggers, functions, foreign keys, tables outside the publication. Indexes are mirrored into the SQLite replica, so an index on a published table is built on every replica too.

## Live traffic

Read `references/locks.md` for lock modes, the writer-order recipe, and the deadlock mechanics. The checks:

- **Which locks, how long.** Every `ALTER TABLE`, `DROP TRIGGER`, `DROP INDEX`, `DROP CONSTRAINT`, `LOCK TABLE` takes ACCESS EXCLUSIVE on its table and holds it until COMMIT. Writes and reads to those tables queue for the whole remaining transaction, not the statement. List the tables and expect the PR body to.
- **Expensive statements** (`SET NOT NULL` scans the table; a volatile default or a type change rewrites it; a backfill `UPDATE` or `INSERT ... SELECT` touches every row and fires every trigger) run while those locks are held. Size them against production row counts, place them before the catalog-only work so fewer tables are held during them, and for a big `SET NOT NULL` use the `CHECK ... NOT VALID` then `VALIDATE` pattern across releases.
- **Lock order matches the app's writers.** Derive it from triggers that write another table and from the mutators' read order, then take locks in that order, explicitly with `LOCK TABLE` if the statements would not. Migration 050's first draft took `file` before `user` while a trigger on `user` wrote `file`; a user rename in flight deadlocks that ordering, reproducibly.
- **Readers can still deadlock you** and no ordering prevents that. The migration is the right victim: it rolls back atomically, the deploy aborts before anything else rolls, and a rerun succeeds. Until #10725 adds a retry, the deploy notes must say "rerun on deadlock".
- **Guard checks first.** A data precondition (no NULLs left, no orphans) is checked in a `DO` block with a named `RAISE EXCEPTION` before any lock is taken, so a bad database fails on line one with a message instead of at the end with a bare constraint error.
- **Backfill DML fires triggers.** An `UPDATE` on `file` runs `file_effect_outbox_fn` and every other trigger per row, and every changed row replicates through Zero. Check the outbox function's no-op short-circuit covers the columns being written, and that the row count is known.

## Function bodies

Postgres tracks dependencies for indexes, foreign keys, CHECK constraints, and a trigger's `UPDATE OF` column list. It does not parse plpgsql. A function that still names a dropped or renamed column survives the DDL and fails on the next write, in production, after the deploy is green.

- `git grep -n '"<column>"' apps/dotcom/zero-cache/migrations/` for every column the migration drops or renames, and check each hit's function is redefined in this migration or already dead.
- Redefine from live introspection (`pg_get_functiondef` on staging or production), not by reading the chain forward: four of the eight functions 050 touched had been replaced two or three times.
- The dollar-quote tag varies (`$$`, `$function$`); tests that slice function bodies out of migrations depend on it.
- A `CREATE OR REPLACE TRIGGER` is needed when the trigger's `UPDATE OF` list names the column, otherwise the drop is blocked.

## Evidence

Read `references/testing.md` for the suites and how to run them. Expect:

- The transaction-block and filename checks pass (they run in CI without a database).
- The migration has run against a real Postgres: the opt-in suites with `ZERO_CACHE_TEST_POSTGRES_URL` set (`effect_outbox.test.ts` applies the whole chain, one file per query and without Zero, so it proves the SQL and the triggers, not the runner's single transaction or replication), and a trigger test for any function the migration defines.
- For anything that locks a hot table, a local rehearsal in the PR: which locks the migration holds during its expensive statement, and whether the app's write path that touches those tables in the opposite order deadlocks it (`references/testing.md` § Rehearsing locks and concurrency).
- A preview deploy (`dotcom-preview-please`) if the migration is large: it runs the chain from scratch on a fresh Supabase branch.

## Deploy notes the PR body needs

- The ordering dependency: which release shipped the client and sync-worker half, or that this is additive and needs none.
- Tables locked and the expected hold time, from the rehearsal or a production row count.
- The Zero visibility window: none, a column backfill, or a table backfill, sized from the production row count, and how it will be confirmed done before dependent code ships (the upstream `backfilling` table empty and then every serving replica caught up; `references/zero.md` § Backfill done-checks).
- Off-peak: check the connected-clients graph for the current trough. The pipeline reset still hits every open tab.
- Rerun on deadlock: `gh run rerun <deploy-run-id> --failed`. The migrate step is first, so a failure there has rolled nothing else.
- How to see it committed on production: `increase(zero_sync_pipeline_resets_total{deployment_environment="production", reason="schema-change"}[15m])` goes non-zero; for a backfill, the upstream `backfilling` table empties and the replicas catch up afterwards.
- If it goes out as a hotfix: the cherry-pick onto `hotfixes` conflicts whenever `hotfixes` lacks a main-only change to the same file. Recovery is a manual branch off `origin/hotfixes`, resolve, push, PR to `hotfixes`.
