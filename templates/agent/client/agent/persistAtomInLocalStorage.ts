import { Atom, react } from 'tldraw'

/**
 * Load an atom's value from local storage and persist it to local storage whenever it changes.
 *
 * @param atom - The atom to persist.
 * @param key - The key to use for local storage.
 */
export function persistAtomInLocalStorage<T>(atom: Atom<T>, key: string) {
	const localStorage = globalThis.localStorage
	if (!localStorage) return

	try {
		const stored = localStorage.getItem(key)
		if (stored) {
			const value = JSON.parse(stored) as T
			atom.set(value)
		}
	} catch {
		console.warn(`Couldn't load ${key} from localStorage`)
	}

	react(`save ${key} to localStorage`, () => {
		localStorage.setItem(key, JSON.stringify(atom.get()))
	})
}
