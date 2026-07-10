import { describe, expect, it } from 'vitest'
import { createTLSchema } from '../createTLSchema'
import { toRichText } from '../misc/TLRichText'
import {
	commentRecordConfig,
	commentSchemaRecords,
	commentThreadRecordConfig,
	createComment,
	createCommentId,
	createCommentThread,
	createCommentThreadId,
	isCommentId,
	isCommentThreadId,
	TLCommentAnchor,
} from './TLComment'
import { TLPageId } from './TLPage'
import { TLShapeId } from './TLShape'

const pageId = 'page:page1' as TLPageId
const shapeId = 'shape:box1' as TLShapeId

const anchors: TLCommentAnchor[] = [
	{ type: 'shape', shapeId, x: 1, y: 0, isPrecise: false },
	{ type: 'point', x: 100, y: 200 },
	{ type: 'region', x: 0, y: 0, w: 300, h: 150 },
	{ type: 'page' },
	{ type: 'text-range', shapeId, from: 3, to: 12 },
]

describe('TLCommentThread', () => {
	it.each(anchors)('creates a valid thread anchored to %j', (anchor) => {
		const thread = createCommentThread({ pageId, anchor, createdBy: 'user1', now: 1000 })
		expect(commentThreadRecordConfig.validator.validate(thread)).toEqual(thread)
		expect(thread).toMatchObject({
			typeName: 'comment-thread',
			pageId,
			anchor,
			createdAt: 1000,
			resolved: null,
			meta: {},
		})
	})

	it('validates resolution state', () => {
		const thread = createCommentThread({
			pageId,
			anchor: { type: 'page' },
			createdBy: 'user1',
			now: 1000,
		})
		const resolved = { ...thread, resolved: { at: 2000, by: 'user2' } }
		expect(commentThreadRecordConfig.validator.validate(resolved)).toEqual(resolved)
		expect(() =>
			commentThreadRecordConfig.validator.validate({ ...thread, resolved: { at: 2000 } })
		).toThrow()
	})

	it('rejects unknown anchor kinds and malformed anchors', () => {
		const thread = createCommentThread({
			pageId,
			anchor: { type: 'shape', shapeId, x: 1, y: 0, isPrecise: false },
			createdBy: 'user1',
			now: 1000,
		})
		expect(() =>
			commentThreadRecordConfig.validator.validate({
				...thread,
				anchor: { type: 'volume', level: 11 },
			})
		).toThrow()
		expect(() =>
			commentThreadRecordConfig.validator.validate({
				...thread,
				// shape anchors must reference a shape id
				anchor: { type: 'shape', shapeId: 'page:nope', x: 1, y: 0, isPrecise: false },
			})
		).toThrow()
	})
})

describe('TLComment', () => {
	const threadId = createCommentThreadId('thread1')

	it('creates a valid comment with a rich text body', () => {
		const comment = createComment({
			threadId,
			pageId,
			authorId: 'user1',
			body: toRichText('hello'),
			now: 1000,
		})
		expect(commentRecordConfig.validator.validate(comment)).toEqual(comment)
		expect(comment).toMatchObject({
			typeName: 'comment',
			threadId,
			pageId,
			createdAt: 1000,
			editedAt: null,
		})
	})

	it('accepts an editedAt timestamp after edits', () => {
		const comment = createComment({
			threadId,
			pageId,
			authorId: 'user1',
			body: toRichText('hello'),
			now: 1000,
		})
		const edited = { ...comment, editedAt: 2000, body: toRichText('hello, edited') }
		expect(commentRecordConfig.validator.validate(edited)).toEqual(edited)
	})

	it('rejects a threadId that is not a comment-thread id', () => {
		const comment = createComment({
			threadId,
			pageId,
			authorId: 'user1',
			body: toRichText('hello'),
			now: 1000,
		})
		expect(() =>
			commentRecordConfig.validator.validate({ ...comment, threadId: 'comment:not-a-thread' })
		).toThrow()
	})
})

describe('schema registration', () => {
	it('registers both record types via commentSchemaRecords', () => {
		const schema = createTLSchema({ records: commentSchemaRecords })
		// custom record types aren't part of the default TLRecord union, so index untyped
		const types = schema.types as Record<string, { scope: string } | undefined>
		expect(types['comment-thread']?.scope).toBe('document')
		expect(types['comment']?.scope).toBe('document')
	})
})

describe('isCommentThreadId / isCommentId', () => {
	it('isCommentThreadId accepts comment-thread ids and rejects everything else', () => {
		expect(isCommentThreadId(createCommentThreadId())).toBe(true)
		expect(isCommentThreadId(createCommentId())).toBe(false)
		expect(isCommentThreadId('shape:box1')).toBe(false)
		expect(isCommentThreadId('not-an-id')).toBe(false)
	})

	it('isCommentId accepts comment ids and rejects everything else, including comment-thread ids', () => {
		expect(isCommentId(createCommentId())).toBe(true)
		expect(isCommentId(createCommentThreadId())).toBe(false)
		expect(isCommentId('shape:box1')).toBe(false)
		expect(isCommentId('not-an-id')).toBe(false)
	})
})

describe('comment-thread migrations', () => {
	const migration = (commentThreadRecordConfig.migrations as any).sequence.find(
		(m: any) => m.id === 'com.tldraw.comment-thread/2'
	) as { up(r: any): any; down(r: any): any }

	it('stamps existing shape anchors with the top-right position (x:1, y:0)', () => {
		expect(migration.up({ anchor: { type: 'shape', shapeId } })).toEqual({
			anchor: { type: 'shape', shapeId, x: 1, y: 0, isPrecise: false },
		})
	})

	it('leaves shape anchors that already have x/y unchanged', () => {
		const anchor = { type: 'shape', shapeId, x: 0.25, y: 0.75, isPrecise: true }
		expect(migration.up({ anchor })).toEqual({ anchor })
	})

	it('leaves non-shape anchors untouched', () => {
		const anchor = { type: 'point', x: 5, y: 6 }
		expect(migration.up({ anchor })).toEqual({ anchor })
	})

	it('down-migrates by dropping x/y', () => {
		expect(
			migration.down({ anchor: { type: 'shape', shapeId, x: 0.3, y: 0.4, isPrecise: true } })
		).toEqual({
			anchor: { type: 'shape', shapeId },
		})
	})
})
