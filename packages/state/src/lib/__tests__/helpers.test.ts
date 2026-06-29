import { describe, expect, it, vi } from 'vitest'
import { ArraySet } from '../ArraySet'
import { atom } from '../Atom'
import { reactor } from '../EffectScheduler'
import { attach, detach, equals, hasReactors, haveParentsChanged, singleton } from '../helpers'
import { getGlobalEpoch } from '../transactions'
import { Child } from '../types'

// Unit tests for the internal helpers behind SPEC.md rules EQ1/EQ2 (equals),
// CAP7 (attach/detach), and G2 (singleton).

const makeChild = (): Child => ({
	parents: [],
	parentEpochs: [],
	parentSet: new ArraySet(),
	name: 'test-child',
	lastTraversedEpoch: 0,
	isActivelyListening: true,
	__debug_ancestor_epochs__: null,
})

describe('helpers', () => {
	describe('haveParentsChanged', () => {
		it('returns false when no parents exist', () => {
			expect(haveParentsChanged(makeChild())).toBe(false)
		})

		it('returns true when parent epoch has changed', () => {
			const parentAtom = atom('parent', 1)
			const oldEpoch = parentAtom.lastChangedEpoch

			const child = makeChild()
			child.parents.push(parentAtom)
			child.parentEpochs.push(oldEpoch)

			// Change the parent, which should update its epoch
			parentAtom.set(2)

			expect(haveParentsChanged(child)).toBe(true)
		})

		it('does not read a parent whose changed epoch is already known', () => {
			const parentAtom = atom('parent', 1)
			const oldEpoch = parentAtom.lastChangedEpoch

			const child = makeChild()
			child.parents.push(parentAtom)
			child.parentEpochs.push(oldEpoch)

			parentAtom.set(2)
			const getWithoutCapture = vi.spyOn(parentAtom, '__unsafe__getWithoutCapture')

			expect(haveParentsChanged(child, getGlobalEpoch())).toBe(true)
			expect(getWithoutCapture).not.toHaveBeenCalled()
		})

		it('returns true when any parent has changed among multiple parents', () => {
			const parent1 = atom('parent1', 1)
			const parent2 = atom('parent2', 2)

			const child = makeChild()
			child.parents.push(parent1, parent2)
			child.parentEpochs.push(parent1.lastChangedEpoch, parent2.lastChangedEpoch)

			// Change only the second parent
			parent2.set(3)

			expect(haveParentsChanged(child)).toBe(true)
		})

		it('reuses the parent check result for a child within the same global epoch', () => {
			const parent = atom('parent', 1)
			const getWithoutCapture = vi.spyOn(parent, '__unsafe__getWithoutCapture')

			const child = makeChild()
			child.parents.push(parent)
			child.parentEpochs.push(parent.lastChangedEpoch)

			const epoch = getGlobalEpoch()
			expect(haveParentsChanged(child, epoch)).toBe(false)
			expect(haveParentsChanged(child, epoch)).toBe(false)

			expect(getWithoutCapture).toHaveBeenCalledTimes(1)
		})
	})

	describe('detach [CAP7]', () => {
		it('removes child from parent children when attached', () => {
			const parent = atom('parent', 1)
			const child = makeChild()

			parent.children.add(child)
			expect(parent.children.size()).toBe(1)

			detach(parent, child)

			expect(parent.children.size()).toBe(0)
		})
	})

	describe('attach [CAP7]', () => {
		it('adds child to parent children when not already attached', () => {
			const parent = atom('parent', 1)
			const child = makeChild()

			expect(parent.children.size()).toBe(0)

			attach(parent, child)

			expect(parent.children.size()).toBe(1)
			expect(Array.from(parent.children)).toContain(child)
		})
	})

	describe('equals [EQ1, EQ2]', () => {
		it('[EQ1] returns true for identical references and Object.is cases', () => {
			const obj = { a: 1 }
			expect(equals(obj, obj)).toBe(true)
			expect(equals(1, 1)).toBe(true)
			expect(equals(NaN, NaN)).toBe(true)
		})

		it('[EQ1] returns false for different values', () => {
			expect(equals(1, 2)).toBe(false)
			expect(equals({ id: 1 }, { id: 1 })).toBe(false)
		})

		it('[EQ1] uses the first value’s custom equals method when available', () => {
			const obj1 = {
				id: 1,
				equals: (other: any) => other && other.id === 1,
			}
			const obj2 = { id: 1, name: 'test' }

			expect(equals(obj1, obj2)).toBe(true)
		})

		it('[EQ2] does not consult the second value’s equals method', () => {
			const obj1 = { id: 1 }
			const obj2 = { id: 1, equals: () => true }

			expect(equals(obj1, obj2)).toBe(false)
		})
	})

	describe('singleton [G2]', () => {
		it('returns the same instance on subsequent calls with the same key', () => {
			const init = vi.fn(() => ({ value: 42 }))

			const instance1 = singleton('test-singleton', init)
			const instance2 = singleton('test-singleton', init)

			expect(init).toHaveBeenCalledTimes(1)
			expect(instance1).toBe(instance2)
		})

		it('stores the instance on globalThis so duplicate module copies share it', () => {
			const instance = singleton('test-singleton-global', () => ({ value: 1 }))

			expect((globalThis as any)[Symbol.for('com.tldraw.state/test-singleton-global')]).toBe(
				instance
			)
		})
	})

	describe('hasReactors', () => {
		it('returns false when signal has no actively listening children', () => {
			const signal = atom('test', 1)
			expect(hasReactors(signal)).toBe(false)
		})

		it('integrates correctly with real reactive signals', () => {
			const baseAtom = atom('base', 1)
			expect(hasReactors(baseAtom)).toBe(false)

			const reactorInstance = reactor('test-reactor', () => {
				baseAtom.get()
			})

			reactorInstance.start()
			expect(hasReactors(baseAtom)).toBe(true)

			reactorInstance.stop()
			expect(hasReactors(baseAtom)).toBe(false)
		})
	})
})
