import { deleteFromLocalStorage, getFromLocalStorage, setInLocalStorage } from '@tldraw/utils'
import { Atom, atom, AtomOptions } from './Atom'
import { react } from './EffectScheduler'

/**
 * Creates a new {@link Atom} that persists its value to localStorage.
 *
 * The atom is automatically synced with localStorage - changes to the atom are saved to localStorage,
 * and the initial value is read from localStorage if it exists. Returns both the atom and a cleanup
 * function that should be called to stop syncing when the atom is no longer needed. If you need to delete
 * the atom, you should do it manually after all cleanup functions have been called.
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
	const outAtom = atom(name, _initialValue, options)

	// Set up automatic syncing: whenever the atom changes, save it to localStorage
	const reactCleanup = react(`save ${name} to localStorage`, () => {
		setInLocalStorage(name, JSON.stringify(outAtom.get()))
	})

	// Set up cross-tab sync: listen for storage events from other tabs
	const handleStorageEvent = (event: StorageEvent) => {
		// Only handle events for this specific key
		if (event.key !== name) return

		// If the value was deleted in another tab
		if (event.newValue === null) {
			outAtom.set(initialValue)
			return
		}

		// If the value was changed in another tab, update the atom
		try {
			const newValue = JSON.parse(event.newValue) as Value
			outAtom.set(newValue)
		} catch {
			// If parsing fails, the stored value is corrupted; preserve the existing value
		}
	}

	window.addEventListener('storage', handleStorageEvent)

	// Combined cleanup function
	const cleanup = () => {
		reactCleanup()
		window.removeEventListener('storage', handleStorageEvent)
	}

	return [outAtom, cleanup]
}
