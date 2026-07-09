import {
	createComment,
	createCommentThread,
	TLPageId,
	TLRichText,
	TLShapeId,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { commentRecordToRow, rowsToSnapshotDocuments, threadRecordToRow } from './commentRows'

const pageId = 'page:page1' as TLPageId
const shapeId = 'shape:box1' as TLShapeId
// minimal rich text doc; the validator doesn't run in these tests
const body = { type: 'doc', content: [] } as unknown as TLRichText

function makeThread(anchor = { type: 'shape' as const, shapeId, x: 0.5, y: 0.5, isPrecise: true }) {
	return createCommentThread({ pageId, anchor, createdBy: 'user1', now: 1000 })
}

describe('threadRecordToRow', () => {
	it('denormalizes shape anchor, resolution, and preserves the full record', () => {
		const thread = { ...makeThread(), resolved: { at: 2000, by: 'user2' } }
		const row = threadRecordToRow(thread, 'file1', 42)
		expect(row).toEqual({
			id: thread.id,
			fileId: 'file1',
			pageId,
			shapeId,
			resolved: true,
			createdBy: 'user1',
			createdAt: 1000,
			record: thread,
			lastChangedClock: 42,
		})
	})

	it('leaves shapeId null for non-shape anchors and resolved false for open threads', () => {
		const thread = makeThread({ type: 'point', x: 10, y: 20 } as any)
		const row = threadRecordToRow(thread, 'file1', 1)
		expect(row.shapeId).toBeNull()
		expect(row.resolved).toBe(false)
	})
})

describe('commentRecordToRow', () => {
	it('denormalizes the thread anchor and preserves the full record', () => {
		const thread = makeThread()
		const comment = createComment({
			threadId: thread.id,
			pageId,
			authorId: 'user1',
			body,
			now: 1500,
		})
		const row = commentRecordToRow(comment, thread, 'file1', 43)
		expect(row).toEqual({
			id: comment.id,
			fileId: 'file1',
			threadId: thread.id,
			pageId,
			authorId: 'user1',
			shapeId,
			body: comment.body,
			createdAt: 1500,
			updatedAt: 1500,
			record: comment,
			lastChangedClock: 43,
		})
	})

	it('uses editedAt for updatedAt and null shapeId when the thread is missing', () => {
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
		const row = commentRecordToRow(comment, undefined, 'file1', 44)
		expect(row.updatedAt).toBe(1600)
		expect(row.shapeId).toBeNull()
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
		const commentRow = commentRecordToRow(comment, thread, 'file1', 43)
		expect(rowsToSnapshotDocuments([threadRow], [commentRow])).toEqual([
			{ state: thread, lastChangedClock: 42 },
			{ state: comment, lastChangedClock: 43 },
		])
	})

	it('coerces bigint-as-string clocks from pg to numbers', () => {
		const thread = makeThread()
		const threadRow = { ...threadRecordToRow(thread, 'file1', 42), lastChangedClock: '42' as any }
		expect(rowsToSnapshotDocuments([threadRow], [])).toEqual([
			{ state: thread, lastChangedClock: 42 },
		])
	})
})
