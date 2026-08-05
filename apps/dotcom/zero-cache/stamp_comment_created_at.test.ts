import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Focused integration test for the `set_comment_created_at` trigger (migration 046), which
// replaces the authoring client's `createdAt` with a server stamp that is monotonic per thread.
// Client stamps let a thread's history read as post-join replies in the notifications feed; the
// stamp must also be strictly increasing within a thread because the notifications reply gate
// compares with a strict `>`, and the Durable Object drains several comments in one transaction
// where `now()` is frozen and even `clock_timestamp()` can tie at millisecond resolution.
//
// This talks to a real postgres (the trigger is plpgsql, so fakes can't exercise it). It is
// opt-in: set ZERO_CACHE_TEST_POSTGRES_URL (local dev stack:
// postgres://user:password@localhost:6543/postgres) to run it. Without a connection string the
// suite is skipped so CI stays green.
//
// Safety: same model as delete_file_states.test.ts — everything the test owns is
// schema-qualified, and the statements that cannot be qualified (the shipped migration SQL run
// verbatim, and the inserts whose trigger body resolves `comment` via search_path at execution
// time) run inside a transaction with `SET LOCAL search_path`.

const DIRNAME = dirname(fileURLToPath(import.meta.url))
const CONNECTION_STRING = process.env.ZERO_CACHE_TEST_POSTGRES_URL

// The real, shipped trigger. Loaded from the migration file so the test exercises exactly what
// runs in production rather than a hand-copied duplicate.
const MIGRATION_SQL = readFileSync(
	join(DIRNAME, 'migrations', '046_stamp_comment_created_at.sql'),
	'utf8'
)

const schemaName = `tldraw_test_comment_${process.pid}`

// Only the columns the trigger reads or writes, plus enough NOT NULLs to stay realistic. No
// foreign keys: the trigger never touches the referenced tables.
const SCHEMA_SQL = `
DROP TABLE IF EXISTS "${schemaName}"."comment" CASCADE;
CREATE TABLE "${schemaName}"."comment" (
  "id" VARCHAR PRIMARY KEY,
  "threadId" VARCHAR NOT NULL,
  "body" JSONB NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "editedAt" BIGINT,
  "updatedAt" BIGINT NOT NULL
);
`

const describeMaybe = CONNECTION_STRING ? describe : describe.skip

describeMaybe('set_comment_created_at trigger (server-stamped comment timestamps)', () => {
	// A single Client, not a Pool: inTestSchema's BEGIN/COMMIT must run on one connection.
	let client: pg.Client

	// Runs statements inside one transaction with search_path pinned to the test schema, for SQL
	// executed verbatim (the shipped migration) and statements whose trigger body resolves the
	// unqualified `comment` at execution time.
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

	beforeEach(async () => {
		await client.query(SCHEMA_SQL)
		await inTestSchema(MIGRATION_SQL)
	})

	async function serverNowMs(): Promise<number> {
		const res = await client.query<{ now: string }>(
			`SELECT (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT AS now`
		)
		return Number(res.rows[0].now)
	}

	async function insert(
		rows: { id: string; threadId: string; createdAt: number; editedAt?: number | null }[]
	) {
		const values = rows
			.map(
				(r) =>
					`('${r.id}', '${r.threadId}', '{}', ${r.createdAt}, ${r.editedAt ?? 'NULL'}, ${
						r.editedAt ?? r.createdAt
					})`
			)
			.join(', ')
		await inTestSchema(
			`INSERT INTO comment ("id", "threadId", "body", "createdAt", "editedAt", "updatedAt") VALUES ${values}`
		)
	}

	async function stamps() {
		const res = await client.query<{
			id: string
			createdAt: string
			editedAt: string | null
			updatedAt: string
		}>(`SELECT "id", "createdAt", "editedAt", "updatedAt" FROM "${schemaName}"."comment"`)
		return new Map(
			res.rows.map((r) => [
				r.id,
				{
					createdAt: Number(r.createdAt),
					editedAt: r.editedAt === null ? null : Number(r.editedAt),
					updatedAt: Number(r.updatedAt),
				},
			])
		)
	}

	it('replaces the client stamp with server time and lifts updatedAt, whether the client clock is slow or fast', async () => {
		const before = await serverNowMs()
		await insert([
			{ id: 'c-slow', threadId: 't1', createdAt: before - 3_600_000 },
			{ id: 'c-fast', threadId: 't2', createdAt: before + 3_600_000, editedAt: 2_000 },
		])
		const after = await serverNowMs()

		const rows = await stamps()
		for (const id of ['c-slow', 'c-fast']) {
			const { createdAt, updatedAt } = rows.get(id)!
			expect(createdAt).toBeGreaterThanOrEqual(before)
			expect(createdAt).toBeLessThanOrEqual(after)
			expect(updatedAt).toBe(createdAt)
		}
		expect(rows.get('c-fast')!.editedAt).toBe(2_000)
	})

	it('stamps a multi-row insert strictly increasing per thread, in statement order', async () => {
		// The drain writes a batch in one statement, where now() is frozen and clock_timestamp()
		// can tie at millisecond resolution. Ties would break the notifications feed's strict
		// "after my join" compare.
		const before = await serverNowMs()
		await insert([
			{ id: 'c1', threadId: 't1', createdAt: 1_000 },
			{ id: 'c2', threadId: 't1', createdAt: 1_000 },
			{ id: 'c3', threadId: 't1', createdAt: 500 },
			{ id: 'd1', threadId: 't2', createdAt: 1_000 },
		])
		const after = await serverNowMs()
		const rows = await stamps()
		expect(rows.get('c1')!.createdAt).toBeLessThan(rows.get('c2')!.createdAt)
		expect(rows.get('c2')!.createdAt).toBeLessThan(rows.get('c3')!.createdAt)
		// each thread chains independently: t2's single row stamps at real time, not after t1's
		expect(rows.get('d1')!.createdAt).toBeGreaterThanOrEqual(before)
		expect(rows.get('d1')!.createdAt).toBeLessThanOrEqual(after)
	})

	it('does not re-stamp on update', async () => {
		// The drain retries at-least-once; its conflict branch updates body/editedAt/etc. but the
		// trigger is BEFORE INSERT only, so the first insert's stamp is permanent.
		await insert([{ id: 'c1', threadId: 't1', createdAt: 1_000 }])
		const stamped = (await stamps()).get('c1')!.createdAt
		await client.query(
			`UPDATE "${schemaName}"."comment" SET "body" = '{"edited": true}', "editedAt" = 5 WHERE "id" = 'c1'`
		)
		expect((await stamps()).get('c1')!.createdAt).toBe(stamped)
	})
})
