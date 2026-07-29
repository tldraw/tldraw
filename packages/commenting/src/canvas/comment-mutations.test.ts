import {
	commentSchemaRecords,
	createCommentThread,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	TLComment,
	TLCommentThread,
	toRichText,
	createComment as tlCreateComment,
} from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import {
	deleteComment,
	deleteThread,
	editComment,
	reopenThread,
	resolveThread,
} from './comment-mutations'
import {
	getCommentRecord,
	getComments,
	getCommentThreads,
	getLiveComments,
	getLiveCommentThreads,
	putCommentRecords,
} from './comment-store'
import { CommentTool } from './comment-tool'
import { commitCommentMutation, openThreadId } from './state'

/**
 * These need a real editor: what's under test is how each write interacts with the store and the
 * undo stack, which is exactly what the history option governs.
 */

let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
})

function makeEditor(tool?: ReturnType<typeof CommentTool.configure>): Editor {
	const editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: tool ? [...defaultTools, tool] : defaultTools,
		getContainer: () => document.body,
	})
	editors.push(editor)
	return editor
}

function makeThread(editor: Editor, createdBy = 'me') {
	const thread = createCommentThread({
		pageId: editor.getCurrentPageId(),
		anchor: { type: 'point', x: 0, y: 0 },
		createdBy,
	})
	const comment = tlCreateComment({
		threadId: thread.id,
		pageId: thread.pageId,
		authorId: createdBy,
		body: toRichText('hello'),
	})
	putCommentRecords(editor, [thread, comment])
	return { thread, comment }
}

function addComment(editor: Editor, thread: TLCommentThread, authorId = 'me') {
	const comment = tlCreateComment({
		threadId: thread.id,
		pageId: thread.pageId,
		authorId,
		body: toRichText('reply'),
	})
	putCommentRecords(editor, [comment])
	return comment
}

function readComment(editor: Editor, comment: TLComment) {
	return getCommentRecord(editor, comment.id) as TLComment | undefined
}

function readThread(editor: Editor, thread: TLCommentThread) {
	return getCommentRecord(editor, thread.id) as TLCommentThread | undefined
}

describe('editComment', () => {
	it('replaces the body and stamps editedAt', () => {
		const editor = makeEditor()
		const { comment } = makeThread(editor)
		expect(comment.editedAt).toBe(null)

		editComment(editor, comment, toRichText('changed'))

		const updated = readComment(editor, comment)!
		expect(updated.body).toEqual(toRichText('changed'))
		expect(typeof updated.editedAt).toBe('number')
	})
})

describe('resolveThread and reopenThread', () => {
	it('stamps who resolved the thread and when', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)

		resolveThread(editor, thread, 'ada')

		const resolved = readThread(editor, thread)!.resolved!
		expect(resolved.by).toBe('ada')
		expect(typeof resolved.at).toBe('number')
	})

	it('clears the resolution when reopened', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)
		resolveThread(editor, thread, 'ada')

		reopenThread(editor, readThread(editor, thread)!)

		expect(readThread(editor, thread)!.resolved).toBe(null)
	})
})

describe('deleteComment', () => {
	it('soft-deletes: the record stays put with its flag set, for the server to prune', () => {
		const editor = makeEditor()
		const { comment } = makeThread(editor)

		deleteComment(editor, comment)

		expect(readComment(editor, comment)).toMatchObject({ isDeleted: true })
		expect(getComments(editor)).toHaveLength(1)
		expect(getLiveComments(editor)).toHaveLength(0)
	})

	it('closes the thread when its last comment goes', () => {
		const editor = makeEditor()
		const { thread, comment } = makeThread(editor)
		openThreadId.set(editor, thread.id)

		deleteComment(editor, comment)

		expect(openThreadId.get(editor)).toBe(null)
	})

	it('leaves the thread open while it still has comments', () => {
		const editor = makeEditor()
		const { thread, comment } = makeThread(editor)
		addComment(editor, thread)
		openThreadId.set(editor, thread.id)

		deleteComment(editor, comment)

		expect(openThreadId.get(editor)).toBe(thread.id)
	})

	it('leaves a different open thread alone', () => {
		const editor = makeEditor()
		const { comment } = makeThread(editor)
		const other = makeThread(editor)
		openThreadId.set(editor, other.thread.id)

		deleteComment(editor, comment)

		expect(openThreadId.get(editor)).toBe(other.thread.id)
	})
})

