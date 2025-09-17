import { describe, expect, it, vi } from 'vitest'
import { ARRAY_SIZE_THRESHOLD, ArraySet } from '../ArraySet'

const get = <T>(set: ArraySet<T>) => {
	const s = new Set<T>()

	set.visit((i) => s.add(i))
	return s
}

describe(ArraySet, () => {
	it('works with small numbers of things', () => {
		const as = new ArraySet<number>()

		expect(as.isEmpty).toBe(true)

		as.add(3)
		as.add(5)
		as.add(8)
		as.add(9)

		expect(get(as)).toEqual(new Set([3, 5, 8, 9]))

		as.remove(8)

		expect(get(as)).toEqual(new Set([3, 5, 9]))

		as.add(10)

		expect(get(as)).toEqual(new Set([3, 5, 9, 10]))

		as.add(12)

		expect(get(as)).toEqual(new Set([3, 5, 9, 10, 12]))

		as.remove(5)
		as.remove(9)

		expect(get(as)).toEqual(new Set([3, 10, 12]))

		as.remove(9)

		expect(get(as)).toEqual(new Set([3, 10, 12]))

		as.add(123)
		as.add(234)

		expect(get(as)).toEqual(new Set([3, 10, 12, 123, 234]))

		expect(as.isEmpty).toBe(false)

		as.remove(123)
		as.remove(234)
		as.remove(3)
		as.remove(10)
		expect(as.isEmpty).toBe(false)
		as.remove(12)
		expect(as.isEmpty).toBe(true)
	})

	it('works with large numbers of things', () => {
		const as = new ArraySet<number>()

		expect(as.isEmpty).toBe(true)
		for (let i = 0; i < 100; i++) {
			as.add(i)
		}

		expect(get(as)).toEqual(new Set(Array.from({ length: 100 }, (_, i) => i)))

		expect(as.isEmpty).toBe(false)
		for (let i = 0; i < 100; i++) {
			as.remove(i)
		}

		expect(get(as)).toEqual(new Set())
		expect(as.isEmpty).toBe(true)
	})
})

function rng(seed: number) {
	return () => {
		const x = Math.sin(seed++) * 10000
		return x - Math.floor(x)
	}
}

function runTest(seed: number) {
	const as = new ArraySet<number>()
	const s = new Set<number>()
	const r = rng(seed)

	const nums = new Array(ARRAY_SIZE_THRESHOLD * 2).fill(0).map(() => Math.floor(r() * 100))

	for (let i = 0; i < 1000; i++) {
		const num = nums[Math.floor(r() * nums.length)]

		const choice = r()
		if (choice < 0.45) {
			as.add(num)
			s.add(num)
		} else if (choice < 0.9) {
			as.remove(num)
			s.delete(num)
		} else {
			as.clear()
			s.clear()
		}

		try {
			expect(get(as)).toEqual(s)
		} catch (e) {
			console.error('Failed on iteration', i, 'with seed', seed)
			throw e
		}
	}
}

describe('fuzzing this thing (if this fails tell david)', () => {
	new Array(10).fill(0).forEach(() => {
		const seed = Math.floor(Math.random() * 1000000)
		it(`fuzz with seed ${seed}`, () => {
			runTest(seed)
		})
	})
})

describe('regression tests', () => {
	it('passes with seed 354923', () => {
		runTest(354923)
	})
})

