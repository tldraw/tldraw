import { Child, Signal } from './types'

/**
 * Get whether the given value is a child.
 *
 * @param x The value to check.
 * @returns True if the value is a child, false otherwise.
 * @internal
 */
function isChild(x: any): x is Child {
	return x && typeof x === 'object' && 'parents' in x
}

/**
 * Checks if any of a child's parent signals have changed by comparing their current epochs
 * with the child's cached view of those epochs.
 *
 * This function is used internally to determine if a computed signal or effect needs to
 * be re-evaluated because one of its dependencies has changed.
 *
 * @param child - The child (computed signal or effect) to check for parent changes
 * @returns `true` if any parent signal has changed since the child last observed it, `false` otherwise
 * @example
 * ```ts
 * const childSignal = computed('child', () => parentAtom.get())
 * // Check if the child needs to recompute
 * if (haveParentsChanged(childSignal)) {
 *   // Recompute the child's value
 * }
 * ```
 * @internal
 */
export function haveParentsChanged(child: Child): boolean {
	for (let i = 0, n = child.parents.length; i < n; i++) {
		// Get the parent's value without capturing it.
		child.parents[i].__unsafe__getWithoutCapture(true)

		// If the parent's epoch does not match the child's view of the parent's epoch, then the parent has changed.
		if (child.parents[i].lastChangedEpoch !== child.parentEpochs[i]) {
			return true
		}
	}

	return false
}

/**
 * Detaches a child signal from its parent signal, removing the parent-child relationship
 * in the reactive dependency graph. If the parent has no remaining children and is itself
 * a child, it will recursively detach from its own parents.
 *
 * This function is used internally to clean up the dependency graph when signals are no
 * longer needed or when dependencies change.
 *
 * @param parent - The parent signal to detach from
 * @param child - The child signal to detach
 * @example
 * ```ts
 * // When a computed signal's dependencies change
 * const oldParent = atom('old', 1)
 * const child = computed('child', () => oldParent.get())
 * // Later, detach the child from the old parent
 * detach(oldParent, child)
 * ```
 * @internal
 */
export function detach(parent: Signal<any>, child: Child) {
	// If the child is not attached to the parent, do nothing.
	if (!parent.children.remove(child)) {
		return
	}

	// If the parent has no more children, then detach the parent from its parents.
	if (parent.children.isEmpty && isChild(parent)) {
		for (let i = 0, n = parent.parents.length; i < n; i++) {
			detach(parent.parents[i], parent)
		}
	}
}

/**
 * Attaches a child signal to its parent signal, establishing a parent-child relationship
 * in the reactive dependency graph. If the parent is itself a child, it will recursively
 * attach to its own parents to maintain the dependency chain.
 *
 * This function is used internally when dependencies are captured during computed signal
 * evaluation or effect execution.
 *
 * @param parent - The parent signal to attach to
 * @param child - The child signal to attach
 * @example
 * ```ts
 * // When a computed signal captures a new dependency
 * const parentAtom = atom('parent', 1)
 * const child = computed('child', () => parentAtom.get())
 * // Internally, attach is called to establish the dependency
 * attach(parentAtom, child)
 * ```
 * @internal
 */
export function attach(parent: Signal<any>, child: Child) {
	// If the child is already attached to the parent, do nothing.
	if (!parent.children.add(child)) {
		return
	}

	// If the parent itself is a child, add the parent to the parent's parents.
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
	const shallowEquals =
		a === b || Object.is(a, b) || Boolean(a && b && typeof a.equals === 'function' && a.equals(b))
	return shallowEquals
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
 * Creates or retrieves a singleton instance using a global symbol registry.
 * This ensures that the same instance is shared across all code that uses
 * the same key, even across different module boundaries.
 *
 * The singleton is stored on `globalThis` using a symbol created with
 * `Symbol.for()`, which ensures global uniqueness across realms.
 *
 * @param key - A unique string identifier for the singleton
 * @param init - A function that creates the initial value if it doesn't exist
 * @returns The singleton instance
 * @example
 * ```ts
 * // Create a singleton logger
 * const logger = singleton('logger', () => new Logger())
 *
 * // Elsewhere in the codebase, get the same logger instance
 * const sameLogger = singleton('logger', () => new Logger())
 * // logger === sameLogger
 * ```
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
