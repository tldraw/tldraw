import { describe, expect, it } from 'vitest'
import { IncrementalSetConstructor } from './IncrementalSetConstructor'

describe('IncrementalSetConstructor', () => {
	describe('core functionality', () => {
		it('should return undefined when no net changes occur', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('d')
			constructor.remove('d')

			const result = constructor.get()
			expect(result).toBeUndefined()
		})

		it('should return correct result when items are added', () => {
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

		it('should return correct result when items are removed', () => {
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

		it('should handle mixed add and remove operations correctly', () => {
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

		it('should handle adding existing items as no-op', () => {
			const originalSet = new Set(['a', 'b', 'c'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.add('a')
			constructor.add('b')

			const result = constructor.get()
			expect(result).toBeUndefined()
		})

		it('should handle complex restore and cancel scenarios', () => {
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

		it('should handle removing non-existent items as no-op', () => {
			const originalSet = new Set(['a', 'b'])
			const constructor = new IncrementalSetConstructor(originalSet)

			constructor.remove('c')
			constructor.remove('d')

			const result = constructor.get()
			expect(result).toBeUndefined()
		})

		it('should remove recently added items correctly', () => {
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
	})
})
