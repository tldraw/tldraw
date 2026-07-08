import { toRichText } from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
import { createComment, createCommentThread } from './records'
import { COMMENT_OBJECT_TYPES, commentsSyncPlugin, filterCommentChanges } from './server'

const thread = createCommentThread({
	pageId: 'page:a' as any,
	anchor: { type: 'point', x: 0, y: 0 },
	createdBy: 'user-1',
	now: 1,
})
const comment = createComment({
	threadId: thread.id,
	pageId: 'page:a' as any,
	authorId: 'user-1',
	body: toRichText('hi'),
	now: 2,
})

describe('filterCommentChanges', () => {
	it('keeps only comment records and comment-record deletes', () => {
		const diff = {
			puts: {
				[thread.id]: thread,
				[comment.id]: comment,
				'shape:x': { typeName: 'shape', id: 'shape:x' },
			},
			deletes: ['shape:y', comment.id, thread.id],
		} as any
		expect(filterCommentChanges(diff)).toEqual({
			puts: [thread, comment],
			deletes: [comment.id, thread.id],
		})
	})

	it('unwraps [before, after] put tuples to the after value', () => {
		const editedComment = { ...comment, editedAt: 3 }
		const diff = {
			puts: {
				[comment.id]: [comment, editedComment],
			},
			deletes: [],
		} as any
		expect(filterCommentChanges(diff)).toEqual({
			puts: [editedComment],
			deletes: [],
		})
	})
})

describe('commentsSyncPlugin', () => {
	it('bundles records, object types, and id', () => {
		const plugin = commentsSyncPlugin()
		expect(plugin.id).toBe('tldraw.comments')
		expect(plugin.objectTypes).toEqual(COMMENT_OBJECT_TYPES)
		expect(Object.keys(plugin.records!)).toEqual(['comment-thread', 'comment'])
		expect(plugin.onCommittedChanges).toBeUndefined()
	})

	it('invokes onChange only when the diff contains comment records', () => {
		const onChange = vi.fn()
		const plugin = commentsSyncPlugin({ onChange })
		plugin.onCommittedChanges!({
			diff: { puts: {}, deletes: ['shape:y'] } as any,
			documentClock: 1,
		})
		expect(onChange).not.toHaveBeenCalled()
		plugin.onCommittedChanges!({
			diff: { puts: { [comment.id]: comment }, deletes: [] } as any,
			documentClock: 2,
		})
		expect(onChange).toHaveBeenCalledWith({ puts: [comment], deletes: [] })
	})
})
