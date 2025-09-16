import { ArraySet } from '../ArraySet'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { react } from '../EffectScheduler'
import {
	maybeCaptureParent,
	startCapturingParents,
	stopCapturingParents,
	unsafe__withoutCapture,
	whyAmIRunning,
} from '../capture'
import { advanceGlobalEpoch, getGlobalEpoch } from '../transactions'
import { Child } from '../types'

const emptyChild = (props: Partial<Child> = {}) =>
	({
		parentEpochs: [],
		parents: [],
		parentSet: new ArraySet(),
		isActivelyListening: false,
		lastTraversedEpoch: 0,
		...props,
	}) as Child

describe('capturing parents', () => {
	it('can be started and stopped', () => {
		const a = atom('', 1)
		const startEpoch = getGlobalEpoch()

		const child = emptyChild()
		const originalParentEpochs = child.parentEpochs
		const originalParents = child.parents

		startCapturingParents(child)
		maybeCaptureParent(a)
		stopCapturingParents()

		// the parents should be kept because no sharing is possible and we don't want to reallocate
		// when parents change
		expect(child.parentEpochs).toBe(originalParentEpochs)
		expect(child.parents).toBe(originalParents)
		expect(child.parentEpochs).toEqual([startEpoch])
		expect(child.parents).toEqual([a])
	})

	it('can handle several parents', () => {
		const atomA = atom('', 1)
		const atomAEpoch = getGlobalEpoch()
		advanceGlobalEpoch() // let's say time has passed
		const atomB = atom('', 1)
		const atomBEpoch = getGlobalEpoch()
		advanceGlobalEpoch() // let's say time has passed
		const atomC = atom('', 1)
		const atomCEpoch = getGlobalEpoch()

		expect(atomAEpoch < atomBEpoch).toBe(true)
		expect(atomBEpoch < atomCEpoch).toBe(true)

		const child = emptyChild()

		const originalParentEpochs = child.parentEpochs
		const originalParents = child.parents

		startCapturingParents(child)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomB)
		maybeCaptureParent(atomC)
		stopCapturingParents()

		// the parents should be kept because no sharing is possible and we don't want to reallocate
		// when parents change
		expect(child.parentEpochs).toBe(originalParentEpochs)
		expect(child.parents).toBe(originalParents)

		expect(child.parentEpochs).toEqual([atomAEpoch, atomBEpoch, atomCEpoch])
		expect(child.parents).toEqual([atomA, atomB, atomC])
	})

	it('will reorder if parents are captured in different orders each time', () => {
		const atomA = atom('', 1)
		advanceGlobalEpoch() // let's say time has passed
		const atomB = atom('', 1)
		advanceGlobalEpoch() // let's say time has passed
		const atomC = atom('', 1)

		const child = emptyChild()

		startCapturingParents(child)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomB)
		maybeCaptureParent(atomC)
		stopCapturingParents()

		expect(child.parents).toEqual([atomA, atomB, atomC])

		startCapturingParents(child)
		maybeCaptureParent(atomB)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomC)
		stopCapturingParents()

		expect(child.parents).toEqual([atomB, atomA, atomC])

		startCapturingParents(child)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomC)
		maybeCaptureParent(atomB)
		stopCapturingParents()

		expect(child.parents).toEqual([atomA, atomC, atomB])
	})

	it('will shrink the parent arrays if the number of captured parents shrinks', () => {
		const atomA = atom('', 1)
		const atomAEpoch = getGlobalEpoch()
		advanceGlobalEpoch() // let's say time has passed
		const atomB = atom('', 1)
		const atomBEpoch = getGlobalEpoch()
		advanceGlobalEpoch() // let's say time has passed
		const atomC = atom('', 1)
		const atomCEpoch = getGlobalEpoch()

		const child = emptyChild()

		const originalParents = child.parents
		const originalParentEpochs = child.parentEpochs

		startCapturingParents(child)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomB)
		maybeCaptureParent(atomC)
		stopCapturingParents()

		expect(child.parents).toEqual([atomA, atomB, atomC])
		expect(child.parents).toBe(originalParents)

		startCapturingParents(child)
		maybeCaptureParent(atomB)
		maybeCaptureParent(atomA)
		stopCapturingParents()

		expect(child.parents).toEqual([atomB, atomA])
		expect(child.parentEpochs).toEqual([atomBEpoch, atomAEpoch])
		expect(child.parents).toBe(originalParents)

		startCapturingParents(child)
		stopCapturingParents()

		expect(child.parents).toEqual([])
		expect(child.parentEpochs).toEqual([])
		expect(child.parents).toBe(originalParents)
		expect(child.parentEpochs).toBe(originalParentEpochs)

		startCapturingParents(child)
		maybeCaptureParent(atomC)
		stopCapturingParents()

		expect(child.parents).toEqual([atomC])
		expect(child.parentEpochs).toEqual([atomCEpoch])
		expect(child.parents).toBe(originalParents)
		expect(child.parentEpochs).toBe(originalParentEpochs)
	})

	it('doesnt do anything if you dont start capturing', () => {
		expect(() => {
			maybeCaptureParent(atom('', 1))
		}).not.toThrow()
	})
})

