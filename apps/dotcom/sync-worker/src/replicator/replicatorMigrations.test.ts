import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { migrate } from './replicatorMigrations'
import { MockLogger, SqlStorageAdapter } from './test-helpers'

describe('replicatorMigrations', () => {
	let db: DatabaseSync
	let sqlStorage: SqlStorageAdapter
	let logger: MockLogger
	let dbPath: string

	beforeEach(() => {
		// Create a temporary database file for each test
		dbPath = join(tmpdir(), `test-${Date.now()}-${Math.random()}.db`)
		db = new DatabaseSync(dbPath)
		sqlStorage = new SqlStorageAdapter(db)
		logger = new MockLogger()
	})

	afterEach(() => {
		try {
			db.close()
		} catch {
			// Ignore if already closed
		}
		try {
			unlinkSync(dbPath)
		} catch {
			// Ignore errors when cleaning up temp files
		}
	})

	describe('migrate function', () => {
		it('should run migrations on empty database', async () => {
			await migrate(sqlStorage as any, logger as any)

			// Check that initial tables were created
			const tableQuery = `
				SELECT name FROM sqlite_master 
				WHERE type='table' 
			`
			const tables = sqlStorage.exec(tableQuery).toArray()

			expect(tables).toMatchInlineSnapshot(`
			[
			  {
			    "name": "active_user",
			  },
			  {
			    "name": "migrations",
			  },
			  {
			    "name": "meta",
			  },
			  {
			    "name": "sqlite_stat1",
			  },
			  {
			    "name": "history",
			  },
			  {
			    "name": "topic_subscription",
			  },
			]
		`)
		})

		it('should not re-run already applied migrations', async () => {
			// Run migrations first time
			await migrate(sqlStorage as any, logger as any)
			const firstMigrationCount = sqlStorage
				.exec('SELECT COUNT(*) as count FROM migrations')
				.one().count

			// Run migrations again
			await migrate(sqlStorage as any, logger as any)
			const secondMigrationCount = sqlStorage
				.exec('SELECT COUNT(*) as count FROM migrations')
				.one().count

			// Should be the same count
			expect(firstMigrationCount).toBe(secondMigrationCount)
		})

		it('should detect migration sequence changes and throw error', async () => {
			// Apply first few migrations manually
			sqlStorage.exec(`
				CREATE TABLE migrations (
					id TEXT PRIMARY KEY,
					code TEXT NOT NULL
				);
			`)
			sqlStorage.exec(`INSERT INTO migrations (id, code) VALUES ('000_seed', 'sql')`)
			sqlStorage.exec(`INSERT INTO migrations (id, code) VALUES ('001_different_id', 'sql')`)

			// Should throw error because migration sequence changed
			await expect(migrate(sqlStorage as any, logger as any)).rejects.toThrow(
				'TLPostgresReplicator migrations have changed!! this is an append-only array!!'
			)
		})
	})

	describe('test__upTo parameter', () => {
		it('should stop at specified migration', async () => {
			await migrate(sqlStorage as any, logger as any, '002_add_last_updated_at')

			const migrations = sqlStorage.exec('SELECT id FROM migrations ORDER BY id').toArray()
			expect(migrations).toHaveLength(3)
			expect(migrations.map((m: any) => m.id)).toEqual([
				'000_seed',
				'001_add_sequence_number',
				'002_add_last_updated_at',
			])

			// Verify the lastUpdatedAt column was added
			const columns = sqlStorage.exec('PRAGMA table_info(active_user)').toArray()
			expect(columns.find((c: any) => c.name === 'lastUpdatedAt')).toBeTruthy()

			// Verify later migrations haven't run
			const tables = sqlStorage
				.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='meta'`)
				.toArray()
			expect(tables).toHaveLength(0) // meta table should not exist yet
		})

		it('should throw error for invalid migration id', async () => {
			await expect(
				migrate(sqlStorage as any, logger as any, 'invalid_migration_id')
			).rejects.toThrow("Migration with id 'invalid_migration_id' not found")
		})

		it('should handle partial migration followed by complete migration', async () => {
			// First, run partial migration
			await migrate(sqlStorage as any, logger as any, '003_add_lsn_tracking')

			let migrations = sqlStorage.exec('SELECT id FROM migrations ORDER BY id').toArray()
			expect(migrations).toHaveLength(4)

			// Then complete all migrations
			await migrate(sqlStorage as any, logger as any)

			migrations = sqlStorage.exec('SELECT id FROM migrations ORDER BY id').toArray()
			expect(migrations).toHaveLength(7) // All migrations should be applied

			// Should not duplicate existing migrations
			const migrationCounts = sqlStorage
				.exec('SELECT id, COUNT(*) as count FROM migrations GROUP BY id')
				.toArray()
			migrationCounts.forEach((m: any) => {
				expect(m.count).toBe(1) // Each migration should appear only once
			})
		})
	})
})
