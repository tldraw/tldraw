import { atom, isAtom } from '../Atom'
import { computed } from '../Computed'
import { reactor } from '../EffectScheduler'
import { getGlobalEpoch, transact, transaction } from '../transactions'
import { RESET_VALUE } from '../types'

describe('atoms', () => {
	it('contain data', () => {
		const a = atom('', 1)

		expect(a.get()).toBe(1)
	})
	it('can be updated', () => {
		const a = atom('', 1)

		a.set(2)

		expect(a.get()).toBe(2)
	})
	it('will not advance the global epoch on creation', () => {
		const startEpoch = getGlobalEpoch()
		atom('', 3)
		expect(getGlobalEpoch()).toBe(startEpoch)
	})
	it('will advance the global epoch on .set', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('', 3)
		a.set(4)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
	})
	it('can store history', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = getGlobalEpoch()

		expect(a.getDiffSince(startEpoch)).toEqual([])

		a.set(5)

		expect(a.getDiffSince(startEpoch)).toEqual([+4])

		a.set(10)

		expect(a.getDiffSince(startEpoch)).toEqual([+4, +5])

		a.set(20)

		expect(a.getDiffSince(startEpoch)).toEqual([+4, +5, +10])

		a.set(30)

		// will be RESET_VALUE because we don't have enough history
		expect(a.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})
	it('has history independent of other atoms', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })
		const b = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = getGlobalEpoch()

		b.set(-5)
		b.set(-10)
		b.set(-20)
		expect(b.getDiffSince(startEpoch)).toEqual([-6, -5, -10])
		expect(b.getDiffSince(getGlobalEpoch())).toEqual([])

		expect(a.getDiffSince(startEpoch)).toEqual([])
		a.set(5)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])
		expect(b.getDiffSince(startEpoch)).toEqual([-6, -5, -10])
		expect(b.getDiffSince(getGlobalEpoch())).toEqual([])
	})
	it('still updates history during transactions', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = getGlobalEpoch()

		transact(() => {
			expect(a.getDiffSince(startEpoch)).toEqual([])

			a.set(5)

			expect(a.getDiffSince(startEpoch)).toEqual([+4])

			a.set(10)

			expect(a.getDiffSince(startEpoch)).toEqual([+4, +5])

			a.set(20)

			expect(a.getDiffSince(startEpoch)).toEqual([+4, +5, +10])
		})

		expect(a.getDiffSince(startEpoch)).toEqual([+4, +5, +10])
	})
	it('will clear the history if the transaction aborts', () => {
		const a = atom('', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		const startEpoch = getGlobalEpoch()

		transaction((rollback) => {
			expect(a.getDiffSince(startEpoch)).toEqual([])

			a.set(5)

			expect(a.getDiffSince(startEpoch)).toEqual([+4])

			rollback()
		})

		expect(a.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})
	it('supports an update operation', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('', 1)

		a.update((value) => value + 1)

		expect(a.get()).toBe(2)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
	})
	it('supports passing diffs in .set', () => {
		const a = atom('', 1, { historyLength: 3 })

		const startEpoch = getGlobalEpoch()

		a.set(5, +4)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])

		a.set(6, +1)
		expect(a.getDiffSince(startEpoch)).toEqual([+4, +1])
	})
	it('does not push history if nothing changed', () => {
		const a = atom('', 1, { historyLength: 3 })

		const startEpoch = getGlobalEpoch()

		a.set(5, +4)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])
		a.set(5, +4)
		expect(a.getDiffSince(startEpoch)).toEqual([+4])
	})
	it('clears the history buffer if you fail to provide a diff', () => {
		const a = atom('', 1, { historyLength: 3 })
		const startEpoch = getGlobalEpoch()

		a.set(5, +4)

		expect(a.getDiffSince(startEpoch)).toEqual([+4])

		a.set(6)

		expect(a.getDiffSince(startEpoch)).toEqual(RESET_VALUE)
	})
})

describe('reacting to atoms', () => {
	it('should work', async () => {
		const a = atom('', 234)

		let val = 0
		const r = reactor('', () => {
			val = a.get()
		})

		expect(val).toBe(0)

		r.start()

		expect(val).toBe(234)

		a.set(939)

		expect(val).toBe(939)

		r.stop()

		a.set(2342)

		expect(val).toBe(939)
		expect(a.get()).toBe(2342)
	})
})

test('isEqual can provide custom equality checks', () => {
	const foo = { hello: true }
	const bar = { hello: true }

	const a = atom('a', foo)

	a.set(bar)

	expect(a.get()).toBe(bar)

	const b = atom('b', foo, { isEqual: (a, b) => a.hello === b.hello })

	b.set(bar)

	expect(b.get()).toBe(foo)
})

