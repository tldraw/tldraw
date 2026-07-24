import { Editor, TLComment, TLCommentThread, TLCommentThreadId, useValue } from 'tldraw'
import { getComments, getCommentThreads } from './comment-store'

/** The comments that should render: not soft-deleted. Deleted records await the server's prune. */
function getLiveComments(editor: Editor): TLComment[] {
	return getComments(editor).filter((c) => !c.isDeleted)
}

/**
 * The comment threads that should render (pins, sidebar), reactively: live — not soft-deleted —
 * and still holding at least one live comment. A soft-deleted thread or comment is awaiting the
 * server's prune; an emptied thread has no surface left (deleting a thread's last comment
 * leaves the thread record behind). Use `getCommentThreads` for the unfiltered set.
 *
 * @public
 */
export function useCommentThreads(editor: Editor): TLCommentThread[] {
	return useValue(
		'comment threads',
		() => {
			const threadIdsWithComments = new Set(getLiveComments(editor).map((c) => c.threadId))
			return getCommentThreads(editor).filter(
				(thread) => !thread.isDeleted && threadIdsWithComments.has(thread.id)
			)
		},
		[editor]
	)
}

/** A thread's live comments, oldest first, reactively. @public */
export function useThreadComments(editor: Editor, threadId: TLCommentThreadId): TLComment[] {
	return useValue(
		'thread comments',
		() =>
			getLiveComments(editor)
				.filter((c) => c.threadId === threadId)
				.sort((a, b) => a.createdAt - b.createdAt),
		[editor, threadId]
	)
}

/** Every live comment in the store, oldest first, reactively. Group by `threadId` for per-thread lists. @public */
export function useComments(editor: Editor): TLComment[] {
	return useValue(
		'all comments',
		() => getLiveComments(editor).sort((a, b) => a.createdAt - b.createdAt),
		[editor]
	)
}
