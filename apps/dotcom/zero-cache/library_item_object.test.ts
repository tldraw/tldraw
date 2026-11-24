import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Integration test for the library tables, the library_item_object rows naming the R2 objects
// items use and their delete trigger, which queues an object for TLFileEffectProcessor to delete
// once no row names it (all in 055). The cases that need a real Postgres are the
// cascades, which must still queue objects, and deletes that race each other.
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

describeMaybe('library_item_object effect_outbox trigger', () => {
	let adminClient: pg.Client
	let client: pg.Client
	let url: URL

	beforeAll(async () => {
		adminClient = new pg.Client({ connectionString: CONNECTION_STRING })
		await adminClient.connect()
		await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`)
		await adminClient.query(`CREATE DATABASE "${dbName}"`)
		url = new URL(CONNECTION_STRING!)
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

	async function connect() {
		const other = new pg.Client({ connectionString: url.toString() })
		await other.connect()
		return other
	}

	async function addLibrary(id: string) {
		await client.query(
			`INSERT INTO library ("id", "name", "owningGroupId", "createdBy", "createdAt", "updatedAt")
			 VALUES ($1, 'Shapes', 'g1', 'u1', 0, 0)`,
			[id]
		)
	}

	async function addItem(id: string, libraryId: string, objects: [string, string][]) {
		await client.query(
			`INSERT INTO library_item ("id", "libraryId", "contentKey", "createdBy", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, 'u1', 0, 0)`,
			[id, libraryId, objects[0][1]]
		)
		for (const [bucket, objectName] of objects) {
			await client.query(
				`INSERT INTO library_item_object ("itemId", "bucket", "objectName") VALUES ($1, $2, $3)`,
				[id, bucket, objectName]
			)
		}
	}

	beforeEach(async () => {
		await client.query(
			`TRUNCATE "group", library, library_item, library_item_object, effect_outbox CASCADE`
		)
		await client.query(`INSERT INTO "group" ("id", "name") VALUES ('g1', 'g1')`)
		await addLibrary('c1')
		await addItem('i1', 'c1', [
			['rooms', 'content-1'],
			['uploads', 'thumb-1'],
		])
		await addItem('i2', 'c1', [['rooms', 'content-2']])
	})

	async function outbox() {
		const res = await client.query<{ tableName: string; entityId: string; payload: unknown }>(
			`SELECT "tableName", "entityId", payload FROM effect_outbox WHERE command = 'delete'
			 ORDER BY "entityId"`
		)
		return res.rows
	}

	const queued = (bucket: string, objectName: string) => ({
		tableName: 'library_item_object',
		entityId: `${bucket}/${objectName}`,
		payload: { bucket, objectName },
	})

	it('queues nothing for inserts or updates', async () => {
		await client.query(`UPDATE library_item SET "name" = 'Button', "libraryId" = 'c1'`)
		expect(await client.query(`SELECT 1 FROM effect_outbox`)).toMatchObject({ rowCount: 0 })
	})

	it("queues each of a deleted item's objects", async () => {
		await client.query(`DELETE FROM library_item WHERE "id" = 'i1'`)
		expect(await outbox()).toEqual([queued('rooms', 'content-1'), queued('uploads', 'thumb-1')])
		expect(
			await client.query(`SELECT 1 FROM library_item_object WHERE "itemId" = 'i1'`)
		).toMatchObject({ rowCount: 0 })
	})

	it('queues nothing when another item still names the objects', async () => {
		await addLibrary('c2')
		await addItem('copy1', 'c2', [
			['rooms', 'content-1'],
			['uploads', 'thumb-1'],
		])
		await client.query(`DELETE FROM library_item WHERE "id" = 'i1'`)
		expect(await outbox()).toEqual([])
	})

	it('queues the objects when the last item naming them is deleted', async () => {
		await addLibrary('c2')
		await addItem('copy1', 'c2', [['rooms', 'content-1']])
		await client.query(`DELETE FROM library_item WHERE "id" = 'i1'`)
		expect(await outbox()).toEqual([queued('uploads', 'thumb-1')])
		await client.query(`DELETE FROM library WHERE "id" = 'c2'`)
		expect(await outbox()).toEqual([queued('rooms', 'content-1'), queued('uploads', 'thumb-1')])
	})

	it("queues each item's objects when the library's delete cascades", async () => {
		await client.query(`DELETE FROM library WHERE "id" = 'c1'`)
		expect((await outbox()).map((r) => r.entityId)).toEqual([
			'rooms/content-1',
			'rooms/content-2',
			'uploads/thumb-1',
		])
	})

	it('queues the objects once a hard-deleted workspace cascades through an item and its copy', async () => {
		await addLibrary('c2')
		await addItem('copy1', 'c2', [['rooms', 'content-1']])
		await client.query(`DELETE FROM "group" WHERE "id" = 'g1'`)
		expect(await client.query(`SELECT 1 FROM library`)).toMatchObject({ rowCount: 0 })
		expect((await outbox()).map((r) => r.entityId)).toEqual([
			'rooms/content-1',
			'rooms/content-2',
			'uploads/thumb-1',
		])
	})

	it('queues each object once when one statement deletes two libraries that share it', async () => {
		await addLibrary('c2')
		await addItem('copy1', 'c2', [
			['rooms', 'content-1'],
			['uploads', 'thumb-1'],
		])
		await addItem('copy2', 'c2', [['rooms', 'content-2']])
		await client.query(`DELETE FROM library WHERE "id" IN ('c1', 'c2')`)
		expect(await outbox()).toEqual([
			queued('rooms', 'content-1'),
			queued('rooms', 'content-2'),
			queued('uploads', 'thumb-1'),
		])
	})

	it('queues an object again when an item names it after its queued delete was processed', async () => {
		await client.query(`DELETE FROM library_item WHERE "id" = 'i2'`)
		expect(await outbox()).toEqual([queued('rooms', 'content-2')])
		await client.query(`DELETE FROM effect_outbox`)
		await addItem('i3', 'c1', [['rooms', 'content-2']])
		await client.query(`DELETE FROM library_item WHERE "id" = 'i3'`)
		expect(await outbox()).toEqual([queued('rooms', 'content-2')])
	})

	it('queues an object whose last two items are deleted at once by two transactions', async () => {
		await addLibrary('c2')
		await addItem('copy1', 'c2', [['rooms', 'content-1']])
		const first = await connect()
		const second = await connect()
		try {
			await first.query('BEGIN')
			await first.query(`DELETE FROM library_item WHERE "id" = 'i1'`)
			// waits for the first transaction, whose check locked copy1's row
			const secondDelete = second.query(`DELETE FROM library_item WHERE "id" = 'copy1'`)
			await first.query('COMMIT')
			await secondDelete
		} finally {
			await first.end()
			await second.end()
		}
		expect((await outbox()).map((r) => r.entityId)).toContain('rooms/content-1')
	})

	it('makes a delete of an item wait for a transaction that has it locked to copy', async () => {
		const copier = await connect()
		const deleter = await connect()
		try {
			await copier.query('BEGIN')
			await copier.query(`SELECT 1 FROM library_item WHERE "libraryId" = 'c1' FOR KEY SHARE`)
			await deleter.query(`SET lock_timeout = '200ms'`)
			await expect(deleter.query(`DELETE FROM library_item WHERE "id" = 'i1'`)).rejects.toThrow(
				/lock timeout/
			)
			await copier.query('COMMIT')
		} finally {
			await copier.end()
			await deleter.end()
		}
	})

	it('refuses an object row for an item that does not exist', async () => {
		await expect(
			client.query(
				`INSERT INTO library_item_object ("itemId", "bucket", "objectName") VALUES ('nope', 'rooms', 'x')`
			)
		).rejects.toThrow(/library_item_object_item_id_fkey/)
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
