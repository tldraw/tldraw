import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Focused integration test for the `delete_file_states` trigger that cleans up
// guest file_state rows and guest home-group file links (group_file rows) when a
// file is unshared (shared: true -> false).
//
// Visiting a shared file links it into the visitor's home group via a group_file
// row (home group id == user id) — that link is what puts the file in their recent
// files, so unshare has to remove it as well as the file_state, or the file name
// lingers in an ex-guest's recent files after access is revoked.
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

// The real, shipped function body, sliced out of the migration that last defined it so the
// test exercises production's function rather than a hand-copied duplicate. Unlike 034, which
// was this function and nothing else, 050 also drops columns and rebinds triggers, so only the
// one definition is taken from it.
function loadShippedFunction(migrationFile: string, name: string): string {
	const migration = readFileSync(join(DIRNAME, 'migrations', migrationFile), 'utf8')
	const marker = `CREATE OR REPLACE FUNCTION public.${name}()`
	const start = migration.indexOf(marker)
	const end = migration.indexOf('$function$;', start)
	if (start === -1 || end === -1) {
		throw new Error(`could not find ${name}() in ${migrationFile}`)
	}
	// Drop the `public.` qualifier: the migration targets public, while everything here lives
	// in a throwaway schema pinned with SET LOCAL search_path. Left in place it would
	// CREATE OR REPLACE the *production* function whenever this test runs against a shared
	// database — the one way this suite could reach outside its own schema.
	const sql = migration
		.slice(start, end + '$function$;'.length)
		.replace(marker, `CREATE OR REPLACE FUNCTION ${name}()`)
	if (sql.includes('public.')) {
		throw new Error(`refusing to run ${name}(): a public. reference survived unqualifying`)
	}
	return sql
}

const DELETE_FILE_STATES_SQL = loadShippedFunction(
	'050_drop_legacy_owner_columns.sql',
	'delete_file_states'
)

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
  -- NOT NULL mirrors production: since 050 every file belongs to a workspace
  "owningGroupId" TEXT NOT NULL,
  "shared" BOOLEAN NOT NULL
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

		await client.query(
			`INSERT INTO "${schemaName}"."file" ("id", "owningGroupId", "shared") VALUES ('fGroup', 'g1', true)`
		)
		// a shared file we will NOT unshare, as a control
		await client.query(
			`INSERT INTO "${schemaName}"."file" ("id", "owningGroupId", "shared") VALUES ('fControl', 'g1', true)`
		)

		// everyone has a file_state on every file
		for (const fileId of ['fGroup', 'fControl']) {
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
				('fControl', 'g1'),
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

	describe('with the shipped function', () => {
		beforeEach(async () => {
			await inTestSchema(DELETE_FILE_STATES_SQL)
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

		it('leaves still-shared files untouched', async () => {
			await unshare('fGroup')
			expect(await statesFor('fControl')).toEqual(['uGuest', 'uMember', 'uOwner'])
			expect(await linksFor('fControl')).toEqual(['g1', 'uGuest'])
		})
	})
})
