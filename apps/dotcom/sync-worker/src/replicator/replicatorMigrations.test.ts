import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { parseSubscriptions } from './Subscription'
import { migrate } from './replicatorMigrations'
import { ChangeV1 } from './replicatorTypes'
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

	describe('migration 006_graph_subscriptions', () => {
		// Type definitions for mock data
		interface OldHistoryRow {
			lsn: string
			userId: string
			fileId: string | null
			json: string
			timestamp: number
		}

		interface MockFileState {
			userId: string
			fileId: string
			isFileOwner: boolean
		}

		interface MockUser {
			id: string
		}

		interface MockFile {
			id: string
			ownerId: string
		}

		// Helper to create ChangeV1 JSON strings
		const createChangeV1 = (
			event: {
				command: 'insert' | 'update' | 'delete'
				table: 'file_state' | 'user' | 'file' | 'user_mutation_number'
			},
			userId: string,
			fileId: string | null,
			row: any,
			previous?: any
		) => {
			const changeV1 = {
				event,
				userId,
				fileId,
				row,
				previous,
			} satisfies ChangeV1
			return JSON.stringify(changeV1)
		}

		const _oldHistoryRows: OldHistoryRow[] = [
			// LSN 1/1000 - Group 1: Multiple file_state changes in same transaction
			{
				lsn: '1/1000',
				userId: 'alice',
				fileId: 'file_shared_doc',
				json: createChangeV1(
					{ command: 'insert', table: 'file_state' },
					'alice',
					'file_shared_doc',
					{
						userId: 'alice',
						fileId: 'file_shared_doc',
						isFileOwner: false, // Non-owner insert = new subscription
					} satisfies MockFileState
				),
				timestamp: 1704110400000,
			},
			{
				lsn: '1/1000', // Same LSN - should be grouped together
				userId: 'bob',
				fileId: 'file_shared_doc',
				json: createChangeV1({ command: 'insert', table: 'file_state' }, 'bob', 'file_shared_doc', {
					userId: 'bob',
					fileId: 'file_shared_doc',
					isFileOwner: false, // Non-owner insert = new subscription
				} satisfies MockFileState),
				timestamp: 1704110400000,
			},

			// LSN 1/1001 - Group 2: File owner creation (no subscription changes)
			{
				lsn: '1/1001',
				userId: 'charlie',
				fileId: 'file_charlie_private',
				json: createChangeV1(
					{ command: 'insert', table: 'file_state' },
					'charlie',
					'file_charlie_private',
					{
						userId: 'charlie',
						fileId: 'file_charlie_private',
						isFileOwner: true, // Owner insert = no subscription changes
					} satisfies MockFileState
				),
				timestamp: 1704114000000,
			},

			// LSN 1/1002 - Group 3: User leaves shared file (subscription removal)
			{
				lsn: '1/1002',
				userId: 'alice',
				fileId: 'file_team_project',
				json: createChangeV1(
					{ command: 'delete', table: 'file_state' },
					'alice',
					'file_team_project',
					{
						userId: 'alice',
						fileId: 'file_team_project',
						isFileOwner: false, // Non-owner delete = removed subscription
					} satisfies MockFileState,
					null // Delete has null previous
				),
				timestamp: 1704117600000,
			},

			// LSN 1/1003 - Group 4: User profile update (user-only change, no fileId)
			{
				lsn: '1/1003',
				userId: 'diana',
				fileId: null, // User-only change
				json: createChangeV1(
					{ command: 'update', table: 'user' },
					'diana',
					null,
					{
						id: 'diana',
					} satisfies MockUser,
					{
						id: 'diana',
					} satisfies MockUser
				),
				timestamp: 1704121200000,
			},

			// LSN 1/1004 - Group 5: Mixed changes - file metadata + multiple file_state ops
			{
				lsn: '1/1004',
				userId: 'eve',
				fileId: 'file_design_system',
				json: createChangeV1(
					{ command: 'update', table: 'file' },
					'eve',
					'file_design_system',
					{
						id: 'file_design_system',
						ownerId: 'eve',
					} satisfies MockFile,
					{
						id: 'file_design_system',
						ownerId: 'eve',
					} satisfies MockFile
				),
				timestamp: 1704124800000,
			},
			{
				lsn: '1/1004', // Same LSN as above
				userId: 'frank',
				fileId: 'file_design_system',
				json: createChangeV1(
					{ command: 'insert', table: 'file_state' },
					'frank',
					'file_design_system',
					{
						userId: 'frank',
						fileId: 'file_design_system',
						isFileOwner: false, // Non-owner insert = new subscription
					} satisfies MockFileState
				),
				timestamp: 1704124800000,
			},

			// LSN 1/1005 - Group 6: User mutation number update (no subscription impact)
			{
				lsn: '1/1005',
				userId: 'grace',
				fileId: 'file_notebook',
				json: createChangeV1(
					{ command: 'update', table: 'user_mutation_number' },
					'grace',
					'file_notebook',
					{
						userId: 'grace',
						fileId: 'file_notebook',
						mutationNumber: 42,
					},
					{
						userId: 'grace',
						fileId: 'file_notebook',
						mutationNumber: 41,
					}
				),
				timestamp: 1704128400000,
			},

			// LSN 1/1006 - Group 7: Owner leaves their own file (subscription removal but owner)
			{
				lsn: '1/1006',
				userId: 'henry',
				fileId: 'file_henry_temp',
				json: createChangeV1(
					{ command: 'delete', table: 'file_state' },
					'henry',
					'file_henry_temp',
					{
						userId: 'henry',
						fileId: 'file_henry_temp',
						isFileOwner: true, // Owner delete = no subscription changes
					} satisfies MockFileState,
					null // Delete has null previous
				),
				timestamp: 1704132000000,
			},
		]

		it('should migrate from old format to graph subscriptions', async () => {
			// First migrate up to just before the graph subscriptions migration
			await migrate(sqlStorage as any, logger as any, '005_add_history_timestamp')

			// Add active users first (required for foreign key constraints)
			sqlStorage.exec(
				`INSERT INTO active_user (id, sequenceNumber, sequenceIdSuffix, lastUpdatedAt) VALUES (?, ?, ?, ?)`,
				'alice',
				1,
				'suffix',
				Date.now()
			)
			sqlStorage.exec(
				`INSERT INTO active_user (id, sequenceNumber, sequenceIdSuffix, lastUpdatedAt) VALUES (?, ?, ?, ?)`,
				'bob',
				2,
				'suffix',
				Date.now()
			)

			// Set up some initial subscriptions based on what our mock data implies
			sqlStorage.exec(
				`INSERT INTO user_file_subscriptions (userId, fileId) VALUES (?, ?)`,
				'alice',
				'file_shared_doc'
			)
			sqlStorage.exec(
				`INSERT INTO user_file_subscriptions (userId, fileId) VALUES (?, ?)`,
				'bob',
				'file_shared_doc'
			)
			sqlStorage.exec(
				`INSERT INTO user_file_subscriptions (userId, fileId) VALUES (?, ?)`,
				'alice',
				'file_team_project'
			)

			// Insert all the mock history data
			for (const row of _oldHistoryRows) {
				sqlStorage.exec(
					`INSERT INTO history (lsn, userId, fileId, json, timestamp) VALUES (?, ?, ?, ?, ?)`,
					row.lsn,
					row.userId,
					row.fileId,
					row.json,
					row.timestamp
				)
			}

			// Verify old data exists
			const subsCount = sqlStorage
				.exec('SELECT COUNT(*) as count FROM user_file_subscriptions')
				.one().count
			expect(subsCount).toBe(3)

			const historyCount = sqlStorage.exec('SELECT COUNT(*) as count FROM history').one().count
			expect(historyCount).toBe(9) // All our mock entries

			// Verify history table has old structure
			const oldHistoryCols = sqlStorage.exec('PRAGMA table_info(history)').toArray()
			const oldColNames = oldHistoryCols.map((c: any) => c.name)
			expect(oldColNames).toContain('userId')
			expect(oldColNames).toContain('fileId')
			expect(oldColNames).toContain('json')

			// Now run the graph subscriptions migration
			await migrate(sqlStorage as any, logger as any)

			// === VERIFY MIGRATION COMPLETED ===
			const migrations = sqlStorage.exec('SELECT id FROM migrations ORDER BY id').toArray()
			expect(migrations).toHaveLength(7)
			expect(migrations[6]).toEqual({ id: '006_graph_subscriptions' })

			// === VERIFY TOPIC SUBSCRIPTIONS ===
			const topicSubs = sqlStorage
				.exec('SELECT * FROM topic_subscription ORDER BY fromTopic, toTopic')
				.toArray()

			// Should have migrated existing subscriptions
			const subPairs = topicSubs.map((s: any) => `${s.fromTopic}->${s.toTopic}`)
			expect(subPairs).toContain('user:alice->file:file_shared_doc')
			expect(subPairs).toContain('user:bob->file:file_shared_doc')
			expect(subPairs).toContain('user:alice->file:file_team_project')

			// === VERIFY OLD TABLE DROPPED ===
			const oldTables = sqlStorage
				.exec(
					`SELECT name FROM sqlite_master WHERE type='table' AND name='user_file_subscriptions'`
				)
				.toArray()
			expect(oldTables).toHaveLength(0)

			// === VERIFY NEW HISTORY FORMAT ===
			const newHistory = sqlStorage.exec('SELECT * FROM history ORDER BY lsn').toArray()

			// Should have 7 LSN groups (matching our _oldHistoryRows data)
			expect(newHistory).toHaveLength(7)

			// === VERIFY TIMESTAMPS MIGRATED CORRECTLY ===
			// The migration preserves original timestamps from the old history entries
			// Each LSN group gets the timestamp from the last entry in that group

			// Verify all timestamps are valid and positive
			for (const historyEntry of newHistory) {
				expect(historyEntry.timestamp).toBeGreaterThan(0)
			}

			// Verify that timestamps come from our original mock data
			const originalTimestamps = _oldHistoryRows.map((row) => row.timestamp)
			const newTimestamps = newHistory.map((h: any) => h.timestamp)

			// Each new timestamp should be one of the original timestamps
			// (specifically, the timestamp of the last entry in each LSN group)
			for (const newTimestamp of newTimestamps) {
				expect(originalTimestamps).toContain(newTimestamp)
			}

			// Verify specific timestamp mappings for our test data
			// LSN groups should have timestamps from the last entry in each group
			const group7 = newHistory.find((h: any) => h.lsn === '1/1006') as any
			expect(group7.timestamp).toBe(1704132000000) // Henry leaving his file

			// Check LSN 1/1000 - Group 1: Multiple file_state changes grouped together
			const group1 = newHistory.find((h: any) => h.lsn === '1/1000') as any
			expect(group1).toBeTruthy()
			expect(group1.topics.split(',').sort()).toEqual(['user:alice', 'user:bob'])

			const changes1 = JSON.parse(group1.changesJson)
			expect(changes1).toHaveLength(2) // Alice and Bob's changes grouped

			// Verify conversion to ChangeV2 format
			expect(changes1[0]).toHaveProperty('topics')
			expect(changes1[0].topics).toEqual(['user:alice'])
			expect(changes1[1]).toHaveProperty('topics')
			expect(changes1[1].topics).toEqual(['user:bob'])

			// Check subscription changes for new users joining file
			expect(group1.newSubscriptions).toBeTruthy()
			const newSubs1 = parseSubscriptions(group1.newSubscriptions)
			expect(newSubs1).toContainEqual({ fromTopic: 'user:alice', toTopic: 'file:file_shared_doc' })
			expect(newSubs1).toContainEqual({ fromTopic: 'user:bob', toTopic: 'file:file_shared_doc' })

			// Check LSN 1/1001 - Group 2: File owner creation (no subscription changes)
			const group2 = newHistory.find((h: any) => h.lsn === '1/1001') as any
			expect(group2).toBeTruthy()
			expect(group2.topics.split(',').sort()).toEqual(['user:charlie'])
			const changes2 = JSON.parse(group2.changesJson)
			expect(changes2).toHaveLength(1)
			expect(changes2[0].topics).toEqual(['user:charlie'])
			// No subscription changes for owner
			expect(group2.newSubscriptions).toBeNull()
			expect(group2.removedSubscriptions).toBeNull()

			// Check LSN 1/1002 - Group 3: User leaves shared file (subscription removal)
			const group3 = newHistory.find((h: any) => h.lsn === '1/1002') as any
			expect(group3).toBeTruthy()
			expect(group3.topics).toContain('user:alice')
			const changes3 = JSON.parse(group3.changesJson)
			expect(changes3).toHaveLength(1)
			expect(changes3[0].topics).toEqual(['user:alice'])
			// Should track subscription removal
			expect(group3.removedSubscriptions).toBeTruthy()
			const removedSubs3 = parseSubscriptions(group3.removedSubscriptions)
			expect(removedSubs3).toContainEqual({
				fromTopic: 'user:alice',
				toTopic: 'file:file_team_project',
			})
			// no new subscriptions for this group
			expect(group3.newSubscriptions).toBeNull()

			// Check LSN 1/1003 - Group 4: User profile update (user-only change, no fileId)
			const group4 = newHistory.find((h: any) => h.lsn === '1/1003') as any
			expect(group4).toBeTruthy()
			expect(group4.topics).toContain('user:diana')
			const changes4 = JSON.parse(group4.changesJson)
			expect(changes4).toHaveLength(1)
			expect(changes4[0].topics).toEqual(['user:diana'])
			// No subscription changes for user-only updates
			expect(group4.newSubscriptions).toBeNull()
			expect(group4.removedSubscriptions).toBeNull()

			// Check LSN 1/1004 - Group 5: Mixed changes - file metadata + multiple file_state ops
			const group5 = newHistory.find((h: any) => h.lsn === '1/1004') as any
			expect(group5).toBeTruthy()
			expect(group5.topics.split(',').sort()).toEqual([
				'file:file_design_system',
				'user:eve',
				'user:frank',
			])
			const changes5 = JSON.parse(group5.changesJson)
			expect(changes5).toHaveLength(2) // File update + Frank's file_state insert
			expect(changes5[0].topics.sort()).toEqual(['file:file_design_system', 'user:eve'])
			expect(changes5[1].topics).toEqual(['user:frank'])
			// Should track Frank's new subscription
			expect(group5.newSubscriptions).toBeTruthy()
			const newSubs5 = parseSubscriptions(group5.newSubscriptions)
			expect(newSubs5).toContainEqual({
				fromTopic: 'user:frank',
				toTopic: 'file:file_design_system',
			})

			// Check LSN 1/1005 - Group 6: User mutation number update (no subscription impact)
			const group6 = newHistory.find((h: any) => h.lsn === '1/1005') as any
			expect(group6).toBeTruthy()
			expect(group6.topics).toContain('user:grace')
			const changes6 = JSON.parse(group6.changesJson)
			expect(changes6).toHaveLength(1)
			expect(changes6[0].topics).toEqual(['user:grace'])
			// No subscription changes for mutation number updates
			expect(group6.newSubscriptions).toBeNull()
			expect(group6.removedSubscriptions).toBeNull()

			// Check LSN 1/1006 - Group 7: Owner leaves their own file (no subscription changes)
			expect(group7).toBeTruthy()
			expect(group7.topics).toContain('user:henry')
			const changes7 = JSON.parse(group7.changesJson)
			expect(changes7).toHaveLength(1)
			expect(changes7[0].topics).toEqual(['user:henry'])
			// No subscription changes for owner leaving their own file
			expect(group7.newSubscriptions).toBeNull()
			expect(group7.removedSubscriptions).toBeNull()

			// === VERIFY NEW TABLE STRUCTURE ===
			const newHistoryCols = sqlStorage.exec('PRAGMA table_info(history)').toArray()
			const newColNames = newHistoryCols.map((c: any) => c.name)

			// Should have new columns
			expect(newColNames).toContain('lsn')
			expect(newColNames).toContain('changesJson')
			expect(newColNames).toContain('topics')
			expect(newColNames).toContain('timestamp')
			expect(newColNames).toContain('newSubscriptions')
			expect(newColNames).toContain('removedSubscriptions')

			// Should NOT have old columns
			expect(newColNames).not.toContain('userId')
			expect(newColNames).not.toContain('fileId')
			expect(newColNames).not.toContain('json')
		})
	})
})
