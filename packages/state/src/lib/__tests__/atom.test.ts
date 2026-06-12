import { atom } from '../Atom'
import { computed } from '../Computed'
import { react } from '../EffectScheduler'
import { getGlobalEpoch } from '../transactions'

// Tests for SPEC.md §2 (the epoch clock), §3 (equality), and §4 (atoms).
// Rule IDs like [EP3] in test names refer to that document.

describe('the epoch clock (EP)', () => {
	it('[EP1] is shared by all atoms', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('a', 1)
		const b = atom('b', 1)

		a.set(2)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)

		b.set(2)
		expect(getGlobalEpoch()).toBe(startEpoch + 2)
	})

	it('[EP2] does not advance when signals are created', () => {
		const startEpoch = getGlobalEpoch()
		atom('a', 3)
		computed('c', () => 1)
		expect(getGlobalEpoch()).toBe(startEpoch)
	})

	it('[EP3] advances by exactly one when an atom is set to a new value', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('a', 3)
		a.set(4)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
	})

	it('[EP4] does not advance when an atom is set to an equal value', () => {
		const a = atom('a', 3)
		const startEpoch = getGlobalEpoch()
		a.set(3)
		expect(getGlobalEpoch()).toBe(startEpoch)
	})

	it('[EP5] is recorded on the atom as lastChangedEpoch when it changes', () => {
		const a = atom('a', 1)

		a.set(2)
		const changedEpoch = getGlobalEpoch()
		expect(a.lastChangedEpoch).toBe(changedEpoch)

		// other atoms changing does not move this atom's lastChangedEpoch
		const b = atom('b', 1)
		b.set(2)
		expect(a.lastChangedEpoch).toBe(changedEpoch)
	})
})

describe('equality (EQ)', () => {
	it('[EQ1] treats === and Object.is values as equal by default', () => {
		const value = { hello: true }
		const a = atom('a', value)
		const startEpoch = getGlobalEpoch()

		a.set(value)
		expect(getGlobalEpoch()).toBe(startEpoch)

		const n = atom('n', NaN)
		n.set(NaN)
		expect(getGlobalEpoch()).toBe(startEpoch)
	})

	it('[EQ1] consults the old value’s equals method by default', () => {
		class Box {
			constructor(public value: number) {}
			equals(other: unknown) {
				return other instanceof Box && other.value === this.value
			}
		}

		const original = new Box(1)
		const a = atom('a', original)

		a.set(new Box(1))
		expect(a.get()).toBe(original)

		const different = new Box(2)
		a.set(different)
		expect(a.get()).toBe(different)
	})

	it('[EQ2] does not consult the new value’s equals method', () => {
		const oldValue = { x: 1 }
		const newValue = { x: 1, equals: () => true }

		const a = atom('a', oldValue)
		a.set(newValue)

		expect(a.get()).toBe(newValue)
	})

	it('[EQ3] uses a custom isEqual instead of default equality when provided', () => {
		const foo = { hello: true }
		const bar = { hello: true }

		const a = atom('a', foo)

		a.set(bar)

		expect(a.get()).toBe(bar)

		const b = atom('b', foo, { isEqual: (a, b) => a.hello === b.hello })

		b.set(bar)

		expect(b.get()).toBe(foo)
	})

	it('[EQ4] makes setting an equal value a complete no-op', () => {
		const initial = { x: 1 }
		const a = atom('a', initial, {
			isEqual: (a, b) => a.x === b.x,
			historyLength: 5,
			computeDiff: () => 'diff',
		})

		const effect = vi.fn(() => {
			a.get()
		})
		const stop = react('r', effect)
		expect(effect).toHaveBeenCalledTimes(1)

		const startEpoch = getGlobalEpoch()
		const lastChanged = a.lastChangedEpoch

		a.set({ x: 1 })

		expect(getGlobalEpoch()).toBe(startEpoch)
		expect(a.lastChangedEpoch).toBe(lastChanged)
		expect(a.get()).toBe(initial)
		expect(a.getDiffSince(startEpoch)).toEqual([])
		expect(effect).toHaveBeenCalledTimes(1)

		stop()
	})
})

describe('atoms (A)', () => {
	it('[A1] contain data', () => {
		const a = atom('', 1)

		expect(a.get()).toBe(1)
	})

	it('[A2] can be updated with set', () => {
		const a = atom('', 1)

		a.set(2)

		expect(a.get()).toBe(2)
	})

	it('[A3] set returns the value of the atom after the call', () => {
		const a = atom('', 1)

		expect(a.set(2)).toBe(2)
		// setting an equal value returns the unchanged current value
		expect(a.set(2)).toBe(2)
	})

	it('[A4] update(fn) sets the atom to fn(currentValue)', () => {
		const startEpoch = getGlobalEpoch()
		const a = atom('', 1)

		a.update((value) => value + 1)

		expect(a.get()).toBe(2)
		expect(getGlobalEpoch()).toBe(startEpoch + 1)
	})

	it('[A5] __unsafe__getWithoutCapture returns the value without capturing a dependency', () => {
		const a = atom('a', 1)
		const effect = vi.fn(() => {
			a.__unsafe__getWithoutCapture()
		})
		const stop = react('r', effect)

		expect(effect).toHaveBeenCalledTimes(1)

		a.set(2)

		expect(effect).toHaveBeenCalledTimes(1)
		stop()
	})

	it('[A6] are independent of each other', () => {
		const a = atom('a', 1)
		const b = atom('b', 10)

		a.set(2)

		expect(b.get()).toBe(10)
		expect(b.lastChangedEpoch).toBeLessThan(a.lastChangedEpoch)
	})
})
