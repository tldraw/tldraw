import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Integration test for the libraries migration's count of a library's items, kept by triggers
// on library_item. Like file_library.test.ts, it runs the real migration chain in a throwaway
// database and is opt-in: set ZERO_CACHE_TEST_POSTGRES_URL (local dev stack:
// postgres://user:password@localhost:6543/postgres).
const CONNECTION_STRING = process.env.ZERO_CACHE_TEST_POSTGRES_URL

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const MIGRATION_FILES = readdirSync(MIGRATIONS_DIR)
	.filter((f) => f.endsWith('.sql'))
	.sort()

const describeMaybe = CONNECTION_STRING ? describe : describe.skip

function useDatabase(name: string) {
	const dbName = `tldraw_test_${name}_${process.pid}`
	const db = { adminClient: undefined as pg.Client | undefined, client: undefined! as pg.Client }

	beforeAll(async () => {
		const adminClient = new pg.Client({ connectionString: CONNECTION_STRING })
		db.adminClient = adminClient
		await adminClient.connect()
		await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`)
		await adminClient.query(`CREATE DATABASE "${dbName}"`)
		const url = new URL(CONNECTION_STRING!)
		url.pathname = `/${dbName}`
		db.client = new pg.Client({ connectionString: url.toString() })
		await db.client.connect()
	})

	afterAll(async () => {
		if (db.client) await db.client.end()
		if (db.adminClient) {
			await db.adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`)
			await db.adminClient.end()
		}
	})

	return db
}

async function migrate(client: pg.Client, filenames: string[]) {
	for (const filename of filenames) {
		try {
			await client.query(readFileSync(join(MIGRATIONS_DIR, filename), 'utf8'))
		} catch (err) {
			throw new Error(`Migration ${filename} failed: ${(err as Error).message}`)
		}
	}
}

async function seed(client: pg.Client) {
	await client.query(`TRUNCATE "user", "group", library, library_item CASCADE`)
	await client.query(
		`INSERT INTO "user" ("id", "name", "email", "avatar", "color", "exportFormat", "exportTheme",
		   "exportBackground", "exportPadding", "createdAt", "updatedAt", "flags")
		 VALUES ('u1', 'u1', 'u1', '', '', 'png', 'auto', false, false, 0, 0, '')`
	)
	await client.query(`INSERT INTO "group" ("id", "name") VALUES ('g1', 'g1')`)
	for (const id of ['c1', 'c2']) {
		await client.query(
			`INSERT INTO library ("id", "name", "owningGroupId", "createdBy", "createdAt", "updatedAt")
			 VALUES ($1, 'Shapes', 'g1', 'u1', 0, 0)`,
			[id]
		)
	}
}

const addItem = (client: pg.Client, id: string, libraryId: string) =>
	client.query(
		`INSERT INTO library_item ("id", "libraryId", "contentKey", "createdBy", "createdAt", "updatedAt")
		 VALUES ($1, $2, $1, 'u1', 0, 0)`,
		[id, libraryId]
	)

const itemCounts = async (client: pg.Client) =>
	(
		await client.query<{ id: string; itemCount: number }>(
			`SELECT "id", "itemCount" FROM library ORDER BY "id"`
		)
	).rows

describeMaybe('library itemCount', () => {
	const db = useDatabase('library_item_count')

	beforeAll(() => migrate(db.client, MIGRATION_FILES))
	beforeEach(() => seed(db.client))

	it('starts a library with no items', async () => {
		expect(await itemCounts(db.client)).toEqual([
			{ id: 'c1', itemCount: 0 },
			{ id: 'c2', itemCount: 0 },
		])
	})

	it('counts the items added to a library and deleted from it', async () => {
		await addItem(db.client, 'i1', 'c1')
		await addItem(db.client, 'i2', 'c1')
		await addItem(db.client, 'i3', 'c2')
		expect(await itemCounts(db.client)).toEqual([
			{ id: 'c1', itemCount: 2 },
			{ id: 'c2', itemCount: 1 },
		])
		await db.client.query(`DELETE FROM library_item WHERE "id" IN ('i1', 'i3')`)
		expect(await itemCounts(db.client)).toEqual([
			{ id: 'c1', itemCount: 1 },
			{ id: 'c2', itemCount: 0 },
		])
	})

	it('moves the count with an item moved to another library', async () => {
		await addItem(db.client, 'i1', 'c1')
		await db.client.query(`UPDATE library_item SET "libraryId" = 'c2' WHERE "id" = 'i1'`)
		expect(await itemCounts(db.client)).toEqual([
			{ id: 'c1', itemCount: 0 },
			{ id: 'c2', itemCount: 1 },
		])
	})

	it("doesn't change the count when an item is renamed", async () => {
		await addItem(db.client, 'i1', 'c1')
		await db.client.query(`UPDATE library_item SET "name" = 'Box' WHERE "id" = 'i1'`)
		expect(await itemCounts(db.client)).toContainEqual({ id: 'c1', itemCount: 1 })
	})

	it('deletes a library with items, leaving the others counted', async () => {
		await addItem(db.client, 'i1', 'c1')
		await addItem(db.client, 'i2', 'c2')
		await db.client.query(`DELETE FROM library WHERE "id" = 'c1'`)
		expect(await itemCounts(db.client)).toEqual([{ id: 'c2', itemCount: 1 }])
	})
})
