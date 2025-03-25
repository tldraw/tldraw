import { attach, detach, singleton } from './helpers'
import type { Child, Signal } from './types'

class CaptureStackFrame {
	offset = 0

	maybeRemoved?: Signal<any>[]

	constructor(
		public readonly below: CaptureStackFrame | null,
		public readonly child: Child
	) {}
}

const inst = singleton('capture', () => ({ stack: null as null | CaptureStackFrame }))

/**
 * Executes the given function without capturing any parents in the current capture context.
 *
 * This is mainly useful if you want to run an effect only when certain signals change while also
 * dereferencing other signals which should not cause the effect to rerun on their own.
 *
 * @example
 * ```ts
 * const name = atom('name', 'Sam')
 * const time = atom('time', () => new Date().getTime())
 *
 * setInterval(() => {
 *   time.set(new Date().getTime())
 * })
 *
 * react('log name changes', () => {
 * 	 print(name.get(), 'was changed at', unsafe__withoutCapture(() => time.get()))
 * })
 *
 * ```
 *
 * @public
 */
export function unsafe__withoutCapture<T>(fn: () => T): T {
	const oldStack = inst.stack
	inst.stack = null
	try {
		return fn()
	} finally {
		inst.stack = oldStack
	}
}

export function startCapturingParents(child: Child) {
	inst.stack = new CaptureStackFrame(inst.stack, child)
	child.parentSet.clear()
}

export function stopCapturingParents() {
	const frame = inst.stack!
	inst.stack = frame.below

	if (frame.offset < frame.child.parents.length) {
		for (let i = frame.offset; i < frame.child.parents.length; i++) {
			const maybeRemovedParent = frame.child.parents[i]
			if (!frame.child.parentSet.has(maybeRemovedParent)) {
				detach(maybeRemovedParent, frame.child)
			}
		}

		frame.child.parents.length = frame.offset
		frame.child.parentEpochs.length = frame.offset
	}

	if (frame.maybeRemoved) {
		for (let i = 0; i < frame.maybeRemoved.length; i++) {
			const maybeRemovedParent = frame.maybeRemoved[i]
			if (!frame.child.parentSet.has(maybeRemovedParent)) {
				detach(maybeRemovedParent, frame.child)
			}
		}
	}
}

// this must be called after the parent is up to date
export function maybeCaptureParent(p: Signal<any, any>) {
	if (inst.stack) {
		const wasCapturedAlready = inst.stack.child.parentSet.has(p)
		// if the child didn't deref this parent last time it executed, then idx will be -1
		// if the child did deref this parent last time but in a different order relative to other parents, then idx will be greater than stack.offset
		// if the child did deref this parent last time in the same order, then idx will be the same as stack.offset
		// if the child did deref this parent already during this capture session then 0 <= idx < stack.offset

		if (wasCapturedAlready) {
			return
		}

		inst.stack.child.parentSet.add(p)
		if (inst.stack.child.isActivelyListening) {
			attach(p, inst.stack.child)
		}

		if (inst.stack.offset < inst.stack.child.parents.length) {
			const maybeRemovedParent = inst.stack.child.parents[inst.stack.offset]
			if (maybeRemovedParent !== p) {
				if (!inst.stack.maybeRemoved) {
					inst.stack.maybeRemoved = [maybeRemovedParent]
				} else {
					inst.stack.maybeRemoved.push(maybeRemovedParent)
				}
			}
		}

		inst.stack.child.parents[inst.stack.offset] = p
		inst.stack.child.parentEpochs[inst.stack.offset] = p.lastChangedEpoch
		inst.stack.offset++
	}
}

/**
 * A debugging tool that tells you why a computed signal or effect is running.
 * Call in the body of a computed signal or effect function.
 *
 * @example
 * ```ts
 * const name = atom('name', 'Bob')
 * react('greeting', () => {
 * 	whyAmIRunning()
 *	print('Hello', name.get())
 * })
 *
 * name.set('Alice')
 *
 * // 'greeting' is running because:
 * //     'name' changed => 'Alice'
 * ```
 *
 * @public
 */
export function whyAmIRunning() {
	const child = inst.stack?.child
	if (!child) {
		throw new Error('whyAmIRunning() called outside of a reactive context')
	}
	child.__debug_mode__ = true
}

export function logChangedParents(changedParents: Signal<any>[], name: string) {
	// eslint-disable-next-line no-console
	console.log(`'${name}' is recomputing because:`)
	for (const p of changedParents) {
		// eslint-disable-next-line no-console
		console.log(`    '${p.name}' changed =>`, p.get())
	}
}