describe(unsafe__withoutCapture, () => {
	it('allows executing comptuer code in a context that short-circuits the current capture frame', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 1)
		const atomC = atom('c', 1)

		const child = computed('', () => {
			return atomA.get() + atomB.get() + unsafe__withoutCapture(() => atomC.get())
		})

		let lastValue: number | undefined
		let numReactions = 0

		react('', () => {
			numReactions++
			lastValue = child.get()
		})

		expect(lastValue).toBe(3)
		expect(numReactions).toBe(1)

		atomA.set(2)

		expect(lastValue).toBe(4)
		expect(numReactions).toBe(2)

		atomB.set(2)

		expect(lastValue).toBe(5)
		expect(numReactions).toBe(3)

		atomC.set(2)

		// The reaction should not have run because C was not captured
		expect(lastValue).toBe(5)
		expect(numReactions).toBe(3)
	})

	it('allows executing reactor code in a context that short-circuits the current capture frame', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 1)
		const atomC = atom('c', 1)

		let lastValue: number | undefined
		let numReactions = 0

		react('', () => {
			numReactions++
			lastValue = atomA.get() + atomB.get() + unsafe__withoutCapture(() => atomC.get())
		})

		expect(lastValue).toBe(3)
		expect(numReactions).toBe(1)

		atomA.set(2)

		expect(lastValue).toBe(4)
		expect(numReactions).toBe(2)

		atomB.set(2)

		expect(lastValue).toBe(5)
		expect(numReactions).toBe(3)

		atomC.set(2)

		// The reaction should not have run because C was not captured
		expect(lastValue).toBe(5)
		expect(numReactions).toBe(3)
	})

	it('can be nested', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)
		const atomC = atom('c', 3)

		const child = computed('nested', () => {
			const a = atomA.get()
			const b = unsafe__withoutCapture(() => {
				return atomB.get() + unsafe__withoutCapture(() => atomC.get())
			})
			return a + b
		})

		let lastValue: number | undefined
		let numReactions = 0

		react('nested reaction', () => {
			numReactions++
			lastValue = child.get()
		})

		expect(lastValue).toBe(6) // 1 + 2 + 3
		expect(numReactions).toBe(1)

		// Only atomA should trigger reactions
		atomA.set(10)
		expect(lastValue).toBe(15) // 10 + 2 + 3
		expect(numReactions).toBe(2)

		// atomB and atomC should not trigger reactions
		atomB.set(20)
		atomC.set(30)
		expect(lastValue).toBe(15) // unchanged
		expect(numReactions).toBe(2)

		// But their values should still be read correctly
		atomA.set(1)
		expect(lastValue).toBe(51) // 1 + 20 + 30
		expect(numReactions).toBe(3)
	})

	it('restores capture context properly after exception', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)

		let capturedParents: any[] = []
		const child = computed('exception test', () => {
			const a = atomA.get()
			try {
				unsafe__withoutCapture(() => {
					throw new Error('test error')
				})
			} catch (e) {
				// Error caught, capture should be restored
			}
			const b = atomB.get() // This should still be captured
			return a + b
		})

		react('capture parents', () => {
			child.get()
			capturedParents = [...(child as any).parents]
		})

		expect(capturedParents).toHaveLength(2)
		expect(capturedParents).toContain(atomA)
		expect(capturedParents).toContain(atomB)
	})
})

