import { TlaEffectOutbox } from '@tldraw/dotcom-shared'
import { getCollectionItemContentKey, getCollectionItemThumbnailKey } from './collectionStorage'

export interface CollectionItemEffectDeps {
	deleteStoredObjects(keys: string[]): Promise<void>
}

/**
 * Removes a deleted item's stored content and thumbnail. Its row is gone whether the item was
 * deleted on its own or with its collection or workspace, so nothing can ask for them again.
 */
export async function processCollectionItemEffect(
	deps: CollectionItemEffectDeps,
	row: TlaEffectOutbox
) {
	// Invariant: caller must route only tableName === 'collection_item' rows here.
	if (row.command !== 'delete') return
	await deps.deleteStoredObjects([
		getCollectionItemContentKey(row.entityId),
		getCollectionItemThumbnailKey(row.entityId),
	])
}
