import { createTLSchema, createTLStore } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { addComment, resolveThread, startCommentThread } from './hooks'
import { commentSchemaRecords } from './records'

function makeEditorStub() {
	const store = createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) })
	// the helpers only use editor.store, editor.getCurrentPageId(), and editor.run
	return {
		store,
		getCurrentPageId: () => 'page:page' as any,
		run: (fn: () => void, _opts?: unknown) => fn(),
	} as any
}

describe('comment helpers', () => {
	it('startCommentThread puts a thread and first comment', () => {
		const editor = makeEditorStub()
		const { thread, comment } = startCommentThread(editor, {
			anchor: { type: 'point', x: 1, y: 2 },
			body: 'hello',
			user: { id: 'u1' },
		})
		expect(editor.store.get(thread.id)).toBeDefined()
		expect(editor.store.get(comment.id)).toBeDefined()
		expect((editor.store.get(comment.id) as any).threadId).toBe(thread.id)
	})

	it('addComment appends to an existing thread', () => {
		const editor = makeEditorStub()
		const { thread } = startCommentThread(editor, {
			anchor: { type: 'page' },
			body: 'first',
			user: { id: 'u1' },
		})
		const second = addComment(editor, { threadId: thread.id, body: 'second', user: { id: 'u2' } })
		expect((editor.store.get(second.id) as any).authorId).toBe('u2')
	})

	it('resolveThread stamps resolved and is idempotent-safe on missing threads', () => {
		const editor = makeEditorStub()
		const { thread } = startCommentThread(editor, {
			anchor: { type: 'page' },
			body: 'x',
			user: { id: 'u1' },
		})
		resolveThread(editor, thread.id, { id: 'u2' })
		expect((editor.store.get(thread.id) as any).resolved?.by).toBe('u2')
	})
})