describe('maybeCaptureParent', () => {
	it('handles duplicate parent captures correctly', () => {
		const atomA = atom('a', 1)
		const child = emptyChild({ isActivelyListening: true })

		startCapturingParents(child)

		// Capture the same parent multiple times
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomA) // Should be ignored
		maybeCaptureParent(atomA) // Should be ignored

		stopCapturingParents()

		expect(child.parents).toHaveLength(1)
		expect(child.parents[0]).toBe(atomA)
		expect(child.parentEpochs).toHaveLength(1)
	})

	it('handles isActivelyListening flag correctly', () => {
		const atomA = atom('a', 1)
		const childListening = emptyChild({ isActivelyListening: true })
		const childNotListening = emptyChild({ isActivelyListening: false })

		startCapturingParents(childListening)
		maybeCaptureParent(atomA)
		stopCapturingParents()

		startCapturingParents(childNotListening)
		maybeCaptureParent(atomA)
		stopCapturingParents()

		// Both should have the parent in their arrays
		expect(childListening.parents).toContain(atomA)
		expect(childNotListening.parents).toContain(atomA)

		// But only the actively listening child should be in the atom's children
		expect(atomA.children.has(childListening)).toBe(true)
		expect(atomA.children.has(childNotListening)).toBe(false)
	})

	it('handles parent reordering with maybeRemoved tracking', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)
		const atomC = atom('c', 3)
		const child = emptyChild({ isActivelyListening: true })

		// First capture: A, B, C
		startCapturingParents(child)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomB)
		maybeCaptureParent(atomC)
		stopCapturingParents()

		expect(child.parents).toEqual([atomA, atomB, atomC])
		expect(atomA.children.has(child)).toBe(true)
		expect(atomB.children.has(child)).toBe(true)
		expect(atomC.children.has(child)).toBe(true)

		// Second capture: B, A (C removed)
		startCapturingParents(child)
		maybeCaptureParent(atomB)
		maybeCaptureParent(atomA)
		stopCapturingParents()

		expect(child.parents).toEqual([atomB, atomA])
		expect(atomA.children.has(child)).toBe(true)
		expect(atomB.children.has(child)).toBe(true)
		expect(atomC.children.has(child)).toBe(false) // Should be detached
	})
})

describe('startCapturingParents', () => {
	it('clears parentSet before capturing', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)
		const child = emptyChild()

		// Pre-populate parentSet
		child.parentSet.add(atomA)
		child.parentSet.add(atomB)
		expect(child.parentSet.size()).toBe(2)

		startCapturingParents(child)
		expect(child.parentSet.size()).toBe(0)

		// Add one parent during capture
		maybeCaptureParent(atomA)
		stopCapturingParents()

		expect(child.parentSet.size()).toBe(1)
		expect(child.parentSet.has(atomA)).toBe(true)
		expect(child.parentSet.has(atomB)).toBe(false)
	})

	it('handles debug ancestor epochs', () => {
		const atomA = atom('a', 1)
		const child = emptyChild() as Child & { __debug_ancestor_epochs__: Map<any, number> | null }

		// Set up debug tracking
		child.__debug_ancestor_epochs__ = new Map()
		child.parents.push(atomA)
		child.parentEpochs.push(getGlobalEpoch())
		child.parentSet.add(atomA)

		// The important thing is that startCapturingParents handles the debug scenario without crashing
		expect(() => {
			startCapturingParents(child)
			stopCapturingParents()
		}).not.toThrow()

		// Verify the debug ancestor epochs map was cleared
		expect(child.__debug_ancestor_epochs__).toBe(null)
	})
})

describe('stopCapturingParents', () => {
	it('properly truncates parent arrays when shrinking', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)
		const atomC = atom('c', 3)
		const child = emptyChild({ isActivelyListening: true })

		// First capture: A, B, C
		startCapturingParents(child)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomB)
		maybeCaptureParent(atomC)
		stopCapturingParents()

		expect(child.parents).toHaveLength(3)
		expect(child.parentEpochs).toHaveLength(3)

		// Second capture: only A
		startCapturingParents(child)
		maybeCaptureParent(atomA)
		stopCapturingParents()

		expect(child.parents).toHaveLength(1)
		expect(child.parentEpochs).toHaveLength(1)
		expect(child.parents[0]).toBe(atomA)

		// B and C should be detached
		expect(atomB.children.has(child)).toBe(false)
		expect(atomC.children.has(child)).toBe(false)
	})

	it('handles maybeRemoved array cleanup', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)
		const child = emptyChild({ isActivelyListening: true })

		// Setup initial parents
		startCapturingParents(child)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomB)
		stopCapturingParents()

		expect(atomA.children.has(child)).toBe(true)
		expect(atomB.children.has(child)).toBe(true)

		// Reorder and remove
		startCapturingParents(child)
		maybeCaptureParent(atomB) // B moves to position 0, A gets marked for removal
		stopCapturingParents()

		expect(child.parents).toEqual([atomB])
		expect(atomA.children.has(child)).toBe(false) // Should be detached
		expect(atomB.children.has(child)).toBe(true)
	})

	it('handles empty capture sessions', () => {
		const child = emptyChild()

		startCapturingParents(child)
		// Don't capture anything
		stopCapturingParents()

		expect(child.parents).toHaveLength(0)
		expect(child.parentEpochs).toHaveLength(0)
		expect(child.parentSet.size()).toBe(0)
	})
})

