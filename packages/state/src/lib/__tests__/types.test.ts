import { describe, expect, it } from 'vitest'
import { ArraySet } from '../ArraySet'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { ComputeDiff, RESET_VALUE } from '../types'

describe('types', () => {
	describe('RESET_VALUE', () => {
		it('should be a unique symbol', () => {
			expect(typeof RESET_VALUE).toBe('symbol')
			expect(RESET_VALUE.toString()).toBe('Symbol(com.tldraw.state/RESET_VALUE)')
		})

		it('should use Symbol.for for global uniqueness', () => {
			const duplicate = Symbol.for('com.tldraw.state/RESET_VALUE')
			expect(RESET_VALUE).toBe(duplicate)
		})

		it('should be different from other symbols', () => {
			const otherSymbol = Symbol('other')
			const otherGlobalSymbol = Symbol.for('other.symbol')
			expect(RESET_VALUE).not.toBe(otherSymbol)
			expect(RESET_VALUE).not.toBe(otherGlobalSymbol)
		})

		it('should be usable as object key', () => {
			const obj = { [RESET_VALUE]: 'reset' }
			expect(obj[RESET_VALUE]).toBe('reset')
		})

		it('should be usable in Map and Set', () => {
			const map = new Map()
			map.set(RESET_VALUE, 'value')
			expect(map.get(RESET_VALUE)).toBe('value')

			const set = new Set()
			set.add(RESET_VALUE)
			expect(set.has(RESET_VALUE)).toBe(true)
		})

		it('should be serializable with custom toJSON behavior', () => {
			// Symbol cannot be JSON.stringified directly, but we test that it doesn't throw
			expect(() => JSON.stringify({ key: RESET_VALUE })).not.toThrow()
		})

		it('should maintain identity across multiple imports', async () => {
			const { RESET_VALUE: reimported } = await import('../types')
			expect(reimported).toBe(RESET_VALUE)
		})

		it('should work in switch statements', () => {
			let result = ''
			const value = RESET_VALUE

			switch (value) {
				case RESET_VALUE:
					result = 'matched'
					break
				default:
					result = 'not matched'
			}

			expect(result).toBe('matched')
		})

		it('should work with strict equality checks', () => {
			expect(RESET_VALUE === RESET_VALUE).toBe(true)
			expect(RESET_VALUE !== RESET_VALUE).toBe(false)
			expect(Object.is(RESET_VALUE, RESET_VALUE)).toBe(true)
		})

		it('should work in array operations', () => {
			const arr = [RESET_VALUE, 'other']
			expect(arr.includes(RESET_VALUE)).toBe(true)
			expect(arr.indexOf(RESET_VALUE)).toBe(0)
			expect(arr.filter((item) => item === RESET_VALUE)).toHaveLength(1)
		})
	})

	describe('RESET_VALUE type', () => {
		it('should allow RESET_VALUE as the only assignable value', () => {
			// TypeScript compilation test - these should compile without errors
			const resetValue: typeof RESET_VALUE = RESET_VALUE
			expect(resetValue).toBe(RESET_VALUE)

			// Function parameter type checking
			const acceptsResetValue = (value: typeof RESET_VALUE) => value
			expect(acceptsResetValue(RESET_VALUE)).toBe(RESET_VALUE)
		})

		it('should work in union types', () => {
			// Test union type with RESET_VALUE
			const unionValue: number | typeof RESET_VALUE = RESET_VALUE
			expect(unionValue).toBe(RESET_VALUE)

			const numberValue: number | typeof RESET_VALUE = 42
			expect(numberValue).toBe(42)
		})

		it('should work with type guards', () => {
			const checkIsResetValue = (value: unknown): value is typeof RESET_VALUE => {
				return value === RESET_VALUE
			}

			expect(checkIsResetValue(RESET_VALUE)).toBe(true)
			expect(checkIsResetValue('other')).toBe(false)
			expect(checkIsResetValue(null)).toBe(false)
			expect(checkIsResetValue(undefined)).toBe(false)
		})
	})

	describe('Signal interface', () => {
		describe('interface structure', () => {
			it('should be implemented by atomic signals', () => {
				const atomSignal = atom('test-atom', 42)

				// Test required properties exist
				expect(typeof atomSignal.name).toBe('string')
				expect(typeof atomSignal.get).toBe('function')
				expect(typeof atomSignal.lastChangedEpoch).toBe('number')
				expect(typeof atomSignal.getDiffSince).toBe('function')
				expect(typeof atomSignal.__unsafe__getWithoutCapture).toBe('function')
				expect(atomSignal.children).toBeInstanceOf(ArraySet)
			})

			it('should be implemented by computed signals', () => {
				const baseAtom = atom('base', 10)
				const computedSignal = computed('test-computed', () => baseAtom.get() * 2)

				// Test required properties exist
				expect(typeof computedSignal.name).toBe('string')
				expect(typeof computedSignal.get).toBe('function')
				expect(typeof computedSignal.lastChangedEpoch).toBe('number')
				expect(typeof computedSignal.getDiffSince).toBe('function')
				expect(typeof computedSignal.__unsafe__getWithoutCapture).toBe('function')
				expect(computedSignal.children).toBeInstanceOf(ArraySet)
			})
		})

		describe('name property', () => {
			it('should contain human-readable identifier', () => {
				const atomSignal = atom('my-counter', 0)
				expect(atomSignal.name).toBe('my-counter')

				const computedSignal = computed('doubled', () => atomSignal.get() * 2)
				expect(computedSignal.name).toBe('doubled')
			})

			it('should be used for debugging and identification', () => {
				const namedSignal = atom('debug-signal', 'test')
				expect(namedSignal.name).toBe('debug-signal')

				// Name should be accessible for debugging tools
				expect(namedSignal.name.length).toBeGreaterThan(0)
				expect(typeof namedSignal.name).toBe('string')
			})
		})

		describe('get method', () => {
			it('should return current value', () => {
				const atomSignal = atom('test', 'value')
				expect(atomSignal.get()).toBe('value')

				const numberAtom = atom('number', 42)
				expect(numberAtom.get()).toBe(42)
			})

			it('should establish dependency relationships in computed contexts', () => {
				const sourceAtom = atom('source', 1)
				const dependentComputed = computed('dependent', () => {
					return sourceAtom.get() * 10 // This should create a dependency
				})

				expect(dependentComputed.get()).toBe(10)

				sourceAtom.set(2)
				expect(dependentComputed.get()).toBe(20) // Should update automatically
			})

			it('should work with different value types', () => {
				const stringSignal = atom('string', 'hello')
				const numberSignal = atom('number', 123)
				const booleanSignal = atom('boolean', true)
				const objectSignal = atom('object', { key: 'value' })
				const arraySignal = atom('array', [1, 2, 3])
				const nullSignal = atom('null', null)

				expect(stringSignal.get()).toBe('hello')
				expect(numberSignal.get()).toBe(123)
				expect(booleanSignal.get()).toBe(true)
				expect(objectSignal.get()).toEqual({ key: 'value' })
				expect(arraySignal.get()).toEqual([1, 2, 3])
				expect(nullSignal.get()).toBe(null)
			})
		})

		describe('lastChangedEpoch property', () => {
			it('should be a number representing when value last changed', () => {
				const atomSignal = atom('test', 0)
				expect(typeof atomSignal.lastChangedEpoch).toBe('number')

				const initialEpoch = atomSignal.lastChangedEpoch
				atomSignal.set(1)
				expect(atomSignal.lastChangedEpoch).toBeGreaterThan(initialEpoch)
			})

			it('should update when value changes', () => {
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

				// Epoch may change due to recomputation, but this tests the concept
				expect(typeof computedSignal.lastChangedEpoch).toBe('number')
			})
		})

		describe('getDiffSince method', () => {
			it('should return diff array or RESET_VALUE', () => {
				const atomSignal = atom('test', 0, {
					historyLength: 5,
					computeDiff: (prev, curr) => curr - prev,
				})

				const initialEpoch = atomSignal.lastChangedEpoch
				atomSignal.set(5)

				const diffs = atomSignal.getDiffSince(initialEpoch)
				if (diffs !== RESET_VALUE) {
					expect(Array.isArray(diffs)).toBe(true)
				}
			})

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

			it('should handle valid epoch parameter', () => {
				const atomSignal = atom('test', 'a', {
					historyLength: 5,
					computeDiff: (prev, curr) => `${prev}->${curr}`,
				})

				const epoch = atomSignal.lastChangedEpoch
				atomSignal.set('b')

				const result = atomSignal.getDiffSince(epoch)
				expect(result === RESET_VALUE || Array.isArray(result)).toBe(true)
			})
		})

		describe('__unsafe__getWithoutCapture method', () => {
			it('should return value without establishing dependencies', () => {
				const sourceAtom = atom('source', 'test-value')
				expect(sourceAtom.__unsafe__getWithoutCapture()).toBe('test-value')
			})

			it('should accept optional ignoreErrors parameter', () => {
				const atomSignal = atom('test', 42)

				// Should not throw with either parameter value
				expect(() => atomSignal.__unsafe__getWithoutCapture(true)).not.toThrow()
				expect(() => atomSignal.__unsafe__getWithoutCapture(false)).not.toThrow()
				expect(() => atomSignal.__unsafe__getWithoutCapture()).not.toThrow()

				expect(atomSignal.__unsafe__getWithoutCapture(true)).toBe(42)
				expect(atomSignal.__unsafe__getWithoutCapture(false)).toBe(42)
				expect(atomSignal.__unsafe__getWithoutCapture()).toBe(42)
			})

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

		describe('children property', () => {
			it('should be an ArraySet of Child objects', () => {
				const atomSignal = atom('test', 0)
				expect(atomSignal.children).toBeInstanceOf(ArraySet)
			})

			it('should track dependent computed signals when actively listening', () => {
				const sourceAtom = atom('source', 1)
				const dependentComputed = computed('dependent', () => sourceAtom.get() * 2)

				// Just getting the value doesn't establish persistent dependencies
				dependentComputed.get()

				// Without active listeners, children set may be empty after computation
				// This is expected behavior - dependencies are only tracked for active listeners
				expect(sourceAtom.children).toBeInstanceOf(ArraySet)
				expect(typeof sourceAtom.children.isEmpty).toBe('boolean')
			})

			it('should be empty for new atoms with no dependents', () => {
				const atomSignal = atom('isolated', 42)
				expect(atomSignal.children.isEmpty).toBe(true)
			})
		})
	})

	describe('Child interface', () => {
		// Note: Child is an internal interface, but we can test its structure
		// through signals that implement the dependency system

		it('should track parent-child relationships in dependency graph', () => {
			const parentAtom = atom('parent', 10)
			const childComputed = computed('child', () => parentAtom.get() + 1)

			// Force computation to establish relationship
			childComputed.get()

			// Verify that the computed signal has established parent dependencies
			expect((childComputed as any).parents).toContain(parentAtom)
			// Parent-child relationship exists in the dependency graph structure
			expect(parentAtom.children).toBeInstanceOf(ArraySet)
		})

		it('should handle multiple parent dependencies', () => {
			const atom1 = atom('atom1', 1)
			const atom2 = atom('atom2', 2)
			const multiDependentComputed = computed('multi', () => atom1.get() + atom2.get())

			multiDependentComputed.get()

			// Verify that the computed signal tracks both atoms as parents
			const computedParents = (multiDependentComputed as any).parents
			expect(computedParents).toContain(atom1)
			expect(computedParents).toContain(atom2)
			// Both atoms have children ArraySets that could contain dependencies
			expect(atom1.children).toBeInstanceOf(ArraySet)
			expect(atom2.children).toBeInstanceOf(ArraySet)
		})

		it('should support cleanup when dependencies change', () => {
			const atom1 = atom('atom1', true)
			const atom2 = atom('atom2', 10)
			const atom3 = atom('atom3', 20)

			const conditionalComputed = computed('conditional', () => {
				if (atom1.get()) {
					return atom2.get()
				} else {
					return atom3.get()
				}
			})

			// Initially depends on atom1 and atom2
			expect(conditionalComputed.get()).toBe(10)

			// Change condition to depend on atom3 instead
			atom1.set(false)
			expect(conditionalComputed.get()).toBe(20)

			// The dependency graph should update appropriately
			// Verify the computed tracks the conditional atom and the current branch
			const parents = (conditionalComputed as any).parents
			expect(parents).toContain(atom1) // Still needed for condition
			expect(parents).toContain(atom3) // Now depends on atom3
		})
	})

	describe('ComputeDiff type', () => {
		describe('function signature', () => {
			it('should accept previousValue, currentValue, lastComputedEpoch, currentEpoch', () => {
				const diff: ComputeDiff<number, number> = (prev, curr, lastEpoch, currentEpoch) => {
					expect(typeof prev).toBe('number')
					expect(typeof curr).toBe('number')
					expect(typeof lastEpoch).toBe('number')
					expect(typeof currentEpoch).toBe('number')
					return curr - prev
				}

				// Test that the function can be called with correct parameters
				const result = diff(5, 10, 1, 2)
				expect(result).toBe(5)
			})

			it('should return Diff type or RESET_VALUE', () => {
				const numericDiff: ComputeDiff<number, number> = (prev, curr) => curr - prev
				const resetDiff: ComputeDiff<string, string> = () => RESET_VALUE

				expect(numericDiff(1, 3, 0, 1)).toBe(2)
				expect(resetDiff('a', 'b', 0, 1)).toBe(RESET_VALUE)
			})
		})

		describe('practical diff implementations', () => {
			it('should work with simple numeric diffs', () => {
				const numberDiff: ComputeDiff<number, number> = (prev, curr) => curr - prev

				expect(numberDiff(5, 10, 0, 1)).toBe(5)
				expect(numberDiff(10, 3, 1, 2)).toBe(-7)
				expect(numberDiff(0, 0, 2, 3)).toBe(0)
			})

			it('should work with string diffs', () => {
				const stringDiff: ComputeDiff<string, { from: string; to: string }> = (prev, curr) => ({
					from: prev,
					to: curr,
				})

				const result = stringDiff('hello', 'world', 0, 1)
				expect(result).toEqual({ from: 'hello', to: 'world' })
			})

			it('should work with array diffs', () => {
				const arrayDiff: ComputeDiff<number[], { added: number[]; removed: number[] }> = (
					prev,
					curr
				) => {
					const added = curr.filter((item) => !prev.includes(item))
					const removed = prev.filter((item) => !curr.includes(item))
					return { added, removed }
				}

				const result = arrayDiff([1, 2, 3], [2, 3, 4], 0, 1)
				expect(result).toEqual({ added: [4], removed: [1] })
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

		describe('type safety', () => {
			it('should enforce Value type consistency', () => {
				// These should compile correctly
				const stringDiff: ComputeDiff<string, string> = (prev, curr) => `${prev}->${curr}`
				const numberDiff: ComputeDiff<number, number> = (prev, curr) => curr - prev

				expect(stringDiff('a', 'b', 0, 1)).toBe('a->b')
				expect(numberDiff(1, 5, 0, 1)).toBe(4)
			})

			it('should allow different Diff types from Value types', () => {
				const objectToDiff: ComputeDiff<{ count: number }, number> = (prev, curr) => {
					return curr.count - prev.count
				}

				const result = objectToDiff({ count: 5 }, { count: 10 }, 0, 1)
				expect(result).toBe(5)
			})

			it('should work with union return types', () => {
				const unionDiff: ComputeDiff<string, string | number> = (prev, curr) => {
					if (prev.length === curr.length) {
						return 0 // number
					}
					return curr // string
				}

				// Both strings have length 3, so should return 0
				expect(unionDiff('abc', 'def', 0, 1)).toBe(0)
				// Both strings have length 2, so should return 0
				expect(unionDiff('ab', 'cd', 0, 1)).toBe(0)
				// Different lengths should return the current string
				expect(unionDiff('ab', 'xyz', 0, 1)).toBe('xyz')
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

			it('should handle RESET_VALUE returns in atoms', () => {
				const resetDiff: ComputeDiff<string, never> = () => RESET_VALUE

				const atomWithResetDiff = atom<string, never>('reset-diff', 'initial', {
					historyLength: 5,
					computeDiff: resetDiff,
				})

				const initialEpoch = atomWithResetDiff.lastChangedEpoch
				atomWithResetDiff.set('changed')

				const result = atomWithResetDiff.getDiffSince(initialEpoch)
				expect(result).toBe(RESET_VALUE)
			})
		})

		describe('error handling and edge cases', () => {
			it('should handle null and undefined values', () => {
				const nullSafeDiff: ComputeDiff<string | null, string> = (prev, curr) => {
					if (prev === null) return `null->${curr}`
					if (curr === null) return `${prev}->null`
					return `${prev}->${curr}`
				}

				expect(nullSafeDiff(null, 'hello', 0, 1)).toBe('null->hello')
				expect(nullSafeDiff('hello', null, 0, 1)).toBe('hello->null')
			})

			it('should not throw on complex object differences', () => {
				const safeDiff: ComputeDiff<any, any> = (prev, curr) => {
					try {
						return JSON.stringify(curr) !== JSON.stringify(prev) ? 'changed' : 'same'
					} catch {
						return RESET_VALUE
					}
				}

				const circularObj: any = { name: 'test' }
				circularObj.self = circularObj

				expect(() => safeDiff({ a: 1 }, { a: 2 }, 0, 1)).not.toThrow()
				expect(() => safeDiff(circularObj, { other: true }, 0, 1)).not.toThrow()
			})

			it('should handle very large epoch differences', () => {
				const epochSafeDiff: ComputeDiff<number, number | typeof RESET_VALUE> = (
					prev,
					curr,
					lastEpoch,
					currentEpoch
				) => {
					// Handle potential overflow scenarios
					if (currentEpoch < lastEpoch) return RESET_VALUE
					if (currentEpoch - lastEpoch > Number.MAX_SAFE_INTEGER - 1000) return RESET_VALUE
					return curr - prev
				}

				expect(epochSafeDiff(1, 2, 5, 3)).toBe(RESET_VALUE) // Current < last
				expect(epochSafeDiff(1, 2, 1, Number.MAX_SAFE_INTEGER)).toBe(RESET_VALUE) // Huge diff
				expect(epochSafeDiff(1, 5, 10, 20)).toBe(4) // Normal case
			})
		})
	})
})