describe('deleteThread', () => {
	it('soft-deletes the thread record', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)

		deleteThread(editor, thread)

		expect(readThread(editor, thread)).toMatchObject({ isDeleted: true })
		expect(getCommentThreads(editor)).toHaveLength(1)
		expect(getLiveCommentThreads(editor)).toHaveLength(0)
	})

	it('closes the thread when it is the open one', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)
		openThreadId.set(editor, thread.id)

		deleteThread(editor, thread)

		expect(openThreadId.get(editor)).toBe(null)
	})
})

describe('history', () => {
	it('does not put comment writes on the undo stack by default', () => {
		const editor = makeEditor()
		editor.markHistoryStoppingPoint()
		const { comment } = makeThread(editor)

		editor.undo()

		expect(readComment(editor, comment)).toBeDefined()
	})

	it('puts them on the undo stack when the history option asks for it', () => {
		const editor = makeEditor(CommentTool.configure({ history: 'record' }))
		editor.markHistoryStoppingPoint()
		const { comment } = makeThread(editor)

		editor.undo()

		expect(readComment(editor, comment)).toBeUndefined()
	})

	// The flag is write-once server-side, so an undo clearing it would be vetoed and rebased —
	// leaving the UI showing a comment the server has already pruned. The shape gives the undo
	// something recorded to rewind, so what's under test is that the delete isn't on the stack
	// rather than that the stack is empty.
	it('never makes a delete undoable, even with history: record', () => {
		const editor = makeEditor(CommentTool.configure({ history: 'record' }))
		const { comment } = makeThread(editor)
		editor.markHistoryStoppingPoint()
		const shapeId = createShapeId()
		editor.createShape({ id: shapeId, type: 'geo', x: 0, y: 0 })

		deleteComment(editor, comment)
		editor.undo()

		expect(editor.getShape(shapeId)).toBeUndefined()
		expect(readComment(editor, comment)).toMatchObject({ isDeleted: true })
	})

	it('never makes a thread delete undoable, even with history: record', () => {
		const editor = makeEditor(CommentTool.configure({ history: 'record' }))
		const { thread } = makeThread(editor)
		editor.markHistoryStoppingPoint()
		const shapeId = createShapeId()
		editor.createShape({ id: shapeId, type: 'geo', x: 0, y: 0 })

		deleteThread(editor, thread)
		editor.undo()

		expect(editor.getShape(shapeId)).toBeUndefined()
		expect(readThread(editor, thread)).toMatchObject({ isDeleted: true })
	})

	// A host that wants pin drags undoable but posts and edits not gets both: the drag's mode has
	// to survive the write helpers it calls, which set their own mode when used on their own.
	it('keeps dragHistory in charge of a drag that writes through putCommentRecords', () => {
		const editor = makeEditor(CommentTool.configure({ history: 'ignore', dragHistory: 'record' }))
		const { thread } = makeThread(editor)
		editor.markHistoryStoppingPoint()

		commitCommentMutation(
			editor,
			() => putCommentRecords(editor, [{ ...thread, anchor: { type: 'point', x: 50, y: 50 } }]),
			'drag'
		)
		editor.undo()

		expect(readThread(editor, thread)!.anchor).toEqual({ type: 'point', x: 0, y: 0 })
	})
})

describe('getLiveComments and getLiveCommentThreads', () => {
	it('hides a thread whose comments have all been deleted', () => {
		const editor = makeEditor()
		const { thread, comment } = makeThread(editor)

		deleteComment(editor, comment)

		// The thread record itself is untouched — the deleter may not be its creator — but with no
		// live comment left it has no surface.
		expect(readThread(editor, thread)!.isDeleted).toBe(false)
		expect(getLiveCommentThreads(editor)).toHaveLength(0)
	})

	it('keeps a thread that still has a live comment', () => {
		const editor = makeEditor()
		const { thread, comment } = makeThread(editor)
		addComment(editor, thread)

		deleteComment(editor, comment)

		expect(getLiveComments(editor)).toHaveLength(1)
		expect(getLiveCommentThreads(editor)).toEqual([readThread(editor, thread)])
	})
})
