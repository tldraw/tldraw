import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Focused integration test for the effect_outbox trigger (migrations 047, 048), the
// generic transactional outbox that TLFileEffectProcessor (sync-worker) drains. The
// design-critical case is #5 below: cleanup_deleted_group_trigger (023_groups.sql)
// soft-deletes group-owned files from inside a plpgsql trigger when a group is
// deleted, and file_effect_outbox_after_change must still fire for that UPDATE —
// a trigger-on-trigger cascade that only a real Postgres can exercise.
//
// This talks to a real postgres (the triggers are plpgsql, so fakes can't exercise
// them). It is opt-in: set ZERO_CACHE_TEST_POSTGRES_URL (local dev stack:
// postgres://user:password@localhost:6543/postgres) to run it. Without a connection
// string the suite is skipped so CI stays green.
//
// Isolation differs from stamp_comment_created_at.test.ts / delete_file_states.test.ts:
// those pin `search_path` to a throwaway schema because their migration SQL uses
// unqualified table names. 047/048 hardcode `public.` (CREATE TABLE public.effect_outbox,
// CREATE TRIGGER ... ON public.file), so search_path can't redirect them — running them
// verbatim always targets the connection's `public` schema. Since ZERO_CACHE_TEST_POSTGRES_URL
// points at a real local dev stack whose `public` schema holds real dev data, this suite
// instead creates a throwaway database with CREATE DATABASE, and drops it in afterAll.
//
// Owning a whole database also means the REAL migration chain (000 onward) can run
// verbatim, exactly like migrate.ts applies it. Every trigger involved — the outbox
// trigger, the group-delete cascade, the updatedAt bumper (005), the owner-details
// denormalizers — is the shipped one, not a test copy, so a behavior change in any
// migration is caught here.
const CONNECTION_STRING = process.env.ZERO_CACHE_TEST_POSTGRES_URL

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

// The full, shipped migration chain in filename order — the same ordering migrate.ts
// uses (readdirSync().sort()).
const MIGRATION_FILES = readdirSync(MIGRATIONS_DIR)
	.filter((f) => f.endsWith('.sql'))
	.sort()

const dbName = `tldraw_test_outbox_${process.pid}`

const describeMaybe = CONNECTION_STRING ? describe : describe.skip
if (!CONNECTION_STRING) {
	// eslint-disable-next-line no-console
	console.warn(
		'effect_outbox.test.ts: skipping — TLFileEffectProcessor depends on this trigger; set ' +
			'ZERO_CACHE_TEST_POSTGRES_URL to verify it against a real postgres.'
	)
}

