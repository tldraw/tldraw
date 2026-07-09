import { DB } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { TLComment, TLCommentThread, TLRecord } from '@tldraw/tlschema'

/**
 * Conversions between the room's comment records and their Postgres rows. Postgres is the sole
 * durable store for comment records: `record` (jsonb) holds the exact serialized TLRecord and
 * `lastChangedClock` its sync clock, so the Durable Object can rehydrate its room losslessly on
 * cold start. The remaining columns are denormalized copies for app-level Zero queries.
 */

export function threadRecordToRow(
	record: TLCommentThread,
	fileId: string,
	lastChangedClock: number
): DB['comment_thread'] {
	return {
		id: record.id,
		fileId,
		pageId: record.pageId,
		shapeId: record.anchor.type === 'shape' ? record.anchor.shapeId : null,
		resolved: record.resolved !== null,
		createdBy: record.createdBy,
		createdAt: record.createdAt,
		record,
		lastChangedClock,
	}
}

export function commentRecordToRow(
	record: TLComment,
	thread: TLCommentThread | undefined,
	fileId: string,
	lastChangedClock: number
): DB['comment'] {
	return {
		id: record.id,
		fileId,
		threadId: record.threadId,
		pageId: record.pageId,
		authorId: record.authorId,
		shapeId: thread?.anchor.type === 'shape' ? thread.anchor.shapeId : null,
		// rich text stored as-is (JSONB) — preserves the authoritative representation. TLRichText
		// types its content as unknown[], which doesn't structurally satisfy zero's
		// ReadonlyJSONValue, but the value is schema-validated JSON.
		body: record.body as DB['comment']['body'],
		createdAt: record.createdAt,
		updatedAt: record.editedAt ?? record.createdAt,
		record,
		lastChangedClock,
	}
}

/**
 * Rebuild object-lane snapshot documents from Postgres rows, for merging into the room snapshot
 * on load. Clocks come back as strings from pg's bigint parsing, so coerce.
 */
export function rowsToSnapshotDocuments(
	threadRows: DB['comment_thread'][],
	commentRows: DB['comment'][]
): RoomSnapshot['documents'] {
	return [...threadRows, ...commentRows].map((row) => ({
		state: row.record as TLRecord,
		lastChangedClock: Number(row.lastChangedClock),
	}))
}
