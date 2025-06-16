import {
	Subscription,
	getSubscriptionChanges,
	parseSubscriptions,
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