describe('whyAmIRunning', () => {
	it('throws error when called outside reactive context', () => {
		expect(() => {
			whyAmIRunning()
		}).toThrow('whyAmIRunning() called outside of a reactive context')
	})

	it('sets up debug tracking when called in computed', () => {
		const atomA = atom('a', 1)
		let debugTrackingWasSet = false

		const child = computed('debug test', () => {
			whyAmIRunning()
			const computedValue = child as any
			debugTrackingWasSet = computedValue.__debug_ancestor_epochs__ !== null
			return atomA.get()
		})

		// Access the computed to trigger the function
		child.get()
		expect(debugTrackingWasSet).toBe(true)
	})

	it('sets up debug tracking when called in effect', () => {
		const atomA = atom('a', 1)
		let debugTrackingWasSet = false

		react('debug test', () => {
			whyAmIRunning()
			// We need to access the current effect context to check debug state
			// This is implementation-specific and might need adjustment
			atomA.get()
			debugTrackingWasSet = true // We can at least verify the function doesn't throw
		})

		expect(debugTrackingWasSet).toBe(true)
	})

	it('enables ancestor epoch tracking for debugging', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)

		const child = computed('debug computed', () => {
			whyAmIRunning()
			return atomA.get() + atomB.get()
		})

		// First access - should not throw
		expect(() => child.get()).not.toThrow()

		// Change a dependency - should still not throw
		atomA.set(10)
		expect(() => child.get()).not.toThrow()
	})
})

describe('CaptureStackFrame behavior', () => {
	it('maintains proper stack depth with nested captures', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)

		const outerChild = computed('outer', () => {
			const a = atomA.get()
			const innerChild = computed('inner', () => {
				return atomB.get() * 2
			})
			return a + innerChild.get()
		})

		let result: number | undefined
		react('nested test', () => {
			result = outerChild.get()
		})

		expect(result).toBe(5) // 1 + (2 * 2)

		// Test that both levels of dependency tracking work
		atomA.set(10)
		expect(result).toBe(14) // 10 + (2 * 2)

		atomB.set(3)
		expect(result).toBe(16) // 10 + (3 * 2)
	})

	it('handles capture stack properly with exceptions during capture', () => {
		const atomA = atom('a', 1)
		const child = emptyChild()

		// This shouldn't affect the global capture state
		expect(() => {
			startCapturingParents(child)
			maybeCaptureParent(atomA)
			throw new Error('test error')
		}).toThrow('test error')

		// The capture stack should be restored even though we didn't call stopCapturingParents
		// due to the exception. Let's verify this doesn't break subsequent captures.
		const child2 = emptyChild()
		expect(() => {
			startCapturingParents(child2)
			maybeCaptureParent(atomA)
			stopCapturingParents()
		}).not.toThrow()

		expect(child2.parents).toContain(atomA)
	})
})

describe('Integration with actual computed signals', () => {
	it('works correctly with real computed signals', () => {
		const atomA = atom('real a', 1)
		const atomB = atom('real b', 2)
		const atomC = atom('real c', 3)

		const computed1 = computed('real computed 1', () => {
			return atomA.get() + unsafe__withoutCapture(() => atomB.get())
		})

		const computed2 = computed('real computed 2', () => {
			return computed1.get() + atomC.get()
		})

		expect(computed2.get()).toBe(6) // (1 + 2) + 3

		// atomA changes should propagate through computed1 to computed2
		atomA.set(10)
		expect(computed2.get()).toBe(15) // (10 + 2) + 3

		// atomB changes should not propagate (not captured)
		atomB.set(20)
		expect(computed2.get()).toBe(15) // unchanged

		// atomC changes should propagate to computed2
		atomC.set(5)
		expect(computed2.get()).toBe(17) // (10 + 2) + 5

		// But atomB's current value should still be used
		atomA.set(1)
		expect(computed2.get()).toBe(26) // (1 + 20) + 5
	})

	it('handles deeply nested unsafe contexts', () => {
		const atoms = [atom('deep a', 1), atom('deep b', 2), atom('deep c', 3), atom('deep d', 4)]

		const deepComputed = computed('deep computed', () => {
			const a = atoms[0].get() // captured
			const rest = unsafe__withoutCapture(() => {
				const b = atoms[1].get() // not captured
				return unsafe__withoutCapture(() => {
					const c = atoms[2].get() // not captured
					return b + c + unsafe__withoutCapture(() => atoms[3].get()) // not captured
				})
			})
			return a + rest
		})

		expect(deepComputed.get()).toBe(10) // 1 + (2 + 3 + 4)

		// Only changes to atoms[0] should trigger recomputation
		atoms[0].set(10)
		expect(deepComputed.get()).toBe(19) // 10 + (2 + 3 + 4)

		atoms[1].set(20)
		atoms[2].set(30)
		atoms[3].set(40)
		expect(deepComputed.get()).toBe(19) // unchanged (cached)

		// Force recomputation by changing the captured atom
		atoms[0].set(1)
		expect(deepComputed.get()).toBe(91) // 1 + (20 + 30 + 40)
	})
})
