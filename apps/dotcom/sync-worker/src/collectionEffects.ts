import { TlaEffectOutbox } from '@tldraw/dotcom-shared'
import { getCollectionItemContentKey, getCollectionItemThumbnailKey } from './collectionStorage'

export interface CollectionItemEffectDeps {
	deleteStoredObjects(keys: string[]): Promise<void>
	/** The uploads-bucket objects the item owns (collection_item_asset). */
	getOwnedUploads(itemId: string): Promise<string[]>
	deleteUploads(objectNames: string[]): Promise<void>
	forgetOwnedUploads(itemId: string): Promise<void>
}

/**
 * Removes a deleted item's stored content and thumbnail, and the uploads it owned. Its row is gone
 * whether the item was deleted on its own or with its collection or workspace, so nothing can ask
 * for them again. The ownership rows go only after their objects, so a retry finds them.
 */
export async function processCollectionItemEffect(
	deps: CollectionItemEffectDeps,
	row: TlaEffectOutbox
) {
	// Invariant: caller must route only tableName === 'collection_item' rows here.
	if (row.command !== 'delete') return
	const itemId = row.entityId
	const uploads = await deps.getOwnedUploads(itemId)
	if (uploads.length > 0) await deps.deleteUploads(uploads)
	await deps.forgetOwnedUploads(itemId)
	await deps.deleteStoredObjects([
		getCollectionItemContentKey(itemId),
		getCollectionItemThumbnailKey(itemId),
	])
}
