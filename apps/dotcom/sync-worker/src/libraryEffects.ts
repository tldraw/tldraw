import { TlaLibraryItem, TlaEffectOutbox } from '@tldraw/dotcom-shared'
import { getLibraryItemContentKey } from './libraryStorage'
import { getThumbnailObjectNames } from './libraryThumbnails'

export interface LibraryItemEffectDeps {
	deleteStoredObjects(keys: string[]): Promise<void>
	deleteUploads(objectNames: string[]): Promise<void>
}

/**
 * Removes a deleted item's stored content and its thumbnails' uploads, which the deleted row, the
 * effect's payload, names. Its row is gone whether the item was deleted on its own or with its
 * library or workspace, so nothing can ask for them again.
 */
export async function processLibraryItemEffect(deps: LibraryItemEffectDeps, row: TlaEffectOutbox) {
	// Invariant: caller must route only tableName === 'library_item' rows here.
	if (row.command !== 'delete') return
	const { thumbnail } = row.payload as Pick<TlaLibraryItem, 'thumbnail'>
	const thumbnailUploads = getThumbnailObjectNames(thumbnail ?? null)
	if (thumbnailUploads.length > 0) await deps.deleteUploads(thumbnailUploads)
	await deps.deleteStoredObjects([getLibraryItemContentKey(row.entityId)])
}
