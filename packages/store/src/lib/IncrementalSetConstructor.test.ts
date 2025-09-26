import { describe, expect, it } from 'vitest'
import { IncrementalSetConstructor } from './IncrementalSetConstructor'

describe('IncrementalSetConstructor', () => {
	describe('constructor', () => {
		it('should accept an empty set', () => {
			const originalSet = new Set<string>()
			const constructor = new IncrementalSetConstructor(originalSet)
			expect(constructor).toBeDefined()
		})

		it('should accept a set with items', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)
			expect(constructor).toBeDefined()
		})

		it('should work with different data types', () => {
			const numberSet = new Set([1, 2, 3])
			const numberConstructor = new IncrementalSetConstructor(numberSet)
			expect(numberConstructor).toBeDefined()

			const objectSet = new Set([{ id: 1 }, { id: 2 }])
			const objectConstructor = new IncrementalSetConstructor(objectSet)
			expect(objectConstructor).toBeDefined()
		})
	})

	describe('get', () => {
		it('should return undefined when no changes are made', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			const result = constructor.get()
			expect(result).toBeUndefined()
		})

		it('should return undefined when no net changes occur', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('d')
			constructor.remove('d')

			const result = constructor.get()
			expect(result).toBeUndefined()
		})

		it('should return undefined when adding and removing the same existing item', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('a')
			constructor.add('a')

			const result = constructor.get()
			expect(result).toBeUndefined()
		})

		it('should return result when items are added', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('c')
			constructor.add('d')

			const result = constructor.get()
			expect(result).toBeDefined()
			expect(result!.value).toEqual(new Set(['a', 'b', 'c', 'd']))
			expect(result!.diff.added).toEqual(new Set(['c', 'd']))
			expect(result!.diff.removed).toBeUndefined()
		})

		it('should return result when items are removed', () => {
			const originalSet = new Set(['a', 'b', 'c', 'd'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('c')
			constructor.remove('d')

			const result = constructor.get()
			expect(result).toBeDefined()
			expect(result!.value).toEqual(new Set(['a', 'b']))
			expect(result!.diff.removed).toEqual(new Set(['c', 'd']))
			expect(result!.diff.added).toBeUndefined()
		})

		it('should return result when items are both added and removed', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('a')
			constructor.add('d')
			constructor.add('e')

			const result = constructor.get()
			expect(result).toBeDefined()
			expect(result!.value).toEqual(new Set(['b', 'c', 'd', 'e']))
			expect(result!.diff.added).toEqual(new Set(['d', 'e']))
			expect(result!.diff.removed).toEqual(new Set(['a']))
		})

		it('should return result with proper diff structure', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('c')

			const result = constructor.get()
			expect(result).toBeDefined()
			expect(result!).toHaveProperty('value')
			expect(result!).toHaveProperty('diff')
			expect(result!.diff).toHaveProperty('added')
			expect(result!.diff.added).toBeInstanceOf(Set)
		})
	})

	describe('add', () => {
		it('should add new items to an empty set', () => {
			const originalSet = new Set<string>()
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('a')
			constructor.add('b')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['a', 'b']))
			expect(result!.diff.added).toEqual(new Set(['a', 'b']))
		})

		it('should add new items to existing set', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('c')
			constructor.add('d')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['a', 'b', 'c', 'd']))
			expect(result!.diff.added).toEqual(new Set(['c', 'd']))
		})

		it('should be a no-op when adding existing items', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('a')
			constructor.add('b')

			const result = constructor.get()
			expect(result).toBeUndefined()
		})

		it('should restore previously removed items', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('b')
			constructor.add('b') // Restore removed item

			const result = constructor.get()
			expect(result).toBeUndefined() // No net change
		})

		it('should handle complex restore scenarios', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('a')
			constructor.remove('b')
			constructor.add('d')
			constructor.add('a') // Restore one removed item

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['a', 'c', 'd']))
			expect(result!.diff.added).toEqual(new Set(['d']))
			expect(result!.diff.removed).toEqual(new Set(['b']))
		})

		it('should be a no-op when adding the same new item multiple times', () => {
			const originalSet = new Set(['a'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('b')
			constructor.add('b')
			constructor.add('b')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['a', 'b']))
			expect(result!.diff.added).toEqual(new Set(['b']))
		})

		it('should work with different data types', () => {
			const originalSet = new Set([1, 2])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add(3)
			constructor.add(4)

			const result = constructor.get()
			expect(result!.value).toEqual(new Set([1, 2, 3, 4]))
			expect(result!.diff.added).toEqual(new Set([3, 4]))
		})

		it('should work with object references', () => {
			const obj1 = { id: 1 }
			const obj2 = { id: 2 }
			const obj3 = { id: 3 }
			const originalSet = new Set([obj1, obj2])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add(obj3)

			const result = constructor.get()
			expect(result!.value).toEqual(new Set([obj1, obj2, obj3]))
			expect(result!.diff.added).toEqual(new Set([obj3]))
		})
	})

	describe('remove', () => {
		it('should remove existing items', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('b')
			constructor.remove('c')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['a']))
			expect(result!.diff.removed).toEqual(new Set(['b', 'c']))
		})

		it('should be a no-op when removing non-existent items', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('c')
			constructor.remove('d')

			const result = constructor.get()
			expect(result).toBeUndefined()
		})

		it('should remove recently added items from the added diff', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('c')
			constructor.add('d')
			constructor.remove('c') // Remove recently added item

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['a', 'b', 'd']))
			expect(result!.diff.added).toEqual(new Set(['d']))
			expect(result!.diff.removed).toBeUndefined()
		})

		it('should handle removing all recently added items', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('c')
			constructor.add('d')
			constructor.remove('c')
			constructor.remove('d')

			const result = constructor.get()
			expect(result).toBeUndefined() // No net change
		})

		it('should be a no-op when removing already removed items', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('a')
			constructor.remove('a') // Remove again
			constructor.remove('a') // Remove again

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['b', 'c']))
			expect(result!.diff.removed).toEqual(new Set(['a']))
		})

		it('should handle complex mixed operations', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('d')
			constructor.remove('a')
			constructor.add('e')
			constructor.remove('d') // Remove recently added
			constructor.remove('b')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['c', 'e']))
			expect(result!.diff.added).toEqual(new Set(['e']))
			expect(result!.diff.removed).toEqual(new Set(['a', 'b']))
		})

		it('should work with different data types', () => {
			const originalSet = new Set([1, 2, 3])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove(2)
			constructor.remove(3)

			const result = constructor.get()
			expect(result!.value).toEqual(new Set([1]))
			expect(result!.diff.removed).toEqual(new Set([2, 3]))
		})

		it('should work with object references', () => {
			const obj1 = { id: 1 }
			const obj2 = { id: 2 }
			const obj3 = { id: 3 }
			const originalSet = new Set([obj1, obj2, obj3])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove(obj2)

			const result = constructor.get()
			expect(result!.value).toEqual(new Set([obj1, obj3]))
			expect(result!.diff.removed).toEqual(new Set([obj2]))
		})
	})

	describe('complex scenarios', () => {
		it('should handle multiple add/remove cycles', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('c')
			constructor.remove('c')
			constructor.add('c')
			constructor.remove('c')
			constructor.add('c')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['a', 'b', 'c']))
			expect(result!.diff.added).toEqual(new Set(['c']))
		})

		it('should handle original item remove/add cycles', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('a')
			constructor.add('a')
			constructor.remove('a')
			constructor.add('a')

			const result = constructor.get()
			expect(result).toBeUndefined() // No net change
		})

		it('should maintain set uniqueness', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			// Try to add duplicates
			constructor.add('c')
			constructor.add('c')
			constructor.add('c')
			constructor.add('a')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['a', 'b', 'c']))
			expect(result!.diff.added).toEqual(new Set(['c']))
		})

		it('should handle large sets efficiently', () => {
			const originalItems = Array.from({ length: 1000 }, (_, i) => `item${i}`)
			const originalSet = new Set(originalItems)
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('new1')
			constructor.add('new2')
			constructor.remove('item0')
			constructor.remove('item1')

			const result = constructor.get()
			expect(result!.value.size).toBe(1000)
			expect(result!.diff.added).toEqual(new Set(['new1', 'new2']))
			expect(result!.diff.removed).toEqual(new Set(['item0', 'item1']))
		})

		it('should preserve original set immutability', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('d')
			constructor.remove('a')

			// Original set should remain unchanged
			expect(originalSet).toEqual(new Set(['a', 'b', 'c']))
		})

		it('should handle empty diff scenarios correctly', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('d')
			constructor.remove('d')
			constructor.remove('a')
			constructor.add('a')

			const result = constructor.get()
			expect(result).toBeUndefined()
		})
	})

	describe('edge cases', () => {
		it('should work with empty sets', () => {
			const originalSet = new Set<string>()
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('a')
			constructor.remove('a')

			const result = constructor.get()
			expect(result).toBeUndefined()
		})

		it('should handle sets with single items', () => {
			const originalSet = new Set(['only'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('only')
			constructor.add('new')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set(['new']))
			expect(result!.diff.added).toEqual(new Set(['new']))
			expect(result!.diff.removed).toEqual(new Set(['only']))
		})

		it('should handle null and undefined values', () => {
			const originalSet = new Set([null, undefined, 'a'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove(null)
			constructor.add('b')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set([undefined, 'a', 'b']))
			expect(result!.diff.added).toEqual(new Set(['b']))
			expect(result!.diff.removed).toEqual(new Set([null]))
		})

		it('should handle special values like NaN', () => {
			const originalSet = new Set([NaN, 0, -0])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove(NaN)
			constructor.add(1)

			const result = constructor.get()
			expect(result!.value.has(NaN)).toBe(false)
			expect(result!.value.has(1)).toBe(true)
			expect(result!.diff.added).toEqual(new Set([1]))
			expect(result!.diff.removed).toEqual(new Set([NaN]))
		})

		it('should distinguish between +0 and -0', () => {
			const originalSet = new Set([0, -0])
			const constructor = new IncrementalSetConstructor(originalSet)

			// Set treats +0 and -0 as the same value
			expect(originalSet.size).toBe(1)

			constructor.add(1)
			const result = constructor.get()
			expect(result!.value.size).toBe(2) // 0/-0 and 1
		})

		it('should work with boolean values', () => {
			const originalSet = new Set<boolean | string>([true, false])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove(false)
			constructor.add('true') // String 'true', not boolean

			const result = constructor.get()
			expect(result!.value).toEqual(new Set([true, 'true']))
			expect(result!.diff.added).toEqual(new Set(['true']))
			expect(result!.diff.removed).toEqual(new Set([false]))
		})

		it('should handle symbol values', () => {
			const sym1 = Symbol('test1')
			const sym2 = Symbol('test2')
			const sym3 = Symbol('test3')
			const originalSet = new Set([sym1, sym2])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove(sym1)
			constructor.add(sym3)

			const result = constructor.get()
			expect(result!.value).toEqual(new Set([sym2, sym3]))
			expect(result!.diff.added).toEqual(new Set([sym3]))
			expect(result!.diff.removed).toEqual(new Set([sym1]))
		})
	})

	describe('type safety', () => {
		it('should maintain type safety with string sets', () => {
			const originalSet = new Set<string>(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('c')
			// TypeScript would prevent: constructor.add(123)

			const result = constructor.get()
			expect(result!.value).toBeInstanceOf(Set)
		})

		it('should maintain type safety with number sets', () => {
			const originalSet = new Set<number>([1, 2])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add(3)
			// TypeScript would prevent: constructor.add('string')

			const result = constructor.get()
			expect(result!.value).toBeInstanceOf(Set)
		})

		it('should work with union types', () => {
			const originalSet = new Set<string | number>(['a', 1, 'b', 2])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('c')
			constructor.add(3)
			constructor.remove('a')

			const result = constructor.get()
			expect(result!.value).toEqual(new Set([1, 'b', 2, 'c', 3]))
		})
	})

	describe('diff structure validation', () => {
		it('should not create removed diff when only adding', () => {
			const originalSet = new Set(['a'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('b')

			const result = constructor.get()
			expect(result!.diff.added).toEqual(new Set(['b']))
			expect(result!.diff.removed).toBeUndefined()
		})

		it('should not create added diff when only removing', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('a')

			const result = constructor.get()
			expect(result!.diff.removed).toEqual(new Set(['a']))
			expect(result!.diff.added).toBeUndefined()
		})

		it('should create both added and removed diffs when needed', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('a')
			constructor.add('c')

			const result = constructor.get()
			expect(result!.diff.added).toEqual(new Set(['c']))
			expect(result!.diff.removed).toEqual(new Set(['a']))
		})

		it('should handle empty diff sets correctly', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('c')
			constructor.remove('c') // This should remove 'c' from added diff

			const result = constructor.get()
			expect(result).toBeUndefined()
		})
	})
})
