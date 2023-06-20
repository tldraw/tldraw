import { Child, Signal } from './types'

/**
 * Get whether the given value is a child.
 *
 * @param x The value to check.
 * @returns True if the value is a child, false otherwise.
 */
function isChild(x: any): x is Child {
	return x && typeof x === 'object' && 'parents' in x
}

/**
 * Get whether a child's parents have changed.
 *
 * @param child The child to check.
 * @returns True if the child's parents have changed, false otherwise.
 */
export function haveParentsChanged(child: Child) {
	for (let i = 0, n = child.parents.length; i < n; i++) {
		// Get the parent's value without capturing it.
		child.parents[i].__unsafe__getWithoutCapture()

		// If the parent's epoch does not match the child's view of the parent's epoch, then the parent has changed.
		if (child.parents[i].lastChangedEpoch !== child.parentEpochs[i]) {
			return true
		}
	}

	return false
}

/**
 * Detach a child from a parent.
 *
 * @param parent The parent to detach from.
 * @param child The child to detach.
 */
export const detach = (parent: Signal<any>, child: Child) => {
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
 * Attach a child to a parent.
 *
 * @param parent The parent to attach to.
 * @param child The child to attach.
 */
export const attach = (parent: Signal<any>, child: Child) => {
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
 * Get whether two values are equal (insofar as @tldraw/state is concerned).
 *
 * @param a The first value.
 * @param b The second value.
 */
export function equals(a: any, b: any): boolean {
	const shallowEquals =
		a === b || Object.is(a, b) || Boolean(a && b && typeof a.equals === 'function' && a.equals(b))
	return shallowEquals
}

export declare function assertNever(x: never): never

/** @public */
export const EMPTY_ARRAY: [] = Object.freeze([]) as any
