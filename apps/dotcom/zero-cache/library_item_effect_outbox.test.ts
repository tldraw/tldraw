import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Integration test for the library tables (055), the library_item delete trigger (056),
// which queues the R2 cleanup TLFileEffectProcessor runs, and the item asset ownership table (057). The cases that need a real Postgres are
// the cascades: items removed with their library, or with a workspace that is hard-deleted,
// must still produce outbox rows.
//
// Like effect_outbox.test.ts, it runs the real migration chain in a throwaway database and is
// opt-in: set ZERO_CACHE_TEST_POSTGRES_URL (local dev stack:
// postgres://user:password@localhost:6543/postgres).
const CONNECTION_STRING = process.env.ZERO_CACHE_TEST_POSTGRES_URL

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const MIGRATION_FILES = readdirSync(MIGRATIONS_DIR)
	.filter((f) => f.endsWith('.sql'))
	.sort()

const dbName = `tldraw_test_libraries_${process.pid}`

const describeMaybe = CONNECTION_STRING ? describe : describe.skip

describeMaybe('library_item effect_outbox trigger', () => {
	let adminClient: pg.Client
	let client: pg.Client

	beforeAll(async () => {
		adminClient = new pg.Client({ connectionString: CONNECTION_STRING })
		await adminClient.connect()
		await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`)
		await adminClient.query(`CREATE DATABASE "${dbName}"`)
		const url = new URL(CONNECTION_STRING!)
		url.pathname = `/${dbName}`
		client = new pg.Client({ connectionString: url.toString() })
		await client.connect()
		for (const filename of MIGRATION_FILES) {
			try {
				await client.query(readFileSync(join(MIGRATIONS_DIR, filename), 'utf8'))
			} catch (err) {
				throw new Error(`Migration ${filename} failed: ${(err as Error).message}`)
			}
		}
	})

	afterAll(async () => {
		if (client) await client.end()
		if (adminClient) {
			await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`)
			await adminClient.end()
		}
	})

	beforeEach(async () => {
		await client.query(
			`TRUNCATE "group", library, library_item, library_item_asset, effect_outbox CASCADE`
		)
		await client.query(`INSERT INTO "group" ("id", "name") VALUES ('g1', 'g1')`)
		await client.query(
			`INSERT INTO library ("id", "name", "owningGroupId", "createdBy", "createdAt", "updatedAt")
			 VALUES ('c1', 'Shapes', 'g1', 'u1', 0, 0)`
		)
		for (const id of ['i1', 'i2']) {
			await client.query(
				`INSERT INTO library_item ("id", "libraryId", "createdBy", "createdAt", "updatedAt")
				 VALUES ($1, 'c1', 'u1', 0, 0)`,
				[id]
			)
		}
	})

	async function outbox() {
		const res = await client.query<{ tableName: string; entityId: string; command: string }>(
			`SELECT "tableName", "entityId", command FROM effect_outbox ORDER BY "entityId"`
		)
		return res.rows
	}

	it('queues nothing for inserts or updates', async () => {
		await client.query(`UPDATE library_item SET "name" = 'Button', "libraryId" = 'c1'`)
		expect(await outbox()).toEqual([])
	})

	it('queues a delete row for a deleted item', async () => {
		await client.query(`DELETE FROM library_item WHERE "id" = 'i1'`)
		expect(await outbox()).toEqual([
			{ tableName: 'library_item', entityId: 'i1', command: 'delete' },
		])
	})

	it("queues a row for each item when the library's delete cascades", async () => {
		await client.query(`DELETE FROM library WHERE "id" = 'c1'`)
		expect(await outbox()).toEqual([
			{ tableName: 'library_item', entityId: 'i1', command: 'delete' },
			{ tableName: 'library_item', entityId: 'i2', command: 'delete' },
		])
	})

	it('queues a row for each item when a hard-deleted workspace cascades', async () => {
		await client.query(`DELETE FROM "group" WHERE "id" = 'g1'`)
		expect(await client.query(`SELECT 1 FROM library`)).toMatchObject({ rowCount: 0 })
		expect((await outbox()).map((r) => r.entityId)).toEqual(['i1', 'i2'])
	})

	it("keeps an item's owned uploads until the worker's cleanup removes them (057)", async () => {
		await client.query(
			`INSERT INTO library_item_asset ("itemId", "objectName") VALUES ('i1', 'abc-png')`
		)
		await client.query(`DELETE FROM library WHERE "id" = 'c1'`)
		const owned = await client.query(`SELECT "objectName" FROM library_item_asset`)
		expect(owned.rows).toEqual([{ objectName: 'abc-png' }])
	})

	it('refuses a library whose workspace does not exist', async () => {
		await expect(
			client.query(
				`INSERT INTO library ("id", "name", "owningGroupId", "createdBy", "createdAt", "updatedAt")
				 VALUES ('c2', 'Shapes', 'nope', 'u1', 0, 0)`
			)
		).rejects.toThrow(/library_owning_group_id_fkey/)
	})
})
