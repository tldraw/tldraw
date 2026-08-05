import { DB, extractMentionIds } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import {
	TLComment,
	TLCommentAnchor,
	TLCommentReaction,
	TLCommentThread,
	commentReactionRecordConfig,
	commentRecordConfig,
	commentThreadRecordConfig,
	isCommentId,
	isCommentReactionId,
	isCommentThreadId,
} from '@tldraw/tlschema'
import { JsonObject } from '@tldraw/utils'

/**
 * Conversions between the room's comment records and their Postgres rows. Postgres is the sole
 * durable store, so the columns carry every record field and the DO can rebuild records losslessly
 * on cold start. Timestamps and clocks go through Number() in case the global int8-to-number parser
 * in `postgres.ts` ever goes away.
 */

/**
 * The author's user row is gone — deleting a user cascades their comment rows away, so a warm room
 * is still holding records for a deleted author. Retrying can't succeed; the caller prunes.
 */
export function isCommentAuthorFkViolation(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false
	const { code, constraint } = error as { code?: unknown; constraint?: unknown }
	return code === '23503' && constraint === 'comment_author_id_fkey'
}

/**
 * The thread's file row doesn't exist: the file was deleted, or a client pushed comments into a
 * room whose slug was never a `file` row. Neither can succeed on retry, so the caller prunes.
 */
export function isCommentThreadFkViolation(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false
	const { code, constraint } = error as { code?: unknown; constraint?: unknown }
	return code === '23503' && constraint === 'comment_thread_file_id_fkey'
}

/** The comment's file row is gone, cascading every comment row with it. The caller prunes. */
export function isCommentFileFkViolation(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false
	const { code, constraint } = error as { code?: unknown; constraint?: unknown }
	return code === '23503' && constraint === 'comment_file_id_fkey'
}

/**
 * The comment's thread row doesn't exist. Unlike the other FK matchers this is NOT on its own
 * sufficient to prune: threads upsert before comments in the same drain, so a thread whose own
 * upsert just failed transiently also fails its comments' FK, and it's still queued to retry.
 * The caller only prunes when the threadId is also absent from the room's lane.
 */
export function isCommentThreadIdFkViolation(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false
	const { code, constraint } = error as { code?: unknown; constraint?: unknown }
	return code === '23503' && constraint === 'comment_thread_id_fkey'
}

/**
 * A `comment_mention` insert hit either of its foreign keys: the mentioned user is gone, or the
 * comment was deleted between its upsert and the mention write. The caller skips the row.
 */
export function isCommentMentionFkViolation(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false
	const { code, constraint } = error as { code?: unknown; constraint?: unknown }
	return (
		code === '23503' &&
		(constraint === 'comment_mention_user_id_fkey' ||
			constraint === 'comment_mention_comment_id_fkey')
	)
}

/**
 * A reaction's comment, thread, or user row is gone, cascading the reaction rows with it. The
 * caller prunes.
 */
export function isCommentReactionFkViolation(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false
	const { code, constraint } = error as { code?: unknown; constraint?: unknown }
	return (
		code === '23503' &&
		(constraint === 'comment_reaction_comment_id_fkey' ||
			constraint === 'comment_reaction_thread_id_fkey' ||
			constraint === 'comment_reaction_user_id_fkey')
	)
}

/** One comment's desired `comment_mention` rows: the full set its body currently mentions. */
export interface CommentMentionReconcile {
	commentId: string
	userIds: string[]
}

/**
 * The desired end state of `comment_mention` for a drain's upserted comments. The caller
 * reconciles Postgres to this (delete rows not in the set, insert the rest with ON CONFLICT DO
 * NOTHING), so an at-least-once replay is a no-op rather than WAL churn for Zero.
 */
export function planMentionReconciles(commentRows: DB['comment'][]): CommentMentionReconcile[] {
	return commentRows.map((row) => ({
		commentId: row.id,
		userIds: extractMentionIds(row.body),
	}))
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
		isDeleted: record.isDeleted,
		createdBy: record.createdBy,
		createdAt: record.createdAt,
		meta: record.meta,
		lastChangedClock,
	}
}

