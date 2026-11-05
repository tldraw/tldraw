import { atom } from '@tldraw/state'
import { getFromLocalStorage, setInLocalStorage } from '@tldraw/utils'

/**
 * The ids of the packs a user has added to their panel. A {@link PackCollectionSource} lists only
 * these packs. Adding is a preference, not a copy: an added pack still gets the pack's updates.
 * An `Atom<readonly string[]>` fits, as does a host's own store of user preferences.
 * @public
 */
export interface AddedPackIds {
	/** Reactive. */
	get(): readonly string[]
	set(packIds: readonly string[]): void
}

/** The localStorage key {@link localStorageAddedPackIds} uses for a source's added packs. */
export function getAddedPackIdsKey(sourceId: string) {
	return `tldraw-collections-added-packs:${sourceId}`
}

/**
 * Added pack ids kept in this browser's localStorage under `key`. Without localStorage, or with a
 * corrupt entry, nothing is added and changes last until the page reloads.
 * @public
 */
export function localStorageAddedPackIds(key: string): AddedPackIds {
	let stored: string[] = []
	try {
		const parsed: unknown = JSON.parse(getFromLocalStorage(key) ?? '[]')
		if (Array.isArray(parsed)) stored = parsed.filter((id) => typeof id === 'string')
	} catch {
		// A corrupt entry adds nothing.
	}
	const ids = atom<readonly string[]>('added pack ids', stored)
	return {
		get: () => ids.get(),
		set: (packIds) => {
			ids.set(packIds)
			setInLocalStorage(key, JSON.stringify(packIds))
		},
	}
}
