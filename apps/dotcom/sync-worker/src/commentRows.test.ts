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
	commentRecordToRow,
	isCommentAuthorFkViolation,
	mergeCommentDocumentsIntoSnapshot,
	rowsToSnapshotDocuments,
	rowToCommentRecord,
	rowToThreadRecord,
	threadRecordToRow,
} from './commentRows'

const pageId = 'page:page1' as TLPageId
const shapeId = 'shape:box1' as TLShapeId
// minimal rich text doc; the validator doesn't run in these tests
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
})