export function reactionRecordToRow(
	record: TLCommentReaction,
	fileId: string,
	lastChangedClock: number
): DB['comment_reaction'] {
	return {
		id: record.id,
		fileId,
		commentId: record.commentId,
		threadId: record.threadId,
		pageId: record.pageId,
		userId: record.userId,
		// stamped by Postgres (set_comment_reaction_user_name_trigger); value here is ignored
		userName: '',
		emoji: record.emoji,
		// client-dated; clamp so it can't outrun the server-clamped comment_read.readAt watermark,
		// which would make a "reacted to your comment" notification impossible to mark read
		createdAt: Math.min(record.createdAt, Date.now()),
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
		// placeholders — a Postgres trigger stamps the real values on insert (migration 040)
		authorName: '',
		authorColor: '',
		authorAvatar: '',
		// TLRichText's content is unknown[], not structurally a zero ReadonlyJSONValue
		body: record.body as DB['comment']['body'],
		// client-dated placeholder — a Postgres trigger re-stamps it with server arrival time on
		// insert (migration 046), and the upsert's conflict branch never writes this column
		createdAt: record.createdAt,
		editedAt: record.editedAt,
		isDeleted: record.isDeleted,
		updatedAt: record.editedAt ?? record.createdAt,
		meta: record.meta,
		lastChangedClock,
	}
}

export function rowToThreadRecord(row: DB['comment_thread']): TLCommentThread {
	const record: TLCommentThread = {
		id: row.id as TLCommentThread['id'],
		typeName: 'comment-thread',
		pageId: row.pageId as TLCommentThread['pageId'],
		anchor: row.anchor as TLCommentAnchor,
		createdBy: row.createdBy,
		createdAt: Number(row.createdAt),
		resolved: row.resolvedAt != null ? { at: Number(row.resolvedAt), by: row.resolvedBy! } : null,
		isDeleted: row.isDeleted,
		meta: (row.meta ?? {}) as JsonObject,
	}
	// The fields above are raw casts, so validate: a corrupt row should fail the room open rather
	// than seed an invalid record.
	return commentThreadRecordConfig.validator.validate(record) as TLCommentThread
}

export function rowToCommentRecord(row: DB['comment']): TLComment {
	const record: TLComment = {
		id: row.id as TLComment['id'],
		typeName: 'comment',
		threadId: row.threadId as TLComment['threadId'],
		pageId: row.pageId as TLComment['pageId'],
		authorId: row.authorId,
		createdAt: Number(row.createdAt),
		editedAt: row.editedAt != null ? Number(row.editedAt) : null,
		body: row.body as TLComment['body'],
		isDeleted: row.isDeleted,
		meta: (row.meta ?? {}) as JsonObject,
	}
	// The fields above are raw casts, so validate: a corrupt row should fail the room open rather
	// than seed an invalid record.
	return commentRecordConfig.validator.validate(record) as TLComment
}

export function rowToReactionRecord(row: DB['comment_reaction']): TLCommentReaction {
	const record: TLCommentReaction = {
		id: row.id as TLCommentReaction['id'],
		typeName: 'comment-reaction',
		commentId: row.commentId as TLCommentReaction['commentId'],
		threadId: row.threadId as TLCommentReaction['threadId'],
		pageId: row.pageId as TLCommentReaction['pageId'],
		userId: row.userId,
		emoji: row.emoji,
		createdAt: Number(row.createdAt),
		meta: (row.meta ?? {}) as JsonObject,
	}
	// See rowToCommentRecord.
	return commentReactionRecordConfig.validator.validate(record) as TLCommentReaction
}

/**
 * Rebuild object-lane snapshot documents from Postgres rows, for merging into the room snapshot
 * on load.
 */
export function rowsToSnapshotDocuments(
	threadRows: DB['comment_thread'][],
	commentRows: DB['comment'][],
	reactionRows: DB['comment_reaction'][] = []
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
		...reactionRows.map((row) => ({
			state: rowToReactionRecord(row),
			lastChangedClock: Number(row.lastChangedClock),
		})),
	]
}

/** The room-seedable subset of a file's comment rows; see {@link liveCommentDocuments}. */
export interface CommentLoadResult {
	documents: RoomSnapshot['documents']
	/**
	 * The highest `lastChangedClock` across ALL of the file's comment rows, including soft-deleted
	 * ones dropped from `documents` — a dropped row can hold the file's highest clock, and seeding
	 * the room below it would make future edits emit clocks the drain's guard rejects.
	 */
	clockFloor: number
}

