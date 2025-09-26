import { afterEach, describe, expect, test } from 'vitest'
import { mockUniqueId, restoreUniqueId, uniqueId } from './id'

describe('uniqueId', () => {
	test('generates unique IDs with default length of 21', () => {
		const id1 = uniqueId()
		const id2 = uniqueId()

		expect(id1).not.toBe(id2)
		expect(id1).toHaveLength(21)
		expect(id2).toHaveLength(21)
	})

	test('generates IDs with custom length', () => {
		const shortId = uniqueId(10)
		const longId = uniqueId(32)

		expect(shortId).toHaveLength(10)
		expect(longId).toHaveLength(32)
	})

	test('generates different IDs on repeated calls', () => {
		const ids = new Set()
		const numIds = 100

		for (let i = 0; i < numIds; i++) {
			ids.add(uniqueId())
		}

		// Should generate unique IDs with very high probability
		expect(ids.size).toBe(numIds)
	})
})

describe('mockUniqueId', () => {
	afterEach(() => {
		restoreUniqueId()
	})

	test('replaces uniqueId with custom implementation', () => {
		mockUniqueId(() => 'test-id')

		expect(uniqueId()).toBe('test-id')
		expect(uniqueId(10)).toBe('test-id')
	})
})

describe('restoreUniqueId', () => {
	test('restores original uniqueId behavior after mocking', () => {
		mockUniqueId(() => 'mocked-id')
		expect(uniqueId()).toBe('mocked-id')

		restoreUniqueId()

		const id1 = uniqueId()
		const id2 = uniqueId()

		expect(id1).not.toBe('mocked-id')
		expect(id2).not.toBe('mocked-id')
		expect(id1).not.toBe(id2)
		expect(id1).toHaveLength(21)
	})
})
