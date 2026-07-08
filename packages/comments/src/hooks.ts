import { Editor, TLPageId, toRichText, useEditor, useValue } from 'tldraw'
import {
	TLComment,
	TLCommentAnchor,
	TLCommentThread,
	TLCommentThreadId,
	createComment,
	createCommentThread,
} from './records'
import { CommentsPluginUser } from './types'

/** Reactive list of comment threads, optionally filtered to a page. @public */
export function useCommentThreads(pageId?: TLPageId): TLCommentThread[] {
	const editor = useEditor()
	return useValue(
		'comment threads',
		() => {
			const threads = editor.store.query
				.records('comment-thread' as any)
				.get() as unknown as TLCommentThread[]
			return pageId ? threads.filter((t) => t.pageId === pageId) : threads
		},
		[editor, pageId]
	)
}

/** Reactive, createdAt-ordered comments for a thread. @public */
export function useThreadComments(threadId: TLCommentThreadId): TLComment[] {
	const editor = useEditor()
	return useValue(
		'thread comments',
		() =>
			(editor.store.query.records('comment' as any).get() as unknown as TLComment[])
				.filter((c) => c.threadId === threadId)
				.sort((a, b) => a.createdAt - b.createdAt),
		[editor, threadId]
	)
}

/** Creates a thread with its first comment. Not undoable. @public */
export function startCommentThread(
	editor: Editor,
	opts: { anchor: TLCommentAnchor; body: string; user: CommentsPluginUser; pageId?: TLPageId }
): { thread: TLCommentThread; comment: TLComment } {
	const pageId = opts.pageId ?? editor.getCurrentPageId()
	const thread = createCommentThread({ pageId, anchor: opts.anchor, createdBy: opts.user.id })
	const comment = createComment({
		threadId: thread.id,
		pageId,
		authorId: opts.user.id,
		body: toRichText(opts.body),
	})
	editor.run(
		() => {
			editor.store.put([thread as any, comment as any])
		},
		{ history: 'ignore' }
	)
	return { thread, comment }
}

/** Appends a comment to a thread. Not undoable. @public */
export function addComment(
	editor: Editor,
	opts: { threadId: TLCommentThreadId; body: string; user: CommentsPluginUser }
): TLComment {
	const thread = editor.store.get(opts.threadId as any) as unknown as TLCommentThread | undefined
	if (!thread) throw new Error(`Comment thread not found: ${opts.threadId}`)
	const comment = createComment({
		threadId: opts.threadId,
		pageId: thread.pageId,
		authorId: opts.user.id,
		body: toRichText(opts.body),
	})
	editor.run(
		() => {
			editor.store.put([comment as any])
		},
		{ history: 'ignore' }
	)
	return comment
}

/** Marks a thread resolved. Not undoable. @public */
export function resolveThread(
	editor: Editor,
	threadId: TLCommentThreadId,
	user: CommentsPluginUser
): void {
	const thread = editor.store.get(threadId as any) as unknown as TLCommentThread | undefined
	if (!thread || thread.resolved) return
	editor.run(
		() => {
			editor.store.put([{ ...thread, resolved: { at: Date.now(), by: user.id } } as any])
		},
		{ history: 'ignore' }
	)
}