/**
 * Build the room-seedable comment documents from a file's Postgres rows. Soft-deleted records stay
 * in Postgres for recovery and Zero-side filtering but never re-enter a room.
 *
 * A live thread whose comments are all soft-deleted is dropped too — the durable backstop for the
 * drain's emptied-thread prune, whose isDeleted stamp rides an outbox entry in DO SQLite. A thread
 * with no comment rows at all is kept: that's a new thread whose first comment hasn't drained.
 */
export function liveCommentDocuments(
	threadRows: DB['comment_thread'][],
	commentRows: DB['comment'][],
	reactionRows: DB['comment_reaction'][] = []
): CommentLoadResult {
	const threadIdsWithComments = new Set(commentRows.map((row) => row.threadId))
	const threadIdsWithLiveComments = new Set(
		commentRows.filter((row) => !row.isDeleted).map((row) => row.threadId)
	)
	const liveThreadRows = threadRows.filter(
		(row) =>
			!row.isDeleted &&
			(!threadIdsWithComments.has(row.id) || threadIdsWithLiveComments.has(row.id))
	)
	const liveThreadIds = new Set(liveThreadRows.map((row) => row.id))
	const liveCommentRows = commentRows.filter(
		(row) => !row.isDeleted && liveThreadIds.has(row.threadId)
	)
	const liveCommentIds = new Set(liveCommentRows.map((row) => row.id))
	const liveReactionRows = reactionRows.filter((row) => liveCommentIds.has(row.commentId))
	let clockFloor = 0
	for (const row of threadRows) clockFloor = Math.max(clockFloor, Number(row.lastChangedClock))
	for (const row of commentRows) clockFloor = Math.max(clockFloor, Number(row.lastChangedClock))
	for (const row of reactionRows) clockFloor = Math.max(clockFloor, Number(row.lastChangedClock))
	return {
		documents: rowsToSnapshotDocuments(liveThreadRows, liveCommentRows, liveReactionRows),
		clockFloor,
	}
}

/** A row of the DO's `comment_outbox` table: a monotonic sequence number and the touched record id. */
export interface CommentOutboxEntry {
	seq: number
	recordId: string
}

/**
 * Postgres writes grouped by table and operation. The delete buckets carry lane-absent ids, and
 * "delete" means stamping `isDeleted` — the drain never hard-deletes comment-lane rows.
 */
export interface CommentDrainPlan {
	threadUpserts: DB['comment_thread'][]
	commentUpserts: DB['comment'][]
	reactionUpserts: DB['comment_reaction'][]
	threadDeletes: string[]
	commentDeletes: string[]
	reactionDeletes: string[]
	/** Ids of no known comment record type — a bug or a corrupted outbox row. */
	unknownIds: string[]
}

/**
 * The pure planning half of the comment outbox drain (see drainCommentOutbox). The outbox stores
 * only ids; upsert-vs-delete is decided by presence in the object `lane` at plan time, so multiple
 * entries for one record coalesce into a single write and a create-then-prune nets out to a delete.
 */
export function planCommentDrain(
	entries: CommentOutboxEntry[],
	lane: ReadonlyMap<string, { state: unknown; lastChangedClock: number }>,
	fileId: string
): CommentDrainPlan {
	const plan: CommentDrainPlan = {
		threadUpserts: [],
		commentUpserts: [],
		reactionUpserts: [],
		threadDeletes: [],
		commentDeletes: [],
		reactionDeletes: [],
		unknownIds: [],
	}
	const pendingIds = new Set(entries.map((e) => e.recordId))
	for (const id of pendingIds) {
		const doc = lane.get(id)
		if (isCommentThreadId(id)) {
			if (doc) {
				plan.threadUpserts.push(
					threadRecordToRow(doc.state as TLCommentThread, fileId, doc.lastChangedClock)
				)
			} else {
				plan.threadDeletes.push(id)
			}
		} else if (isCommentReactionId(id)) {
			if (doc) {
				plan.reactionUpserts.push(
					reactionRecordToRow(doc.state as TLCommentReaction, fileId, doc.lastChangedClock)
				)
			} else {
				plan.reactionDeletes.push(id)
			}
		} else if (isCommentId(id)) {
			if (doc) {
				plan.commentUpserts.push(
					commentRecordToRow(doc.state as TLComment, fileId, doc.lastChangedClock)
				)
			} else {
				plan.commentDeletes.push(id)
			}
		} else {
			plan.unknownIds.push(id)
		}
	}
	return plan
}

