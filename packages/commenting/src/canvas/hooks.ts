import {
	computed,
	Computed,
	Editor,
	TLComment,
	TLCommentThread,
	TLCommentThreadId,
	useValue,
	WeakCache,
} from 'tldraw'
import { getComments, getCommentThreads } from './comment-store'

/** The comments that should render: not soft-deleted. Deleted records await the server's prune. */
function getLiveComments(editor: Editor): TLComment[] {
	return getComments(editor).filter((c) => !c.isDeleted)
}

/**
 * The comment threads that should render (pins, sidebar), reactively: live — not soft-deleted —
 * and still holding at least one live comment. A soft-deleted thread or comment is awaiting the
 * server's prune, as is a thread emptied by its last comment's delete — until the prune lands,
 * the emptied thread record lingers with no surface. Use `getCommentThreads` for the
 * unfiltered set.
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

/**
 * Every live comment grouped by thread, oldest first within each thread. One computed shared by
 * every mounted thread: each `useThreadComments` would otherwise scan and sort the whole comment
 * set, so N open threads did N full passes on every comment mutation. Cached per editor so the
 * grouping survives re-renders and is rebuilt only when the comment set actually changes.
 */
const commentsByThread = new WeakCache<Editor, Computed<Map<TLCommentThreadId, TLComment[]>>>()

function getCommentsByThread(editor: Editor) {
	return commentsByThread.get(editor, () =>
		computed('comments by thread', () => {
			const byThread = new Map<TLCommentThreadId, TLComment[]>()
			for (const comment of getLiveComments(editor)) {
				const existing = byThread.get(comment.threadId)
				if (existing) existing.push(comment)
				else byThread.set(comment.threadId, [comment])
			}
			for (const comments of byThread.values()) {
				comments.sort((a, b) => a.createdAt - b.createdAt)
			}
			return byThread
		})
	)
}

/** A thread's live comments, oldest first, reactively. @public */
export function useThreadComments(editor: Editor, threadId: TLCommentThreadId): TLComment[] {
	return useValue(
		'thread comments',
		() => getCommentsByThread(editor).get().get(threadId) ?? EMPTY_COMMENTS,
		[editor, threadId]
	)
}

/** Shared empty result so a thread with no comments doesn't churn referential equality. */
const EMPTY_COMMENTS: TLComment[] = []

/** Every live comment in the store, oldest first, reactively. Group by `threadId` for per-thread lists. @public */
export function useComments(editor: Editor): TLComment[] {
	return useValue(
		'all comments',
		() => getLiveComments(editor).sort((a, b) => a.createdAt - b.createdAt),
		[editor]
	)
}
