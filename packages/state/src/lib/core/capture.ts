import { attach, detach } from './helpers'
import { Child, Signal } from './types'

const tldrawStateGlobalKey = Symbol.for('__@tldraw/state__')
const tldrawStateGlobal = globalThis as { [tldrawStateGlobalKey]?: true }

if (tldrawStateGlobal[tldrawStateGlobalKey]) {
	console.error(
		'Multiple versions of @tldraw/state detected. This will cause unexpected behavior. Please add "resolutions" (yarn/pnpm) or "overrides" (npm) in your package.json to ensure only one version of @tldraw/state is loaded.'
	)
} else {
	tldrawStateGlobal[tldrawStateGlobalKey] = true
}

class CaptureStackFrame {
	offset = 0
	numNewParents = 0

	maybeRemoved?: Signal<any>[]

	constructor(public readonly below: CaptureStackFrame | null, public readonly child: Child) {}
}

let stack: CaptureStackFrame | null = null

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
 * 	 print(name.value, 'was changed at', unsafe__withoutCapture(() => time.value))
 * })
 *
 * ```
 *
 * @public
 */
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

/**
 * A debugging tool that tells you why a computed signal or effect is running.
 * Call in the body of a computed signal or effect function.
 *
 * @example
 * ```ts
 * const name = atom('name', 'Bob')
 * react('greeting', () => {
 * 	whyAmIRunning()
 *	print('Hello', name.value)
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
