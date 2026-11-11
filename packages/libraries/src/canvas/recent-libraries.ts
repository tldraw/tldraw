import { atom, getFromLocalStorage, setInLocalStorage, type Atom } from '@tldraw/editor'
import type { TLLibrary, TLLibraryId } from '../lib/schema'

const MAX_RECENT = 20

const recentsBySource = new Map<string, Atom<TLLibraryId[]>>()

function storageKey(sourceId: string) {
	return `tldraw-collections-recent:${sourceId}`
}

function getRecents(sourceId: string) {
	let recents = recentsBySource.get(sourceId)
	if (!recents) {
		let stored: TLLibraryId[] = []
		try {
			const parsed = JSON.parse(getFromLocalStorage(storageKey(sourceId)) ?? '[]')
			if (Array.isArray(parsed)) {
				stored = parsed.filter((id): id is TLLibraryId => typeof id === 'string')
			}
		} catch {
			// A corrupt entry starts the list over.
		}
		recents = atom('recent libraries', stored)
		recentsBySource.set(sourceId, recents)
	}
	return recents
}

/** Notes that the current user just added to a library, in this browser. */
export function recordRecentLibrary(sourceId: string, libraryId: TLLibraryId) {
	const recents = getRecents(sourceId)
	const next = [libraryId, ...recents.get().filter((id) => id !== libraryId)].slice(0, MAX_RECENT)
	recents.set(next)
	setInLocalStorage(storageKey(sourceId), JSON.stringify(next))
}

/**
 * Libraries the current user added to most recently come first, in the order they were last
 * added to; the rest follow in the source's order. Reactive.
 */
export function sortByRecentlyAddedTo(sourceId: string, libraries: TLLibrary[]) {
	const recents = getRecents(sourceId).get()
	const rank = (id: TLLibraryId) => {
		const index = recents.indexOf(id)
		return index === -1 ? recents.length : index
	}
	return libraries
		.map((library, index) => ({ library, index }))
		.sort((a, b) => rank(a.library.id) - rank(b.library.id) || a.index - b.index)
		.map(({ library }) => library)
}
