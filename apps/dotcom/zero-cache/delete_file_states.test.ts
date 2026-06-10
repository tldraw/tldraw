import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Focused integration test for the `delete_file_states` trigger that cleans up
// guest file_state rows and guest home-group file links (group_file rows) when a
// file is unshared (shared: true -> false).
//
// Regression coverage for: unsharing a group-owned file (ownerId NULL,
// owningGroupId set) used to leave guest file_states behind, because the original
// trigger keyed on `OLD."ownerId" != "userId"` and `NULL != x` is NULL in SQL.
// Visiting a shared file also links it into the visitor's home group via a
// group_file row (home group id == user id) — that link is what puts the file in
// their recent files, and nothing cleaned it up either, so the file name lingered
// in an ex-guest's recent files after access was revoked.
// See migration 034_fix_unshare_group_file_cleanup.sql.
//
// This talks to a real postgres (the trigger is plpgsql, so fakes can't exercise
// it). It is opt-in: set ZERO_CACHE_TEST_POSTGRES_URL (local dev stack:
// postgres://user:password@localhost:6543/postgres) to run it. Without a
// connection string the suite is skipped so CI stays green.
//
// Safety: the suite isolates itself in a throwaway schema, and it must stay safe
// even if the URL points at a shared database through a transaction-mode pooler
// (pgbouncer on 6432, Neon pooler). Transaction pooling can hand each statement
// to a different backend session, so session-level `SET search_path` cannot be
// trusted to stick — and unqualified DDL like `DROP TABLE ... CASCADE` would then
// run against `public`. So no statement here relies on session state: everything
// the test owns is schema-qualified explicitly, and the statements that cannot be
// qualified (the shipped migration SQL, executed verbatim, and the UPDATEs whose
// trigger body resolves table names at execution time) run inside a transaction
// with `SET LOCAL search_path` — a transaction is exactly the unit a
// transaction-mode pooler pins to a single backend, and SET LOCAL expires with it.

const DIRNAME = dirname(fileURLToPath(import.meta.url))
const CONNECTION_STRING = process.env.ZERO_CACHE_TEST_POSTGRES_URL

// The real, shipped function body. We load it from the migration file so the test
// exercises exactly what runs in production rather than a hand-copied duplicate.
const FIXED_FUNCTION_SQL = readFileSync(
	join(DIRNAME, 'migrations', '034_fix_unshare_group_file_cleanup.sql'),
	'utf8'
)

// The original (buggy) function body, kept here so we can prove the bug exists and
// that the fix is what closes it.
const BUGGY_FUNCTION_SQL = `
CREATE OR REPLACE FUNCTION delete_file_states() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.shared = TRUE AND NEW.shared = FALSE THEN
    DELETE FROM file_state WHERE "fileId" = OLD.id AND OLD."ownerId" != "userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`

const schemaName = `tldraw_test_${process.pid}`

// Minimal schema covering only the tables the trigger reads or writes, plus the
// trigger binding. Recreated before each test (the trigger references the function,
// which we (re)create first). Dropping `file` CASCADE also drops the trigger.
// Fully qualified so it cannot touch `public` no matter what session it runs on.
const SCHEMA_SQL = `
DROP TABLE IF EXISTS "${schemaName}"."file_state", "${schemaName}"."group_file", "${schemaName}"."file", "${schemaName}"."group_user", "${schemaName}"."group" CASCADE;
CREATE TABLE "${schemaName}"."group" (
  "id" TEXT PRIMARY KEY
);
CREATE TABLE "${schemaName}"."group_user" (
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  PRIMARY KEY ("userId", "groupId")
);
CREATE TABLE "${schemaName}"."file" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT,
  "owningGroupId" TEXT,
  "shared" BOOLEAN NOT NULL,
  -- mirror the production XOR invariant so the test seed stays realistic
  CHECK (("ownerId" IS NULL) != ("owningGroupId" IS NULL))
);
CREATE TABLE "${schemaName}"."file_state" (
  "userId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  PRIMARY KEY ("userId", "fileId")
);
CREATE TABLE "${schemaName}"."group_file" (
  "fileId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  PRIMARY KEY ("fileId", "groupId")
);
CREATE TRIGGER file_shared_update
AFTER UPDATE OF shared ON "${schemaName}"."file"
FOR EACH ROW
EXECUTE FUNCTION "${schemaName}".delete_file_states();
`

