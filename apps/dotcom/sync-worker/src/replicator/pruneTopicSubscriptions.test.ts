import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { pruneTopicSubscriptionsSql } from './pruneTopicSubscriptions'
import { migrate } from './replicatorMigrations'
import { MockLogger, SqlStorageAdapter } from './test-helpers'

describe('pruneTopicSubscriptions', () => {
	let db: DatabaseSync
	let sqlStorage: SqlStorageAdapter
	let logger: MockLogger
	let dbPath: string

	beforeEach(async () => {
		// Create a temporary database file for each test
		dbPath = join(tmpdir(), `test-prune-${Date.now()}-${Math.random()}.db`)
		db = new DatabaseSync(dbPath)
		sqlStorage = new SqlStorageAdapter(db)
		logger = new MockLogger()

		// Use the migrate function to set up the proper schema
		await migrate(sqlStorage as any, logger as any)
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

	it('should preserve subscriptions for active users', () => {
		// Setup: Add active users
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('alice')`)
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('bob')`)

		// Setup: Add subscriptions from active users
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:alice', 'file:doc1')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:bob', 'file:doc2')`
		)

		// Execute the pruning
		sqlStorage.exec(pruneTopicSubscriptionsSql)

		// Verify: Active user subscriptions should remain
		const subscriptions = sqlStorage
			.exec('SELECT * FROM topic_subscription ORDER BY fromTopic')
			.toArray()
		expect(subscriptions).toEqual([
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'user:bob', toTopic: 'file:doc2' },
		])
	})

	it('should remove subscriptions from inactive users', () => {
		// Setup: Add active users
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('alice')`)

		// Setup: Add subscriptions - one from active user, one from inactive user
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:alice', 'file:doc1')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:inactive', 'file:doc2')`
		)

		// Execute the pruning
		sqlStorage.exec(pruneTopicSubscriptionsSql)

		// Verify: Only active user subscriptions should remain
		const subscriptions = sqlStorage.exec('SELECT * FROM topic_subscription').toArray()
		expect(subscriptions).toEqual([{ fromTopic: 'user:alice', toTopic: 'file:doc1' }])
	})

	it('should preserve transitively reachable subscriptions', () => {
		// Setup: Add active users
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('alice')`)

		// Setup: Create chain: user:alice -> file:doc1 -> user:bob -> file:doc2
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:alice', 'file:doc1')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('file:doc1', 'user:bob')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:bob', 'file:doc2')`
		)

		// Execute the pruning
		sqlStorage.exec(pruneTopicSubscriptionsSql)

		// Verify: All subscriptions in the reachable chain should remain
		const subscriptions = sqlStorage
			.exec('SELECT * FROM topic_subscription ORDER BY fromTopic')
			.toArray()
		expect(subscriptions).toEqual([
			{ fromTopic: 'file:doc1', toTopic: 'user:bob' },
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'user:bob', toTopic: 'file:doc2' },
		])

		// now remove alice
		sqlStorage.exec(`DELETE FROM active_user WHERE id = 'alice'`)

		// Execute the pruning
		sqlStorage.exec(pruneTopicSubscriptionsSql)

		// Verify: everything should be removed
		const subscriptions2 = sqlStorage
			.exec('SELECT * FROM topic_subscription ORDER BY fromTopic')
			.toArray()
		expect(subscriptions2).toEqual([])
	})

	it('should remove completely orphaned subscription chains', () => {
		// Setup: Add active users
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('alice')`)

		// Setup: Create reachable chain and orphaned chain
		// Reachable: user:alice -> file:doc1
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:alice', 'file:doc1')`
		)

		// Orphaned chain: user:inactive -> file:orphaned -> user:also_orphaned
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:inactive', 'file:orphaned')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('file:orphaned', 'user:also_orphaned')`
		)

		// Execute the pruning
		sqlStorage.exec(pruneTopicSubscriptionsSql)

		// Verify: Only the reachable subscription should remain
		const subscriptions = sqlStorage.exec('SELECT * FROM topic_subscription').toArray()
		expect(subscriptions).toEqual([{ fromTopic: 'user:alice', toTopic: 'file:doc1' }])
	})

	it('should handle circular references correctly', () => {
		// Setup: Add active users
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('alice')`)

		// Setup: Create circular chain reachable from active user
		// user:alice -> file:doc1 -> user:bob -> file:doc2 -> user:alice (circular)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:alice', 'file:doc1')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('file:doc1', 'user:bob')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:bob', 'file:doc2')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('file:doc2', 'user:alice')`
		)

		// Execute the pruning
		sqlStorage.exec(pruneTopicSubscriptionsSql)

		// Verify: All subscriptions in the circular chain should remain
		const subscriptions = sqlStorage
			.exec('SELECT * FROM topic_subscription ORDER BY fromTopic')
			.toArray()
		expect(subscriptions).toEqual([
			{ fromTopic: 'file:doc1', toTopic: 'user:bob' },
			{ fromTopic: 'file:doc2', toTopic: 'user:alice' },
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'user:bob', toTopic: 'file:doc2' },
		])
	})

	it('should handle empty database gracefully', () => {
		// Execute the pruning on empty database
		sqlStorage.exec(pruneTopicSubscriptionsSql)

		// Verify: No subscriptions should exist
		const subscriptions = sqlStorage.exec('SELECT * FROM topic_subscription').toArray()
		expect(subscriptions).toEqual([])
	})

	it('should handle database with only active users but no subscriptions', () => {
		// Setup: Add active users but no subscriptions
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('alice')`)
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('bob')`)

		// Execute the pruning
		sqlStorage.exec(pruneTopicSubscriptionsSql)

		// Verify: No subscriptions should exist
		const subscriptions = sqlStorage.exec('SELECT * FROM topic_subscription').toArray()
		expect(subscriptions).toEqual([])
	})

	it('should preserve complex multi-branch reachable graph', () => {
		// Setup: Add active users
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('alice')`)
		sqlStorage.exec(`INSERT INTO active_user (id) VALUES ('bob')`)

		// Setup: Create complex reachable graph
		// Branch 1: user:alice -> file:shared -> user:charlie
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:alice', 'file:shared')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('file:shared', 'user:charlie')`
		)

		// Branch 2: user:bob -> file:project -> user:david
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:bob', 'file:project')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('file:project', 'user:david')`
		)

		// Cross connections: user:charlie -> file:project, user:david -> file:shared
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:charlie', 'file:project')`
		)
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:david', 'file:shared')`
		)

		// Add orphaned subscription
		sqlStorage.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:orphaned', 'file:nowhere')`
		)

		// Execute the pruning
		sqlStorage.exec(pruneTopicSubscriptionsSql)

		// Verify: All reachable subscriptions should remain, orphaned should be removed
		const subscriptions = sqlStorage
			.exec('SELECT * FROM topic_subscription ORDER BY fromTopic')
			.toArray()
		expect(subscriptions).toEqual([
			{ fromTopic: 'file:project', toTopic: 'user:david' },
			{ fromTopic: 'file:shared', toTopic: 'user:charlie' },
			{ fromTopic: 'user:alice', toTopic: 'file:shared' },
			{ fromTopic: 'user:bob', toTopic: 'file:project' },
			{ fromTopic: 'user:charlie', toTopic: 'file:project' },
			{ fromTopic: 'user:david', toTopic: 'file:shared' },
		])
	})
})
