import { describe, expect, it, vi } from 'vitest'
import { ArraySet } from '../ArraySet'
import { atom } from '../Atom'
import { reactor } from '../EffectScheduler'
import { attach, detach, equals, hasReactors, haveParentsChanged, singleton } from '../helpers'
import { Child } from '../types'

describe('helpers', () => {
	describe('haveParentsChanged', () => {
		it('returns false when no parents exist', () => {
			const child: Child = {
				parents: [],
				parentEpochs: [],
				parentSet: new ArraySet(),
				name: 'test-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			expect(haveParentsChanged(child)).toBe(false)
		})

		it('returns true when parent epoch has changed', () => {
			const parentAtom = atom('parent', 1)
			const oldEpoch = parentAtom.lastChangedEpoch

			const child: Child = {
				parents: [parentAtom],
				parentEpochs: [oldEpoch],
				parentSet: new ArraySet(),
				name: 'test-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			// Change the parent, which should update its epoch
			parentAtom.set(2)

			expect(haveParentsChanged(child)).toBe(true)
		})

		it('returns true when any parent has changed among multiple parents', () => {
			const parent1 = atom('parent1', 1)
			const parent2 = atom('parent2', 2)
			const oldEpoch1 = parent1.lastChangedEpoch
			const oldEpoch2 = parent2.lastChangedEpoch

			const child: Child = {
				parents: [parent1, parent2],
				parentEpochs: [oldEpoch1, oldEpoch2],
				parentSet: new ArraySet(),
				name: 'test-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			// Change only the second parent
			parent2.set(3)

			expect(haveParentsChanged(child)).toBe(true)
		})
	})

	describe('detach', () => {
		it('removes child from parent children when attached', () => {
			const parent = atom('parent', 1)
			const child: Child = {
				parents: [],
				parentEpochs: [],
				parentSet: new ArraySet(),
				name: 'test-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			parent.children.add(child)
			expect(parent.children.size()).toBe(1)

			detach(parent, child)

			expect(parent.children.size()).toBe(0)
		})
	})

	describe('attach', () => {
		it('adds child to parent children when not already attached', () => {
			const parent = atom('parent', 1)
			const child: Child = {
				parents: [],
				parentEpochs: [],
				parentSet: new ArraySet(),
				name: 'test-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			expect(parent.children.size()).toBe(0)

			attach(parent, child)

			expect(parent.children.size()).toBe(1)
			expect(Array.from(parent.children)).toContain(child)
		})
	})

	describe('equals', () => {
		it('returns true for identical references and Object.is cases', () => {
			const obj = { a: 1 }
			expect(equals(obj, obj)).toBe(true)
			expect(equals(1, 1)).toBe(true)
			expect(equals(NaN, NaN)).toBe(true)
		})

		it('returns false for different values', () => {
			expect(equals(1, 2)).toBe(false)
			expect(equals({ id: 1 }, { id: 1 })).toBe(false)
		})

		it('uses custom equals method when available', () => {
			const obj1 = {
				id: 1,
				equals: (other: any) => other && other.id === 1,
			}
			const obj2 = { id: 1, name: 'test' }

			expect(equals(obj1, obj2)).toBe(true)
		})
	})

	describe('singleton', () => {
		it('returns same instance on subsequent calls with same key', () => {
			const init = vi.fn(() => ({ value: 42 }))

			const instance1 = singleton('test-singleton', init)
			const instance2 = singleton('test-singleton', init)

			expect(init).toHaveBeenCalledTimes(1)
			expect(instance1).toBe(instance2)
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
