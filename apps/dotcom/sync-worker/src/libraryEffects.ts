import { DB, TlaEffectOutbox, TlaLibraryItemObject } from '@tldraw/dotcom-shared'
import { Kysely, sql } from 'kysely'

// A board's asset can point at a library item's upload until the board's asset association pass
// copies it, which runs when the board next persists (PERSIST_INTERVAL_MS). An object no item names
// any more is kept this long before it's deleted, so deleting the item in that window doesn't break
// the board's image.
export const LIBRARY_OBJECT_DELETE_GRACE_MS = 10 * 60_000

export type LibraryItemObject = Pick<TlaLibraryItemObject, 'bucket' | 'objectName'>

export interface LibraryItemObjectEffectDeps {
	/** Whether a library_item_object row names the object. */
	isObjectUsed(object: LibraryItemObject): Promise<boolean>
	deleteObject(object: LibraryItemObject): Promise<void>
}

/**
 * Deletes an R2 object no library item names, queued when the last row naming it goes or before
 * an add stores it (queueLibraryObjectDeletes): the effect's payload names it. Rows are drained once they're older than LIBRARY_OBJECT_DELETE_GRACE_MS, and each is a
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

/**
 * Queues each object for deletion, as library_item_object's delete trigger does (057), before a
 * request stores it: if the request fails, or the worker is stopped, before rows name the objects,
 * the processor deletes them once the grace period has passed. Objects rows name by then are kept.
 */
export async function queueLibraryObjectDeletes(db: Kysely<DB>, objects: LibraryItemObject[]) {
	if (objects.length === 0) return
	const rows = objects.map(
		({ bucket, objectName }) =>
			sql`('library_item_object', ${`${bucket}/${objectName}`}, 'delete', ${JSON.stringify({ bucket, objectName })}::jsonb)`
	)
	await sql`INSERT INTO effect_outbox ("tableName", "entityId", command, payload) VALUES ${sql.join(rows)}`.execute(
		db
	)
}
