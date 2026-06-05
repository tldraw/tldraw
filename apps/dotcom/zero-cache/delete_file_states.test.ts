import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Focused integration test for the `delete_file_states` trigger that cleans up
// guest file_state rows when a file is unshared (shared: true -> false).
//
// Regression coverage for: unsharing a group-owned file (ownerId NULL,
// owningGroupId set) used to leave guest file_states behind, because the original
// trigger keyed on `OLD."ownerId" != "userId"` and `NULL != x` is NULL in SQL.
// See migration 033_fix_unshare_group_file_cleanup.sql.
//
// This talks to a real postgres (the trigger is plpgsql, so SQLite/PGlite-free
// fakes can't exercise it). It is opt-in: set ZERO_CACHE_TEST_POSTGRES_URL (or rely
// on BOTCOM_POSTGRES_POOLED_CONNECTION_STRING from a running `yarn dev` stack) to
// run it. Without a connection string the suite is skipped so CI stays green.

const DIRNAME = dirname(fileURLToPath(import.meta.url))
const CONNECTION_STRING =
	process.env.ZERO_CACHE_TEST_POSTGRES_URL ?? process.env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING

// The real, shipped function body. We load it from the migration file so the test
// exercises exactly what runs in production rather than a hand-copied duplicate.
const FIXED_FUNCTION_SQL = readFileSync(
	join(DIRNAME, 'migrations', '033_fix_unshare_group_file_cleanup.sql'),
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

// Minimal schema covering only the tables the trigger reads or writes, plus the
// trigger binding. Recreated before each test (the trigger references the function,
// which we (re)create first). Dropping `file` CASCADE also drops the trigger.
const SCHEMA_SQL = `
DROP TABLE IF EXISTS "file_state", "file", "group_user", "group" CASCADE;
CREATE TABLE "group" (
  "id" TEXT PRIMARY KEY
);
CREATE TABLE "group_user" (
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  PRIMARY KEY ("userId", "groupId")
);
CREATE TABLE "file" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT,
  "owningGroupId" TEXT,
  "shared" BOOLEAN NOT NULL,
  -- mirror the production XOR invariant so the test seed stays realistic
  CHECK (("ownerId" IS NULL) != ("owningGroupId" IS NULL))
);
CREATE TABLE "file_state" (
  "userId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  PRIMARY KEY ("userId", "fileId")
);
CREATE TRIGGER file_shared_update
AFTER UPDATE OF shared ON file
FOR EACH ROW
EXECUTE FUNCTION delete_file_states();
`

const describeMaybe = CONNECTION_STRING ? describe : describe.skip

describeMaybe('delete_file_states trigger (unshare cleanup)', () => {
	let pool: pg.Pool
	const schemaName = `tldraw_test_${process.pid}`

	beforeAll(async () => {
		pool = new pg.Pool({ connectionString: CONNECTION_STRING, max: 1 })
		// isolate everything in a throwaway schema and route unqualified names there
		await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
		await pool.query(`CREATE SCHEMA "${schemaName}"`)
		await pool.query(`SET search_path TO "${schemaName}"`)
	})

	afterAll(async () => {
		if (!pool) return
		await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
		await pool.end()
	})

	async function seed() {
		await pool.query(`SET search_path TO "${schemaName}"`)

		// group g1 with an owner and a member; guest is NOT a member
		await pool.query(`INSERT INTO "group" ("id") VALUES ('g1')`)
		await pool.query(
			`INSERT INTO "group_user" ("userId", "groupId") VALUES ('uOwner', 'g1'), ('uMember', 'g1')`
		)

		// group-owned shared file: ownerId NULL, owningGroupId set
		await pool.query(
			`INSERT INTO "file" ("id", "ownerId", "owningGroupId", "shared") VALUES ('fGroup', NULL, 'g1', true)`
		)
		// legacy user-owned shared file: ownerId set, owningGroupId NULL
		await pool.query(
			`INSERT INTO "file" ("id", "ownerId", "owningGroupId", "shared") VALUES ('fLegacy', 'uOwner', NULL, true)`
		)
		// a shared file we will NOT unshare, as a control
		await pool.query(
			`INSERT INTO "file" ("id", "ownerId", "owningGroupId", "shared") VALUES ('fControl', 'uOwner', NULL, true)`
		)

		// everyone has a file_state on every file
		for (const fileId of ['fGroup', 'fLegacy', 'fControl']) {
			await pool.query(
				`INSERT INTO "file_state" ("userId", "fileId") VALUES ('uOwner', $1), ('uMember', $1), ('uGuest', $1)`,
				[fileId]
			)
		}
	}

	async function statesFor(fileId: string): Promise<string[]> {
		const res = await pool.query<{ userId: string }>(
			`SELECT "userId" FROM "file_state" WHERE "fileId" = $1 ORDER BY "userId"`,
			[fileId]
		)
		return res.rows.map((r) => r.userId)
	}

	describe('with the fixed function (migration 033)', () => {
		beforeEach(async () => {
			await pool.query(`SET search_path TO "${schemaName}"`)
			await pool.query(FIXED_FUNCTION_SQL)
			await pool.query(SCHEMA_SQL)
			await seed()
		})

		it('removes the guest state but keeps group members when a group-owned file is unshared', async () => {
			await pool.query(`UPDATE "file" SET "shared" = false WHERE "id" = 'fGroup'`)
			// owner + member of the owning group keep access; guest is cleaned up
			expect(await statesFor('fGroup')).toEqual(['uMember', 'uOwner'])
		})

		it('removes the guest state but keeps the owner when a legacy file is unshared', async () => {
			await pool.query(`UPDATE "file" SET "shared" = false WHERE "id" = 'fLegacy'`)
			expect(await statesFor('fLegacy')).toEqual(['uOwner'])
		})

		it('leaves still-shared files untouched', async () => {
			await pool.query(`UPDATE "file" SET "shared" = false WHERE "id" = 'fGroup'`)
			expect(await statesFor('fControl')).toEqual(['uGuest', 'uMember', 'uOwner'])
		})
	})

	describe('with the original buggy function (regression guard)', () => {
		beforeEach(async () => {
			await pool.query(`SET search_path TO "${schemaName}"`)
			await pool.query(BUGGY_FUNCTION_SQL)
			await pool.query(SCHEMA_SQL)
			await seed()
		})

		it('demonstrates the bug: group-owned guest state survives because ownerId is NULL', async () => {
			await pool.query(`UPDATE "file" SET "shared" = false WHERE "id" = 'fGroup'`)
			// NULL != "userId" is NULL, so the old DELETE matched nothing: the guest lingers
			expect(await statesFor('fGroup')).toEqual(['uGuest', 'uMember', 'uOwner'])
		})

		it('still works for legacy files (so the regression is group-specific)', async () => {
			await pool.query(`UPDATE "file" SET "shared" = false WHERE "id" = 'fLegacy'`)
			expect(await statesFor('fLegacy')).toEqual(['uOwner'])
		})
	})
})
