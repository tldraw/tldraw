import { attach, detach } from './helpers'
import { Child, Signal } from './types'

class CaptureStackFrame {
	offset = 0
	numNewParents = 0

	maybeRemoved?: Signal<any>[]

	constructor(public readonly below: CaptureStackFrame | null, public readonly child: Child) {}
}

let stack: CaptureStackFrame | null = null

export function unsafe__withoutCapture<T>(fn: () => T): T {
	const oldStack = stack
	stack = null
	try {
		return fn()
	} finally {
		stack = oldStack
	}
}

export function startCapturingParents(child: Child) {
	stack = new CaptureStackFrame(stack, child)
}

export function stopCapturingParents() {
	const frame = stack!
	stack = frame.below

	const didParentsChange = frame.numNewParents > 0 || frame.offset !== frame.child.parents.length

	if (!didParentsChange) {
		return
	}

	for (let i = frame.offset; i < frame.child.parents.length; i++) {
		const p = frame.child.parents[i]
		const parentWasRemoved = frame.child.parents.indexOf(p) >= frame.offset
		if (parentWasRemoved) {
			detach(p, frame.child)
		}
	}

	frame.child.parents.length = frame.offset
	frame.child.parentEpochs.length = frame.offset

	if (stack?.maybeRemoved) {
		for (let i = 0; i < stack.maybeRemoved.length; i++) {
			const maybeRemovedParent = stack.maybeRemoved[i]
			if (frame.child.parents.indexOf(maybeRemovedParent) === -1) {
				detach(maybeRemovedParent, frame.child)
			}
		}
	}
}

// this must be called after the parent is up to date
export function maybeCaptureParent(p: Signal<any, any>) {
	if (stack) {
		const idx = stack.child.parents.indexOf(p)
		// if the child didn't deref this parent last time it executed, then idx will be -1
		// if the child did deref this parent last time but in a different order relative to other parents, then idx will be greater than stack.offset
		// if the child did deref this parent last time in the same order, then idx will be the same as stack.offset
		// if the child did deref this parent already during this capture session then 0 <= idx < stack.offset

		if (idx < 0) {
			stack.numNewParents++
			if (stack.child.isActivelyListening) {
				attach(p, stack.child)
			}
		}

		if (idx < 0 || idx >= stack.offset) {
			if (idx !== stack.offset && idx > 0) {
				const maybeRemovedParent = stack.child.parents[stack.offset]

				if (!stack.maybeRemoved) {
					stack.maybeRemoved = [maybeRemovedParent]
				} else if (stack.maybeRemoved.indexOf(maybeRemovedParent) === -1) {
					stack.maybeRemoved.push(maybeRemovedParent)
				}
			}

			stack.child.parents[stack.offset] = p
			stack.child.parentEpochs[stack.offset] = p.lastChangedEpoch
			stack.offset++
		}
	}
}

export function whyAmIRunning() {
	const child = stack?.child
	if (!child) {
		throw new Error('whyAmIRunning() called outside of a reactive context')
	}

	const changedParents = []
	for (let i = 0; i < child.parents.length; i++) {
		const parent = child.parents[i]

		if (parent.lastChangedEpoch > child.parentEpochs[i]) {
			changedParents.push(parent)
		}
	}

	if (changedParents.length === 0) {
		// eslint-disable-next-line no-console
		console.log((child as any).name, 'is running but none of the parents changed')
	} else {
		// eslint-disable-next-line no-console
		console.log((child as any).name, 'is running because:')
		for (const changedParent of changedParents) {
			// eslint-disable-next-line no-console
			console.log(
				'\t',
				(changedParent as any).name,
				'changed =>',
				changedParent.__unsafe__getWithoutCapture()
			)
		}
	}
}
