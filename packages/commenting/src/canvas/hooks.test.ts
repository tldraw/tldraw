import {
	commentSchemaRecords,
	createComment,
	createCommentThread,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	toRichText,
} from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import { putCommentRecords } from './comment-mutations'
import { getCommentsByThread } from './hooks'

let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
})

function makeEditor(): Editor {
	const editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: defaultTools,
		getContainer: () => document.body,
	})
	editors.push(editor)
	return editor
}

function makeThreadWithComment(editor: Editor, text: string) {
	const pageId = editor.getCurrentPageId()
	const thread = createCommentThread({
		pageId,
		anchor: { type: 'point', x: 0, y: 0 },
		createdBy: 'user1',
	})
	const comment = createComment({
		threadId: thread.id,
		pageId,
		authorId: 'user1',
		body: toRichText(text),
	})
	return { thread, comment }
}

describe('getCommentsByThread', () => {
	it('groups live comments by thread, oldest first', () => {
		const editor = makeEditor()
		const { thread, comment } = makeThreadWithComment(editor, 'first')
		const reply = createComment({
			threadId: thread.id,
			pageId: editor.getCurrentPageId(),
			authorId: 'user2',
			body: toRichText('second'),
			now: comment.createdAt + 1,
		})
		// Inserted newest-first to prove the grouping sorts by createdAt rather than store order.
		putCommentRecords(editor, [thread, reply, comment])
		expect(getCommentsByThread(editor).get().get(thread.id)).toEqual([comment, reply])
	})

	it("reuses a thread's array when another thread's comments change", () => {
		const editor = makeEditor()
		const a = makeThreadWithComment(editor, 'thread a')
		const b = makeThreadWithComment(editor, 'thread b')
		putCommentRecords(editor, [a.thread, a.comment, b.thread, b.comment])

		const byThread = getCommentsByThread(editor)
		const before = byThread.get()

		const replyToB = createComment({
			threadId: b.thread.id,
			pageId: editor.getCurrentPageId(),
			authorId: 'user2',
			body: toRichText('reply'),
			now: b.comment.createdAt + 1,
		})
		putCommentRecords(editor, [replyToB])
		const after = byThread.get()

		expect(after).not.toBe(before)
		// The unchanged thread keeps its exact array, so its subscribers don't re-render...
		expect(after.get(a.thread.id)).toBe(before.get(a.thread.id))
		// ...while the changed thread gets a fresh one with the reply in place.
		expect(after.get(b.thread.id)).not.toBe(before.get(b.thread.id))
		expect(after.get(b.thread.id)).toEqual([b.comment, replyToB])
	})
})
