import { isComputed } from './Computed'
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

/**
 * Begins capturing parent signal dependencies for the given child signal.
 *
 * This function initiates a capture session where any signal accessed via `.get()`
 * will be automatically registered as a dependency of the child signal. It sets up
 * the capture stack frame and clears the existing parent set to prepare for fresh
 * dependency tracking.
 *
 * @param child - The child signal (computed or effect) that will capture dependencies
 *
 * @example
 * ```ts
 * const effect = createEffect('myEffect', () => { /* ... *\/ })
 * startCapturingParents(effect)
 * // Now any signal.get() calls will be captured as dependencies
 * ```
 *
 * @internal
 */
export function startCapturingParents(child: Child) {
	inst.stack = new CaptureStackFrame(inst.stack, child)
	if (child.__debug_ancestor_epochs__) {
		const previousAncestorEpochs = child.__debug_ancestor_epochs__
		child.__debug_ancestor_epochs__ = null
		for (const p of child.parents) {
			p.__unsafe__getWithoutCapture(true)
		}
		logChangedAncestors(child, previousAncestorEpochs)
	}
	child.parentSet.clear()
}

/**
 * Completes the parent dependency capture session and finalizes the dependency graph.
 *
 * This function cleans up the capture session by removing dependencies that are no
 * longer needed, detaching signals that should no longer be parents, and updating
 * the dependency arrays to reflect the current set of captured parents. It must be
 * called after `startCapturingParents` to complete the capture cycle.
 *
 * @example
 * ```ts
 * startCapturingParents(effect)
 * // ... signal.get() calls happen here ...
 * stopCapturingParents() // Finalizes the dependency graph
 * ```
 *
 * @internal
 */
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

	if (frame.child.__debug_ancestor_epochs__) {
		captureAncestorEpochs(frame.child, frame.child.__debug_ancestor_epochs__)
	}
}

/**
 * Conditionally captures a signal as a parent dependency during an active capture session.
 *
 * This function is called whenever a signal's `.get()` method is invoked during a
 * capture session. It checks if the signal should be added as a dependency and manages
 * the parent-child relationship in the reactive graph. The function handles deduplication,
 * attachment/detachment, and tracks changes in dependency order.
 *
 * Note: This must be called after the parent signal is up to date.
 *
 * @param p - The signal that might be captured as a parent dependency
 *
 * @example
 * ```ts
 * // This is called internally when you do:
 * const value = someAtom.get() // maybeCaptureParent(someAtom) is called
 * ```
 *
 * @internal
 */
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
	child.__debug_ancestor_epochs__ = new Map()
}

function captureAncestorEpochs(child: Child, ancestorEpochs: Map<Signal<any>, number>) {
	for (let i = 0; i < child.parents.length; i++) {
		const parent = child.parents[i]
		const epoch = child.parentEpochs[i]
		ancestorEpochs.set(parent, epoch)
		if (isComputed(parent)) {
			captureAncestorEpochs(parent as any, ancestorEpochs)
		}
	}
	return ancestorEpochs
}

type ChangeTree = { [signalName: string]: ChangeTree } | null
function collectChangedAncestors(
	child: Child,
	ancestorEpochs: Map<Signal<any>, number>
): NonNullable<ChangeTree> {
	const changeTree: ChangeTree = {}
	for (let i = 0; i < child.parents.length; i++) {
		const parent = child.parents[i]
		if (!ancestorEpochs.has(parent)) {
			continue
		}
		const prevEpoch = ancestorEpochs.get(parent)
		const currentEpoch = parent.lastChangedEpoch
		if (currentEpoch !== prevEpoch) {
			if (isComputed(parent)) {
				changeTree[parent.name] = collectChangedAncestors(parent as any, ancestorEpochs)
			} else {
				changeTree[parent.name] = null
			}
		}
	}
	return changeTree
}

function logChangedAncestors(child: Child, ancestorEpochs: Map<Signal<any>, number>) {
	const changeTree = collectChangedAncestors(child, ancestorEpochs)
	if (Object.keys(changeTree).length === 0) {
		// eslint-disable-next-line no-console
		console.log(`Effect(${child.name}) was executed manually.`)
		return
	}

	let str = isComputed(child)
		? `Computed(${child.name}) is recomputing because:`
		: `Effect(${child.name}) is executing because:`

	function logParent(tree: NonNullable<ChangeTree>, indent: number) {
		const indentStr = '\n' + ' '.repeat(indent) + '↳ '
		for (const [name, val] of Object.entries(tree)) {
			if (val) {
				str += `${indentStr}Computed(${name}) changed`
				logParent(val, indent + 2)
			} else {
				str += `${indentStr}Atom(${name}) changed`
			}
		}
	}

	logParent(changeTree, 1)

	// eslint-disable-next-line no-console
	console.log(str)
}
