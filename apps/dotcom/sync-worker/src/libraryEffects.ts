import { TlaLibraryItem, TlaEffectOutbox } from '@tldraw/dotcom-shared'
import { getLibraryItemContentKey } from './libraryStorage'
import { getThumbnailObjectNames } from './libraryThumbnails'

export interface LibraryItemEffectDeps {
	deleteStoredObjects(keys: string[]): Promise<void>
	/** The uploads-bucket objects the item owns (library_item_asset). */
	getOwnedUploads(itemId: string): Promise<string[]>
	deleteUploads(objectNames: string[]): Promise<void>
	forgetOwnedUploads(itemId: string): Promise<void>
}

/**
 * Removes a deleted item's stored content, its thumbnails' uploads, which the deleted row, the
 * effect's payload, names, and the uploads it owned. Its row is gone whether the item was deleted
 * on its own or with its library or workspace, so nothing can ask for them again. The ownership
 * rows go only after their objects, so a retry finds them.
 */
export async function processLibraryItemEffect(deps: LibraryItemEffectDeps, row: TlaEffectOutbox) {
	// Invariant: caller must route only tableName === 'library_item' rows here.
	if (row.command !== 'delete') return
	const itemId = row.entityId
	const { thumbnail } = row.payload as Pick<TlaLibraryItem, 'thumbnail'>
	const uploads = [
		...getThumbnailObjectNames(thumbnail ?? null),
		...(await deps.getOwnedUploads(itemId)),
	]
	if (uploads.length > 0) await deps.deleteUploads(uploads)
	await deps.forgetOwnedUploads(itemId)
	await deps.deleteStoredObjects([getLibraryItemContentKey(itemId)])
}
