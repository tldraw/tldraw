import { DB } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { TLComment, TLCommentAnchor, TLCommentThread } from '@tldraw/tlschema'
import { JsonObject } from '@tldraw/utils'

/**
 * Conversions between the room's comment records and their Postgres rows. Postgres is the sole
 * durable store for comment records: the columns collectively carry every record field, so the
 * Durable Object can rebuild the records losslessly on cold start (`rowTo*Record`), and the
 * Zero-visible subset serves app-level queries. `lastChangedClock` preserves each record's sync
 * clock across reloads and guards upserts against no-op replays. Timestamps and clocks come back
 * from pg's bigint parsing as strings, so reads coerce with Number().
 */

/**
 * True when `error` is Postgres rejecting a comment upsert because its author's user row no
 * longer exists: foreign key violation (code 23503) on `comment_author_id_fkey`. Deleting a user
 * cascades their comment rows away in Postgres (`ON DELETE CASCADE`), so hitting this means a
 * warm room still holds comment records for a since-deleted author. The caller mirrors the
 * cascade into the room by pruning those records instead of retrying the upsert forever.
 *
 * The error shape (`code`/`constraint`) is what node-postgres surfaces on `DatabaseError` and
 * kysely rethrows unchanged; both fields must match so unrelated FK failures keep the normal
 * at-least-once retry behavior.
 */
export function isCommentAuthorFkViolation(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false
	const { code, constraint } = error as { code?: unknown; constraint?: unknown }
	return code === '23503' && constraint === 'comment_author_id_fkey'
}

export function threadRecordToRow(
	record: TLCommentThread,
	fileId: string,
	lastChangedClock: number
): DB['comment_thread'] {
	return {
		id: record.id,
		fileId,
		pageId: record.pageId,
		anchor: record.anchor,
		shapeId: record.anchor.type === 'shape' ? record.anchor.shapeId : null,
		resolvedAt: record.resolved?.at ?? null,
		resolvedBy: record.resolved?.by ?? null,
		createdBy: record.createdBy,
		createdAt: record.createdAt,
		meta: record.meta,
		lastChangedClock,
	}
}

export function commentRecordToRow(
	record: TLComment,
	fileId: string,
	lastChangedClock: number
): DB['comment'] {
	return {
		id: record.id,
		fileId,
		threadId: record.threadId,
		pageId: record.pageId,
		authorId: record.authorId,
		// rich text stored as-is (JSONB). TLRichText types its content as unknown[], which doesn't
		// structurally satisfy zero's ReadonlyJSONValue, but the value is schema-validated JSON.
		body: record.body as DB['comment']['body'],
		createdAt: record.createdAt,
		editedAt: record.editedAt,
		updatedAt: record.editedAt ?? record.createdAt,
		meta: record.meta,
		lastChangedClock,
	}
}

export function rowToThreadRecord(row: DB['comment_thread']): TLCommentThread {
	return {
		id: row.id as TLCommentThread['id'],
		typeName: 'comment-thread',
		pageId: row.pageId as TLCommentThread['pageId'],
		anchor: row.anchor as TLCommentAnchor,
		createdBy: row.createdBy,
		createdAt: Number(row.createdAt),
		resolved: row.resolvedAt != null ? { at: Number(row.resolvedAt), by: row.resolvedBy! } : null,
		meta: (row.meta ?? {}) as JsonObject,
	}
}

export function rowToCommentRecord(row: DB['comment']): TLComment {
	return {
		id: row.id as TLComment['id'],
		typeName: 'comment',
		threadId: row.threadId as TLComment['threadId'],
		pageId: row.pageId as TLComment['pageId'],
		authorId: row.authorId,
		createdAt: Number(row.createdAt),
		editedAt: row.editedAt != null ? Number(row.editedAt) : null,
		body: row.body as TLComment['body'],
		meta: (row.meta ?? {}) as JsonObject,
	}
}

/**
 * Rebuild object-lane snapshot documents from Postgres rows, for merging into the room snapshot
 * on load.
 */
export function rowsToSnapshotDocuments(
	threadRows: DB['comment_thread'][],
	commentRows: DB['comment'][]
): RoomSnapshot['documents'] {
	return [
		...threadRows.map((row) => ({
			state: rowToThreadRecord(row),
			lastChangedClock: Number(row.lastChangedClock),
		})),
		...commentRows.map((row) => ({
			state: rowToCommentRecord(row),
			lastChangedClock: Number(row.lastChangedClock),
		})),
	]
}

/**
 * Merge rehydrated comment documents into a room snapshot, clamping the snapshot's clocks up to
 * the highest merged clock. Comments push to Postgres per-commit while the document snapshot
 * persists on a throttle, so after a storage loss the comment clocks can be ahead of the
 * snapshot's — seeding the room clock below them would make future edits emit clocks the drain's
 * lastChangedClock guard rejects, silently dropping those edits from Postgres.
 *
 * `SQLiteSyncStorage` seeds its clock from `snapshot.documentClock ?? snapshot.clock ?? 0`, so we
 * clamp based on that effective value (setting `documentClock` when only a higher legacy `clock`
 * was present would lower the seed, not raise it) and keep `clock` \>= `documentClock` when both
 * are set.
 *
 * When the clamp fires, the room is claiming a clock higher than anything the stale snapshot
 * actually has history for — the delete/tombstone history between the snapshot's old clock and
 * `maxClock` lived only in the DO's SQLite storage that we just lost, so it's genuinely gone, not
 * merely unsynced. We raise `tombstoneHistoryStartsAtClock` to match so `wipeAll` fires for any
 * client reconnecting with `sinceClock` short of `maxClock`: that forces a full resync instead of
 * a partial incremental diff, which would otherwise let clients silently keep documents the
 * server can no longer account for.
 */
export function mergeCommentDocumentsIntoSnapshot(
	snapshot: RoomSnapshot,
	commentDocs: RoomSnapshot['documents']
): void {
	if (commentDocs.length === 0) return
	snapshot.documents = [...snapshot.documents, ...commentDocs]
	const maxClock = Math.max(...commentDocs.map((d) => d.lastChangedClock))
	const effectiveClock = snapshot.documentClock ?? snapshot.clock ?? 0
	if (effectiveClock >= maxClock) return
	snapshot.documentClock = maxClock
	if (snapshot.clock !== undefined && snapshot.clock < maxClock) {
		snapshot.clock = maxClock
	}
	snapshot.tombstoneHistoryStartsAtClock = maxClock
}