const describeMaybe = CONNECTION_STRING ? describe : describe.skip

describeMaybe('delete_file_states trigger (unshare cleanup)', () => {
	// A single Client, not a Pool. Two reasons: a Pool reaps idle clients (10s
	// default) and transparently replaces them, silently resetting session state;
	// and inTestSchema's BEGIN/COMMIT must run on one client, while pool.query may
	// use a different client per call.
	let client: pg.Client

	// Runs statements inside one transaction with search_path pinned to the test
	// schema. This is for SQL we execute verbatim (the shipped migration and the
	// original buggy function) and for statements whose trigger body resolves
	// unqualified table names at execution time. SET LOCAL scopes the setting to
	// the transaction, so it works through transaction-mode poolers and cannot
	// leak to or from other sessions.
	async function inTestSchema(...statements: string[]) {
		await client.query('BEGIN')
		try {
			await client.query(`SET LOCAL search_path TO "${schemaName}"`)
			for (const sql of statements) {
				await client.query(sql)
			}
			await client.query('COMMIT')
		} catch (err) {
			await client.query('ROLLBACK')
			throw err
		}
	}

	beforeAll(async () => {
		client = new pg.Client({ connectionString: CONNECTION_STRING })
		await client.connect()
		await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
		await client.query(`CREATE SCHEMA "${schemaName}"`)
		// sanity-check that SET LOCAL pins the schema for a whole transaction on
		// this connection before any unqualified SQL runs
		await client.query('BEGIN')
		await client.query(`SET LOCAL search_path TO "${schemaName}"`)
		const res = await client.query<{ schema: string }>('SELECT current_schema() AS schema')
		await client.query('COMMIT')
		if (res.rows[0]?.schema !== schemaName) {
			throw new Error(
				`SET LOCAL search_path did not hold within a transaction (current_schema() is ` +
					`"${res.rows[0]?.schema}", expected "${schemaName}"). Refusing to run unqualified ` +
					`DDL against this connection.`
			)
		}
	})

	afterAll(async () => {
		if (!client) return
		await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
		await client.end()
	})

	async function seed() {
		// group g1 with an owner and a member; guest is NOT a member
		await client.query(`INSERT INTO "${schemaName}"."group" ("id") VALUES ('g1')`)
		await client.query(
			`INSERT INTO "${schemaName}"."group_user" ("userId", "groupId") VALUES ('uOwner', 'g1'), ('uMember', 'g1')`
		)

		// group-owned shared file: ownerId NULL, owningGroupId set
		await client.query(
			`INSERT INTO "${schemaName}"."file" ("id", "ownerId", "owningGroupId", "shared") VALUES ('fGroup', NULL, 'g1', true)`
		)
		// legacy user-owned shared file: ownerId set, owningGroupId NULL
		await client.query(
			`INSERT INTO "${schemaName}"."file" ("id", "ownerId", "owningGroupId", "shared") VALUES ('fLegacy', 'uOwner', NULL, true)`
		)
		// a shared file we will NOT unshare, as a control
		await client.query(
			`INSERT INTO "${schemaName}"."file" ("id", "ownerId", "owningGroupId", "shared") VALUES ('fControl', 'uOwner', NULL, true)`
		)

		// everyone has a file_state on every file
		for (const fileId of ['fGroup', 'fLegacy', 'fControl']) {
			await client.query(
				`INSERT INTO "${schemaName}"."file_state" ("userId", "fileId") VALUES ('uOwner', $1), ('uMember', $1), ('uGuest', $1)`,
				[fileId]
			)
		}

		// group_file rows: the owning group's own row for fGroup, plus home-group
		// file links (home group id == user id) created by visiting a shared file
		await client.query(
			`INSERT INTO "${schemaName}"."group_file" ("fileId", "groupId") VALUES
				('fGroup', 'g1'),
				('fGroup', 'uMember'),
				('fGroup', 'uGuest'),
				('fLegacy', 'uOwner'),
				('fLegacy', 'uGuest'),
				('fControl', 'uGuest')`
		)
	}

	// Unsharing fires the trigger, whose body reads `file_state` and `group_user`
	// unqualified — resolved via search_path at execution time — so the UPDATE
	// must run with the test schema pinned.
	async function unshare(fileId: string) {
		await inTestSchema(
			`UPDATE "${schemaName}"."file" SET "shared" = false WHERE "id" = '${fileId}'`
		)
	}

	async function statesFor(fileId: string): Promise<string[]> {
		const res = await client.query<{ userId: string }>(
			`SELECT "userId" FROM "${schemaName}"."file_state" WHERE "fileId" = $1 ORDER BY "userId"`,
			[fileId]
		)
		return res.rows.map((r) => r.userId)
	}

	async function linksFor(fileId: string): Promise<string[]> {
		const res = await client.query<{ groupId: string }>(
			`SELECT "groupId" FROM "${schemaName}"."group_file" WHERE "fileId" = $1 ORDER BY "groupId"`,
			[fileId]
		)
		return res.rows.map((r) => r.groupId)
	}

	describe('with the fixed function (migration 034)', () => {
		beforeEach(async () => {
			await inTestSchema(FIXED_FUNCTION_SQL)
			await client.query(SCHEMA_SQL)
			await seed()
		})

		it('removes the guest state but keeps group members when a group-owned file is unshared', async () => {
			await unshare('fGroup')
			// owner + member of the owning group keep access; guest is cleaned up
			expect(await statesFor('fGroup')).toEqual(['uMember', 'uOwner'])
		})

		it('removes the guest file link but keeps the owning group row and member links', async () => {
			await unshare('fGroup')
			// the file still lives in its owning group, and the member keeps their
			// home-group link (they retain access); the guest's link is cleaned up
			// so the file stops showing in their recent files
			expect(await linksFor('fGroup')).toEqual(['g1', 'uMember'])
		})

		it('removes the guest state but keeps the owner when a legacy file is unshared', async () => {
			await unshare('fLegacy')
			expect(await statesFor('fLegacy')).toEqual(['uOwner'])
		})

		it('removes the guest file link but keeps the owner link when a legacy file is unshared', async () => {
			await unshare('fLegacy')
			expect(await linksFor('fLegacy')).toEqual(['uOwner'])
		})

		it('leaves still-shared files untouched', async () => {
			await unshare('fGroup')
			expect(await statesFor('fControl')).toEqual(['uGuest', 'uMember', 'uOwner'])
			expect(await linksFor('fControl')).toEqual(['uGuest'])
		})
	})

	describe('with the original buggy function (regression guard)', () => {
		beforeEach(async () => {
			await inTestSchema(BUGGY_FUNCTION_SQL)
			await client.query(SCHEMA_SQL)
			await seed()
		})

		it('demonstrates the bug: group-owned guest state survives because ownerId is NULL', async () => {
			await unshare('fGroup')
			// NULL != "userId" is NULL, so the old DELETE matched nothing: the guest lingers
			expect(await statesFor('fGroup')).toEqual(['uGuest', 'uMember', 'uOwner'])
			// and the old function never touched group_file at all, so the guest's
			// home-group link (their recent-files entry) survived too
			expect(await linksFor('fGroup')).toEqual(['g1', 'uGuest', 'uMember'])
		})

		it('still works for legacy files (so the regression is group-specific)', async () => {
			await unshare('fLegacy')
			expect(await statesFor('fLegacy')).toEqual(['uOwner'])
		})
	})
})