/**
 * Which outbox entries a finished drain may delete. `failedIds` stay queued for the next drain;
 * everything else clears. `clearAll` is the fast path when nothing failed.
 */
export function outboxEntriesToClear(
	entries: CommentOutboxEntry[],
	failedIds: ReadonlySet<string>
): { clearAll: boolean; seqs: number[] } {
	if (failedIds.size === 0) {
		return { clearAll: true, seqs: [] }
	}
	return {
		clearAll: false,
		seqs: entries.filter((e) => !failedIds.has(e.recordId)).map((e) => e.seq),
	}
}

/**
 * Of the just-pruned comments' threads, which no longer have any comments. Callers delete those
 * threads in the same transaction: an emptied thread never renders, and no client may delete a
 * thread it didn't create, so the ordinary "delete the last comment" path needs this prune.
 *
 * `remaining` must be transaction-time, not an earlier lane snapshot — a reply committed in
 * between has to keep its thread alive.
 */
export function findEmptiedCommentThreads(
	candidateThreadIds: ReadonlySet<string>,
	remaining: { keys(): Iterable<string>; get(id: string): unknown }
): string[] {
	if (candidateThreadIds.size === 0) return []
	const emptied = new Set(candidateThreadIds)
	for (const id of remaining.keys()) {
		if (!isCommentId(id)) continue
		const threadId = (remaining.get(id) as TLComment | undefined)?.threadId
		if (threadId !== undefined && emptied.delete(threadId) && emptied.size === 0) break
	}
	return [...emptied]
}

/**
 * Reactions pointing at just-pruned comments. Postgres already cascaded these rows away, so this
 * only catches the warm room's SQLite up.
 */
export function findOrphanedReactions(
	prunedCommentIds: ReadonlySet<string>,
	remaining: { keys(): Iterable<string>; get(id: string): unknown }
): string[] {
	if (prunedCommentIds.size === 0) return []
	const orphaned: string[] = []
	for (const id of remaining.keys()) {
		if (!isCommentReactionId(id)) continue
		const commentId = (remaining.get(id) as TLCommentReaction | undefined)?.commentId
		if (commentId !== undefined && prunedCommentIds.has(commentId)) orphaned.push(id)
	}
	return orphaned
}

/**
 * Merge rehydrated comment documents into a room snapshot, clamping the snapshot's clocks up to
 * the load's `clockFloor`. Comments push to Postgres per-commit while the snapshot persists on a
 * throttle, so after a storage loss the comment clocks can be ahead — seeding the room below them
 * would make future edits emit clocks the drain's guard silently rejects.
 *
 * The clamp works off `documentClock ?? clock ?? 0`, matching how `SQLiteSyncStorage` seeds.
 * `tombstoneHistoryStartsAtClock` rises with it: the tombstone history for that range lived only
 * in the lost SQLite, so reconnecting clients must full-resync rather than take a partial diff.
 */
export function mergeCommentDocumentsIntoSnapshot(
	snapshot: RoomSnapshot,
	load: CommentLoadResult
): void {
	const { documents: commentDocs, clockFloor } = load
	if (commentDocs.length === 0 && clockFloor === 0) return
	if (commentDocs.length > 0) {
		snapshot.documents = [...snapshot.documents, ...commentDocs]
	}
	const maxClock = Math.max(clockFloor, ...commentDocs.map((d) => d.lastChangedClock))
	const effectiveClock = snapshot.documentClock ?? snapshot.clock ?? 0
	if (effectiveClock >= maxClock) return
	snapshot.documentClock = maxClock
	if (snapshot.clock !== undefined && snapshot.clock < maxClock) {
		snapshot.clock = maxClock
	}
	snapshot.tombstoneHistoryStartsAtClock = maxClock
}
