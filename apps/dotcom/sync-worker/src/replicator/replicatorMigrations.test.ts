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
			expect(migrations).toHaveLength(8) // All migrations should be applied

			// Should not duplicate existing migrations
			const migrationCounts = sqlStorage
				.exec('SELECT id, COUNT(*) as count FROM migrations GROUP BY id')
				.toArray()
			migrationCounts.forEach((m: any) => {
				expect(m.count).toBe(1) // Each migration should appear only once
			})
		})
	})

	describe('migration 007_update_history_subscriptions', () => {
		it('should update the subscription changes column for all existing history rows', async () => {
			await migrate(sqlStorage as any, logger as any, '006_graph_subscriptions')

			// Add test data to verify the migration works correctly
			const testData = [
				// Test case 1: file_state insert that should create user->file subscription
				{
					lsn: 'test/001',
					changesJson: JSON.stringify([
						{
							event: { table: 'file_state', command: 'insert' },
							row: { userId: 'alice', fileId: 'doc1' },
							topics: ['user:alice'], // Missing file:doc1 topic
						},
					]),
					newSubscriptions: null, // Should be updated to include user:alice->file:doc1
					removedSubscriptions: null,
					topics: 'user:alice',
					timestamp: 1000,
				},
				// Test case 2: file_state delete that should remove user->file subscription
				{
					lsn: 'test/002',
					changesJson: JSON.stringify([
						{
							event: { table: 'file_state', command: 'delete' },
							row: { userId: 'bob', fileId: 'doc2' },
							previous: { userId: 'bob', fileId: 'doc2' },
							topics: ['user:bob'], // Missing file:doc2 topic
						},
					]),
					newSubscriptions: null,
					removedSubscriptions: null, // Should be updated to include user:bob->file:doc2
					topics: 'user:bob',
					timestamp: 1001,
				},
				// Test case 3: user update that should NOT change subscriptions
				{
					lsn: 'test/003',
					changesJson: JSON.stringify([
						{
							event: { table: 'user', command: 'update' },
							row: { id: 'dave', name: 'David' },
							previous: { id: 'dave', name: 'Dave' },
							topics: ['user:dave'],
						},
					]),
					newSubscriptions: null, // Should remain null
					removedSubscriptions: null, // Should remain null
					topics: 'user:dave',
					timestamp: 1002,
				},
				// Test case 4: file update that should NOT change subscriptions
				{
					lsn: 'test/004',
					changesJson: JSON.stringify([
						{
							event: { table: 'file', command: 'update' },
							row: { id: 'doc4', name: 'Updated Doc' },
							previous: { id: 'doc4', name: 'Old Doc' },
							topics: ['file:doc4'],
						},
					]),
					newSubscriptions: null, // Should remain null
					removedSubscriptions: null, // Should remain null
					topics: 'file:doc4',
					timestamp: 1003,
				},
				// Test case 5: Multiple file_state changes in one transaction
				{
					lsn: 'test/005',
					changesJson: JSON.stringify([
						{
							event: { table: 'file_state', command: 'insert' },
							row: { userId: 'eve', fileId: 'doc5' },
							topics: ['user:eve'],
						},
						{
							event: { table: 'file_state', command: 'delete' },
							row: { userId: 'frank', fileId: 'doc6' },
							previous: { userId: 'frank', fileId: 'doc6' },
							topics: ['user:frank'],
						},
					]),
					newSubscriptions: null, // Should be updated to include user:eve->file:doc5
					removedSubscriptions: null, // Should be updated to include user:frank->file:doc6
					topics: 'user:eve,user:frank',
					timestamp: 1004,
				},
				// Test case 6: Multiple insertions and deletions in one transaction
				{
					lsn: 'test/006',
					changesJson: JSON.stringify([
						{
							event: { table: 'file_state', command: 'insert' },
							row: { userId: 'grace', fileId: 'doc7' },
							topics: ['user:grace'],
						},
						{
							event: { table: 'file_state', command: 'insert' },
							row: { userId: 'henry', fileId: 'doc8' },
							topics: ['user:henry'],
						},
						{
							event: { table: 'file_state', command: 'delete' },
							row: { userId: 'iris', fileId: 'doc9' },
							previous: { userId: 'iris', fileId: 'doc9' },
							topics: ['user:iris'],
						},
						{
							event: { table: 'file_state', command: 'delete' },
							row: { userId: 'jack', fileId: 'doc10' },
							previous: { userId: 'jack', fileId: 'doc10' },
							topics: ['user:jack'],
						},
					]),
					newSubscriptions: null, // Should be updated to include user:grace->file:doc7, user:henry->file:doc8
					removedSubscriptions: null, // Should be updated to include user:iris->file:doc9, user:jack->file:doc10
					topics: 'user:grace,user:henry,user:iris,user:jack',
					timestamp: 1005,
				},
			]

			// Insert test data
			for (const testRow of testData) {
				sqlStorage.exec(
					'INSERT INTO history (lsn, changesJson, newSubscriptions, removedSubscriptions, topics, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
					testRow.lsn,
					testRow.changesJson,
					testRow.newSubscriptions,
					testRow.removedSubscriptions,
					testRow.topics,
					testRow.timestamp
				)
			}

			// Verify test data was inserted
			const initialHistory = sqlStorage.exec('SELECT * FROM history').toArray()
			expect(initialHistory).toHaveLength(6)

			// Run migration 007
			await migrate(sqlStorage as any, logger as any, '007_update_history_subscriptions')

			// Verify the migration was applied
			const migrations = sqlStorage.exec('SELECT id FROM migrations ORDER BY id').toArray()
			expect(migrations.map((m: any) => m.id)).toContain('007_update_history_subscriptions')

			// Get the updated history data
			const updatedHistory = sqlStorage
				.exec(
					"SELECT lsn, newSubscriptions, removedSubscriptions FROM history WHERE lsn LIKE 'test/%' ORDER BY lsn"
				)
				.toArray()

			// Test case 1: file_state insert should have new subscription
			const test1 = updatedHistory.find((r: any) => r.lsn === 'test/001')
			expect(test1?.newSubscriptions).toBe('user:alice\\file:doc1')
			expect(test1?.removedSubscriptions).toBeNull()

			// Test case 2: file_state delete should have removed subscription
			const test2 = updatedHistory.find((r: any) => r.lsn === 'test/002')
			expect(test2?.newSubscriptions).toBeNull()
			expect(test2?.removedSubscriptions).toBe('user:bob\\file:doc2')

			// Test case 3: user update should have no subscription changes
			const test3 = updatedHistory.find((r: any) => r.lsn === 'test/003')
			expect(test3?.newSubscriptions).toBeNull()
			expect(test3?.removedSubscriptions).toBeNull()

			// Test case 4: file update should have no subscription changes
			const test4 = updatedHistory.find((r: any) => r.lsn === 'test/004')
			expect(test4?.newSubscriptions).toBeNull()
			expect(test4?.removedSubscriptions).toBeNull()

			// Test case 5: Multiple file_state changes should have both new and removed subscriptions
			const test5 = updatedHistory.find((r: any) => r.lsn === 'test/005')
			expect(test5?.newSubscriptions).toBe('user:eve\\file:doc5')
			expect(test5?.removedSubscriptions).toBe('user:frank\\file:doc6')

			// Test case 6: Multiple insertions and deletions should have new subscriptions
			const test6 = updatedHistory.find((r: any) => r.lsn === 'test/006')
			expect(test6?.newSubscriptions).toBe('user:grace\\file:doc7,user:henry\\file:doc8')
			expect(test6?.removedSubscriptions).toBe('user:iris\\file:doc9,user:jack\\file:doc10')
		})

		it('should update file change topics to only include the file after migration', async () => {
			await migrate(sqlStorage as any, logger as any, '006_graph_subscriptions')

			// Insert a history row with a file change and both user and file topics
			sqlStorage.exec(
				'INSERT INTO history (lsn, changesJson, newSubscriptions, removedSubscriptions, topics, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
				'00/001',
				JSON.stringify([
					{
						event: { table: 'file', command: 'update' },
						row: { id: 'doc1', ownerId: 'alice', name: 'Doc 1' },
						previous: { id: 'doc1', ownerId: 'alice', name: 'Old Doc 1' },
						topics: ['user:alice', 'file:doc1'],
					},
				]),
				null,
				null,
				'user:alice,file:doc1',
				1234
			)

			// Run migration 007
			await migrate(sqlStorage as any, logger as any, '007_update_history_subscriptions')

			// Check that topics are now just 'file:doc1'
			const updated = sqlStorage.exec("SELECT topics FROM history WHERE lsn = '00/001'").one()
			expect(updated.topics).toBe('file:doc1')
		})
	})
})
