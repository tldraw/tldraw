import { RoomSnapshot } from '@tldraw/sync-core'
import {
	createComment,
	createCommentThread,
	TLPageId,
	TLRichText,
	TLShapeId,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import {
	CommentOutboxEntry,
	commentRecordToRow,
	findEmptiedCommentThreads,
	isCommentAuthorFkViolation,
	mergeCommentDocumentsIntoSnapshot,
	outboxEntriesToClear,
	planCommentDrain,
	rowsToSnapshotDocuments,
	rowToCommentRecord,
	rowToThreadRecord,
	threadRecordToRow,
} from './commentRows'

const pageId = 'page:page1' as TLPageId
const shapeId = 'shape:box1' as TLShapeId
// minimal rich text doc; passes richTextValidator (which rowToCommentRecord now runs)
const body = { type: 'doc', content: [] } as unknown as TLRichText

function makeThread(anchor = { type: 'shape' as const, shapeId, x: 0.5, y: 0.5, isPrecise: true }) {
	return createCommentThread({ pageId, anchor, createdBy: 'user1', now: 1000 })
}

describe('threadRecordToRow', () => {
	it('resolved thread with shape anchor: resolvedAt/resolvedBy set, shapeId denormalized', () => {
		const thread = { ...makeThread(), resolved: { at: 2000, by: 'user2' } }
		const row = threadRecordToRow(thread, 'file1', 42)
		expect(row).toEqual({
			id: thread.id,
			fileId: 'file1',
			pageId,
			anchor: thread.anchor,
			shapeId,
			resolvedAt: 2000,
			resolvedBy: 'user2',
			createdBy: 'user1',
			createdAt: 1000,
			meta: thread.meta,
			lastChangedClock: 42,
		})
	})

	it('open thread with point anchor: shapeId/resolvedAt/resolvedBy all null', () => {
		const thread = makeThread({ type: 'point', x: 10, y: 20 } as any)
		const row = threadRecordToRow(thread, 'file1', 1)
		expect(row.shapeId).toBeNull()
		expect(row.resolvedAt).toBeNull()
		expect(row.resolvedBy).toBeNull()
	})
})

describe('commentRecordToRow', () => {
	it('editedAt null: updatedAt falls back to createdAt', () => {
		const thread = makeThread()
		const comment = createComment({
			threadId: thread.id,
			pageId,
			authorId: 'user1',
			body,
			now: 1500,
		})
		const row = commentRecordToRow(comment, 'file1', 43)
		expect(row).toEqual({
			id: comment.id,
			fileId: 'file1',
			threadId: thread.id,
			pageId,
			authorId: 'user1',
			body: comment.body,
			createdAt: 1500,
			editedAt: null,
			updatedAt: 1500,
			meta: comment.meta,
			lastChangedClock: 43,
		})
	})

	it('editedAt set: both editedAt and updatedAt carry the edited value', () => {
		const thread = makeThread()
		const comment = {
			...createComment({
				threadId: thread.id,
				pageId,
				authorId: 'user1',
				body,
				now: 1500,
			}),
			editedAt: 1600,
		}
		const row = commentRecordToRow(comment, 'file1', 44)
		expect(row.editedAt).toBe(1600)
		expect(row.updatedAt).toBe(1600)
	})
})

describe('isCommentAuthorFkViolation', () => {
	it('matches a pg foreign key violation on comment_author_id_fkey', () => {
		// shape of node-postgres's DatabaseError for `insert ... violates foreign key constraint`
		const error = Object.assign(new Error('violates foreign key constraint'), {
			code: '23503',
			constraint: 'comment_author_id_fkey',
		})
		expect(isCommentAuthorFkViolation(error)).toBe(true)
	})

	it('requires both the code and the constraint to match', () => {
		expect(
			isCommentAuthorFkViolation(
				Object.assign(new Error(), { code: '23503', constraint: 'comment_thread_id_fkey' })
			)
		).toBe(false)
		expect(
			isCommentAuthorFkViolation(
				Object.assign(new Error(), { code: '23505', constraint: 'comment_author_id_fkey' })
			)
		).toBe(false)
		expect(isCommentAuthorFkViolation(Object.assign(new Error(), { code: '23503' }))).toBe(false)
	})

	it('rejects non-object and empty errors', () => {
		expect(isCommentAuthorFkViolation(null)).toBe(false)
		expect(isCommentAuthorFkViolation(undefined)).toBe(false)
		expect(isCommentAuthorFkViolation('23503')).toBe(false)
		expect(isCommentAuthorFkViolation(new Error('connection refused'))).toBe(false)
	})
})

describe('round-trip: record -> row -> rowTo*Record', () => {
	it('resolved shape-anchored thread', () => {
		const thread = { ...makeThread(), resolved: { at: 2000, by: 'user2' } }
		const row = threadRecordToRow(thread, 'file1', 42)
		expect(rowToThreadRecord(row)).toEqual(thread)
	})

	it('open point-anchored thread', () => {
		const thread = makeThread({ type: 'point', x: 10, y: 20 } as any)
		const row = threadRecordToRow(thread, 'file1', 1)
		expect(rowToThreadRecord(row)).toEqual(thread)
	})

	it('unedited comment', () => {
		const thread = makeThread()
		const comment = createComment({
			threadId: thread.id,
			pageId,
			authorId: 'user1',
			body,
			now: 1500,
		})
		const row = commentRecordToRow(comment, 'file1', 43)
		expect(rowToCommentRecord(row)).toEqual(comment)
	})

	it('edited comment with non-empty meta', () => {
		const thread = makeThread()
		const comment = {
			...createComment({
				threadId: thread.id,
				pageId,
				authorId: 'user1',
				body,
				now: 1500,
				meta: { pinned: true },
			}),
			editedAt: 1600,
		}
		const row = commentRecordToRow(comment, 'file1', 44)
		expect(rowToCommentRecord(row)).toEqual(comment)
	})
})

describe('rehydration validation', () => {
	it('rowToThreadRecord throws on a mangled anchor', () => {
		const row = threadRecordToRow(makeThread(), 'file1', 42)
		const corrupt = { ...row, anchor: { type: 'shape' } as any }
		expect(() => rowToThreadRecord(corrupt)).toThrow()
	})

	it('rowToCommentRecord throws on a mangled body', () => {
		const thread = makeThread()
		const comment = createComment({
			threadId: thread.id,
			pageId,
			authorId: 'user1',
			body,
			now: 1500,
		})
		const row = commentRecordToRow(comment, 'file1', 43)
		const corrupt = { ...row, body: 'not rich text' as any }
		expect(() => rowToCommentRecord(corrupt)).toThrow()
	})
})

describe('rowsToSnapshotDocuments', () => {
	it('round-trips records losslessly through rows', () => {
		const thread = makeThread()
		const comment = createComment({
			threadId: thread.id,
			pageId,
			authorId: 'user1',
			body,
			now: 1500,
		})
		const threadRow = threadRecordToRow(thread, 'file1', 42)
		const commentRow = commentRecordToRow(comment, 'file1', 43)
		expect(rowsToSnapshotDocuments([threadRow], [commentRow])).toEqual([
			{ state: thread, lastChangedClock: 42 },
			{ state: comment, lastChangedClock: 43 },
		])
	})

	it('coerces pg bigint-as-string clocks and timestamps to numbers', () => {
		const thread = { ...makeThread(), resolved: { at: 2000, by: 'user2' } }
		const comment = {
			...createComment({
				threadId: thread.id,
				pageId,
				authorId: 'user1',
				body,
				now: 1500,
			}),
			editedAt: 1600,
		}
		const threadRow = {
			...threadRecordToRow(thread, 'file1', 42),
			createdAt: '1000' as any,
			resolvedAt: '2000' as any,
			lastChangedClock: '42' as any,
		}
		const commentRow = {
			...commentRecordToRow(comment, 'file1', 43),
			createdAt: '1500' as any,
			editedAt: '1600' as any,
			lastChangedClock: '43' as any,
		}
		expect(rowsToSnapshotDocuments([threadRow], [commentRow])).toEqual([
			{ state: thread, lastChangedClock: 42 },
			{ state: comment, lastChangedClock: 43 },
		])
	})
})

describe('planCommentDrain', () => {
	function makeComment(threadId: ReturnType<typeof makeThread>['id']) {
		return createComment({ threadId, pageId, authorId: 'user1', body, now: 1500 })
	}

	function laneOf(...docs: { state: { id: string }; lastChangedClock: number }[]) {
		return new Map(docs.map((doc) => [doc.state.id, doc]))
	}

	function entriesOf(...recordIds: string[]): CommentOutboxEntry[] {
		return recordIds.map((recordId, i) => ({ seq: i + 1, recordId }))
	}

	it('classifies lane-present ids as upserts built via the row converters', () => {
		const thread = makeThread()
		const comment = makeComment(thread.id)
		const lane = laneOf(
			{ state: thread, lastChangedClock: 42 },
			{ state: comment, lastChangedClock: 43 }
		)
		expect(planCommentDrain(entriesOf(thread.id, comment.id), lane, 'file1')).toEqual({
			threadUpserts: [threadRecordToRow(thread, 'file1', 42)],
			commentUpserts: [commentRecordToRow(comment, 'file1', 43)],
			threadDeletes: [],
			commentDeletes: [],
			unknownIds: [],
		})
	})

	it('coalesces duplicate entries for one id into a single write', () => {
		const thread = makeThread()
		const lane = laneOf({ state: thread, lastChangedClock: 42 })
		const plan = planCommentDrain(entriesOf(thread.id, thread.id, thread.id), lane, 'file1')
		expect(plan.threadUpserts).toEqual([threadRecordToRow(thread, 'file1', 42)])
	})

	it('nets a create-then-delete out to a delete when the id is absent from the lane', () => {
		const thread = makeThread()
		const comment = makeComment(thread.id)
		const plan = planCommentDrain(
			entriesOf(thread.id, comment.id, thread.id, comment.id),
			new Map(),
			'file1'
		)
		expect(plan).toEqual({
			threadUpserts: [],
			commentUpserts: [],
			threadDeletes: [thread.id],
			commentDeletes: [comment.id],
			unknownIds: [],
		})
	})

	it('only considers ids present in the entries, not everything in the lane', () => {
		// the caller bounds entries to its drain's high-water mark; lane records outside the
		// entries belong to a later drain and must not leak into this plan
		const enqueued = makeThread()
		const laterThread = makeThread()
		const lane = laneOf(
			{ state: enqueued, lastChangedClock: 1 },
			{ state: laterThread, lastChangedClock: 2 }
		)
		const plan = planCommentDrain(entriesOf(enqueued.id), lane, 'file1')
		expect(plan.threadUpserts).toEqual([threadRecordToRow(enqueued, 'file1', 1)])
	})

	it('separates unknown ids instead of misfiling them as upserts or deletes', () => {
		const thread = makeThread()
		const lane = laneOf({ state: thread, lastChangedClock: 42 })
		const plan = planCommentDrain(entriesOf('shape:oops', thread.id), lane, 'file1')
		expect(plan).toEqual({
			threadUpserts: [threadRecordToRow(thread, 'file1', 42)],
			commentUpserts: [],
			threadDeletes: [],
			commentDeletes: [],
			unknownIds: ['shape:oops'],
		})
	})
})

describe('findEmptiedCommentThreads', () => {
	function makeComment(threadId: ReturnType<typeof makeThread>['id']) {
		return createComment({ threadId, pageId, authorId: 'user1', body, now: 1500 })
	}

	// mimics the prune transaction's read surface AFTER the pruned comments were deleted
	function viewOf(...records: { id: string }[]) {
		const map = new Map(records.map((r) => [r.id, r]))
		return { keys: () => map.keys(), get: (id: string) => map.get(id) }
	}

	it('returns nothing (without scanning) when there are no candidate threads', () => {
		const view = {
			keys(): Iterable<string> {
				throw new Error('should not scan')
			},
			get: () => undefined,
		}
		expect(findEmptiedCommentThreads(new Set(), view)).toEqual([])
	})

	it('returns a thread with no remaining comments', () => {
		const thread = makeThread()
		expect(findEmptiedCommentThreads(new Set([thread.id]), viewOf(thread))).toEqual([thread.id])
	})

	it('keeps a thread alive when a remaining comment references it', () => {
		const emptied = makeThread()
		const alive = makeThread()
		const reply = makeComment(alive.id)
		expect(
			findEmptiedCommentThreads(new Set([emptied.id, alive.id]), viewOf(emptied, alive, reply))
		).toEqual([emptied.id])
	})

	it('skips non-comment records without reading them', () => {
		const thread = makeThread()
		const view = {
			keys: () => ['shape:box1', thread.id, 'document:document'],
			get(id: string): unknown {
				throw new Error(`should not read ${id}`)
			},
		}
		expect(findEmptiedCommentThreads(new Set([thread.id]), view)).toEqual([thread.id])
	})

	it('stops scanning once every candidate thread is kept alive', () => {
		const thread = makeThread()
		const reply = makeComment(thread.id)
		const straggler = makeComment(thread.id)
		let yielded = 0
		const map = new Map<string, { id: string }>([
			[reply.id, reply],
			[straggler.id, straggler],
		])
		const view = {
			*keys() {
				for (const id of map.keys()) {
					yielded++
					yield id
				}
			},
			get: (id: string) => map.get(id),
		}
		expect(findEmptiedCommentThreads(new Set([thread.id]), view)).toEqual([])
		expect(yielded).toBe(1)
	})
})

describe('outboxEntriesToClear', () => {
	const entries: CommentOutboxEntry[] = [
		{ seq: 1, recordId: 'comment:a' },
		{ seq: 2, recordId: 'comment:b' },
		{ seq: 3, recordId: 'comment:a' },
	]

	it('signals the bulk-clear fast path when nothing failed', () => {
		expect(outboxEntriesToClear(entries, new Set())).toEqual({ clearAll: true, seqs: [] })
	})

	it('keeps every entry of a failed record queued, clearing only the rest', () => {
		expect(outboxEntriesToClear(entries, new Set(['comment:a']))).toEqual({
			clearAll: false,
			seqs: [2],
		})
	})

	it('clears entries for pruned records — pruned ids are not failed ids', () => {
		// a pruned record (author FK cascade) is never added to failedIds, so its entries clear
		// like a success; only the genuinely failed record's entries survive
		expect(outboxEntriesToClear(entries, new Set(['comment:b']))).toEqual({
			clearAll: false,
			seqs: [1, 3],
		})
	})
})

describe('mergeCommentDocumentsIntoSnapshot', () => {
	function makeDocs(...clocks: number[]): RoomSnapshot['documents'] {
		return clocks.map((clock) => ({
			state: makeThread(),
			lastChangedClock: clock,
		}))
	}

	function makeSnapshot(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
		return { documentClock: 10, documents: makeDocs(10), ...overrides }
	}

	it('merges docs and clamps documentClock up when a comment clock exceeds it', () => {
		const snapshot = makeSnapshot({ documentClock: 10 })
		const docs = makeDocs(5, 42)
		mergeCommentDocumentsIntoSnapshot(snapshot, docs)
		expect(snapshot.documentClock).toBe(42)
		expect(snapshot.documents).toHaveLength(3)
		expect(snapshot.documents.slice(1)).toEqual(docs)
	})

	it('leaves documentClock alone when all comment clocks are at or below it', () => {
		const snapshot = makeSnapshot({ documentClock: 10 })
		mergeCommentDocumentsIntoSnapshot(snapshot, makeDocs(3, 10))
		expect(snapshot.documentClock).toBe(10)
		expect(snapshot.documents).toHaveLength(3)
	})

	it('no-ops on empty comment docs', () => {
		const snapshot = makeSnapshot({ documentClock: 10 })
		const documents = snapshot.documents
		mergeCommentDocumentsIntoSnapshot(snapshot, [])
		expect(snapshot.documentClock).toBe(10)
		expect(snapshot.documents).toBe(documents)
	})

	it('clamps both clocks when a legacy snapshot has clock and documentClock below', () => {
		const snapshot = makeSnapshot({ clock: 12, documentClock: 10 })
		mergeCommentDocumentsIntoSnapshot(snapshot, makeDocs(42))
		expect(snapshot.documentClock).toBe(42)
		expect(snapshot.clock).toBe(42)
	})

	it('does not lower the effective seed for a clock-only snapshot already above the comments', () => {
		// SQLiteSyncStorage seeds from documentClock ?? clock; introducing a lower documentClock
		// here would shadow the higher legacy clock and regress the seed
		const snapshot = makeSnapshot({ clock: 100, documentClock: undefined })
		mergeCommentDocumentsIntoSnapshot(snapshot, makeDocs(42))
		expect(snapshot.documentClock).toBeUndefined()
		expect(snapshot.clock).toBe(100)
	})

	it('clamps documentClock but not a clock already above the comments', () => {
		const snapshot = makeSnapshot({ clock: 100, documentClock: 10 })
		mergeCommentDocumentsIntoSnapshot(snapshot, makeDocs(42))
		expect(snapshot.documentClock).toBe(42)
		expect(snapshot.clock).toBe(100)
	})

	it('raises tombstoneHistoryStartsAtClock to maxClock when the clamp fires and it was lower', () => {
		const snapshot = makeSnapshot({ documentClock: 10, tombstoneHistoryStartsAtClock: 5 })
		mergeCommentDocumentsIntoSnapshot(snapshot, makeDocs(42))
		expect(snapshot.documentClock).toBe(42)
		expect(snapshot.tombstoneHistoryStartsAtClock).toBe(42)
	})

	it('sets tombstoneHistoryStartsAtClock to maxClock when the clamp fires and it was undefined', () => {
		const snapshot = makeSnapshot({ documentClock: 10, tombstoneHistoryStartsAtClock: undefined })
		mergeCommentDocumentsIntoSnapshot(snapshot, makeDocs(42))
		expect(snapshot.documentClock).toBe(42)
		expect(snapshot.tombstoneHistoryStartsAtClock).toBe(42)
	})

	it('leaves tombstoneHistoryStartsAtClock untouched when the clamp does not fire', () => {
		const snapshot = makeSnapshot({ documentClock: 10, tombstoneHistoryStartsAtClock: 5 })
		mergeCommentDocumentsIntoSnapshot(snapshot, makeDocs(3, 10))
		expect(snapshot.documentClock).toBe(10)
		expect(snapshot.tombstoneHistoryStartsAtClock).toBe(5)
	})
})
