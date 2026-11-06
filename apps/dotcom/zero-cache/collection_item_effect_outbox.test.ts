import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Integration test for the collection tables (055) and the collection_item delete trigger (056),
// which queues the R2 cleanup TLFileEffectProcessor runs. The cases that need a real Postgres are
// the cascades: items removed with their collection, or with a workspace that is hard-deleted,
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

const dbName = `tldraw_test_collections_${process.pid}`

const describeMaybe = CONNECTION_STRING ? describe : describe.skip

describeMaybe('collection_item effect_outbox trigger', () => {
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
		await client.query(`TRUNCATE "group", collection, collection_item, effect_outbox CASCADE`)
		await client.query(`INSERT INTO "group" ("id", "name") VALUES ('g1', 'g1')`)
		await client.query(
			`INSERT INTO collection ("id", "name", "owningGroupId", "createdBy", "createdAt", "updatedAt")
			 VALUES ('c1', 'Shapes', 'g1', 'u1', 0, 0)`
		)
		for (const id of ['i1', 'i2']) {
			await client.query(
				`INSERT INTO collection_item ("id", "collectionId", "createdBy", "createdAt", "updatedAt")
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
		await client.query(`UPDATE collection_item SET "name" = 'Button', "collectionId" = 'c1'`)
		expect(await outbox()).toEqual([])
	})

	it('queues a delete row for a deleted item', async () => {
		await client.query(`DELETE FROM collection_item WHERE "id" = 'i1'`)
		expect(await outbox()).toEqual([
			{ tableName: 'collection_item', entityId: 'i1', command: 'delete' },
		])
	})

	it("queues a row for each item when the collection's delete cascades", async () => {
		await client.query(`DELETE FROM collection WHERE "id" = 'c1'`)
		expect(await outbox()).toEqual([
			{ tableName: 'collection_item', entityId: 'i1', command: 'delete' },
			{ tableName: 'collection_item', entityId: 'i2', command: 'delete' },
		])
	})

	it('queues a row for each item when a hard-deleted workspace cascades', async () => {
		await client.query(`DELETE FROM "group" WHERE "id" = 'g1'`)
		expect(await client.query(`SELECT 1 FROM collection`)).toMatchObject({ rowCount: 0 })
		expect((await outbox()).map((r) => r.entityId)).toEqual(['i1', 'i2'])
	})

	it('refuses a collection whose workspace does not exist', async () => {
		await expect(
			client.query(
				`INSERT INTO collection ("id", "name", "owningGroupId", "createdBy", "createdAt", "updatedAt")
				 VALUES ('c2', 'Shapes', 'nope', 'u1', 0, 0)`
			)
		).rejects.toThrow(/collection_owning_group_id_fkey/)
	})
})
