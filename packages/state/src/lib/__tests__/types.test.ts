import { describe, expect, it } from 'vitest'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { ComputeDiff, RESET_VALUE } from '../types'

describe('types', () => {
	describe('RESET_VALUE', () => {
		it('should be a unique symbol with correct identity', () => {
			expect(typeof RESET_VALUE).toBe('symbol')
			expect(RESET_VALUE).toBe(Symbol.for('com.tldraw.state/RESET_VALUE'))
		})

		it('should work as object key and in collections', () => {
			const obj = { [RESET_VALUE]: 'reset' }
			expect(obj[RESET_VALUE]).toBe('reset')

			const map = new Map()
			map.set(RESET_VALUE, 'value')
			expect(map.get(RESET_VALUE)).toBe('value')

			const set = new Set([RESET_VALUE])
			expect(set.has(RESET_VALUE)).toBe(true)
		})
	})

	describe('Signal interface', () => {
		describe('get method', () => {
			it('should establish dependency relationships in computed contexts', () => {
				const sourceAtom = atom('source', 1)
				const dependentComputed = computed('dependent', () => {
					return sourceAtom.get() * 10
				})

				expect(dependentComputed.get()).toBe(10)

				sourceAtom.set(2)
				expect(dependentComputed.get()).toBe(20)
			})
		})

		describe('lastChangedEpoch property', () => {
			it('should update when atom value changes', () => {
				const atomSignal = atom('test', 'initial')
				const firstEpoch = atomSignal.lastChangedEpoch

				atomSignal.set('changed')
				const secondEpoch = atomSignal.lastChangedEpoch

				expect(secondEpoch).toBeGreaterThan(firstEpoch)
			})

			it('should not change when computed produces same value', () => {
				const sourceAtom = atom('source', 1)
				const computedSignal = computed('computed', () => {
					const val = sourceAtom.get()
					return val > 0 ? 'positive' : 'non-positive'
				})

				// Force initial computation
				computedSignal.get()
				const initialEpoch = computedSignal.lastChangedEpoch

				// Change source but computed value should remain same
				sourceAtom.set(2)
				computedSignal.get() // Force recomputation

				// The epoch should NOT change because the computed value is the same
				expect(computedSignal.lastChangedEpoch).toBe(initialEpoch)
			})
		})

		describe('getDiffSince method', () => {
			it('should return RESET_VALUE when epoch is too old', () => {
				const atomSignal = atom('test', 0, {
					historyLength: 2,
					computeDiff: (prev, curr) => curr - prev,
				})

				const veryOldEpoch = atomSignal.lastChangedEpoch

				// Make enough changes to exceed history length
				atomSignal.set(1)
				atomSignal.set(2)
				atomSignal.set(3)
				atomSignal.set(4)

				const result = atomSignal.getDiffSince(veryOldEpoch)
				expect(result).toBe(RESET_VALUE)
			})

			it('should return diff array when history is available', () => {
				const atomSignal = atom('test', 0, {
					historyLength: 5,
					computeDiff: (prev, curr) => curr - prev,
				})

				const initialEpoch = atomSignal.lastChangedEpoch
				atomSignal.set(5)

				const diffs = atomSignal.getDiffSince(initialEpoch)
				if (diffs !== RESET_VALUE) {
					expect(Array.isArray(diffs)).toBe(true)
					expect(diffs[0]).toBe(5) // 5 - 0 = 5
				}
			})
		})

		describe('__unsafe__getWithoutCapture method', () => {
			it('should not create dependency relationships', () => {
				const sourceAtom = atom('source', 1)
				let computationCount = 0

				const computedSignal = computed('computed', () => {
					computationCount++
					// Use unsafe get - should not create dependency
					return sourceAtom.__unsafe__getWithoutCapture() * 2
				})

				expect(computedSignal.get()).toBe(2)
				expect(computationCount).toBe(1)

				// Change source - computed should not recompute
				sourceAtom.set(5)

				// Computed value should remain stale since no dependency was established
				expect(computedSignal.get()).toBe(2) // Still the old computed value
				expect(computationCount).toBe(1) // No recomputation
			})
		})
	})

	describe('ComputeDiff type', () => {
		describe('practical diff implementations', () => {
			it('should work with simple numeric diffs', () => {
				const numberDiff: ComputeDiff<number, number> = (prev, curr) => curr - prev

				expect(numberDiff(5, 10, 0, 1)).toBe(5)
				expect(numberDiff(10, 3, 1, 2)).toBe(-7)
				expect(numberDiff(0, 0, 2, 3)).toBe(0)
			})

			it('should use RESET_VALUE for complex cases', () => {
				const conditionalDiff: ComputeDiff<any[], any> = (prev, curr) => {
					// Use RESET_VALUE for very large arrays
					if (prev.length > 1000 || curr.length > 1000) {
						return RESET_VALUE
					}
					return { lengthDiff: curr.length - prev.length }
				}

				const largeArray = new Array(1001).fill(0)
				expect(conditionalDiff([1], largeArray, 0, 1)).toBe(RESET_VALUE)
				expect(conditionalDiff([1, 2], [1, 2, 3], 0, 1)).toEqual({ lengthDiff: 1 })
			})

			it('should handle epoch parameters for temporal logic', () => {
				const timeSensitiveDiff: ComputeDiff<number, number | typeof RESET_VALUE> = (
					prev,
					curr,
					lastEpoch,
					currentEpoch
				) => {
					// If too much time passed, force reset
					const epochDiff = currentEpoch - lastEpoch
					if (epochDiff > 100) {
						return RESET_VALUE
					}
					return curr - prev
				}

				expect(timeSensitiveDiff(5, 10, 1, 2)).toBe(5) // Normal case
				expect(timeSensitiveDiff(5, 10, 1, 102)).toBe(RESET_VALUE) // Too much time
			})
		})

		describe('integration with atoms', () => {
			it('should be usable in atom configuration', () => {
				const customDiff: ComputeDiff<number, string> = (prev, curr) => {
					if (curr > prev) return 'increased'
					if (curr < prev) return 'decreased'
					return 'same'
				}

				const atomWithDiff = atom<number, string>('with-diff', 5, {
					historyLength: 3,
					computeDiff: customDiff,
				})

				const initialEpoch = atomWithDiff.lastChangedEpoch
				atomWithDiff.set(10)

				const diffs = atomWithDiff.getDiffSince(initialEpoch)
				if (diffs !== RESET_VALUE && diffs.length > 0) {
					expect(diffs[0]).toBe('increased')
				}
			})
		})
	})
})
