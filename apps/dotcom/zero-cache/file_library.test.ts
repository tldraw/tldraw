import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Integration test for migration 059: libraries added to a file, and a user's default library.
// Like library_item_effect_outbox.test.ts, it runs the real migration chain in a throwaway
// database and is opt-in: set ZERO_CACHE_TEST_POSTGRES_URL (local dev stack:
// postgres://user:password@localhost:6543/postgres).
const CONNECTION_STRING = process.env.ZERO_CACHE_TEST_POSTGRES_URL

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const MIGRATION_FILES = readdirSync(MIGRATIONS_DIR)
	.filter((f) => f.endsWith('.sql'))
	.sort()

const dbName = `tldraw_test_file_library_${process.pid}`

const describeMaybe = CONNECTION_STRING ? describe : describe.skip

describeMaybe('file_library and default libraries', () => {
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

	const insertLibrary = (id: string, owningGroupId: string, createdBy: string, isDefault = false) =>
		client.query(
			`INSERT INTO library ("id", "name", "owningGroupId", "createdBy", "createdAt", "updatedAt", "isDefault")
			 VALUES ($1, 'Shapes', $2, $3, 0, 0, $4)`,
			[id, owningGroupId, createdBy, isDefault]
		)

	const addToFile = (fileId: string, libraryId: string) =>
		client.query(
			`INSERT INTO file_library ("fileId", "libraryId", "addedBy", "addedAt") VALUES ($1, $2, 'u1', 0)`,
			[fileId, libraryId]
		)

	const fileLibraries = async () =>
		(
			await client.query<{ fileId: string; libraryId: string }>(
				`SELECT "fileId", "libraryId" FROM file_library ORDER BY "fileId", "libraryId"`
			)
		).rows

	beforeEach(async () => {
		await client.query(`TRUNCATE "user", "group", file, library, file_library CASCADE`)
		for (const id of ['u1', 'u2', 'g1']) {
			if (id.startsWith('u')) {
				await client.query(
					`INSERT INTO "user" ("id", "name", "email", "avatar", "color", "exportFormat", "exportTheme",
					   "exportBackground", "exportPadding", "createdAt", "updatedAt", "flags")
					 VALUES ($1, $1, $1, '', '', 'png', 'auto', false, false, 0, 0, '')`,
					[id]
				)
			}
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
		await insertLibrary('c1', 'g1', 'u1')
		await insertLibrary('c2', 'g1', 'u1')
	})

	it('adds a library to a file once', async () => {
		await addToFile('f1', 'c1')
		await expect(addToFile('f1', 'c1')).rejects.toThrow(/file_library_pkey/)
	})

	it("removes a file's rows with the file, and a library's with the library", async () => {
		await addToFile('f1', 'c1')
		await addToFile('f1', 'c2')
		await addToFile('f2', 'c1')
		await client.query(`DELETE FROM file WHERE "id" = 'f2'`)
		expect(await fileLibraries()).toEqual([
			{ fileId: 'f1', libraryId: 'c1' },
			{ fileId: 'f1', libraryId: 'c2' },
		])
		await client.query(`DELETE FROM library WHERE "id" = 'c1'`)
		expect(await fileLibraries()).toEqual([{ fileId: 'f1', libraryId: 'c2' }])
	})

	it('refuses a row for a file or library that does not exist', async () => {
		await expect(addToFile('nope', 'c1')).rejects.toThrow(/file_library_file_id_fkey/)
		await expect(addToFile('f1', 'nope')).rejects.toThrow(/file_library_library_id_fkey/)
	})

	it('makes an existing library not the default', async () => {
		const res = await client.query(`SELECT "isDefault" FROM library WHERE "id" = 'c1'`)
		expect(res.rows).toEqual([{ isDefault: false }])
	})

	it('allows one default per user, in their home workspace', async () => {
		await insertLibrary('d1', 'u1', 'u1', true)
		await insertLibrary('d2', 'u2', 'u2', true)
		await expect(insertLibrary('d3', 'u1', 'u1', true)).rejects.toThrow(
			/library_one_default_per_user_idx/
		)
	})

	it("refuses a default outside its creator's home workspace", async () => {
		await expect(insertLibrary('d1', 'g1', 'u1', true)).rejects.toThrow(
			/library_default_in_home_workspace/
		)
		await insertLibrary('d1', 'u1', 'u1', true)
		await expect(
			client.query(`UPDATE library SET "owningGroupId" = 'g1' WHERE "id" = 'd1'`)
		).rejects.toThrow(/library_default_in_home_workspace/)
	})
})
