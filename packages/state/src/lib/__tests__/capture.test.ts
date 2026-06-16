import { ArraySet } from '../ArraySet'
import { atom } from '../Atom'
import {
	maybeCaptureParent,
	startCapturingParents,
	stopCapturingParents,
	unsafe__withoutCapture,
} from '../capture'
import { computed } from '../Computed'
import { react, reactor } from '../EffectScheduler'
import { advanceGlobalEpoch, getGlobalEpoch } from '../transactions'
import { Child } from '../types'

// Tests for SPEC.md §5 (dependency capture).
// Rule IDs like [CAP2] in test names refer to that document.

describe('dependency capture (CAP)', () => {
	it('[CAP1][CAP3] captures each dereferenced signal once, in first-dereference order', () => {
		const a = atom('a', 1)
		const b = atom('b', 2)

		const r = reactor('r', () => {
			a.get()
			a.get()
			b.get()
			a.get()
		})
		r.start()

		expect(r.scheduler.parents).toEqual([a, b])
		r.stop()
	})

	it('[CAP2] the parent set is exactly the signals dereferenced in the latest run', () => {
		const which = atom('which', true)
		const b = atom('b', 1)
		const c = atom('c', 2)

		let runs = 0
		const stop = react('r', () => {
			runs++
			if (which.get()) {
				b.get()
			} else {
				c.get()
			}
		})
		expect(runs).toBe(1)

		// c is not currently a parent
		c.set(3)
		expect(runs).toBe(1)

		which.set(false)
		expect(runs).toBe(2)

		// b is no longer a parent after the latest run
		b.set(10)
		expect(runs).toBe(2)

		// c now is
		c.set(4)
		expect(runs).toBe(3)

		stop()
	})

	it('[CAP4] capture contexts nest: an effect captures a computed, not its parents', () => {
		const a = atom('a', 1)
		const double = computed('double', () => a.get() * 2)

		const r = reactor('r', () => {
			double.get()
		})
		r.start()

		expect(r.scheduler.parents).toEqual([double])
		expect(double.parents).toEqual([a])
		r.stop()
	})

	it('[CAP7] liveness propagates transitively up the graph', () => {
		const a = atom('a', 1)
		const c = computed('c', () => a.get())

		// lazily dereferencing a computed does not attach anything
		c.get()
		expect(a.children.isEmpty).toBe(true)
		expect(c.children.isEmpty).toBe(true)

		const r = reactor('r', () => {
			c.get()
		})
		r.start()

		expect(a.children.isEmpty).toBe(false)
		expect(c.children.isEmpty).toBe(false)

		r.stop()

		expect(a.children.isEmpty).toBe(true)
		expect(c.children.isEmpty).toBe(true)
	})

	it('[CAP6] dereferencing signals outside a capture context captures nothing', () => {
		expect(() => {
			maybeCaptureParent(atom('', 1))
		}).not.toThrow()
	})
})

describe('unsafe__withoutCapture (CAP5)', () => {
	it('[CAP5] short-circuits the current capture frame in a computed', () => {
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

	it('[CAP5] short-circuits the current capture frame in an effect', () => {
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

	it('[CAP5] restores the capture context even if the wrapped function throws', () => {
		const a = atom('a', 1)
		let runs = 0

		const stop = react('r', () => {
			runs++
			try {
				unsafe__withoutCapture(() => {
					throw new Error('oops')
				})
			} catch {
				// ignore
			}
			// captured only if the capture context was restored
			a.get()
		})

		expect(runs).toBe(1)

		a.set(2)

		expect(runs).toBe(2)
		stop()
	})
})

// Internal contract of startCapturingParents / maybeCaptureParent / stopCapturingParents [CAP8].

const emptyChild = (props: Partial<Child> = {}) =>
	({
		parentEpochs: [],
		parents: [],
		parentSet: new ArraySet(),
		isActivelyListening: false,
		lastTraversedEpoch: 0,
		...props,
	}) as Child

describe('capturing parents (CAP8, internal)', () => {
	it('[CAP8] can be started and stopped', () => {
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

	it('[CAP8] can handle several parents', () => {
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

	it('[CAP8] will reorder if parents are captured in different orders each time', () => {
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

	it('[CAP8] will shrink the parent arrays if the number of captured parents shrinks', () => {
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
})
