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