describeMaybe('effect_outbox trigger (file changes + group-delete cascade)', () => {
	// One client on the admin connection (for CREATE/DROP DATABASE, which cannot run
	// inside a transaction) and one on the throwaway database (where the migration
	// chain and all DML run un-namespaced, matching production).
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

		// Apply the real migration chain, in order, verbatim.
		for (const filename of MIGRATION_FILES) {
			const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
			try {
				await client.query(sql)
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
		// TRUNCATE fires no row-level triggers, so resetting state writes no outbox rows.
		// CASCADE clears referencing tables (file_state, group_file, group_user, ...).
		await client.query(`TRUNCATE "user", "file", "group", effect_outbox CASCADE`)
	})

	async function seedUser(id: string) {
		await client.query(
			`INSERT INTO "user" ("id", "name", "email", "avatar", "color", "exportFormat", "exportTheme",
			   "exportBackground", "exportPadding", "createdAt", "updatedAt", "flags")
			 VALUES ($1, $1, $1, '', '', 'png', 'auto', false, false, 0, 0, '')`,
			[id]
		)
	}

	async function seedFile(
		id: string,
		overrides: { ownerId?: string | null; owningGroupId?: string | null } = {}
	) {
		const ownerId = overrides.ownerId !== undefined ? overrides.ownerId : 'u1'
		const owningGroupId = overrides.owningGroupId !== undefined ? overrides.owningGroupId : null
		await client.query(
			`INSERT INTO "file" ("id", "name", "ownerId", "owningGroupId", "thumbnail", "shared",
			   "sharedLinkType", "published", "lastPublished", "publishedSlug", "createdAt",
			   "updatedAt", "isEmpty")
			 VALUES ($1, $1, $2, $3, '', false, 'view', false, 0, $1, 0, 0, false)`,
			[id, ownerId, owningGroupId]
		)
	}

	interface OutboxRow {
		tableName: string
		entityId: string
		command: string
		payload: any
		prevPayload: any
		attempts: number
		nextRetryAt: string | null
	}

	async function outboxRows(entityId: string): Promise<OutboxRow[]> {
		const res = await client.query<OutboxRow>(
			`SELECT "tableName", "entityId", command, payload, "prevPayload", attempts, "nextRetryAt"
			 FROM effect_outbox WHERE "entityId" = $1 ORDER BY id`,
			[entityId]
		)
		return res.rows
	}

	it('file INSERT produces one outbox row with the new row as payload and no prevPayload', async () => {
		await seedUser('u1')
		await seedFile('f1')

		const rows = await outboxRows('f1')
		expect(rows).toHaveLength(1)
		expect(rows[0].tableName).toBe('file')
		expect(rows[0].command).toBe('insert')
		expect(rows[0].payload.id).toBe('f1')
		expect(rows[0].prevPayload).toBeNull()
	})

	it('a no-op update (bumping only updatedAt) produces no new outbox row', async () => {
		await seedUser('u1')
		await seedFile('f1')

		// This is the room-persist path: sync-worker bumps updatedAt every few seconds
		// per active room. The 005 trigger rewrites updatedAt to now() on any distinct
		// update, so only updatedAt differs between OLD and NEW — the outbox filter
		// must treat that as a no-op.
		await client.query(`UPDATE "file" SET "updatedAt" = 12345 WHERE "id" = 'f1'`)

		const rows = await outboxRows('f1')
		// only the insert row from seedFile
		expect(rows).toHaveLength(1)
		expect(rows[0].command).toBe('insert')
	})

	it('an effect-relevant update (publish) produces an update row carrying the full OLD row as prevPayload', async () => {
		await seedUser('u1')
		await seedFile('f1')

		await client.query(
			`UPDATE "file" SET "published" = true, "lastPublished" = 999 WHERE "id" = 'f1'`
		)

		const rows = await outboxRows('f1')
		expect(rows).toHaveLength(2)
		const updateRow = rows[1]
		expect(updateRow.command).toBe('update')
		expect(updateRow.payload.published).toBe(true)
		expect(updateRow.payload.lastPublished).toBe(999)
		// prevPayload is the full OLD row: changed columns show their old values,
		// unchanged columns are present and equal
		expect(updateRow.prevPayload.published).toBe(false)
		expect(updateRow.prevPayload.lastPublished).toBe(0)
		expect(updateRow.prevPayload.id).toBe('f1')
		expect(updateRow.prevPayload.name).toBe('f1')
		expect(updateRow.prevPayload.ownerId).toBe('u1')
	})

	it('file DELETE produces a delete row with the OLD row as payload and no prevPayload', async () => {
		await seedUser('u1')
		await seedFile('f1')

		await client.query(`DELETE FROM "file" WHERE "id" = 'f1'`)

		const rows = await outboxRows('f1')
		expect(rows).toHaveLength(2)
		const deleteRow = rows[1]
		expect(deleteRow.command).toBe('delete')
		expect(deleteRow.payload.id).toBe('f1')
		expect(deleteRow.prevPayload).toBeNull()
	})

	it('deleting a group cascades to a soft-delete update on its files, and the outbox trigger fires for it', async () => {
		await seedUser('u1')
		await client.query(`INSERT INTO "group" ("id", "name") VALUES ('g1', 'g1')`)
		await seedFile('fGroup', { ownerId: null, owningGroupId: 'g1' })

		// The real cleanup_deleted_group_trigger (023_groups.sql) fires inside this
		// UPDATE and soft-deletes fGroup, which in turn must fire
		// file_effect_outbox_after_change for that nested UPDATE.
		await client.query(`UPDATE "group" SET "isDeleted" = true WHERE "id" = 'g1'`)

		const rows = await outboxRows('fGroup')
		expect(rows).toHaveLength(2)
		const cascadeRow = rows[1]
		expect(cascadeRow.tableName).toBe('file')
		expect(cascadeRow.command).toBe('update')
		expect(cascadeRow.payload.isDeleted).toBe(true)
		expect(cascadeRow.prevPayload.isDeleted).toBe(false)
	})

	it('new rows start with attempts = 0 and nextRetryAt IS NULL (048 applied)', async () => {
		await seedUser('u1')
		await seedFile('f1')

		const rows = await outboxRows('f1')
		expect(rows).toHaveLength(1)
		expect(rows[0].attempts).toBe(0)
		expect(rows[0].nextRetryAt).toBeNull()
	})
})
