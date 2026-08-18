import { Child, Signal } from './types'

function isChild(x: any): x is Child {
	return x && typeof x === 'object' && 'parents' in x
}

/**
 * Checks whether any of a child's parents have changed since the child last observed them,
 * i.e. whether a computed or effect needs to re-run.
 *
 * @internal
 */
export function haveParentsChanged(child: Child): boolean {
	const { parents, parentEpochs } = child
	for (let i = 0, n = parents.length; i < n; i++) {
		const parent = parents[i]
		// Bring the parent up to date first; a stale computed parent's epoch would be stale too.
		parent.__unsafe__getWithoutCapture(true)

		if (parent.lastChangedEpoch !== parentEpochs[i]) {
			return true
		}
	}

	return false
}

/**
 * Removes the parent-child edge. If that leaves the parent with no children and the parent is
 * itself a child, it detaches from its own parents so unobserved computeds don't stay attached.
 *
 * @internal
 */
export function detach(parent: Signal<any>, child: Child) {
	if (!parent.children.remove(child)) {
		return
	}

	if (parent.children.isEmpty && isChild(parent)) {
		for (let i = 0, n = parent.parents.length; i < n; i++) {
			detach(parent.parents[i], parent)
		}
	}
}

/**
 * Adds the parent-child edge. If the parent is itself a child, it attaches to its own parents
 * too so the whole chain becomes actively listening.
 *
 * @internal
 */
export function attach(parent: Signal<any>, child: Child) {
	if (!parent.children.add(child)) {
		return
	}

	if (isChild(parent)) {
		for (let i = 0, n = parent.parents.length; i < n; i++) {
			attach(parent.parents[i], parent)
		}
	}
}

/**
 * Checks if two values are equal using the equality semantics of @tldraw/state.
 *
 * This function performs equality checks in the following order:
 * 1. Reference equality (`===`)
 * 2. `Object.is()` equality (handles NaN and -0/+0 cases)
 * 3. Custom `.equals()` method when the left-hand value provides one
 *
 * This is used internally to determine if a signal's value has actually changed
 * when setting new values, preventing unnecessary updates and re-computations.
 *
 * @param a - The first value to compare
 * @param b - The second value to compare
 * @returns `true` if the values are considered equal, `false` otherwise
 * @example
 * ```ts
 * equals(1, 1) // true
 * equals(NaN, NaN) // true (unlike === which returns false)
 * equals({ equals: (other: any) => other.id === 1 }, { id: 1 }) // Uses custom equals method
 * ```
 * @internal
 */
export function equals(a: any, b: any): boolean {
	return (
		a === b || Object.is(a, b) || Boolean(a && b && typeof a.equals === 'function' && a.equals(b))
	)
}

/**
 * A TypeScript utility function for exhaustiveness checking in switch statements and
 * conditional branches. This function should never be called at runtime—it exists
 * purely for compile-time type checking and is `undefined` in emitted JavaScript.
 *
 * @param x - A value that should be of type `never`
 * @throws Always at runtime because the identifier is undefined
 * @example
 * ```ts
 * type Color = 'red' | 'blue'
 *
 * function handleColor(color: Color) {
 *   switch (color) {
 *     case 'red':
 *       return 'Stop'
 *     case 'blue':
 *       return 'Go'
 *     default:
 *       return assertNever(color) // TypeScript error if not all cases handled
 *   }
 * }
 * ```
 * @public
 */
export declare function assertNever(x: never): never

/**
 * Creates or retrieves a value stored on `globalThis` under a `Symbol.for` key, so that two
 * copies of this module (e.g. duplicated bundles) still share the same instance.
 *
 * @internal
 */
export function singleton<T>(key: string, init: () => T): T {
	const symbol = Symbol.for(`com.tldraw.state/${key}`)
	const global = globalThis as any
	global[symbol] ??= init()
	return global[symbol]
}

/**
 * @public
 */
export const EMPTY_ARRAY: [] = singleton('empty_array', () => Object.freeze([]) as any)

/**
 * Checks if a signal has any active reactors (effects or computed signals) that are
 * currently listening to it. This determines whether changes to the signal will
 * cause any side effects or recomputations to occur.
 *
 * A signal is considered to have active reactors if any of its child dependencies
 * are actively listening for changes.
 *
 * @param signal - The signal to check for active reactors
 * @returns `true` if the signal has active reactors, `false` otherwise
 * @example
 * ```ts
 * const count = atom('count', 0)
 *
 * console.log(hasReactors(count)) // false - no effects listening
 *
 * const stop = react('logger', () => console.log(count.get()))
 * console.log(hasReactors(count)) // true - effect is listening
 *
 * stop()
 * console.log(hasReactors(count)) // false - effect stopped
 * ```
 * @public
 */
export function hasReactors(signal: Signal<any>) {
	for (const child of signal.children) {
		if (child.isActivelyListening) {
			return true
		}
	}

	return false
}
