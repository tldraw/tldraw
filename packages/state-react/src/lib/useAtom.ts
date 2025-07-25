import { Atom, AtomOptions, atom } from '@tldraw/state'
import { useState } from 'react'

/**
 * Creates a new atom and returns it. The atom will be created only once.
 *
 * See `atom`.
 *
 * @example
 * ```ts
 * const Counter = track(function Counter () {
 *   const count = useAtom('count', 0)
 *   const increment = useCallback(() => count.set(count.get() + 1), [count])
 *   return <button onClick={increment}>{count.get()}</button>
 * })
 * ```
 *
 * @param name - The name of the atom. This does not need to be globally unique. It is used for debugging and performance profiling.
 * @param valueOrInitialiser - The initial value of the atom. If this is a function, it will be called to get the initial value.
 * @param options - Options for the atom.
 *
 * @public
 */
export function useAtom<Value, Diff = unknown>(
	name: string,
	valueOrInitialiser: Value | (() => Value),
	options?: AtomOptions<Value, Diff>
): Atom<Value, Diff> {
	return useState(() => {
		const initialValue =
			typeof valueOrInitialiser === 'function' ? (valueOrInitialiser as any)() : valueOrInitialiser

		return atom(`useAtom(${name})`, initialValue, options)
	})[0]
}
