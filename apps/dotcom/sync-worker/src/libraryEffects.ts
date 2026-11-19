import { TlaEffectOutbox, TlaLibraryItemObject } from '@tldraw/dotcom-shared'

// A board's asset can point at a library item's upload until the board's asset association pass
// copies it, which runs when the board next persists (PERSIST_INTERVAL_MS), or, for an item placed
// while offline, once the client reconnects and the board persists. An object no item names any
// more is kept this long before it's deleted, so deleting the item in that window doesn't break the
// board's image.
export const LIBRARY_OBJECT_DELETE_GRACE_MS = 24 * 60 * 60_000

export type LibraryItemObject = Pick<TlaLibraryItemObject, 'bucket' | 'objectName'>

export interface LibraryItemObjectEffectDeps {
	/** Whether a library_item_object row names the object. */
	isObjectUsed(object: LibraryItemObject): Promise<boolean>
	deleteObject(object: LibraryItemObject): Promise<void>
}

/**
 * Deletes an R2 object the last library item using it no longer needs: the effect's payload names
 * it. Rows are drained once they're older than LIBRARY_OBJECT_DELETE_GRACE_MS, and each is a
 * wake-up signal: an item that names the object again by then keeps it.
 */
export async function processLibraryItemObjectEffect(
	deps: LibraryItemObjectEffectDeps,
	row: TlaEffectOutbox
) {
	// Invariant: caller must route only tableName === 'library_item_object' rows here.
	if (row.command !== 'delete') return
	const { bucket, objectName } = row.payload as LibraryItemObject
	if (await deps.isObjectUsed({ bucket, objectName })) return
	await deps.deleteObject({ bucket, objectName })
}
