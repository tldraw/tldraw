import { afterEach, describe, expect, test, vi } from 'vitest'
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

	test('uses URL-safe alphabet characters only', () => {
		const id = uniqueId(1000) // Large ID to test character distribution
		const urlSafePattern = /^[A-Za-z0-9_-]+$/

		expect(id).toMatch(urlSafePattern)
	})

	test('handles zero length', () => {
		const id = uniqueId(0)
		expect(id).toBe('')
	})

	test('handles small lengths', () => {
		const id1 = uniqueId(1)
		const id2 = uniqueId(2)
		const id3 = uniqueId(3)

		expect(id1).toHaveLength(1)
		expect(id2).toHaveLength(2)
		expect(id3).toHaveLength(3)
	})

	test('generates different IDs on repeated calls', () => {
		const ids = new Set()
		const numIds = 1000

		for (let i = 0; i < numIds; i++) {
			ids.add(uniqueId())
		}

		// Should generate unique IDs with very high probability
		expect(ids.size).toBe(numIds)
	})

	test('handles large lengths', () => {
		const largeId = uniqueId(1000)
		expect(largeId).toHaveLength(1000)
	})

	test('maintains consistent format across different sizes', () => {
		const sizes = [1, 5, 10, 21, 50, 100]
		const urlSafePattern = /^[A-Za-z0-9_-]+$/

		sizes.forEach((size) => {
			const id = uniqueId(size)
			expect(id).toHaveLength(size)
			expect(id).toMatch(urlSafePattern)
		})
	})
})

describe('mockUniqueId', () => {
	afterEach(() => {
		// Clean up after each test
		restoreUniqueId()
	})

	test('replaces uniqueId with custom implementation', () => {
		mockUniqueId(() => 'test-id')

		expect(uniqueId()).toBe('test-id')
		expect(uniqueId(10)).toBe('test-id')
	})

	test('passes size parameter to mock function', () => {
		const mockFn = vi.fn((size = 21) => `mock-${size}`)
		mockUniqueId(mockFn)

		uniqueId()
		uniqueId(10)
		uniqueId(32)

		expect(mockFn).toHaveBeenCalledWith(undefined)
		expect(mockFn).toHaveBeenCalledWith(10)
		expect(mockFn).toHaveBeenCalledWith(32)
	})

	test('allows predictable ID generation for testing', () => {
		let counter = 0
		mockUniqueId(() => `test-${++counter}`)

		expect(uniqueId()).toBe('test-1')
		expect(uniqueId()).toBe('test-2')
		expect(uniqueId()).toBe('test-3')
	})

	test('supports size-aware mock functions', () => {
		mockUniqueId((size = 21) => 'x'.repeat(size))

		expect(uniqueId()).toBe('x'.repeat(21))
		expect(uniqueId(5)).toBe('xxxxx')
		expect(uniqueId(10)).toBe('x'.repeat(10))
	})

	test('can be called multiple times to change implementation', () => {
		mockUniqueId(() => 'first-mock')
		expect(uniqueId()).toBe('first-mock')

		mockUniqueId(() => 'second-mock')
		expect(uniqueId()).toBe('second-mock')
	})
})

describe('restoreUniqueId', () => {
	test('restores original uniqueId behavior after mocking', () => {
		// Mock the function
		mockUniqueId(() => 'mocked-id')
		expect(uniqueId()).toBe('mocked-id')

		// Restore original behavior
		restoreUniqueId()

		const id1 = uniqueId()
		const id2 = uniqueId()

		// Should now generate real random IDs
		expect(id1).not.toBe('mocked-id')
		expect(id2).not.toBe('mocked-id')
		expect(id1).not.toBe(id2)
		expect(id1).toHaveLength(21)
	})

	test('can be called multiple times safely', () => {
		mockUniqueId(() => 'mock')

		restoreUniqueId()
		restoreUniqueId() // Should not throw or cause issues
		restoreUniqueId()

		const id = uniqueId()
		expect(id).not.toBe('mock')
		expect(id).toHaveLength(21)
	})

	test('has no effect when called without prior mocking', () => {
		const id1 = uniqueId()
		restoreUniqueId()
		const id2 = uniqueId()

		// Both should be real IDs with default length
		expect(id1).toHaveLength(21)
		expect(id2).toHaveLength(21)
		expect(id1).not.toBe(id2)
	})
})

describe('integration tests', () => {
	afterEach(() => {
		restoreUniqueId()
	})

	test('mocking and restoring workflow', () => {
		// Start with real implementation
		const realId1 = uniqueId(5)
		expect(realId1).toHaveLength(5)

		// Mock for testing
		mockUniqueId((size = 21) => `test-${size}`)
		expect(uniqueId()).toBe('test-21')
		expect(uniqueId(10)).toBe('test-10')

		// Restore for real usage
		restoreUniqueId()
		const realId2 = uniqueId(5)
		expect(realId2).toHaveLength(5)
		expect(realId2).not.toBe('test-5')
		expect(realId2).not.toBe(realId1) // Different random IDs
	})

	test('sequential mocking operations', () => {
		// First mock
		mockUniqueId(() => 'first')
		expect(uniqueId()).toBe('first')

		// Second mock without restore
		mockUniqueId(() => 'second')
		expect(uniqueId()).toBe('second')

		// Restore
		restoreUniqueId()
		const realId = uniqueId()
		expect(realId).not.toBe('first')
		expect(realId).not.toBe('second')
		expect(realId).toHaveLength(21)
	})

	test('nested mocking scenario', () => {
		const originalId = uniqueId()

		// First level mock
		mockUniqueId(() => 'level1')
		expect(uniqueId()).toBe('level1')

		// Second level mock (overwrites first)
		mockUniqueId(() => 'level2')
		expect(uniqueId()).toBe('level2')

		// Restore (goes back to original, not level1)
		restoreUniqueId()
		const restoredId = uniqueId()
		expect(restoredId).not.toBe('level1')
		expect(restoredId).not.toBe('level2')
		expect(restoredId).not.toBe(originalId) // Different random ID
		expect(restoredId).toHaveLength(21)
	})
})
