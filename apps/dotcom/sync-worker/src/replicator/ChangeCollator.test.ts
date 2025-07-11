import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { ChangeCollator, getEffects } from './ChangeCollator'
import { Subscription } from './Subscription'
import { migrate } from './replicatorMigrations'
import { ChangeV2, Topic } from './replicatorTypes'
import {
	MockLogger,
	SqlStorageAdapter,
	createMockFileChange,
	createMockFileChangeV2,
	createMockUser,
	createMockUserChange,
} from './test-helpers'

// Mock SQL adapter class for testing
describe('ChangeCollator', () => {
	describe('getEffects', () => {
		it('should return null for non-file table changes', () => {
			const userChange: ChangeV2 = {
				event: {
					command: 'update',
					table: 'user',
				},
				row: createMockUser('alice'),
				topics: ['user:alice'],
			}

			const result = getEffects(userChange)
			expect(result).toBeNull()
		})

		it('should return null for file_state table changes', () => {
			const fileStateChange: ChangeV2 = {
				event: {
					command: 'insert',
					table: 'file_state',
				},
				row: {
					userId: 'alice',
					fileId: 'doc1',
					firstVisitAt: null,
					lastEditAt: null,
					lastSessionState: null,
					lastVisitAt: null,
					isFileOwner: false,
					isPinned: null,
				},
				topics: ['user:alice'],
			}

			const result = getEffects(fileStateChange)
			expect(result).toBeNull()
		})

		it('should return notify_file_durable_object effect for file insert', () => {
			const change = createMockFileChangeV2('doc1', 'alice', 'insert', {
				published: false,
			})

			const result = getEffects(change)

			expect(result).toHaveLength(1)
			expect(result![0]).toEqual({
				type: 'notify_file_durable_object',
				command: 'insert',
				file: change.row,
			})
		})

		it('should return notify_file_durable_object effect for file delete', () => {
			const change = createMockFileChangeV2('doc1', 'alice', 'delete', {
				published: false,
			})

			const result = getEffects(change)

			expect(result).toHaveLength(1)
			expect(result![0]).toEqual({
				type: 'notify_file_durable_object',
				command: 'delete',
				file: change.row,
			})
		})

		it('should return only notify_file_durable_object effect for file update with no publication changes', () => {
			const previous = {
				id: 'doc1',
				ownerId: 'alice',
				published: false,
				lastPublished: 100,
				name: 'Old Name',
			}

			const change = createMockFileChangeV2('doc1', 'alice', 'update', {
				published: false,
				lastPublished: 100,
				name: 'New Name',
				previous,
			})

			const result = getEffects(change)

			expect(result).toHaveLength(1)
			expect(result![0]).toEqual({
				type: 'notify_file_durable_object',
				command: 'update',
				file: change.row,
			})
		})

		it('should return publish effect when file becomes published', () => {
			const previous = {
				id: 'doc1',
				ownerId: 'alice',
				published: false,
				lastPublished: 100,
			}

			const change = createMockFileChangeV2('doc1', 'alice', 'update', {
				published: true,
				lastPublished: 200,
				previous,
			})

			const result = getEffects(change)

			expect(result).toHaveLength(2)
			expect(result![0]).toEqual({
				type: 'notify_file_durable_object',
				command: 'update',
				file: change.row,
			})
			expect(result![1]).toEqual({
				type: 'publish',
				file: change.row,
			})
		})

		it('should return unpublish effect when file becomes unpublished', () => {
			const previous = {
				id: 'doc1',
				ownerId: 'alice',
				published: true,
				lastPublished: 100,
			}

			const change = createMockFileChangeV2('doc1', 'alice', 'update', {
				published: false,
				lastPublished: 100,
				previous,
			})

			const result = getEffects(change)

			expect(result).toHaveLength(2)
			expect(result![0]).toEqual({
				type: 'notify_file_durable_object',
				command: 'update',
				file: change.row,
			})
			expect(result![1]).toEqual({
				type: 'unpublish',
				file: change.row,
			})
		})

		it('should return publish effect when file is republished with newer timestamp', () => {
			const previous = {
				id: 'doc1',
				ownerId: 'alice',
				published: true,
				lastPublished: 100,
			}

			const change = createMockFileChangeV2('doc1', 'alice', 'update', {
				published: true,
				lastPublished: 200,
				previous,
			})

			const result = getEffects(change)

			expect(result).toHaveLength(2)
			expect(result![0]).toEqual({
				type: 'notify_file_durable_object',
				command: 'update',
				file: change.row,
			})
			expect(result![1]).toEqual({
				type: 'publish',
				file: change.row,
			})
		})

		it('should not return publish effect when file remains published with same timestamp', () => {
			const previous = {
				id: 'doc1',
				ownerId: 'alice',
				published: true,
				lastPublished: 100,
			}

			const change = createMockFileChangeV2('doc1', 'alice', 'update', {
				published: true,
				lastPublished: 100,
				previous,
			})

			const result = getEffects(change)

			expect(result).toHaveLength(1)
			expect(result![0]).toEqual({
				type: 'notify_file_durable_object',
				command: 'update',
				file: change.row,
			})
		})

		it('should handle edge case where previous is undefined for non-update commands', () => {
			const change = createMockFileChangeV2('doc1', 'alice', 'insert', {
				published: true,
				lastPublished: 100,
			})

			// Even though file is published, no previous means no publish effect for inserts
			const result = getEffects(change)

			expect(result).toHaveLength(1)
			expect(result![0]).toEqual({
				type: 'notify_file_durable_object',
				command: 'insert',
				file: change.row,
			})
		})
	})

	// Database-based integration tests for ChangeCollator
	describe('ChangeCollator Integration Tests', () => {
		let db: DatabaseSync
		let sqlStorage: SqlStorageAdapter
		let dbPath: string

		beforeEach(async () => {
			// Create a temporary database file for each test
			dbPath = join(tmpdir(), `test-change-collator-${Date.now()}-${Math.random()}.db`)
			db = new DatabaseSync(dbPath)
			sqlStorage = new SqlStorageAdapter(db)

			// Instead of running full migrations, just create the tables we need for testing
			migrate(sqlStorage as any, new MockLogger() as any)
		})

		afterEach(() => {
			// Clean up database
			db.close()
			try {
				unlinkSync(dbPath)
			} catch (_error) {
				// Ignore errors when cleaning up
			}
		})

		describe('ChangeCollator', () => {
			let collator: ChangeCollator

			beforeEach(() => {
				collator = new ChangeCollator(sqlStorage as any)
			})

			it('should always return true for hasListenerForTopics', () => {
				expect(collator.hasListenerForTopics(['user:test'])).toBe(true)
				expect(collator.hasListenerForTopics(['file:test'])).toBe(true)
				expect(collator.hasListenerForTopics([])).toBe(true)
			})

			it('should add subscriptions to the database', () => {
				const subscriptions: Subscription[] = [
					{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
					{ fromTopic: 'user:bob', toTopic: 'file:doc1' },
				]

				collator.addSubscriptions(subscriptions)

				const result = sqlStorage
					.exec('SELECT * FROM topic_subscription ORDER BY fromTopic')
					.toArray()
				expect(result).toEqual([
					{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
					{ fromTopic: 'user:bob', toTopic: 'file:doc1' },
				])
			})

			it('should handle null subscriptions gracefully', () => {
				expect(() => collator.addSubscriptions(null)).not.toThrow()
				expect(() => collator.removeSubscriptions(null)).not.toThrow()
			})

			it('should remove subscriptions from the database', () => {
				// Add some subscriptions first
				const subscriptions: Subscription[] = [
					{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
					{ fromTopic: 'user:bob', toTopic: 'file:doc1' },
				]
				collator.addSubscriptions(subscriptions)

				// Remove one subscription
				collator.removeSubscriptions([{ fromTopic: 'user:alice', toTopic: 'file:doc1' }])

				const result = sqlStorage.exec('SELECT * FROM topic_subscription').toArray()
				expect(result).toEqual([{ fromTopic: 'user:bob', toTopic: 'file:doc1' }])
			})

			it('should avoid duplicate subscriptions', () => {
				const subscription: Subscription = { fromTopic: 'user:alice', toTopic: 'file:doc1' }

				// Add the same subscription twice
				collator.addSubscriptions([subscription])
				collator.addSubscriptions([subscription])

				const result = sqlStorage.exec('SELECT * FROM topic_subscription').toArray()
				expect(result).toHaveLength(1)
				expect(result[0]).toEqual(subscription)
			})

			it('should route changes to directly subscribed users', () => {
				// Set up: alice subscribes to file:doc1
				collator.addSubscriptions([{ fromTopic: 'user:alice', toTopic: 'file:doc1' }])

				const change = createMockFileChange('doc1', 'owner1')

				// File changes generate both file topic and file owner's user topic
				collator.addChangeForTopics(['file:doc1', 'user:owner1'], change)

				expect(collator.changes.get('alice')).toEqual([change])
				expect(collator.changes.get('owner1')).toEqual([change]) // File owner also gets notified
			})

			it('should route changes to users mentioned in topics', () => {
				// When a user topic is mentioned directly, that user should get the change
				const change = createMockUserChange('alice')

				collator.addChangeForTopics(['user:alice'], change)

				expect(collator.changes.get('alice')).toEqual([change])
			})

			it('should find transitive subscribers through subscription graph', () => {
				// Set up transitive subscription: alice -> bob -> file:doc1
				// When file:doc1 changes, bob gets it directly, alice gets it transitively through bob
				collator.addSubscriptions([
					{ fromTopic: 'user:alice', toTopic: 'user:bob' },
					{ fromTopic: 'user:bob', toTopic: 'file:doc1' },
				])

				const change = createMockFileChange('doc1', 'owner1')

				// File changes generate both file topic and file owner's user topic
				collator.addChangeForTopics(['file:doc1', 'user:owner1'], change)

				expect(collator.changes.get('alice')).toEqual([change]) // Alice gets it transitively through bob
				expect(collator.changes.get('bob')).toEqual([change]) // Bob gets it directly
				expect(collator.changes.get('owner1')).toEqual([change]) // File owner also gets notified
			})

			it('should handle multiple users subscribing to the same topic', () => {
				// Multiple users subscribe to the same file
				collator.addSubscriptions([
					{ fromTopic: 'user:alice', toTopic: 'file:shared' },
					{ fromTopic: 'user:bob', toTopic: 'file:shared' },
					{ fromTopic: 'user:charlie', toTopic: 'file:shared' },
				])

				const change = createMockFileChange('shared', 'owner1', {
					name: 'Shared Document',
					shared: true,
					sharedLinkType: 'readonly',
				})

				// File changes generate both file topic and file owner's user topic
				collator.addChangeForTopics(['file:shared', 'user:owner1'], change)

				expect(collator.changes.get('alice')).toEqual([change])
				expect(collator.changes.get('bob')).toEqual([change])
				expect(collator.changes.get('charlie')).toEqual([change])
				expect(collator.changes.get('owner1')).toEqual([change]) // File owner also gets notified
			})

			it('should deduplicate changes for users with multiple subscription paths', () => {
				// Alice subscribes to both file:doc1 and user:bob
				// Bob subscribes to file:doc1
				// When file:doc1 changes, Alice should only get the change once
				collator.addSubscriptions([
					{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
					{ fromTopic: 'user:alice', toTopic: 'user:bob' },
					{ fromTopic: 'user:bob', toTopic: 'file:doc1' },
				])

				const change = createMockFileChange('doc1', 'owner1')

				// File changes generate both file topic and file owner's user topic
				collator.addChangeForTopics(['file:doc1', 'user:owner1'], change)

				// Alice should only get the change once despite having multiple paths to it
				expect(collator.changes.get('alice')).toEqual([change])
				expect(collator.changes.get('bob')).toEqual([change])
				expect(collator.changes.get('owner1')).toEqual([change])
			})

			it('should handle empty topics array', () => {
				const change = createMockFileChange('test', 'owner1')

				collator.addChangeForTopics([], change)

				expect(collator.changes.size).toBe(0)
			})

			it('should collect effects for file changes', () => {
				const change = createMockFileChangeV2('doc1', 'owner1', 'update', {
					published: true,
					lastPublished: 200,
					previous: {
						id: 'doc1',
						ownerId: 'owner1',
						published: false,
						lastPublished: 100,
					},
				})

				collator.handleEvent(change)

				expect(collator.effects).toHaveLength(2)
				expect(collator.effects[0]).toEqual({
					type: 'notify_file_durable_object',
					command: 'update',
					file: change.row,
				})
				expect(collator.effects[1]).toEqual({
					type: 'publish',
					file: change.row,
				})
			})

			it('should not collect effects for non-file changes', () => {
				const userChange: ChangeV2 = {
					event: {
						command: 'update',
						table: 'user',
					},
					row: createMockUser('alice'),
					topics: ['user:alice'],
				}

				collator.handleEvent(userChange)

				expect(collator.effects).toHaveLength(0)
				expect(collator.changes.get('alice')).toHaveLength(1)
			})

			it('should handle user_mutation_number table with mutation_commit type', () => {
				const mutationChange: ChangeV2 = {
					event: {
						command: 'update',
						table: 'user_mutation_number',
					},
					row: {
						userId: 'alice',
						mutationNumber: 42,
					} as any,
					topics: ['user:alice'],
				}

				collator.handleEvent(mutationChange)

				expect(collator.changes.get('alice')).toHaveLength(1)
				expect(collator.changes.get('alice')![0]).toEqual({
					type: 'mutation_commit',
					mutationNumber: 42,
					userId: 'alice',
				})
			})

			it('should handle effects when getEffects returns null', () => {
				const userChange: ChangeV2 = {
					event: {
						command: 'update',
						table: 'user',
					},
					row: createMockUser('alice'),
					topics: ['user:alice'],
				}

				const initialEffectsLength = collator.effects.length

				collator.handleEvent(userChange)

				// Effects should not change since getEffects returns null for user changes
				expect(collator.effects).toHaveLength(initialEffectsLength)
				// But the change should still be processed
				expect(collator.changes.get('alice')).toHaveLength(1)
			})
		})
	})
})

/* eslint-disable no-console */
describe.skip('ChangeCollator Performance Tests', () => {
	let db: DatabaseSync
	let sqlStorage: SqlStorageAdapter
	let dbPath: string
	let collator: ChangeCollator

	// Helper to generate user topics
	const generateUserTopic = (userId: number): Topic => `user:user${userId}` as Topic

	// Helper to generate file topics
	const generateFileTopic = (fileId: number): Topic => `file:file${fileId}` as Topic

	// Helper to create mock change
	const createTestChange = (fileId: string, ownerId: string) => {
		return createMockFileChange(fileId, ownerId)
	}

	beforeAll(async () => {
		// Create a temporary database file for performance testing
		dbPath = join(tmpdir(), `test-collator-perf-${Date.now()}-${Math.random()}.db`)
		db = new DatabaseSync(dbPath)
		sqlStorage = new SqlStorageAdapter(db)

		// Run migrations
		migrate(sqlStorage as any, new MockLogger() as any)
		collator = new ChangeCollator(sqlStorage as any)

		console.log('Seeding large topic subscription graph...')
		const startTime = Date.now()

		// Create a realistic but large subscription graph
		// Scenario: 1000 users, 5000 files, with various subscription patterns

		const NUM_USERS = 1000
		const NUM_FILES = 5000
		const subscriptions: Array<{ fromTopic: Topic; toTopic: Topic }> = []

		// Pattern 1: Each user subscribes to 5-20 random files (simulates normal usage)
		for (let userId = 1; userId <= NUM_USERS; userId++) {
			const userTopic = generateUserTopic(userId)
			const subscriptionCount = 5 + Math.floor(Math.random() * 16) // 5-20 subscriptions

			const subscribedFiles = new Set<number>()
			for (let i = 0; i < subscriptionCount; i++) {
				let fileId: number
				do {
					fileId = 1 + Math.floor(Math.random() * NUM_FILES)
				} while (subscribedFiles.has(fileId))
				subscribedFiles.add(fileId)

				subscriptions.push({
					fromTopic: userTopic,
					toTopic: generateFileTopic(fileId),
				})
			}
		}

		// Pattern 2: Some files are very popular (simulates shared team files)
		// Top 50 files get many more subscribers
		for (let fileId = 1; fileId <= 50; fileId++) {
			const fileTopic = generateFileTopic(fileId)
			const subscriberCount = 50 + Math.floor(Math.random() * 100) // 50-150 subscribers

			const subscribers = new Set<number>()
			for (let i = 0; i < subscriberCount; i++) {
				let userId: number
				do {
					userId = 1 + Math.floor(Math.random() * NUM_USERS)
				} while (subscribers.has(userId))
				subscribers.add(userId)

				subscriptions.push({
					fromTopic: generateUserTopic(userId),
					toTopic: fileTopic,
				})
			}
		}

		// Pattern 3: Create some transitive subscription chains (user -> user -> file)
		// Simulates team hierarchies or delegation
		for (let i = 0; i < 200; i++) {
			const leadUserId = 1 + Math.floor(Math.random() * 100) // Top 100 users as leads
			const followerId = 101 + Math.floor(Math.random() * 900) // Other users as followers

			subscriptions.push({
				fromTopic: generateUserTopic(followerId),
				toTopic: generateUserTopic(leadUserId),
			})
		}

		// Insert all subscriptions into database
		console.log(`Inserting ${subscriptions.length} subscription edges...`)
		for (let i = 0; i < subscriptions.length; i++) {
			const { fromTopic, toTopic } = subscriptions[i]
			sqlStorage.exec(
				`INSERT OR IGNORE INTO topic_subscription (fromTopic, toTopic) VALUES (?, ?)`,
				fromTopic,
				toTopic
			)

			// Log progress every 5000 insertions
			if ((i + 1) % 5000 === 0) {
				console.log(`Inserted ${i + 1}/${subscriptions.length} subscriptions...`)
			}
		}

		const endTime = Date.now()
		console.log(`Topic graph seeding completed in ${endTime - startTime}ms`)
		console.log(`Total subscription edges: ${subscriptions.length}`)
	}, 180000) // 3 minute timeout for graph generation

	afterAll(() => {
		db.close()
		try {
			unlinkSync(dbPath)
		} catch (_error) {
			// Ignore cleanup errors
		}
	})

	it('should perform well with change affecting many subscribers (popular file)', () => {
		// Test a change to a very popular file (file1 has many subscribers)
		const change = createTestChange('file1', 'user1')
		const topics: Topic[] = ['file:file1', 'user:user1'] // File change generates both topics

		const startTime = performance.now()

		collator.addChangeForTopics(topics, change)

		const endTime = performance.now()
		const duration = endTime - startTime

		// Count how many users received the change
		const affectedUsers = collator.changes.size
		console.log(`Popular file change: ${duration.toFixed(2)}ms, affected ${affectedUsers} users`)

		expect(duration).toBeLessThan(1000) // Should complete in under 1 second
		expect(affectedUsers).toBeGreaterThan(50) // Should affect many users due to popularity
	})

	it('should perform well with change affecting few subscribers (regular file)', () => {
		// Test a change to a less popular file
		const change = createTestChange('file2500', 'user500')
		const topics: Topic[] = ['file:file2500', 'user:user500']

		// Clear previous changes
		collator.changes.clear()

		const startTime = performance.now()

		collator.addChangeForTopics(topics, change)

		const endTime = performance.now()
		const duration = endTime - startTime

		const affectedUsers = collator.changes.size
		console.log(`Regular file change: ${duration.toFixed(2)}ms, affected ${affectedUsers} users`)

		expect(duration).toBeLessThan(100) // Should be very fast for less popular files
		expect(affectedUsers).toBeLessThan(30) // Should affect fewer users
	})

	it('should perform well with multiple topics (batch change)', () => {
		// Test a change that affects multiple topics at once
		const change = createTestChange('file100', 'user100')
		const topics: Topic[] = [
			'file:file100',
			'user:user100',
			'file:file101', // Additional related files
			'file:file102',
			'user:user101', // Additional related users
		]

		// Clear previous changes
		collator.changes.clear()

		const startTime = performance.now()

		collator.addChangeForTopics(topics, change)

		const endTime = performance.now()
		const duration = endTime - startTime

		const affectedUsers = collator.changes.size
		console.log(`Multi-topic change: ${duration.toFixed(2)}ms, affected ${affectedUsers} users`)

		expect(duration).toBeLessThan(1500) // Should handle multiple topics efficiently
		expect(affectedUsers).toBeGreaterThan(5) // Should affect users from multiple topic sources
	})

	it('should perform well under high load (rapid sequential changes)', () => {
		// Test rapid sequential changes to simulate high activity
		const changes = []
		for (let i = 0; i < 100; i++) {
			changes.push({
				change: createTestChange(`file${1000 + i}`, `user${100 + i}`),
				topics: [`file:file${1000 + i}`, `user:user${100 + i}`] as Topic[],
			})
		}

		// Clear previous changes
		collator.changes.clear()

		const startTime = performance.now()

		for (const { change, topics } of changes) {
			collator.addChangeForTopics(topics, change)
		}

		const endTime = performance.now()
		const duration = endTime - startTime
		const avgPerChange = duration / changes.length

		const totalAffectedUsers = collator.changes.size
		console.log(
			`High load test: ${duration.toFixed(2)}ms total, ${avgPerChange.toFixed(2)}ms avg per change`
		)
		console.log(`Total affected users: ${totalAffectedUsers}`)

		expect(duration).toBeLessThan(5000) // Should complete 100 changes in under 5 seconds
		expect(avgPerChange).toBeLessThan(50) // Should average under 50ms per change
	})

	it('should deduplicate users efficiently with overlapping subscriptions', () => {
		// Test scenario where multiple topics have overlapping subscribers
		// This tests the deduplication logic performance
		const change = createTestChange('file50', 'user50') // Popular file and user
		const topics: Topic[] = [
			'file:file1', // Very popular file
			'file:file2', // Another popular file
			'file:file50', // The file being changed
			'user:user50', // The user making the change
			'user:user1', // Popular user
		]

		// Clear previous changes
		collator.changes.clear()

		const startTime = performance.now()

		collator.addChangeForTopics(topics, change)

		const endTime = performance.now()
		const duration = endTime - startTime

		const affectedUsers = collator.changes.size
		console.log(`Deduplication test: ${duration.toFixed(2)}ms, affected ${affectedUsers} users`)

		expect(duration).toBeLessThan(2000) // Should handle complex overlapping efficiently

		// Verify each user only got the change once (deduplication worked)
		for (const [_userId, userChanges] of collator.changes) {
			expect(userChanges.filter((c) => c === change)).toHaveLength(1)
		}
	})
})
/* eslint-enable no-console */