describe('isAtom', () => {
	it('returns true for atom instances', () => {
		const a = atom('test', 42)
		expect(isAtom(a)).toBe(true)
	})

	it('returns false for non-atom values', () => {
		expect(isAtom(42)).toBe(false)
		expect(isAtom('hello')).toBe(false)
		expect(isAtom({})).toBe(false)
		expect(isAtom([])).toBe(false)
		expect(isAtom(null)).toBe(false)
		expect(isAtom(undefined)).toBe(false)
		expect(isAtom(true)).toBe(false)
	})

	it('returns false for computed signals', () => {
		const a = atom('a', 1)
		const c = computed('c', () => a.get() * 2)
		expect(isAtom(c)).toBe(false)
	})

	it('returns false for functions', () => {
		const fn = () => 42
		expect(isAtom(fn)).toBe(false)
	})
})

describe('atom edge cases', () => {
	it('handles falsy values correctly', () => {
		const a1 = atom('zero', 0)
		const a2 = atom('false', false)
		const a3 = atom('null', null)
		const a4 = atom('undefined', undefined)
		const a5 = atom('empty string', '')

		expect(a1.get()).toBe(0)
		expect(a2.get()).toBe(false)
		expect(a3.get()).toBe(null)
		expect(a4.get()).toBe(undefined)
		expect(a5.get()).toBe('')
	})

	it('handles NaN values correctly', () => {
		const a = atom('nan', NaN)
		expect(a.get()).toBeNaN()

		// Setting the same NaN should not advance epoch
		const startEpoch = getGlobalEpoch()
		a.set(NaN)
		expect(getGlobalEpoch()).toBe(startEpoch)

		// Setting a different number should advance epoch
		a.set(42)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
		expect(a.get()).toBe(42)
	})

	it('handles -0 and +0 correctly', () => {
		const a = atom('zero', -0)
		expect(a.get()).toBe(-0)
		expect(Object.is(a.get(), -0)).toBe(true)

		// -0 === +0 is true, so atoms consider them equal and should not advance epoch
		const startEpoch = getGlobalEpoch()
		a.set(+0)
		// Should NOT advance epoch because -0 === +0 is true (first check in equals())
		expect(getGlobalEpoch()).toBe(startEpoch)
		expect(a.get()).toBe(-0) // Should keep original value
	})

	it('works with complex nested objects', () => {
		const complex = {
			array: [1, 2, { nested: true }],
			map: new Map([['key', 'value']]),
			set: new Set([1, 2, 3]),
			func: () => 'test',
		}

		const a = atom('complex', complex)
		expect(a.get()).toBe(complex)
		expect((a.get().array[2] as any).nested).toBe(true)
		expect(a.get().map.get('key')).toBe('value')
		expect(a.get().set.has(2)).toBe(true)
		expect(a.get().func()).toBe('test')
	})
})

describe('atom with custom isEqual', () => {
	it('uses custom equality for object comparison', () => {
		interface Person {
			id: number
			name: string
			age: number
		}

		const person1: Person = { id: 1, name: 'Alice', age: 25 }
		const person2: Person = { id: 1, name: 'Alice', age: 30 } // Different age, same id
		const person3: Person = { id: 2, name: 'Bob', age: 25 } // Different id

		const a = atom('person', person1, {
			isEqual: (a: Person, b: Person) => a.id === b.id,
		})

		const startEpoch = getGlobalEpoch()

		// Should not advance epoch - same ID
		a.set(person2)
		expect(getGlobalEpoch()).toBe(startEpoch)
		expect(a.get()).toBe(person1) // Should keep original

		// Should advance epoch - different ID
		a.set(person3)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
		expect(a.get()).toBe(person3)
	})

	it('handles null/undefined in custom isEqual', () => {
		const a = atom('nullable', null, {
			isEqual: (a, b) => {
				if (a === null && b === null) return true
				if (a === null || b === null) return false
				return (a as any).value === (b as any).value
			},
		})

		const startEpoch = getGlobalEpoch()

		// null to null should not advance
		a.set(null)
		expect(getGlobalEpoch()).toBe(startEpoch)

		// null to object should advance
		a.set({ value: 'test' } as any)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
	})
})

describe('__unsafe__getWithoutCapture', () => {
	it('returns current value without capturing', () => {
		const a = atom('test', 42)
		expect(a.__unsafe__getWithoutCapture()).toBe(42)

		a.set(100)
		expect(a.__unsafe__getWithoutCapture()).toBe(100)
	})

	it('ignores errors parameter', () => {
		const a = atom('test', 42)
		expect(a.__unsafe__getWithoutCapture(true)).toBe(42)
		expect(a.__unsafe__getWithoutCapture(false)).toBe(42)
	})
})

