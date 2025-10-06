import { afterEach, describe, expect, test } from 'vitest'
import { mockUniqueId, restoreUniqueId, uniqueId } from './id'

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