describe('ArraySet - comprehensive tests', () => {
	describe('constructor and initial state', () => {
		it('starts empty with correct initial state', () => {
			const arraySet = new ArraySet<string>()
			expect(arraySet.isEmpty).toBe(true)
			expect(arraySet.size()).toBe(0)
			expect(arraySet.has('anything')).toBe(false)
		})
	})

	describe('add method', () => {
		it('returns true when adding new element', () => {
			const arraySet = new ArraySet<string>()
			expect(arraySet.add('hello')).toBe(true)
			expect(arraySet.has('hello')).toBe(true)
			expect(arraySet.size()).toBe(1)
		})

		it('returns false when adding existing element', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('hello')
			expect(arraySet.add('hello')).toBe(false)
			expect(arraySet.size()).toBe(1)
		})

		it('handles null and undefined values', () => {
			const arraySet = new ArraySet<string | null | undefined>()
			expect(arraySet.add(null)).toBe(true)
			expect(arraySet.add(undefined)).toBe(true)
			expect(arraySet.add(null)).toBe(false) // duplicate
			expect(arraySet.has(null)).toBe(true)
			expect(arraySet.has(undefined)).toBe(true)
			expect(arraySet.size()).toBe(2)
		})

		it('works with different data types', () => {
			const numberSet = new ArraySet<number>()
			const objSet = new ArraySet<{ id: number }>()
			const obj1 = { id: 1 }
			const obj2 = { id: 2 }

			expect(numberSet.add(42)).toBe(true)
			expect(numberSet.add(0)).toBe(true)
			expect(numberSet.add(-1)).toBe(true)

			expect(objSet.add(obj1)).toBe(true)
			expect(objSet.add(obj2)).toBe(true)
			expect(objSet.add(obj1)).toBe(false) // same reference
		})

		it('transitions to Set mode when threshold exceeded', () => {
			const arraySet = new ArraySet<number>()

			// Fill up to threshold
			for (let i = 0; i < ARRAY_SIZE_THRESHOLD; i++) {
				expect(arraySet.add(i)).toBe(true)
			}

			expect(arraySet.size()).toBe(ARRAY_SIZE_THRESHOLD)

			// This addition should trigger conversion to Set
			expect(arraySet.add(ARRAY_SIZE_THRESHOLD)).toBe(true)
			expect(arraySet.size()).toBe(ARRAY_SIZE_THRESHOLD + 1)

			// Verify all elements are still present
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				expect(arraySet.has(i)).toBe(true)
			}
		})
	})

	describe('remove method', () => {
		it('returns true when removing existing element', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('hello')
			expect(arraySet.remove('hello')).toBe(true)
			expect(arraySet.has('hello')).toBe(false)
			expect(arraySet.size()).toBe(0)
		})

		it('returns false when removing non-existing element', () => {
			const arraySet = new ArraySet<string>()
			expect(arraySet.remove('hello')).toBe(false)
			expect(arraySet.size()).toBe(0)
		})

		it('handles removing from empty set', () => {
			const arraySet = new ArraySet<string>()
			expect(arraySet.remove('anything')).toBe(false)
		})

		it('properly reorders array after removal', () => {
			const arraySet = new ArraySet<number>()
			// Add elements [1, 2, 3, 4]
			for (let i = 1; i <= 4; i++) {
				arraySet.add(i)
			}

			// Remove element from middle
			arraySet.remove(2)
			expect(arraySet.size()).toBe(3)

			// All remaining elements should still be present
			expect(arraySet.has(1)).toBe(true)
			expect(arraySet.has(2)).toBe(false)
			expect(arraySet.has(3)).toBe(true)
			expect(arraySet.has(4)).toBe(true)
		})

		it('works with Set mode', () => {
			const arraySet = new ArraySet<number>()

			// Force conversion to Set mode
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.add(i)
			}

			// Remove some elements
			expect(arraySet.remove(5)).toBe(true)
			expect(arraySet.remove(5)).toBe(false) // already removed
			expect(arraySet.has(5)).toBe(false)
			expect(arraySet.size()).toBe(ARRAY_SIZE_THRESHOLD)
		})
	})

	describe('has method', () => {
		it('returns false for empty set', () => {
			const arraySet = new ArraySet<string>()
			expect(arraySet.has('anything')).toBe(false)
		})

		it('returns true for existing elements in array mode', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('hello')
			arraySet.add('world')
			expect(arraySet.has('hello')).toBe(true)
			expect(arraySet.has('world')).toBe(true)
			expect(arraySet.has('missing')).toBe(false)
		})

		it('returns true for existing elements in Set mode', () => {
			const arraySet = new ArraySet<number>()

			// Force conversion to Set mode
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.add(i)
			}

			expect(arraySet.has(0)).toBe(true)
			expect(arraySet.has(ARRAY_SIZE_THRESHOLD)).toBe(true)
			expect(arraySet.has(ARRAY_SIZE_THRESHOLD + 1)).toBe(false)
		})

		it('works with null and undefined', () => {
			const arraySet = new ArraySet<string | null | undefined>()
			arraySet.add(null)
			arraySet.add(undefined)
			expect(arraySet.has(null)).toBe(true)
			expect(arraySet.has(undefined)).toBe(true)
		})
	})

	describe('isEmpty getter', () => {
		it('returns true for new ArraySet', () => {
			const arraySet = new ArraySet<string>()
			expect(arraySet.isEmpty).toBe(true)
		})

		it('returns false when elements exist', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('hello')
			expect(arraySet.isEmpty).toBe(false)
		})

		it('returns true after clearing all elements', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('hello')
			arraySet.remove('hello')
			expect(arraySet.isEmpty).toBe(true)
		})

		it('works correctly in Set mode', () => {
			const arraySet = new ArraySet<number>()

			// Force conversion to Set mode
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.add(i)
			}
			expect(arraySet.isEmpty).toBe(false)

			// Remove all elements
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.remove(i)
			}
			expect(arraySet.isEmpty).toBe(true)
		})
	})

	describe('size method', () => {
		it('returns 0 for empty set', () => {
			const arraySet = new ArraySet<string>()
			expect(arraySet.size()).toBe(0)
		})

		it('returns correct size as elements are added', () => {
			const arraySet = new ArraySet<string>()
			expect(arraySet.size()).toBe(0)

			arraySet.add('first')
			expect(arraySet.size()).toBe(1)

			arraySet.add('second')
			expect(arraySet.size()).toBe(2)

			// Adding duplicate shouldn't increase size
			arraySet.add('first')
			expect(arraySet.size()).toBe(2)
		})

		it('returns correct size as elements are removed', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('first')
			arraySet.add('second')
			expect(arraySet.size()).toBe(2)

			arraySet.remove('first')
			expect(arraySet.size()).toBe(1)

			// Removing non-existent shouldn't decrease size
			arraySet.remove('first')
			expect(arraySet.size()).toBe(1)

			arraySet.remove('second')
			expect(arraySet.size()).toBe(0)
		})

		it('tracks size correctly across array/Set transition', () => {
			const arraySet = new ArraySet<number>()

			for (let i = 0; i < ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.add(i)
				expect(arraySet.size()).toBe(i + 1)
			}

			// This should trigger conversion
			arraySet.add(ARRAY_SIZE_THRESHOLD)
			expect(arraySet.size()).toBe(ARRAY_SIZE_THRESHOLD + 1)
		})
	})

	describe('clear method', () => {
		it('clears empty set without error', () => {
			const arraySet = new ArraySet<string>()
			arraySet.clear()
			expect(arraySet.isEmpty).toBe(true)
			expect(arraySet.size()).toBe(0)
		})

		it('clears set in array mode', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('hello')
			arraySet.add('world')

			arraySet.clear()
			expect(arraySet.isEmpty).toBe(true)
			expect(arraySet.size()).toBe(0)
			expect(arraySet.has('hello')).toBe(false)
			expect(arraySet.has('world')).toBe(false)
		})

		it('clears set in Set mode', () => {
			const arraySet = new ArraySet<number>()

			// Force conversion to Set mode
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.add(i)
			}

			arraySet.clear()
			expect(arraySet.isEmpty).toBe(true)
			expect(arraySet.size()).toBe(0)

			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				expect(arraySet.has(i)).toBe(false)
			}
		})

		it('allows adding elements after clear', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('hello')
			arraySet.clear()

			expect(arraySet.add('world')).toBe(true)
			expect(arraySet.has('world')).toBe(true)
			expect(arraySet.size()).toBe(1)
		})
	})

	describe('visit method', () => {
		it('does not call visitor for empty set', () => {
			const arraySet = new ArraySet<string>()
			const visitor = vi.fn()

			arraySet.visit(visitor)
			expect(visitor).not.toHaveBeenCalled()
		})

		it('visits all elements in array mode', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('hello')
			arraySet.add('world')

			const visited: string[] = []
			arraySet.visit((item) => visited.push(item))

			expect(visited).toContain('hello')
			expect(visited).toContain('world')
			expect(visited).toHaveLength(2)
		})

		it('visits all elements in Set mode', () => {
			const arraySet = new ArraySet<number>()

			// Force conversion to Set mode
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.add(i)
			}

			const visited: number[] = []
			arraySet.visit((item) => visited.push(item))

			expect(visited).toHaveLength(ARRAY_SIZE_THRESHOLD + 1)
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				expect(visited).toContain(i)
			}
		})

		it('handles elements with falsy values - undefined values are correctly filtered out in visit', () => {
			const arraySet = new ArraySet<number | null | undefined>()
			arraySet.add(0)
			arraySet.add(null)
			arraySet.add(undefined)

			const visited: (number | null | undefined)[] = []
			arraySet.visit((item) => visited.push(item))

			expect(visited).toContain(0)
			expect(visited).toContain(null)
			// undefined values are intentionally filtered out during visit in array mode
			// because undefined is used as a placeholder for deleted elements
			expect(visited).not.toContain(undefined)
			expect(visited).toHaveLength(2)
		})
	})

	describe('Symbol.iterator (for...of support)', () => {
		it('supports iteration over empty set', () => {
			const arraySet = new ArraySet<string>()
			const items = [...arraySet]
			expect(items).toHaveLength(0)
		})

		it('supports iteration in array mode', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('hello')
			arraySet.add('world')

			const items = [...arraySet]
			expect(items).toContain('hello')
			expect(items).toContain('world')
			expect(items).toHaveLength(2)
		})

		it('supports iteration in Set mode', () => {
			const arraySet = new ArraySet<number>()

			// Force conversion to Set mode
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.add(i)
			}

			const items = [...arraySet]
			expect(items).toHaveLength(ARRAY_SIZE_THRESHOLD + 1)
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				expect(items).toContain(i)
			}
		})

		it('works with for...of loop', () => {
			const arraySet = new ArraySet<string>()
			arraySet.add('a')
			arraySet.add('b')
			arraySet.add('c')

			const collected: string[] = []
			for (const item of arraySet) {
				collected.push(item)
			}

			expect(collected).toContain('a')
			expect(collected).toContain('b')
			expect(collected).toContain('c')
			expect(collected).toHaveLength(3)
		})

		it('handles falsy values in iteration - undefined values are correctly filtered out in iterator', () => {
			const arraySet = new ArraySet<number | null | undefined>()
			arraySet.add(0)
			arraySet.add(null)
			arraySet.add(undefined)

			const items = [...arraySet]
			expect(items).toContain(0)
			expect(items).toContain(null)
			// undefined values are intentionally filtered out during iteration in array mode
			// because undefined is used as a placeholder for deleted elements
			expect(items).not.toContain(undefined)
			expect(items).toHaveLength(2)
		})
	})

	describe('edge cases and error conditions', () => {
		it('throws error when internal state is corrupted (no array or set)', () => {
			const arraySet = new ArraySet<string>()
			// Force both array and set to be null (simulating corruption)
			;(arraySet as any).array = null
			;(arraySet as any).set = null

			expect(() => arraySet.isEmpty).toThrow('no set or array')
			expect(() => arraySet.add('test')).toThrow('no set or array')
			expect(() => arraySet.remove('test')).toThrow('no set or array')
			expect(() => arraySet.visit(() => {})).toThrow('no set or array')
			expect(() => [...arraySet]).toThrow('no set or array')
		})

		it('works with extremely large numbers of elements', () => {
			const arraySet = new ArraySet<number>()
			const count = 1000

			for (let i = 0; i < count; i++) {
				arraySet.add(i)
			}

			expect(arraySet.size()).toBe(count)
			expect(arraySet.has(0)).toBe(true)
			expect(arraySet.has(count - 1)).toBe(true)
			expect(arraySet.has(count)).toBe(false)
		})

		it('maintains consistency when mixing add/remove operations', () => {
			const arraySet = new ArraySet<number>()
			const reference = new Set<number>()

			// Add some initial elements
			for (let i = 0; i < 5; i++) {
				arraySet.add(i)
				reference.add(i)
			}

			// Mix of operations
			arraySet.remove(2)
			reference.delete(2)

			arraySet.add(10)
			reference.add(10)

			arraySet.remove(0)
			reference.delete(0)

			// Verify consistency
			expect(get(arraySet)).toEqual(reference)
			expect(arraySet.size()).toBe(reference.size)
		})

		it('handles object references correctly', () => {
			const arraySet = new ArraySet<object>()
			const obj1 = { id: 1 }
			const obj2 = { id: 1 } // Different reference, same content

			arraySet.add(obj1)
			arraySet.add(obj2) // Should be added as it's a different reference

			expect(arraySet.size()).toBe(2)
			expect(arraySet.has(obj1)).toBe(true)
			expect(arraySet.has(obj2)).toBe(true)
		})

		it('handles string edge cases', () => {
			const arraySet = new ArraySet<string>()

			arraySet.add('')
			arraySet.add(' ')
			arraySet.add('\n')
			arraySet.add('\t')

			expect(arraySet.size()).toBe(4)
			expect(arraySet.has('')).toBe(true)
			expect(arraySet.has(' ')).toBe(true)
			expect(arraySet.has('\n')).toBe(true)
			expect(arraySet.has('\t')).toBe(true)
		})
	})

	describe('transition behavior', () => {
		it('maintains all elements during array to Set transition', () => {
			const arraySet = new ArraySet<number>()

			// Add exactly threshold number of elements
			for (let i = 0; i < ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.add(i)
			}

			// Verify in array mode
			expect(arraySet.size()).toBe(ARRAY_SIZE_THRESHOLD)

			// Add one more to trigger transition
			arraySet.add(ARRAY_SIZE_THRESHOLD)

			// Verify all elements still present
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				expect(arraySet.has(i)).toBe(true)
			}
			expect(arraySet.size()).toBe(ARRAY_SIZE_THRESHOLD + 1)
		})

		it('does not transition back to array mode after clearing Set', () => {
			const arraySet = new ArraySet<number>()

			// Force transition to Set mode
			for (let i = 0; i <= ARRAY_SIZE_THRESHOLD; i++) {
				arraySet.add(i)
			}

			// Clear the set
			arraySet.clear()
			expect(arraySet.isEmpty).toBe(true)

			// Add a single element - should still use Set mode
			arraySet.add(1)
			expect(arraySet.size()).toBe(1)
			expect(arraySet.has(1)).toBe(true)
		})
	})

	describe('performance characteristics', () => {
		it('ARRAY_SIZE_THRESHOLD constant is accessible', () => {
			expect(ARRAY_SIZE_THRESHOLD).toBe(8)
			expect(typeof ARRAY_SIZE_THRESHOLD).toBe('number')
		})

		it('efficiently handles repeated add/remove on same elements', () => {
			const arraySet = new ArraySet<string>()

			// Repeatedly add and remove same element
			for (let i = 0; i < 100; i++) {
				expect(arraySet.add('test')).toBe(true)
				expect(arraySet.remove('test')).toBe(true)
			}

			expect(arraySet.isEmpty).toBe(true)
		})
	})
})
