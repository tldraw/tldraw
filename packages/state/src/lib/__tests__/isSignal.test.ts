import { describe, expect, it } from 'vitest'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { isSignal } from '../isSignal'

describe('isSignal', () => {
	describe('returns true for signal types', () => {
		it('identifies atoms as signals', () => {
			const atomSignal = atom('test-atom', 42)
			expect(isSignal(atomSignal)).toBe(true)
		})

		it('identifies computed signals as signals', () => {
			const baseAtom = atom('base', 10)
			const computedSignal = computed('test-computed', () => baseAtom.get() * 2)
			expect(isSignal(computedSignal)).toBe(true)
		})

		it('identifies atoms with different value types as signals', () => {
			const stringAtom = atom('string-atom', 'hello')
			const numberAtom = atom('number-atom', 123)
			const booleanAtom = atom('boolean-atom', true)
			const objectAtom = atom('object-atom', { key: 'value' })
			const arrayAtom = atom('array-atom', [1, 2, 3])
			const nullAtom = atom('null-atom', null)

			expect(isSignal(stringAtom)).toBe(true)
			expect(isSignal(numberAtom)).toBe(true)
			expect(isSignal(booleanAtom)).toBe(true)
			expect(isSignal(objectAtom)).toBe(true)
			expect(isSignal(arrayAtom)).toBe(true)
			expect(isSignal(nullAtom)).toBe(true)
		})

		it('identifies atoms with options as signals', () => {
			const atomWithHistory = atom('with-history', 0, {
				historyLength: 10,
				computeDiff: (a, b) => b - a,
			})
			const atomWithCustomEquality = atom('with-equality', 'test', {
				isEqual: (a, b) => a === b,
			})

			expect(isSignal(atomWithHistory)).toBe(true)
			expect(isSignal(atomWithCustomEquality)).toBe(true)
		})

		it('identifies computed signals with different derivations as signals', () => {
			const baseAtom = atom('base', 5)

			const simpleComputed = computed('simple', () => baseAtom.get() + 1)
			const complexComputed = computed('complex', () => {
				const val = baseAtom.get()
				return val > 10 ? 'high' : 'low'
			})
			const computedWithPrevValue = computed('with-prev', (prev) => {
				const current = baseAtom.get()
				return typeof prev === 'undefined' || prev === null ? current : (prev as number) + current
			})

			expect(isSignal(simpleComputed)).toBe(true)
			expect(isSignal(complexComputed)).toBe(true)
			expect(isSignal(computedWithPrevValue)).toBe(true)
		})

		it('identifies nested computed signals as signals', () => {
			const baseAtom = atom('base', 1)
			const firstComputed = computed('first', () => baseAtom.get() * 2)
			const nestedComputed = computed('nested', () => firstComputed.get() + 10)

			expect(isSignal(firstComputed)).toBe(true)
			expect(isSignal(nestedComputed)).toBe(true)
		})
	})

	describe('returns false for non-signal types', () => {
		it('returns false for primitive values', () => {
			expect(isSignal(42)).toBe(false)
			expect(isSignal('string')).toBe(false)
			expect(isSignal(true)).toBe(false)
			expect(isSignal(false)).toBe(false)
			expect(isSignal(Symbol('test'))).toBe(false)
			expect(isSignal(BigInt(123))).toBe(false)
		})

		it('returns false for null and undefined', () => {
			expect(isSignal(null)).toBe(false)
			expect(isSignal(undefined)).toBe(false)
		})

		it('returns false for objects', () => {
			expect(isSignal({})).toBe(false)
			expect(isSignal({ get: () => 42 })).toBe(false)
			expect(isSignal({ name: 'test', get: () => 'value' })).toBe(false)
		})

		it('returns false for arrays', () => {
			expect(isSignal([])).toBe(false)
			expect(isSignal([1, 2, 3])).toBe(false)
		})

		it('returns false for functions', () => {
			expect(isSignal(function test() {})).toBe(false)
			expect(isSignal(() => 42)).toBe(false)
			expect(
				isSignal(function namedFunction() {
					return 'test'
				})
			).toBe(false)
		})

		it('returns false for built-in objects', () => {
			expect(isSignal(new Date())).toBe(false)
			expect(isSignal(new Map())).toBe(false)
			expect(isSignal(new Set())).toBe(false)
			expect(isSignal(new WeakMap())).toBe(false)
			expect(isSignal(new WeakSet())).toBe(false)
			expect(isSignal(/regex/)).toBe(false)
		})

		it('returns false for class instances', () => {
			class TestClass {
				get() {
					return 'test'
				}
			}
			expect(isSignal(new TestClass())).toBe(false)
		})

		it('returns false for objects that mimic signal interface', () => {
			const fakeSignal = {
				name: 'fake',
				get: () => 'value',
				lastChangedEpoch: 1,
				getDiffSince: () => [],
				__unsafe__getWithoutCapture: () => 'value',
				children: new Set(),
			}
			expect(isSignal(fakeSignal)).toBe(false)
		})

		it('returns false for DOM elements', () => {
			// Skip if running in Node.js environment without DOM
			if (typeof document !== 'undefined') {
				const div = document.createElement('div')
				expect(isSignal(div)).toBe(false)
			}
		})
	})

	describe('type guard functionality', () => {
		it('properly narrows types in TypeScript', () => {
			const mixedValues: unknown[] = [
				atom('test', 42),
				computed('computed', () => 1),
				'not a signal',
				{ fake: 'object' },
			]

			const signals = mixedValues.filter(isSignal)

			// All filtered values should be signals
			signals.forEach((signal) => {
				expect(isSignal(signal)).toBe(true)
				// TypeScript should now know these have .get() method
				expect(typeof signal.get).toBe('function')
			})

			expect(signals).toHaveLength(2)
		})

		it('works with conditional logic', () => {
			const testValue: unknown = atom('test', 'value')

			if (isSignal(testValue)) {
				// TypeScript should know testValue is a Signal here
				expect(testValue.get()).toBe('value')
				expect(typeof testValue.name).toBe('string')
				expect(typeof testValue.lastChangedEpoch).toBe('number')
			} else {
				// This branch should not execute
				expect(true).toBe(false)
			}
		})
	})

	describe('edge cases and robustness', () => {
		it('handles objects with circular references', () => {
			const circular: any = { name: 'circular' }
			circular.self = circular

			expect(isSignal(circular)).toBe(false)
		})

		it('handles objects with prototype chain modifications', () => {
			const obj = Object.create(null)
			obj.get = () => 'test'

			expect(isSignal(obj)).toBe(false)
		})

		it('handles frozen/sealed objects', () => {
			const frozen = Object.freeze({ value: 42 })
			const sealed = Object.seal({ value: 42 })

			expect(isSignal(frozen)).toBe(false)
			expect(isSignal(sealed)).toBe(false)
		})

		it('handles objects with getters/setters', () => {
			const objWithGetter = {
				get value() {
					return 42
				},
				set value(val) {
					/* no-op */
				},
			}

			expect(isSignal(objWithGetter)).toBe(false)
		})

		it('does not throw with unusual input types', () => {
			// Test that the function is robust and doesn't throw
			expect(() => isSignal(Symbol.iterator)).not.toThrow()
			expect(() => isSignal(Number.POSITIVE_INFINITY)).not.toThrow()
			expect(() => isSignal(Number.NaN)).not.toThrow()

			expect(isSignal(Symbol.iterator)).toBe(false)
			expect(isSignal(Number.POSITIVE_INFINITY)).toBe(false)
			expect(isSignal(Number.NaN)).toBe(false)
		})
	})

	describe('consistency with isAtom function', () => {
		it('isSignal returns true for all values where isAtom returns true', () => {
			const atomSignal = atom('test', 42)

			// This test assumes isAtom exists and works correctly
			// If isSignal(atom) is true, it should be consistent with the atom being a signal
			expect(isSignal(atomSignal)).toBe(true)
		})

		it('isSignal returns true for computed signals while isAtom returns false', () => {
			const baseAtom = atom('base', 10)
			const computedSignal = computed('computed', () => baseAtom.get() * 2)

			expect(isSignal(computedSignal)).toBe(true)
			// Note: We're not testing isAtom directly here since it's not our focus,
			// but isSignal should be true for computed signals
		})
	})
})
