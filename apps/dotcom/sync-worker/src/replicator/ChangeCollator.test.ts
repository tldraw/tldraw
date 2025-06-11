import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { ZReplicationChange } from '../UserDataSyncer'
import {
	CatchUpChangeCollator,
	LiveChangeCollator,
	Subscription,
	getSubscriptionChanges,
	parseSubscriptions,
	serializeSubscriptions,
} from './ChangeCollator'
import { MockLogger, SqlStorageAdapter } from './__tests__/test-helpers'
import { migrate } from './replicatorMigrations'
import { Topic } from './replicatorTypes'

// Helper functions for creating mock objects with defaults
function createMockFileChange(
	fileId: string,
	ownerId: string,
	overrides: Partial<{
		name: string
		shared: boolean
		sharedLinkType: string
		published: boolean
		event: 'insert' | 'update' | 'delete'
	}> = {}
): ZReplicationChange {
	return {
		type: 'row_update',
		table: 'file',
		event: overrides.event || 'update',
		row: {
			id: fileId,
			name: overrides.name || `Test Document ${fileId}`,
			ownerId,
			ownerName: `Owner ${ownerId}`,
			ownerAvatar: '',
			thumbnail: '',
			shared: overrides.shared || false,
			sharedLinkType: overrides.sharedLinkType || 'private',
			published: overrides.published || false,
			lastPublished: 0,
			publishedSlug: '',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			isEmpty: false,
			isDeleted: false,
			createSource: 'test',
		},
	}
}

function createMockUserChange(
	userId: string,
	overrides: Partial<{
		name: string
		email: string
		event: 'insert' | 'update' | 'delete'
	}> = {}
): ZReplicationChange {
	return {
		type: 'row_update',
		table: 'user',
		event: overrides.event || 'update',
		row: {
			id: userId,
			name: overrides.name || userId.charAt(0).toUpperCase() + userId.slice(1),
			email: overrides.email || `${userId}@example.com`,
			avatar: '',
			color: '#000000',
			exportFormat: 'svg',
			exportTheme: 'light',
			exportBackground: true,
			exportPadding: true,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			flags: '',
			locale: 'en',
			animationSpeed: 1.0,
			edgeScrollSpeed: 1.0,
			colorScheme: 'auto',
			isSnapMode: false,
			isWrapMode: false,
			isDynamicSizeMode: false,
			isPasteAtCursorMode: false,
			allowAnalyticsCookie: false,
		},
	}
}

