import { TlaEffectOutbox, TlaLibraryItemObject } from '@tldraw/dotcom-shared'

export type LibraryItemObject = Pick<TlaLibraryItemObject, 'bucket' | 'objectName'>

export interface LibraryItemObjectEffectDeps {
	/** Whether a library_item_object row names the object. */
	isObjectUsed(object: LibraryItemObject): Promise<boolean>
	deleteObject(object: LibraryItemObject): Promise<void>
}

/**
 * Deletes an R2 object the last library item using it no longer needs: the effect's payload names
 * it. The row is a wake-up signal: an item that names the object again by the time it is drained
 * keeps it.
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
