import { atom, getFromLocalStorage, setInLocalStorage, type Atom } from '@tldraw/editor'
import type { TLLibraryId } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'

const toolbarsBySource = new Map<string, Atom<readonly TLLibraryId[]>>()

function storageKey(sourceId: string) {
	return `tldraw-libraries-toolbar:${sourceId}`
}

function getToolbar(sourceId: string) {
	let toolbar = toolbarsBySource.get(sourceId)
	if (!toolbar) {
		let stored: TLLibraryId[] = []
		try {
			const parsed = JSON.parse(getFromLocalStorage(storageKey(sourceId)) ?? '[]')
			if (Array.isArray(parsed)) {
				stored = parsed.filter((id): id is TLLibraryId => typeof id === 'string')
			}
		} catch {
			// A corrupt entry starts the toolbar empty.
		}
		toolbar = atom('toolbar libraries', stored)
		toolbarsBySource.set(sourceId, toolbar)
	}
	return toolbar
}

function setToolbar(sourceId: string, libraryIds: readonly TLLibraryId[]) {
	getToolbar(sourceId).set(libraryIds)
	setInLocalStorage(storageKey(sourceId), JSON.stringify(libraryIds))
}

/**
 * The libraries the current user has put in their toolbar, in the order they were put there. Kept
 * in this browser, per source, like the panel's other per-user choices. May list libraries the
 * source no longer has. Reactive.
 * @public
 */
export function getToolbarLibraryIds(source: LibrarySource): readonly TLLibraryId[] {
	return getToolbar(source.id).get()
}

/**
 * Puts a library at the end of the current user's toolbar. Does nothing if it's there already.
 * @public
 */
export function putLibraryInToolbar(source: LibrarySource, libraryId: TLLibraryId) {
	const libraryIds = getToolbarLibraryIds(source)
	if (libraryIds.includes(libraryId)) return
	setToolbar(source.id, [...libraryIds, libraryId])
}

/** @public */
export function removeLibraryFromToolbar(source: LibrarySource, libraryId: TLLibraryId) {
	setToolbar(
		source.id,
		getToolbarLibraryIds(source).filter((id) => id !== libraryId)
	)
}
