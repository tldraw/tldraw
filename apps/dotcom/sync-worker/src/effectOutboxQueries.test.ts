import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { DB } from '@tldraw/dotcom-shared'
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getNextLibraryObjectDeleteDueAt, selectEffectOutboxBatch } from './effectOutboxQueries'
import { LIBRARY_OBJECT_DELETE_GRACE_MS, queueLibraryObjectDeletes } from './libraryEffects'

// Runs the outbox queries against the real migration chain in a throwaway database. Opt-in, like
// the zero-cache integration tests: set ZERO_CACHE_TEST_POSTGRES_URL (local dev stack:
// postgres://user:password@localhost:6543/postgres).
const CONNECTION_STRING = process.env.ZERO_CACHE_TEST_POSTGRES_URL

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../zero-cache/migrations')
const dbName = `tldraw_test_effect_outbox_queries_${process.pid}`

const describeMaybe = CONNECTION_STRING ? describe : describe.skip

describeMaybe('effect outbox queries', () => {
	let adminClient: pg.Client
	let pool: pg.Pool
	let db: Kysely<DB>

	beforeAll(async () => {
		adminClient = new pg.Client({ connectionString: CONNECTION_STRING })
		await adminClient.connect()
		await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`)
		await adminClient.query(`CREATE DATABASE "${dbName}"`)
		const url = new URL(CONNECTION_STRING!)
		url.pathname = `/${dbName}`
		pool = new pg.Pool({ connectionString: url.toString() })
		for (const filename of readdirSync(MIGRATIONS_DIR)
			.filter((f) => f.endsWith('.sql'))
			.sort()) {
			await pool.query(readFileSync(join(MIGRATIONS_DIR, filename), 'utf8'))
		}
		db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) })
	})

	afterAll(async () => {
		if (db) await db.destroy()
		if (adminClient) {
			await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`)
			await adminClient.end()
		}
	})

	beforeEach(async () => {
		await pool.query(`TRUNCATE effect_outbox`)
	})

	async function queue(tableName: string, entityId: string, ageMs: number) {
		const { rows } = await pool.query<{ createdAt: Date }>(
			`INSERT INTO effect_outbox ("tableName", "entityId", command, payload, "createdAt")
			 VALUES ($1, $2, 'delete', '{}', now() - ($3 || ' milliseconds')::interval)
			 RETURNING "createdAt"`,
			[tableName, entityId, ageMs]
		)
		return rows[0].createdAt.getTime()
	}

	it('leaves a library object delete younger than the grace period for later', async () => {
		const createdAt = await queue('library_item_object', 'uploads/young-png', 60_000)
		expect(await selectEffectOutboxBatch(db)).toEqual([])
		expect(await getNextLibraryObjectDeleteDueAt(db)).toBe(
			createdAt + LIBRARY_OBJECT_DELETE_GRACE_MS
		)
	})

	it('processes a library object delete older than the grace period', async () => {
		await queue('library_item_object', 'uploads/old-png', LIBRARY_OBJECT_DELETE_GRACE_MS + 1_000)
		const batch = await selectEffectOutboxBatch(db)
		expect(batch.map((row) => row.entityId)).toEqual(['uploads/old-png'])
		expect(await getNextLibraryObjectDeleteDueAt(db)).toBe(null)
	})

	it('is due when the earliest deferred delete is', async () => {
		await queue('library_item_object', 'uploads/newer-png', 1_000)
		const earliest = await queue('library_item_object', 'uploads/older-png', 120_000)
		expect(await getNextLibraryObjectDeleteDueAt(db)).toBe(
			earliest + LIBRARY_OBJECT_DELETE_GRACE_MS
		)
	})

	it("queues an add's objects as library_item_object's trigger does, deferred like its rows", async () => {
		await queueLibraryObjectDeletes(db, [
			{ bucket: 'rooms', objectName: 'library-items/k/content.json' },
			{ bucket: 'uploads', objectName: 'thumb-png' },
		])
		const { rows } = await pool.query(
			`SELECT "tableName", "entityId", command, payload FROM effect_outbox ORDER BY id`
		)
		expect(rows).toEqual([
			{
				tableName: 'library_item_object',
				entityId: 'rooms/library-items/k/content.json',
				command: 'delete',
				payload: { bucket: 'rooms', objectName: 'library-items/k/content.json' },
			},
			{
				tableName: 'library_item_object',
				entityId: 'uploads/thumb-png',
				command: 'delete',
				payload: { bucket: 'uploads', objectName: 'thumb-png' },
			},
		])
		expect(await selectEffectOutboxBatch(db)).toEqual([])
		expect(await getNextLibraryObjectDeleteDueAt(db)).not.toBe(null)
	})

	it("doesn't defer other tables' effects", async () => {
		await queue('file', 'file_1', 0)
		const batch = await selectEffectOutboxBatch(db)
		expect(batch.map((row) => row.entityId)).toEqual(['file_1'])
		expect(await getNextLibraryObjectDeleteDueAt(db)).toBe(null)
	})
})
