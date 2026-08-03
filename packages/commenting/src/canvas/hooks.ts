import {
	computed,
	Computed,
	Editor,
	isUninitialized,
	TLComment,
	TLCommentThread,
	TLCommentThreadId,
	useValue,
	WeakCache,
} from 'tldraw'
import { getLiveComments, getLiveCommentThreads } from './comment-store'

/**
 * The comment threads that should render (pins, sidebar), reactively — the live set described by
 * {@link getLiveCommentThreads}. Use `getCommentThreads` for the unfiltered set, including
 * soft-deleted threads awaiting the server's prune.
 *
 * @public
 */
export function useCommentThreads(editor: Editor): TLCommentThread[] {
	return useValue('comment threads', () => getLiveCommentThreads(editor), [editor])
}

/**
 * Every live comment grouped by thread, oldest first within each thread. One computed shared by
 * every mounted thread: each `useThreadComments` would otherwise scan and sort the whole comment
 * set, so N open threads did N full passes on every comment mutation. Cached per editor so the
 * grouping survives re-renders and is rebuilt only when the comment set actually changes.
 */
const commentsByThread = new WeakCache<Editor, Computed<Map<TLCommentThreadId, TLComment[]>>>()

/** Exported for tests; use {@link useThreadComments} to consume. @internal */
export function getCommentsByThread(editor: Editor) {
	return commentsByThread.get(editor, () =>
		computed('comments by thread', (prev) => {
			const byThread = new Map<TLCommentThreadId, TLComment[]>()
			for (const comment of getLiveComments(editor)) {
				const existing = byThread.get(comment.threadId)
				if (existing) existing.push(comment)
				else byThread.set(comment.threadId, [comment])
			}
			for (const [threadId, comments] of byThread) {
				comments.sort((a, b) => a.createdAt - b.createdAt)
				// Reuse the previous per-thread array when that thread's comment list is unchanged
				// (record identities are stable while unchanged), so `useThreadComments` subscribers
				// on other threads don't re-render when one thread gains a reply.
				if (isUninitialized(prev)) continue
				const prevComments = prev.get(threadId)
				if (
					prevComments &&
					prevComments.length === comments.length &&
					comments.every((comment, i) => prevComments[i] === comment)
				) {
					byThread.set(threadId, prevComments)
				}
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

/** Every live comment in the store ({@link getLiveComments}), oldest first, reactively. Group by
 *  `threadId` for per-thread lists. @public */
export function useComments(editor: Editor): TLComment[] {
	return useValue(
		'all comments',
		() => getLiveComments(editor).sort((a, b) => a.createdAt - b.createdAt),
		[editor]
	)
}
