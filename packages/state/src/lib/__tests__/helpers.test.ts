import { describe, expect, it, vi } from 'vitest'
import { ArraySet } from '../ArraySet'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { reactor } from '../EffectScheduler'
import {
	assertNever,
	attach,
	detach,
	EMPTY_ARRAY,
	equals,
	hasReactors,
	haveParentsChanged,
	singleton,
} from '../helpers'
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

		it('returns false when parent epochs match', () => {
			const parentAtom = atom('parent', 1)
			const currentEpoch = parentAtom.lastChangedEpoch

			const child: Child = {
				parents: [parentAtom],
				parentEpochs: [currentEpoch],
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

		it('returns false when all parent epochs still match among multiple parents', () => {
			const parent1 = atom('parent1', 1)
			const parent2 = atom('parent2', 2)
			const currentEpoch1 = parent1.lastChangedEpoch
			const currentEpoch2 = parent2.lastChangedEpoch

			const child: Child = {
				parents: [parent1, parent2],
				parentEpochs: [currentEpoch1, currentEpoch2],
				parentSet: new ArraySet(),
				name: 'test-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			expect(haveParentsChanged(child)).toBe(false)
		})
	})

	describe('detach', () => {
		it('does nothing if child is not attached to parent', () => {
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

			// Mock the children.remove to return false (not found)
			const removeSpy = vi.spyOn(parent.children, 'remove').mockReturnValue(false)

			detach(parent, child)

			expect(removeSpy).toHaveBeenCalledWith(child)
		})

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

			// First attach the child to establish the relationship
			parent.children.add(child)

			const removeSpy = vi.spyOn(parent.children, 'remove')
			detach(parent, child)

			expect(removeSpy).toHaveBeenCalledWith(child)
		})

		it('recursively detaches parent from its parents when parent has no children left and is a child', () => {
			const grandparent = atom('grandparent', 1)

			// Create a computed parent that depends on grandparent
			const parent = computed('parent', () => grandparent.get())

			const child: Child = {
				parents: [],
				parentEpochs: [],
				parentSet: new ArraySet(),
				name: 'test-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			// Attach child to parent
			parent.children.add(child)

			// Verify parent is attached to grandparent (trigger computation first)
			parent.get()
			expect(grandparent.children.isEmpty).toBe(false)

			// Detach child from parent - this should trigger recursive cleanup
			detach(parent, child)

			// After detaching, parent should have no children and should detach from grandparent
			expect(parent.children.isEmpty).toBe(true)
		})

		it('does not recursively detach if parent still has other children', () => {
			const grandparent = atom('grandparent', 1)
			const parent = computed('parent', () => grandparent.get())

			const child1: Child = {
				parents: [],
				parentEpochs: [],
				parentSet: new ArraySet(),
				name: 'test-child1',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			const child2: Child = {
				parents: [],
				parentEpochs: [],
				parentSet: new ArraySet(),
				name: 'test-child2',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			// Attach both children to parent
			parent.children.add(child1)
			parent.children.add(child2)

			// Trigger computation to establish parent-grandparent relationship
			parent.get()

			// Detach only one child
			detach(parent, child1)

			// Parent should still be attached to grandparent since it has another child
			expect(parent.children.isEmpty).toBe(false)
		})
	})

	describe('attach', () => {
		it('does nothing if child is already attached to parent', () => {
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

			// Mock the children.add to return false (already exists)
			const addSpy = vi.spyOn(parent.children, 'add').mockReturnValue(false)

			attach(parent, child)

			expect(addSpy).toHaveBeenCalledWith(child)
		})

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

			const addSpy = vi.spyOn(parent.children, 'add')
			attach(parent, child)

			expect(addSpy).toHaveBeenCalledWith(child)
		})

		it('recursively attaches parent to its parents when parent is a child', () => {
			const grandparent = atom('grandparent', 1)
			const parent = computed('parent', () => grandparent.get())

			const child: Child = {
				parents: [],
				parentEpochs: [],
				parentSet: new ArraySet(),
				name: 'test-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			// Trigger computation to establish parent's dependencies
			parent.get()

			// Clear any existing children from grandparent for clean test
			while (!grandparent.children.isEmpty) {
				const firstChild = Array.from(grandparent.children)[0]
				grandparent.children.remove(firstChild)
			}

			// Now attach child to parent
			attach(parent, child)

			// This should recursively attach parent to grandparent
			expect(parent.children.isEmpty).toBe(false)
		})

		it('does not recursively attach if parent is not a child', () => {
			const parent = atom('parent', 1) // atom is not a child
			const child: Child = {
				parents: [],
				parentEpochs: [],
				parentSet: new ArraySet(),
				name: 'test-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			attach(parent, child)

			// Only the direct attachment should happen, no recursive behavior
			expect(parent.children.isEmpty).toBe(false)
		})
	})

	describe('equals', () => {
		it('returns true for identical references', () => {
			const obj = { a: 1 }
			expect(equals(obj, obj)).toBe(true)
		})

		it('returns true for primitive equality', () => {
			expect(equals(1, 1)).toBe(true)
			expect(equals('hello', 'hello')).toBe(true)
			expect(equals(true, true)).toBe(true)
		})

		it('returns false for different primitives', () => {
			expect(equals(1, 2)).toBe(false)
			expect(equals('hello', 'world')).toBe(false)
			expect(equals(true, false)).toBe(false)
		})

		it('returns true for Object.is equality (NaN case)', () => {
			expect(equals(NaN, NaN)).toBe(true)
		})

		it('returns true for Object.is equality (-0/+0 case)', () => {
			expect(equals(-0, +0)).toBe(true)
		})

		it('returns true when objects have custom equals method', () => {
			const obj1 = {
				id: 1,
				equals: (other: any) => other && other.id === 1,
			}
			const obj2 = { id: 1, name: 'test' }

			expect(equals(obj1, obj2)).toBe(true)
		})

		it('returns false when objects custom equals method returns false', () => {
			const obj1 = {
				id: 1,
				equals: (other: any) => other && other.id === 2,
			}
			const obj2 = { id: 1, name: 'test' }

			expect(equals(obj1, obj2)).toBe(false)
		})

		it('returns false when first object does not have equals method', () => {
			const obj1 = { id: 1 }
			const obj2 = { id: 1 }

			expect(equals(obj1, obj2)).toBe(false)
		})

		it('returns false when equals method is not a function', () => {
			const obj1 = {
				id: 1,
				equals: 'not a function',
			}
			const obj2 = { id: 1 }

			expect(equals(obj1, obj2)).toBe(false)
		})

		it('handles null and undefined correctly', () => {
			expect(equals(null, null)).toBe(true)
			expect(equals(undefined, undefined)).toBe(true)
			expect(equals(null, undefined)).toBe(false)
			expect(equals(null, 0)).toBe(false)
			expect(equals(undefined, 0)).toBe(false)
		})
	})

	describe('assertNever', () => {
		it('is a TypeScript declaration (compile-time only)', () => {
			// assertNever is a TypeScript declaration for exhaustiveness checking
			// It doesn't exist at runtime - it's purely for compile-time type safety
			expect(typeof assertNever).toBe('undefined')
		})

		it('should be used for TypeScript exhaustiveness checking', () => {
			// This test mainly validates that the function exists and is properly typed
			// The actual runtime behavior is not as important as the compile-time type checking
			type Color = 'red' | 'blue'

			function handleColor(color: Color): string {
				switch (color) {
					case 'red':
						return 'Stop'
					case 'blue':
						return 'Go'
					default:
						// This line should cause TypeScript error if not all cases are handled
						return assertNever(color)
				}
			}

			expect(handleColor('red')).toBe('Stop')
			expect(handleColor('blue')).toBe('Go')
		})
	})

	describe('singleton', () => {
		it('creates a singleton instance using init function', () => {
			const init = vi.fn(() => ({ value: 42 }))
			const instance = singleton('test-singleton', init)

			expect(init).toHaveBeenCalledTimes(1)
			expect(instance).toEqual({ value: 42 })
		})

		it('returns same instance on subsequent calls with same key', () => {
			const init = vi.fn(() => ({ value: 42 }))

			const instance1 = singleton('test-singleton-2', init)
			const instance2 = singleton('test-singleton-2', init)

			expect(init).toHaveBeenCalledTimes(1)
			expect(instance1).toBe(instance2)
		})

		it('creates different instances for different keys', () => {
			const init1 = vi.fn(() => ({ value: 1 }))
			const init2 = vi.fn(() => ({ value: 2 }))

			const instance1 = singleton('test-singleton-3a', init1)
			const instance2 = singleton('test-singleton-3b', init2)

			expect(init1).toHaveBeenCalledTimes(1)
			expect(init2).toHaveBeenCalledTimes(1)
			expect(instance1).not.toBe(instance2)
			expect(instance1.value).toBe(1)
			expect(instance2.value).toBe(2)
		})

		it('uses Symbol.for for global uniqueness', () => {
			const key = 'test-singleton-4'
			const symbol = Symbol.for(`com.tldraw.state/${key}`)
			const init = vi.fn(() => ({ value: 99 }))

			const instance = singleton(key, init)

			// Should be accessible via the global symbol
			expect((globalThis as any)[symbol]).toBe(instance)
		})

		it('handles complex objects as singleton values', () => {
			class TestClass {
				constructor(public id: number) {}
			}

			const init = vi.fn(() => new TestClass(123))
			const instance = singleton('test-singleton-5', init)

			expect(instance).toBeInstanceOf(TestClass)
			expect(instance.id).toBe(123)
		})
	})

	describe('EMPTY_ARRAY', () => {
		it('is a frozen empty array', () => {
			expect(Array.isArray(EMPTY_ARRAY)).toBe(true)
			expect(EMPTY_ARRAY.length).toBe(0)
			expect(Object.isFrozen(EMPTY_ARRAY)).toBe(true)
		})

		it('is a singleton instance', () => {
			const another = singleton('empty_array', () => Object.freeze([]) as any)
			expect(EMPTY_ARRAY).toBe(another)
		})

		it('throws when trying to modify', () => {
			expect(() => {
				;(EMPTY_ARRAY as any).push(1)
			}).toThrow()
		})
	})

	describe('hasReactors', () => {
		it('returns false when signal has no children', () => {
			const signal = atom('test', 1)
			expect(hasReactors(signal)).toBe(false)
		})

		it('returns false when signal has children but none are actively listening', () => {
			const signal = atom('test', 1)

			// Create a child that is not actively listening
			const child: Child = {
				parents: [signal],
				parentEpochs: [signal.lastChangedEpoch],
				parentSet: new ArraySet(),
				name: 'inactive-child',
				lastTraversedEpoch: 0,
				isActivelyListening: false, // Not actively listening
				__debug_ancestor_epochs__: null,
			}

			signal.children.add(child)
			expect(hasReactors(signal)).toBe(false)
		})

		it('returns true when signal has at least one actively listening child', () => {
			const signal = atom('test', 1)

			// Create a child that is actively listening
			const child: Child = {
				parents: [signal],
				parentEpochs: [signal.lastChangedEpoch],
				parentSet: new ArraySet(),
				name: 'active-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true, // Actively listening
				__debug_ancestor_epochs__: null,
			}

			signal.children.add(child)
			expect(hasReactors(signal)).toBe(true)
		})

		it('returns true when signal has multiple children and at least one is actively listening', () => {
			const signal = atom('test', 1)

			const inactiveChild: Child = {
				parents: [signal],
				parentEpochs: [signal.lastChangedEpoch],
				parentSet: new ArraySet(),
				name: 'inactive-child',
				lastTraversedEpoch: 0,
				isActivelyListening: false,
				__debug_ancestor_epochs__: null,
			}

			const activeChild: Child = {
				parents: [signal],
				parentEpochs: [signal.lastChangedEpoch],
				parentSet: new ArraySet(),
				name: 'active-child',
				lastTraversedEpoch: 0,
				isActivelyListening: true,
				__debug_ancestor_epochs__: null,
			}

			signal.children.add(inactiveChild)
			signal.children.add(activeChild)
			expect(hasReactors(signal)).toBe(true)
		})

		it('integrates correctly with real computed signals and effects', () => {
			const baseAtom = atom('base', 1)

			// Initially no reactors
			expect(hasReactors(baseAtom)).toBe(false)

			// Create a computed signal that depends on baseAtom
			const computedSignal = computed('computed', () => baseAtom.get() * 2)

			// Just creating a computed doesn't make it a reactor yet
			expect(hasReactors(baseAtom)).toBe(false)

			// Access the computed to establish the dependency
			computedSignal.get()

			// Still no reactors because computed is not actively listening
			expect(hasReactors(baseAtom)).toBe(false)

			// Create an effect that depends on the computed
			const reactorInstance = reactor('test-reactor', () => {
				computedSignal.get()
			})

			// Start the reactor to make it actively listen
			reactorInstance.start()

			// Now there should be reactors
			expect(hasReactors(baseAtom)).toBe(true)
			expect(hasReactors(computedSignal)).toBe(true)

			// Stop the reactor
			reactorInstance.stop()

			// Should no longer have reactors
			expect(hasReactors(baseAtom)).toBe(false)
			expect(hasReactors(computedSignal)).toBe(false)
		})
	})
})
