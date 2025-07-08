import {
	Subscription,
	TopicSubscriptionTree,
	getSubscriptionChanges,
	parseSubscriptions,
	parseTopicSubscriptionTree,
	serializeSubscriptions,
} from './Subscription'
import { Topic } from './replicatorTypes'

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
		expect(result.removedSubscriptions).toEqual([{ fromTopic: 'user:alice', toTopic: 'file:doc1' }])
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

describe('parseTopicSubscriptionTree', () => {
	it('should return empty array for empty tree', () => {
		const tree: TopicSubscriptionTree = {}
		const result = parseTopicSubscriptionTree(tree)
		expect(result).toEqual([])
	})

	it('should return empty array for empty tree with parent topic', () => {
		const tree: TopicSubscriptionTree = {}
		const result = parseTopicSubscriptionTree(tree, 'user:alice' as Topic)
		expect(result).toEqual([])
	})

	it('should handle simple tree with single level', () => {
		const tree: TopicSubscriptionTree = {
			'file:doc1': 1,
			'file:doc2': 1,
		}
		const result = parseTopicSubscriptionTree(tree, 'user:alice' as Topic)
		expect(result).toEqual([
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'user:alice', toTopic: 'file:doc2' },
		])
	})

	it('should handle nested tree structure', () => {
		const tree: TopicSubscriptionTree = {
			'file:doc1': {
				'file:doc1/page1': 1,
				'file:doc1/page2': 1,
			},
			'file:doc2': 1,
		}
		const result = parseTopicSubscriptionTree(tree, 'user:alice' as Topic)
		expect(result).toEqual([
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'file:doc1', toTopic: 'file:doc1/page1' },
			{ fromTopic: 'file:doc1', toTopic: 'file:doc1/page2' },
			{ fromTopic: 'user:alice', toTopic: 'file:doc2' },
		])
	})

	it('should handle deeply nested tree structure', () => {
		const tree: TopicSubscriptionTree = {
			'file:doc1': {
				'file:doc1/page1': {
					'file:doc1/page1/section1': 1,
					'file:doc1/page1/section2': 1,
				},
				'file:doc1/page2': 1,
			},
		}
		const result = parseTopicSubscriptionTree(tree, 'user:alice' as Topic)
		expect(result).toEqual([
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'file:doc1', toTopic: 'file:doc1/page1' },
			{ fromTopic: 'file:doc1/page1', toTopic: 'file:doc1/page1/section1' },
			{ fromTopic: 'file:doc1/page1', toTopic: 'file:doc1/page1/section2' },
			{ fromTopic: 'file:doc1', toTopic: 'file:doc1/page2' },
		])
	})

	it('should handle tree without parent topic', () => {
		const tree: TopicSubscriptionTree = {
			'file:doc1': {
				'file:doc1/page1': 1,
			},
		}
		const result = parseTopicSubscriptionTree(tree)
		expect(result).toEqual([{ fromTopic: 'file:doc1', toTopic: 'file:doc1/page1' }])
	})

	it('should handle mixed leaf and nested nodes', () => {
		const tree: TopicSubscriptionTree = {
			'file:doc1': 1,
			'file:doc2': {
				'file:doc2/page1': 1,
				'file:doc2/page2': 1,
			},
			'file:doc3': 1,
		}
		const result = parseTopicSubscriptionTree(tree, 'user:alice' as Topic)
		expect(result).toEqual([
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'user:alice', toTopic: 'file:doc2' },
			{ fromTopic: 'file:doc2', toTopic: 'file:doc2/page1' },
			{ fromTopic: 'file:doc2', toTopic: 'file:doc2/page2' },
			{ fromTopic: 'user:alice', toTopic: 'file:doc3' },
		])
	})

	it('should handle complex real-world scenario', () => {
		const tree: TopicSubscriptionTree = {
			'user:alice': {
				'file:doc1': {
					'file:doc1/page1': 1,
					'file:doc1/page2': {
						'file:doc1/page2/section1': 1,
					},
				},
				'file:doc2': 1,
			},
			'user:bob': {
				'file:doc3': 1,
			},
		}
		const result = parseTopicSubscriptionTree(tree)
		expect(result).toEqual([
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'file:doc1', toTopic: 'file:doc1/page1' },
			{ fromTopic: 'file:doc1', toTopic: 'file:doc1/page2' },
			{ fromTopic: 'file:doc1/page2', toTopic: 'file:doc1/page2/section1' },
			{ fromTopic: 'user:alice', toTopic: 'file:doc2' },
			{ fromTopic: 'user:bob', toTopic: 'file:doc3' },
		])
	})

	it('should preserve order of subscriptions', () => {
		const tree: TopicSubscriptionTree = {
			'file:doc1': 1,
			'file:doc2': 1,
			'file:doc3': 1,
		}
		const result = parseTopicSubscriptionTree(tree, 'user:alice' as Topic)
		expect(result).toEqual([
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'user:alice', toTopic: 'file:doc2' },
			{ fromTopic: 'user:alice', toTopic: 'file:doc3' },
		])
	})

	it('should handle edge case with single leaf node', () => {
		const tree: TopicSubscriptionTree = {
			'file:doc1': 1,
		}
		const result = parseTopicSubscriptionTree(tree, 'user:alice' as Topic)
		expect(result).toEqual([{ fromTopic: 'user:alice', toTopic: 'file:doc1' }])
	})

	it('should handle edge case with single nested node', () => {
		const tree: TopicSubscriptionTree = {
			'file:doc1': {
				'file:doc1/page1': 1,
			},
		}
		const result = parseTopicSubscriptionTree(tree, 'user:alice' as Topic)
		expect(result).toEqual([
			{ fromTopic: 'user:alice', toTopic: 'file:doc1' },
			{ fromTopic: 'file:doc1', toTopic: 'file:doc1/page1' },
		])
	})
})
