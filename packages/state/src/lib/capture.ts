import { attach, detach, singleton } from './helpers'
import { isComputed } from './isComputed'
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
 * Begins a capture session for `child`: until the matching {@link stopCapturingParents}, any
 * signal read via `.get()` is registered as one of its parents.
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
 * Ends the current capture session: detaches parents that were not read this time and trims
 * the parent arrays to the captured set.
 *
 * @internal
 */
export function stopCapturingParents() {
	const frame = inst.stack!
	inst.stack = frame.below

	const { child, offset, maybeRemoved } = frame

	if (offset < child.parents.length) {
		for (let i = offset; i < child.parents.length; i++) {
			const maybeRemovedParent = child.parents[i]
			if (!child.parentSet.has(maybeRemovedParent)) {
				detach(maybeRemovedParent, child)
			}
		}

		child.parents.length = offset
		child.parentEpochs.length = offset
	}

	if (maybeRemoved) {
		for (let i = 0; i < maybeRemoved.length; i++) {
			const maybeRemovedParent = maybeRemoved[i]
			if (!child.parentSet.has(maybeRemovedParent)) {
				detach(maybeRemovedParent, child)
			}
		}
	}

	if (child.__debug_ancestor_epochs__) {
		captureAncestorEpochs(child, child.__debug_ancestor_epochs__)
	}
}

/**
 * Records `p` as a parent of the child currently being captured, if any. Called from every
 * signal `.get()`, so it must stay cheap.
 *
 * Must be called after the parent signal is up to date, since it snapshots `p.lastChangedEpoch`.
 *
 * @internal
 */
export function maybeCaptureParent(p: Signal<any, any>) {
	const stack = inst.stack
	if (!stack) return

	const child = stack.child

	// `add` returns false when the parent was already captured. In array mode both `has` and
	// `add` scan with indexOf, so going straight to `add` halves the scans per captured parent.
	if (!child.parentSet.add(p)) {
		return
	}

	if (child.isActivelyListening) {
		attach(p, child)
	}

	// The parent previously at this slot may have dropped out of the dependency set (or just
	// moved); stopCapturingParents decides which once the whole set has been captured.
	if (stack.offset < child.parents.length) {
		const maybeRemovedParent = child.parents[stack.offset]
		if (maybeRemovedParent !== p) {
			if (!stack.maybeRemoved) {
				stack.maybeRemoved = [maybeRemovedParent]
			} else {
				stack.maybeRemoved.push(maybeRemovedParent)
			}
		}
	}

	child.parents[stack.offset] = p
	child.parentEpochs[stack.offset] = p.lastChangedEpoch
	stack.offset++
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
		ancestorEpochs.set(parent, child.parentEpochs[i])
		if (isComputed(parent)) {
			captureAncestorEpochs(parent as any, ancestorEpochs)
		}
	}
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
		if (parent.lastChangedEpoch !== ancestorEpochs.get(parent)) {
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