describe('atom history edge cases', () => {
	it('handles history with historyLength of 1', () => {
		const a = atom('test', 1, {
			historyLength: 1,
			computeDiff: (a, b) => b - a,
		})
		const startEpoch = getGlobalEpoch()

		a.set(2)
		expect(a.getDiffSince(startEpoch)).toEqual([1])

		a.set(3)
		// Should only keep the most recent diff
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('handles history with no computeDiff function', () => {
		const a = atom('test', 1, { historyLength: 3 }) // No computeDiff provided
		const startEpoch = getGlobalEpoch()

		a.set(2)
		// Without computeDiff, should use RESET_VALUE for diffs
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('handles computeDiff function that returns RESET_VALUE', () => {
		const a = atom('test', 1, {
			historyLength: 3,
			computeDiff: () => RESET_VALUE, // Always returns RESET_VALUE
		})
		const startEpoch = getGlobalEpoch()

		a.set(2)
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('handles manual diff provision with set', () => {
		const a = atom('test', 1, { historyLength: 3 })
		const startEpoch = getGlobalEpoch()

		// Providing diff manually should store it
		a.set(5, { type: 'increment', amount: 4 })
		expect(a.getDiffSince(startEpoch)).toEqual([{ type: 'increment', amount: 4 }])

		// Not providing diff should use RESET_VALUE
		a.set(6)
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})
})

describe('atom update method', () => {
	it('calls updater with current value', () => {
		const a = atom('test', 10)

		let capturedValue: number | undefined
		a.update((currentValue) => {
			capturedValue = currentValue
			return currentValue * 2
		})

		expect(capturedValue).toBe(10)
		expect(a.get()).toBe(20)
	})

	it('does not advance epoch if updater returns same value', () => {
		const a = atom('test', 42)
		const startEpoch = getGlobalEpoch()

		a.update((value) => value) // Return same value
		expect(getGlobalEpoch()).toBe(startEpoch)
		expect(a.get()).toBe(42)
	})

	it('handles updater that throws', () => {
		const a = atom('test', 42)
		const startEpoch = getGlobalEpoch()

		expect(() => {
			a.update(() => {
				throw new Error('Updater error')
			})
		}).toThrow('Updater error')

		// Value should remain unchanged
		expect(a.get()).toBe(42)
		// Epoch should not have advanced
		expect(getGlobalEpoch()).toBe(startEpoch)
	})

	it('works with complex updater logic', () => {
		const a = atom('array', [1, 2, 3])

		a.update((arr) => [...arr, 4])
		expect(a.get()).toEqual([1, 2, 3, 4])

		a.update((arr) => arr.filter((x) => x % 2 === 0))
		expect(a.get()).toEqual([2, 4])
	})
})

describe('atom with objects having equals method', () => {
	it('uses object.equals method for comparison', () => {
		class ValueObject {
			constructor(public value: number) {}

			equals(other: ValueObject): boolean {
				return this.value === other.value
			}
		}

		const obj1 = new ValueObject(42)
		const obj2 = new ValueObject(42) // Same value, different instance
		const obj3 = new ValueObject(100) // Different value

		const a = atom('value-object', obj1)
		const startEpoch = getGlobalEpoch()

		// Should not advance epoch - same value via equals method
		a.set(obj2)
		expect(getGlobalEpoch()).toBe(startEpoch)
		expect(a.get()).toBe(obj1) // Should keep original

		// Should advance epoch - different value
		a.set(obj3)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
		expect(a.get()).toBe(obj3)
	})

	it('handles asymmetric equals method', () => {
		class AsymmetricObject {
			constructor(
				public value: number,
				public acceptsAll: boolean = false
			) {}

			equals(other: AsymmetricObject): boolean {
				if (this.acceptsAll) return true
				return this.value === other.value
			}
		}

		const obj1 = new AsymmetricObject(42, true) // Accepts all
		const obj2 = new AsymmetricObject(100)

		const a = atom('asymmetric', obj1)
		const startEpoch = getGlobalEpoch()

		// Should not advance epoch - obj1.equals(obj2) returns true
		a.set(obj2)
		expect(getGlobalEpoch()).toBe(startEpoch)
		expect(a.get()).toBe(obj1) // Should keep original
	})
})

describe('atom initialization', () => {
	it('creates atom with just name and value', () => {
		const a = atom('simple', 42)
		expect(a.name).toBe('simple')
		expect(a.get()).toBe(42)
	})

	it('creates atom with empty options', () => {
		const a = atom('empty-options', 42, {})
		expect(a.get()).toBe(42)
	})

	it('creates atom with only historyLength option', () => {
		const a = atom('history-only', 42, { historyLength: 5 })
		expect(a.get()).toBe(42)
		// Should have empty history initially
		expect(a.getDiffSince(getGlobalEpoch())).toEqual([])
	})

	it('creates atom with only computeDiff option', () => {
		const a = atom('diff-only', 42, { computeDiff: (a, b) => b - a })
		expect(a.get()).toBe(42)
		// Without historyLength, computeDiff should not be used
		const startEpoch = getGlobalEpoch()
		a.set(50)
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})

	it('creates atom with only isEqual option', () => {
		const a = atom(
			'equal-only',
			{ value: 42 },
			{
				isEqual: (a, b) => a.value === b.value,
			}
		)
		expect(a.get().value).toBe(42)

		const startEpoch = getGlobalEpoch()
		a.set({ value: 42 }) // Same value, different object
		expect(getGlobalEpoch()).toBe(startEpoch) // Should not advance
	})
})

describe('atom getDiffSince', () => {
	it('returns empty array when no changes since epoch', () => {
		const a = atom('test', 1, { historyLength: 3, computeDiff: (a, b) => b - a })
		const currentEpoch = getGlobalEpoch()

		// No changes since current epoch
		expect(a.getDiffSince(currentEpoch)).toEqual([])

		// No changes since future epoch
		expect(a.getDiffSince(currentEpoch + 1000)).toEqual([])
	})

	it('handles epoch exactly at lastChangedEpoch', () => {
		const a = atom('test', 1, { historyLength: 3, computeDiff: (a, b) => b - a })

		a.set(2)
		const changeEpoch = a.lastChangedEpoch

		// Requesting diffs from exactly when it changed should return empty
		expect(a.getDiffSince(changeEpoch)).toEqual([])

		// But from before the change should include the diff
		expect(a.getDiffSince(changeEpoch - 1)).toEqual([1])
	})

	it('works with atoms that have no history buffer', () => {
		const a = atom('no-history', 1) // No historyLength
		const startEpoch = getGlobalEpoch()

		a.set(2)
		expect(a.getDiffSince(startEpoch)).toBe(RESET_VALUE)
	})
})

describe('atom name property', () => {
	it('stores and exposes the name correctly', () => {
		const a = atom('my-test-atom', 42)
		expect(a.name).toBe('my-test-atom')
	})

	it('handles empty string name', () => {
		const a = atom('', 42)
		expect(a.name).toBe('')
	})

	it('handles special characters in name', () => {
		const a = atom('test-atom_123!@#$%', 42)
		expect(a.name).toBe('test-atom_123!@#$%')
	})
})

describe('atom type safety', () => {
	it('maintains type safety with complex types', () => {
		interface ComplexType {
			id: string
			data: number[]
			metadata: { [key: string]: any }
		}

		const initial: ComplexType = {
			id: 'test',
			data: [1, 2, 3],
			metadata: { foo: 'bar' },
		}

		const a = atom('complex', initial)

		// Should maintain type information
		expect(a.get().id).toBe('test')
		expect(a.get().data).toEqual([1, 2, 3])
		expect(a.get().metadata.foo).toBe('bar')

		// Update with new value of same type
		const updated: ComplexType = {
			id: 'updated',
			data: [4, 5, 6],
			metadata: { baz: 'qux' },
		}

		a.set(updated)
		expect(a.get()).toBe(updated)
	})
})

describe('atom with unusual values', () => {
	it('handles Symbol values', () => {
		const sym1 = Symbol('test1')
		const sym2 = Symbol('test2')

		const a = atom('symbol', sym1)
		expect(a.get()).toBe(sym1)

		const startEpoch = getGlobalEpoch()
		a.set(sym2 as any)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
		expect(a.get()).toBe(sym2)
	})

	it('handles BigInt values', () => {
		const big1 = BigInt(123456789012345678901234567890n)
		const big2 = BigInt(987654321098765432109876543210n)

		const a = atom('bigint', big1)
		expect(a.get()).toBe(big1)

		const startEpoch = getGlobalEpoch()
		a.set(big1) // Same value
		expect(getGlobalEpoch()).toBe(startEpoch)

		a.set(big2) // Different value
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
		expect(a.get()).toBe(big2)
	})

	it('handles Date objects', () => {
		const date1 = new Date('2023-01-01')
		const date2 = new Date('2023-01-01') // Same time, different object
		const date3 = new Date('2023-12-31') // Different time

		const a = atom('date', date1)
		expect(a.get()).toBe(date1)

		const startEpoch = getGlobalEpoch()
		a.set(date2) // Different object, should advance epoch
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
		expect(a.get()).toBe(date2)

		a.set(date3)
		expect(getGlobalEpoch()).toBe(startEpoch + 2)
		expect(a.get()).toBe(date3)
	})

	it('handles RegExp objects', () => {
		const regex1 = /test/g
		const regex2 = /test/g // Same pattern, different object

		const a = atom('regex', regex1)
		expect(a.get()).toBe(regex1)

		const startEpoch = getGlobalEpoch()
		a.set(regex2) // Different object, should advance epoch
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
		expect(a.get()).toBe(regex2)
	})
})
