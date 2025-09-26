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
	it('captures parent dependencies and maintains arrays correctly', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)
		const child = emptyChild()

		startCapturingParents(child)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomB)
		stopCapturingParents()

		expect(child.parents).toEqual([atomA, atomB])
		expect(child.parentEpochs).toHaveLength(2)
	})

	it('will shrink the parent arrays if the number of captured parents shrinks', () => {
		const atomA = atom('', 1)
		const atomB = atom('', 2)
		const atomC = atom('', 3)
		const child = emptyChild()

		startCapturingParents(child)
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomB)
		maybeCaptureParent(atomC)
		stopCapturingParents()

		expect(child.parents).toHaveLength(3)

		// Shrink to fewer parents
		startCapturingParents(child)
		maybeCaptureParent(atomA)
		stopCapturingParents()

		expect(child.parents).toEqual([atomA])
		expect(child.parentEpochs).toHaveLength(1)

		// Empty capture
		startCapturingParents(child)
		stopCapturingParents()

		expect(child.parents).toEqual([])
		expect(child.parentEpochs).toEqual([])
	})

	it('doesnt do anything if you dont start capturing', () => {
		expect(() => {
			maybeCaptureParent(atom('', 1))
		}).not.toThrow()
	})
})

describe(unsafe__withoutCapture, () => {
	it('prevents dependency tracking within the callback', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 1)
		const atomC = atom('c', 1)

		const child = computed('test', () => {
			return atomA.get() + atomB.get() + unsafe__withoutCapture(() => atomC.get())
		})

		let lastValue: number | undefined
		let numReactions = 0

		react('counter', () => {
			numReactions++
			lastValue = child.get()
		})

		expect(lastValue).toBe(3)
		expect(numReactions).toBe(1)

		// Changes to captured atoms trigger reactions
		atomA.set(2)
		expect(lastValue).toBe(4)
		expect(numReactions).toBe(2)

		atomB.set(2)
		expect(lastValue).toBe(5)
		expect(numReactions).toBe(3)

		// Changes to non-captured atoms don't trigger reactions
		atomC.set(2)
		expect(lastValue).toBe(5)
		expect(numReactions).toBe(3)
	})

	it('can be nested and restores capture context properly', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)
		const atomC = atom('c', 3)

		const child = computed('nested', () => {
			const a = atomA.get() // captured
			const b = unsafe__withoutCapture(() => {
				return atomB.get() + unsafe__withoutCapture(() => atomC.get()) // neither captured
			})
			return a + b
		})

		let numReactions = 0
		react('nested reaction', () => {
			numReactions++
			child.get()
		})

		// Only atomA should trigger reactions
		atomA.set(10)
		expect(numReactions).toBe(2)

		// atomB and atomC should not trigger reactions
		atomB.set(20)
		atomC.set(30)
		expect(numReactions).toBe(2)
	})

	it('restores capture context properly after exception', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)

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

		let capturedParents: any[] = []
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
		maybeCaptureParent(atomA)
		maybeCaptureParent(atomA) // Should be ignored
		stopCapturingParents()

		expect(child.parents).toHaveLength(1)
		expect(child.parents[0]).toBe(atomA)
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

		// Only the actively listening child should be in the atom's children
		expect(atomA.children.has(childListening)).toBe(true)
		expect(atomA.children.has(childNotListening)).toBe(false)
	})
})

describe('whyAmIRunning', () => {
	it('throws error when called outside reactive context', () => {
		expect(() => {
			whyAmIRunning()
		}).toThrow('whyAmIRunning() called outside of a reactive context')
	})

	it('sets up debug tracking without throwing', () => {
		const atomA = atom('a', 1)
		const atomB = atom('b', 2)

		const child = computed('debug computed', () => {
			whyAmIRunning()
			return atomA.get() + atomB.get()
		})

		expect(() => child.get()).not.toThrow()
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
})
