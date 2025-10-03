import { deleteFromLocalStorage, getFromLocalStorage, setInLocalStorage } from '@tldraw/utils'
import { Atom, atom, AtomOptions } from './Atom'
import { react } from './EffectScheduler'

/**
 * Creates a new {@link Atom} that persists its value to localStorage.
 *
 * The atom is automatically synced with localStorage - changes to the atom are saved to localStorage,
 * and the initial value is read from localStorage if it exists. Returns both the atom and a cleanup
 * function that should be called to stop syncing when the atom is no longer needed.
 *
 * @example
 * ```ts
 * const [theme, cleanup] = localStorageAtom('theme', 'light')
 *
 * theme.get() // 'light' or value from localStorage if it exists
 *
 * theme.set('dark') // updates atom and saves to localStorage
 *
 * // When done:
 * cleanup() // stops syncing to localStorage
 * ```
 *
 * @param name - The localStorage key and atom name. This is used for both localStorage persistence
 *   and debugging/profiling purposes.
 * @param initialValue - The initial value of the atom, used if no value exists in localStorage.
 * @param options - Optional atom configuration. See {@link AtomOptions}.
 * @returns A tuple containing the atom and a cleanup function to stop localStorage syncing.
 * @public
 */
export function localStorageAtom<Value, Diff = unknown>(
	name: string,
	initialValue: Value,
	options?: AtomOptions<Value, Diff>
): [Atom<Value, Diff>, () => void] {
	// Try to restore the initial value from localStorage
	let _initialValue = initialValue

	try {
		const value = getFromLocalStorage(name)
		if (value) {
			_initialValue = JSON.parse(value) as Value
		}
	} catch {
		// If parsing fails, the stored value is corrupted - delete it and use the provided initial value
		deleteFromLocalStorage(name)
	}

	// Create the atom with the restored or initial value
	const result = atom(name, _initialValue, options)

	// Set up automatic syncing: whenever the atom changes, save it to localStorage
	const cleanup = react(`save ${name} to localStorage`, () => {
		setInLocalStorage(name, JSON.stringify(result.get()))
	})

	return [result, cleanup]
}