// Mock SQL adapter class for testing
describe('ChangeCollator', () => {
	describe('serializeSubscriptions', () => {
		it('should serialize empty array to null', () => {
			expect(serializeSubscriptions([])).toBe(null)
		})

		it('should serialize single subscription', () => {
			const subscriptions: Subscription[] = [{ fromTopic: 'user:alice', toTopic: 'file:doc1' }]
			expect(serializeSubscriptions(subscriptions)).toBe('user:alice\\file:doc1')
		})

		it('should serialize multiple subscriptions', () => {
			const subscriptions: Subscription[] = [
				{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
				{ fromTopic: 'user:bob', toTopic: 'file:doc2' },
				{ fromTopic: 'user:charlie', toTopic: 'file:doc3' },
			]
			expect(serializeSubscriptions(subscriptions)).toBe(
				'user:alice\\file:doc1,user:bob\\file:doc2,user:charlie\\file:doc3'
			)
		})
	})

	describe('parseSubscriptions', () => {
		it('should parse empty string', () => {
			expect(parseSubscriptions('')).toEqual(null)
		})

		it('should parse single subscription', () => {
			const result = parseSubscriptions('user:alice\\file:doc1')
			expect(result).toEqual([{ fromTopic: 'user:alice', toTopic: 'file:doc1' }])
		})

		it('should parse multiple subscriptions', () => {
			const result = parseSubscriptions(
				'user:alice\\file:doc1,user:bob\\file:doc2,user:charlie\\file:doc3'
			)
			expect(result).toEqual([
				{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
				{ fromTopic: 'user:bob', toTopic: 'file:doc2' },
				{ fromTopic: 'user:charlie', toTopic: 'file:doc3' },
			])
		})
	})

	describe('serialize/parse round-trip', () => {
		it('should maintain data integrity through serialize->parse cycle', () => {
			const original: Subscription[] = [
				{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
				{ fromTopic: 'user:bob', toTopic: 'file:doc2' },
				{ fromTopic: 'user:charlie', toTopic: 'file:doc3' },
			]

			const serialized = serializeSubscriptions(original)
			const parsed = parseSubscriptions(serialized)

			expect(parsed).toEqual(original)
		})

		it('should handle empty array round-trip', () => {
			const original: Subscription[] = []
			const serialized = serializeSubscriptions(original)

			expect(serialized).toBe(null)
		})
	})

	describe('getSubscriptionChanges', () => {
		it('should return null for empty changes', () => {
			const result = getSubscriptionChanges([])
			expect(result).toEqual({
				newSubscriptions: null,
				removedSubscriptions: null,
			})
		})

		it('should extract new subscriptions from file_state insert', () => {
			const changes = [
				{
					event: { table: 'file_state', command: 'insert' },
					row: { userId: 'alice', fileId: 'doc1' },
					topic: 'user:alice' as Topic,
				},
			]

			const result = getSubscriptionChanges(changes as any)
			expect(result.newSubscriptions).toEqual([{ fromTopic: 'user:alice', toTopic: 'file:doc1' }])
			expect(result.removedSubscriptions).toEqual(null)
		})

		it('should extract removed subscriptions from file_state delete', () => {
			const changes = [
				{
					event: { table: 'file_state', command: 'delete' },
					row: { userId: 'alice', fileId: 'doc1' },
					topic: 'user:alice' as Topic,
				},
			]

			const result = getSubscriptionChanges(changes as any)
			expect(result.newSubscriptions).toEqual(null)
			expect(result.removedSubscriptions).toEqual([
				{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			])
		})

		it('should handle mixed subscription changes', () => {
			const changes = [
				{
					event: { table: 'file_state', command: 'insert' },
					row: { userId: 'alice', fileId: 'doc1' },
					topic: 'user:alice' as Topic,
				},
				{
					event: { table: 'file_state', command: 'delete' },
					row: { userId: 'bob', fileId: 'doc2' },
					topic: 'user:bob' as Topic,
				},
				{
					event: { table: 'user', command: 'update' },
					row: { id: 'charlie' },
					topic: 'user:charlie' as Topic,
				},
			]

			const result = getSubscriptionChanges(changes as any)
			expect(result.newSubscriptions).toEqual([{ fromTopic: 'user:alice', toTopic: 'file:doc1' }])
			expect(result.removedSubscriptions).toEqual([{ fromTopic: 'user:bob', toTopic: 'file:doc2' }])
		})

		it('should ignore non-file_state changes', () => {
			const changes = [
				{
					event: { table: 'user', command: 'insert' },
					row: { id: 'alice' },
					topic: 'user:alice' as Topic,
				},
				{
					event: { table: 'file', command: 'update' },
					row: { id: 'doc1', ownerId: 'alice' },
					topic: 'file:doc1' as Topic,
				},
			]

			const result = getSubscriptionChanges(changes as any)
			expect(result.newSubscriptions).toEqual(null)
			expect(result.removedSubscriptions).toEqual(null)
		})

		it('should return null when no subscriptions found', () => {
			const changes = [
				{
					event: { table: 'user', command: 'insert' },
					row: { id: 'alice' },
					topic: 'user:alice' as Topic,
				},
			]

			const result = getSubscriptionChanges(changes as any)
			expect(result.newSubscriptions).toBe(null)
			expect(result.removedSubscriptions).toBe(null)
		})
	})

	// Database-based integration tests for LiveChangeCollator and CatchUpChangeCollator
	describe('LiveChangeCollator and CatchUpChangeCollator Integration Tests', () => {
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

		describe('LiveChangeCollator', () => {
			let collator: LiveChangeCollator

			beforeEach(() => {
				collator = new LiveChangeCollator(sqlStorage as any)
			})

			it('should have correct isCatchUp property', () => {
				expect(collator.isCatchUp).toBe(false)
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
		})

		describe('CatchUpChangeCollator', () => {
			let collator: CatchUpChangeCollator

			beforeEach(() => {
				// Set up some initial subscriptions in the database
				sqlStorage.exec(
					`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:alice', 'file:doc1')`
				)
				sqlStorage.exec(
					`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:alice', 'file:doc5')`
				)
				sqlStorage.exec(
					`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('file:doc1', 'user:bob')`
				)
				sqlStorage.exec(
					`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES ('user:jeff', 'file:doc1')`
				)

				collator = new CatchUpChangeCollator(sqlStorage as any, 'alice')
			})

			it('should have correct isCatchUp property', () => {
				expect(collator.isCatchUp).toBe(true)
			})

			it('should initialize with user topic', () => {
				expect(collator.userTopic).toBe('user:alice')
			})

			it('should initialize subscription state from database during construction', () => {
				// Verify that the constructor properly read the pre-existing subscriptions:
				// user:alice -> file:doc1 -> user:bob
				// Alice should be able to receive changes for all three topics

				expect(collator.hasListenerForTopics(['user:alice'])).toBe(true) // Own topic
				expect(collator.hasListenerForTopics(['file:doc1'])).toBe(true) // Direct subscription
				expect(collator.hasListenerForTopics(['user:bob'])).toBe(true) // Transitive through file:doc1

				// Verify internal state was built correctly
				expect(collator.userSubscriptions.has('file:doc1')).toBe(true) // Direct subscription
				expect(collator.userSubscriptions.has('user:bob')).toBe(true) // Transitive subscription
				expect(collator.topicGraph.size).toBe(2)
				// Verify the topic graph contains the expected edges
				expect(collator.topicGraph.get('user:alice')).toEqual(new Set(['file:doc1', 'file:doc5']))
				expect(collator.topicGraph.get('file:doc1')).toEqual(new Set(['user:bob']))
				// no mention of jeff
			})

			it('should initialize with empty subscription state', () => {
				const emptyCollator = new CatchUpChangeCollator(sqlStorage as any, 'newuser')
				expect(emptyCollator.userSubscriptions.size).toBe(0)
				expect(emptyCollator.topicGraph.size).toBe(0)
			})

			it('should correctly identify relevant topics', () => {
				expect(collator.hasListenerForTopics(['user:alice'])).toBe(true) // Own topic
				expect(collator.hasListenerForTopics(['file:doc1'])).toBe(true) // Subscribed topic
				expect(collator.hasListenerForTopics(['user:bob'])).toBe(true) // Transitively subscribed
				expect(collator.hasListenerForTopics(['file:other'])).toBe(false) // Not subscribed
				expect(collator.hasListenerForTopics(['file:doc5'])).toBe(true) // Direct subscription
				expect(collator.hasListenerForTopics(['user:jeff'])).toBe(false) // Not subscribed
			})

			it('should only collect changes for relevant topics', () => {
				const relevantChange = createMockFileChange('doc1', 'owner1')
				const irrelevantChange = createMockFileChange('other', 'owner2', {
					name: 'Other Document',
				})

				// File changes generate both file topic and file owner's user topic
				collator.addChangeForTopics(['file:doc1', 'user:owner1'], relevantChange)
				collator.addChangeForTopics(['file:other', 'user:owner2'], irrelevantChange)

				expect(collator._changes).toEqual([relevantChange])
				// it doesn't bother with other users
				expect(collator.changes.get('owner2')).toEqual(undefined)
			})

			it('should update subscription state when adding subscriptions', () => {
				const initialSize = collator.userSubscriptions.size

				collator.addSubscriptions([{ fromTopic: 'user:alice', toTopic: 'file:doc2' }])

				expect(collator.userSubscriptions.size).toBeGreaterThan(initialSize)
				expect(collator.userSubscriptions.has('file:doc2')).toBe(true)

				expect(collator.topicGraph.get('user:alice')).toEqual(
					new Set(['file:doc1', 'file:doc2', 'file:doc5'])
				)
			})

			it('should only process subscription changes that affect this user', () => {
				const initialSize = collator.userSubscriptions.size

				// Add a subscription that doesn't affect this user
				collator.addSubscriptions([{ fromTopic: 'user:charlie', toTopic: 'file:doc3' }])
				collator.addSubscriptions([{ fromTopic: 'user:jeff', toTopic: 'file:doc5' }])

				// Subscription state should not change
				expect(collator.userSubscriptions.size).toBe(initialSize)
			})

			it('should handle user topic changes correctly', () => {
				const userChange = createMockUserChange('alice')

				collator.addChangeForTopics(['user:alice'], userChange)

				expect(collator._changes).toContain(userChange)
			})

			it('should maintain changes array in correct order', () => {
				const change1 = createMockFileChange('doc1', 'owner1')
				const change2 = createMockUserChange('alice')

				// File changes generate both file topic and file owner's user topic
				collator.addChangeForTopics(['file:doc1', 'user:owner1'], change1)
				collator.addChangeForTopics(['user:alice'], change2)

				expect(collator._changes).toEqual([change1, change2])
			})

			it('should remove direct subscriptions and update internal state', () => {
				const initialSubscriptions = collator.userSubscriptions.size

				// Remove alice's direct subscription to file:doc5
				collator.removeSubscriptions([{ fromTopic: 'user:alice', toTopic: 'file:doc5' }])

				// Alice should no longer be able to listen to file:doc5
				expect(collator.hasListenerForTopics(['file:doc5'])).toBe(false)
				expect(collator.userSubscriptions.has('file:doc5')).toBe(false)
				expect(collator.userSubscriptions.size).toBeLessThan(initialSubscriptions)

				// Verify topicGraph was updated - should only contain file:doc1 and file:doc2 (added in previous test)
				const aliceSubscriptions = collator.topicGraph.get('user:alice')
				expect(aliceSubscriptions).toBeDefined()
				expect(aliceSubscriptions!.has('file:doc5')).toBe(false) // Should not contain removed subscription
				expect(aliceSubscriptions!.has('file:doc1')).toBe(true) // Should still contain original subscription

				// Alice should still have other subscriptions
				expect(collator.hasListenerForTopics(['file:doc1'])).toBe(true)
				expect(collator.hasListenerForTopics(['user:bob'])).toBe(true) // Still transitive through file:doc1
			})

			it('should remove transitive subscriptions when intermediate subscription is removed', () => {
				// First establish that Alice has transitive access to user:bob through the chain:
				// alice -> file:doc1 -> user:bob (set up in beforeEach)

				// Verify the transitive subscription is working
				expect(collator.hasListenerForTopics(['user:bob'])).toBe(true) // Transitive through file:doc1
				expect(collator.userSubscriptions.has('user:bob')).toBe(true) // Should be in computed subscriptions

				// Remove the intermediate link: file:doc1 -> user:bob
				collator.removeSubscriptions([{ fromTopic: 'file:doc1', toTopic: 'user:bob' }])

				// Now Alice should lose transitive access to user:bob
				expect(collator.hasListenerForTopics(['user:bob'])).toBe(false)
				expect(collator.userSubscriptions.has('user:bob')).toBe(false)

				// But Alice should still have direct access to file:doc1
				expect(collator.hasListenerForTopics(['file:doc1'])).toBe(true)
				expect(collator.userSubscriptions.has('file:doc1')).toBe(true)

				// Verify topicGraph was updated - file:doc1 no longer has outgoing edges
				expect(collator.topicGraph.get('file:doc1')).toBeUndefined()
			})

			it('should not collect changes for removed topics', () => {
				// Remove alice's subscription to file:doc5
				collator.removeSubscriptions([{ fromTopic: 'user:alice', toTopic: 'file:doc5' }])

				const changeForRemovedTopic = createMockFileChange('doc5', 'owner5')
				const changeForValidTopic = createMockFileChange('doc1', 'owner1')

				// Try to add changes for both topics
				collator.addChangeForTopics(['file:doc5', 'user:owner5'], changeForRemovedTopic)
				collator.addChangeForTopics(['file:doc1', 'user:owner1'], changeForValidTopic)

				// Only the change for the valid topic should be collected
				expect(collator._changes).toEqual([changeForValidTopic])
				expect(collator._changes).not.toContain(changeForRemovedTopic)
			})

			it('should handle removing non-existent subscriptions gracefully', () => {
				const initialState = {
					userSubscriptions: new Set(collator.userSubscriptions),
					topicGraphSize: collator.topicGraph.size,
				}

				// Try to remove a subscription that doesn't exist
				collator.removeSubscriptions([{ fromTopic: 'user:alice', toTopic: 'file:nonexistent' }])

				// State should remain unchanged
				expect(collator.userSubscriptions).toEqual(initialState.userSubscriptions)
				expect(collator.topicGraph.size).toBe(initialState.topicGraphSize)
			})

			it('should ignore subscription removals that do not affect this user', () => {
				const initialState = {
					userSubscriptions: new Set(collator.userSubscriptions),
					topicGraphSize: collator.topicGraph.size,
				}

				// Remove a subscription for a different user
				collator.removeSubscriptions([{ fromTopic: 'user:jeff', toTopic: 'file:doc1' }])

				// Alice's subscription state should remain unchanged
				expect(collator.userSubscriptions).toEqual(initialState.userSubscriptions)
				expect(collator.topicGraph.size).toBe(initialState.topicGraphSize)
				expect(collator.hasListenerForTopics(['file:doc1'])).toBe(true) // Alice still subscribed
			})
		})
	})
})
