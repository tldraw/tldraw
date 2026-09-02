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
	commitCommentMutation,
	deleteComment,
	deleteThread,
	editComment,
	putCommentRecords,
	removeCommentRecords,
	reopenThread,
	resolveThread,
} from './comment-mutations'
import {
	getCommentRecord,
	getComments,
	getCommentThreads,
	getLiveComments,
	getLiveCommentThreads,
} from './comment-store'
import { CommentTool } from './comment-tool'
import { openThreadId } from './state'

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

	// The caller's record is a snapshot. Writing it back would revert every field it doesn't mean
	// to touch — here `meta`, set after the caller took its copy.
	it('edits the version in the store, not the copy it was handed', () => {
		const editor = makeEditor()
		const { comment } = makeThread(editor)
		putCommentRecords(editor, [{ ...comment, meta: { pinned: true } }])

		editComment(editor, comment, toRichText('changed'))

		expect(readComment(editor, comment)).toMatchObject({
			body: toRichText('changed'),
			meta: { pinned: true },
		})
	})

	// `put` is an upsert, so writing a snapshot back would re-create the record — with
	// `isDeleted: false` — after someone else's delete had already taken it away.
	it('does not resurrect a comment that has been removed since', () => {
		const editor = makeEditor()
		const { comment } = makeThread(editor)
		removeCommentRecords(editor, [comment.id])

		editComment(editor, comment, toRichText('changed'))

		expect(readComment(editor, comment)).toBeUndefined()
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

	// A thread's anchor moves without anyone touching the thread — a pin drag, or a pinned shape's
	// delete converting it to a point. Resolving from a copy taken before that must not undo it.
	it('resolves the version in the store, leaving an anchor moved since where it is', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)
		putCommentRecords(editor, [{ ...thread, anchor: { type: 'point', x: 50, y: 50 } }])

		resolveThread(editor, thread, 'ada')

		const updated = readThread(editor, thread)!
		expect(updated.anchor).toEqual({ type: 'point', x: 50, y: 50 })
		expect(updated.resolved!.by).toBe('ada')
	})

	it('reopens the version in the store, leaving an anchor moved since where it is', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)
		resolveThread(editor, thread, 'ada')
		putCommentRecords(editor, [
			{ ...readThread(editor, thread)!, anchor: { type: 'point', x: 50, y: 50 } },
		])

		reopenThread(editor, thread)

		const updated = readThread(editor, thread)!
		expect(updated.anchor).toEqual({ type: 'point', x: 50, y: 50 })
		expect(updated.resolved).toBe(null)
	})

	it('does nothing to a thread that has been removed since', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)
		removeCommentRecords(editor, [thread.id])

		resolveThread(editor, thread, 'ada')
		reopenThread(editor, thread)

		expect(readThread(editor, thread)).toBeUndefined()
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

	// Deleting the same comment twice — a double activation, a handler holding a copy taken before
	// the first delete — shouldn't read as "the last comment went" while a sibling is still live.
	it('leaves the thread open when the comment was already deleted', () => {
		const editor = makeEditor()
		const { thread, comment } = makeThread(editor)
		addComment(editor, thread)
		deleteComment(editor, comment)
		openThreadId.set(editor, thread.id)

		deleteComment(editor, comment)

		expect(openThreadId.get(editor)).toBe(thread.id)
	})

	it('does not resurrect a comment that has been removed since', () => {
		const editor = makeEditor()
		const { comment } = makeThread(editor)
		removeCommentRecords(editor, [comment.id])

		deleteComment(editor, comment)

		expect(readComment(editor, comment)).toBeUndefined()
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

	it('flags the version in the store, leaving an anchor moved since where it is', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)
		putCommentRecords(editor, [{ ...thread, anchor: { type: 'point', x: 50, y: 50 } }])

		deleteThread(editor, thread)

		expect(readThread(editor, thread)).toMatchObject({
			isDeleted: true,
			anchor: { type: 'point', x: 50, y: 50 },
		})
	})

	it('does not resurrect a thread that has been removed since', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)
		removeCommentRecords(editor, [thread.id])

		deleteThread(editor, thread)

		expect(readThread(editor, thread)).toBeUndefined()
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

	it('rejects a nested mutation that resolves to a different history mode', () => {
		const editor = makeEditor(CommentTool.configure({ history: 'record' }))
		const { comment } = makeThread(editor)

		// A delete always ignores history, so it can't run inside a `record` commit.
		expect(() => commitCommentMutation(editor, () => deleteComment(editor, comment))).toThrow(
			"records history as 'ignore' can't run inside one recording it as 'record'"
		)

		deleteComment(editor, comment)
		expect(readComment(editor, comment)).toMatchObject({ isDeleted: true })
	})

	// Store history flushes synchronously under test, so this listener writes from inside the commit
	// that triggered it — where a side effect always sits, with no "after the mutation" to defer to.
	// Matching modes have nothing to disagree about, so its write goes through.
	it('lets a store listener write comments during a commit when the modes match', () => {
		const editor = makeEditor()
		const { thread, comment } = makeThread(editor)
		let hasReacted = false
		editor.store.listen(() => {
			if (hasReacted) return
			hasReacted = true
			putCommentRecords(editor, [{ ...thread, meta: { lastEditedComment: comment.id } }])
		})

		editComment(editor, comment, toRichText('edited'))

		expect(readThread(editor, thread)!.meta).toEqual({ lastEditedComment: comment.id })
	})

	it('rejects a writer used after its commit', () => {
		const editor = makeEditor()
		const { thread } = makeThread(editor)
		let writeAfterCommit: () => void

		commitCommentMutation(editor, ({ put }) => {
			writeAfterCommit = () => put([{ ...thread, resolved: { at: 1, by: 'ada' } }])
		})

		expect(() => writeAfterCommit!()).toThrow('cannot be used after its commit has finished')
	})

	// A host can want pin drags undoable while posts and edits aren't. The drag owns its commit, and
	// its records go through the writer, which keeps `dragHistory` in charge of them.
	it('lets dragHistory govern a drag on its own', () => {
		const editor = makeEditor(CommentTool.configure({ history: 'ignore', dragHistory: 'record' }))
		const { thread } = makeThread(editor)
		editor.markHistoryStoppingPoint()

		commitCommentMutation(
			editor,
			({ put }) => put([{ ...thread, anchor: { type: 'point', x: 50, y: 50 } }]),
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
