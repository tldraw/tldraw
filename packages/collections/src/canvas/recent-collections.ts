import { atom, getFromLocalStorage, setInLocalStorage, type Atom } from '@tldraw/editor'
import type { TLCollection, TLCollectionId } from '../lib/schema'

const MAX_RECENT = 20

// Per source, so two sources that happen to share collection ids don't share recents.
const recentsBySource = new Map<string, Atom<TLCollectionId[]>>()

function storageKey(sourceId: string) {
	return `tldraw-collections-recent:${sourceId}`
}

function getRecents(sourceId: string) {
	let recents = recentsBySource.get(sourceId)
	if (!recents) {
		let stored: TLCollectionId[] = []
		try {
			const parsed = JSON.parse(getFromLocalStorage(storageKey(sourceId)) ?? '[]')
			if (Array.isArray(parsed)) {
				stored = parsed.filter((id): id is TLCollectionId => typeof id === 'string')
			}
		} catch {
			// A corrupt entry starts the list over.
		}
		recents = atom('recent collections', stored)
		recentsBySource.set(sourceId, recents)
	}
	return recents
}

/** Notes that the current user just saved to a collection, in this browser. */
export function recordRecentCollection(sourceId: string, collectionId: TLCollectionId) {
	const recents = getRecents(sourceId)
	const next = [collectionId, ...recents.get().filter((id) => id !== collectionId)].slice(
		0,
		MAX_RECENT
	)
	recents.set(next)
	setInLocalStorage(storageKey(sourceId), JSON.stringify(next))
}

/**
 * Collections the current user saved to most recently come first, in the order they were last
 * saved to; the rest follow in the source's order. Reactive.
 */
export function sortByRecentlySavedTo(sourceId: string, collections: TLCollection[]) {
	const recents = getRecents(sourceId).get()
	const rank = (id: TLCollectionId) => {
		const index = recents.indexOf(id)
		return index === -1 ? recents.length : index
	}
	return collections
		.map((collection, index) => ({ collection, index }))
		.sort((a, b) => rank(a.collection.id) - rank(b.collection.id) || a.index - b.index)
		.map(({ collection }) => collection)
}
