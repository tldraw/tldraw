import { Editor, TLComment, TLCommentThread, TLCommentThreadId, useValue } from 'tldraw'
import { getComments, getCommentThreads } from './comment-store'

/**
 * The comment threads that should render (pins, sidebar), reactively: live — not soft-deleted —
 * and still holding at least one comment. A soft-deleted thread is awaiting the server's prune;
 * an emptied one has no surface left (deleting a thread's last comment leaves the thread record
 * behind when the deleter isn't its creator). Use `getCommentThreads` for the unfiltered set.
 *
 * @public
 */
export function useCommentThreads(editor: Editor): TLCommentThread[] {
	return useValue(
		'comment threads',
		() => {
			const threadIdsWithComments = new Set(getComments(editor).map((c) => c.threadId))
			return getCommentThreads(editor).filter(
				(thread) => thread.deleted == null && threadIdsWithComments.has(thread.id)
			)
		},
		[editor]
	)
}

/** A thread's comments, oldest first, reactively. @public */
export function useThreadComments(editor: Editor, threadId: TLCommentThreadId): TLComment[] {
	return useValue(
		'thread comments',
		() =>
			getComments(editor)
				.filter((c) => c.threadId === threadId)
				.sort((a, b) => a.createdAt - b.createdAt),
		[editor, threadId]
	)
}

/** Every comment in the store, oldest first, reactively. Group by `threadId` for per-thread lists. @public */
export function useComments(editor: Editor): TLComment[] {
	return useValue(
		'all comments',
		() => getComments(editor).sort((a, b) => a.createdAt - b.createdAt),
		[editor]
	)
}
