import { Child, Signal } from './types'

function isChild(x: any): x is Child {
	return x && typeof x === 'object' && 'parents' in x
}

/**
 * Whether any of the child's parents changed since the child last recorded their epochs. O(parents);
 * returns at the first changed parent, so parents after it are not brought up to date.
 *
 * @internal
 */
export function haveParentsChanged(child: Child): boolean {
	for (let i = 0, n = child.parents.length; i < n; i++) {
		const parent = child.parents[i]
		// Bring the parent up to date first: a computed parent's `lastChangedEpoch` only moves when
		// it is re-derived.
		parent.__unsafe__getWithoutCapture(true)

		if (parent.lastChangedEpoch !== child.parentEpochs[i]) {
			return true
		}
	}

	return false
}

/**
 * Removes `child` from `parent.children`. A computed parent that loses its last child stops
 * listening itself, recursively, so a signal's `children` set is empty whenever nothing downstream
 * is actively listening.
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
 * Adds `child` to `parent.children`. A computed parent that gains its first child starts
 * listening itself, recursively, so that changes to any ancestor are traversed down to the child.
 *
 * `parent` must be up to date when it is attached: `Computed` assumes an actively-listening
 * computed has been traversed for every ancestor change since it was last checked, which only
 * holds from the moment it started listening. Capture attaches a parent right after reading it;
 * `EffectScheduler.attach` refreshes its parents first.
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
 * The default equality used for change detection: `===`, then `Object.is` (so `NaN` equals
 * `NaN`; `0` and `-0` are already equal by `===`), then the old value's own `.equals(b)` method
 * if it has one. Only the old value's `equals` is consulted.
 *
 * @internal
 */
export function equals(a: any, b: any): boolean {
	const shallowEquals =
		a === b || Object.is(a, b) || Boolean(a && b && typeof a.equals === 'function' && a.equals(b))
	return shallowEquals
}

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
