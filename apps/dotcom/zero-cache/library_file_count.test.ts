import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Integration test for migration 060: a library's count of the files it is added to, kept by
// triggers on file_library. Like file_library.test.ts, it runs the real migration chain in a
// throwaway database and is opt-in: set ZERO_CACHE_TEST_POSTGRES_URL (local dev stack:
// postgres://user:password@localhost:6543/postgres).
const CONNECTION_STRING = process.env.ZERO_CACHE_TEST_POSTGRES_URL

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const MIGRATION_FILES = readdirSync(MIGRATIONS_DIR)
	.filter((f) => f.endsWith('.sql'))
	.sort()
const FILE_COUNT_MIGRATION = '060_library_file_count.sql'

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
	await client.query(`TRUNCATE "user", "group", file, library, file_library CASCADE`)
	await client.query(
		`INSERT INTO "user" ("id", "name", "email", "avatar", "color", "exportFormat", "exportTheme",
		   "exportBackground", "exportPadding", "createdAt", "updatedAt", "flags")
		 VALUES ('u1', 'u1', 'u1', '', '', 'png', 'auto', false, false, 0, 0, '')`
	)
	for (const id of ['u1', 'g1']) {
		await client.query(`INSERT INTO "group" ("id", "name") VALUES ($1, $1)`, [id])
	}
	for (const id of ['f1', 'f2']) {
		await client.query(
			`INSERT INTO "file" ("id", "name", "owningGroupId", "thumbnail", "shared",
			   "sharedLinkType", "published", "lastPublished", "publishedSlug", "createdAt",
			   "updatedAt", "isEmpty")
			 VALUES ($1, $1, 'g1', '', false, 'view', false, 0, $1, 0, 0, false)`,
			[id]
		)
	}
	for (const id of ['c1', 'c2']) {
		await client.query(
			`INSERT INTO library ("id", "name", "owningGroupId", "createdBy", "createdAt", "updatedAt")
			 VALUES ($1, 'Shapes', 'g1', 'u1', 0, 0)`,
			[id]
		)
	}
}

const addToFile = (client: pg.Client, fileId: string, libraryId: string) =>
	client.query(
		`INSERT INTO file_library ("fileId", "libraryId", "addedBy", "addedAt") VALUES ($1, $2, 'u1', 0)`,
		[fileId, libraryId]
	)

const fileCounts = async (client: pg.Client) =>
	(
		await client.query<{ id: string; fileCount: number }>(
			`SELECT "id", "fileCount" FROM library ORDER BY "id"`
		)
	).rows

describeMaybe('library fileCount', () => {
	const db = useDatabase('library_file_count')

	beforeAll(() => migrate(db.client, MIGRATION_FILES))
	beforeEach(() => seed(db.client))

	it('starts a library in no files', async () => {
		expect(await fileCounts(db.client)).toEqual([
			{ id: 'c1', fileCount: 0 },
			{ id: 'c2', fileCount: 0 },
		])
	})

	it('counts the files a library is added to and removed from', async () => {
		await addToFile(db.client, 'f1', 'c1')
		await addToFile(db.client, 'f2', 'c1')
		await addToFile(db.client, 'f1', 'c2')
		expect(await fileCounts(db.client)).toEqual([
			{ id: 'c1', fileCount: 2 },
			{ id: 'c2', fileCount: 1 },
		])
		await db.client.query(`DELETE FROM file_library WHERE "fileId" = 'f1' AND "libraryId" = 'c1'`)
		await db.client.query(`DELETE FROM file_library WHERE "libraryId" = 'c2'`)
		expect(await fileCounts(db.client)).toEqual([
			{ id: 'c1', fileCount: 1 },
			{ id: 'c2', fileCount: 0 },
		])
	})

	it("doesn't count a refused duplicate", async () => {
		await addToFile(db.client, 'f1', 'c1')
		await expect(addToFile(db.client, 'f1', 'c1')).rejects.toThrow(/file_library_pkey/)
		expect(await fileCounts(db.client)).toContainEqual({ id: 'c1', fileCount: 1 })
	})

	it('uncounts a deleted file', async () => {
		await addToFile(db.client, 'f1', 'c1')
		await addToFile(db.client, 'f2', 'c1')
		await addToFile(db.client, 'f2', 'c2')
		await db.client.query(`DELETE FROM file WHERE "id" = 'f2'`)
		expect(await fileCounts(db.client)).toEqual([
			{ id: 'c1', fileCount: 1 },
			{ id: 'c2', fileCount: 0 },
		])
	})

	it('deletes a library added to files, leaving the others counted', async () => {
		await addToFile(db.client, 'f1', 'c1')
		await addToFile(db.client, 'f2', 'c1')
		await addToFile(db.client, 'f1', 'c2')
		await db.client.query(`DELETE FROM library WHERE "id" = 'c1'`)
		expect(await fileCounts(db.client)).toEqual([{ id: 'c2', fileCount: 1 }])
	})

	it('moves the count with a row moved to another library', async () => {
		await addToFile(db.client, 'f1', 'c1')
		await db.client.query(`UPDATE file_library SET "libraryId" = 'c2' WHERE "fileId" = 'f1'`)
		expect(await fileCounts(db.client)).toEqual([
			{ id: 'c1', fileCount: 0 },
			{ id: 'c2', fileCount: 1 },
		])
	})
})

describeMaybe('library fileCount backfill', () => {
	const db = useDatabase('library_file_count_backfill')

	it('counts the files libraries were already added to', async () => {
		await migrate(
			db.client,
			MIGRATION_FILES.filter((filename) => filename < FILE_COUNT_MIGRATION)
		)
		await seed(db.client)
		await addToFile(db.client, 'f1', 'c1')
		await addToFile(db.client, 'f2', 'c1')
		await migrate(
			db.client,
			MIGRATION_FILES.filter((filename) => filename >= FILE_COUNT_MIGRATION)
		)
		expect(await fileCounts(db.client)).toEqual([
			{ id: 'c1', fileCount: 2 },
			{ id: 'c2', fileCount: 0 },
		])
	})
})
