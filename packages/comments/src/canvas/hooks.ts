import { Editor, useValue } from 'tldraw'
import { TLComment } from '../records'
import { PendingComment, pendingComment } from './comment-tool'

/**
 * Every comment in the store, oldest first, reactively. Group by `threadId` for per-thread lists.
 * Internal: the sidebar groups all comments by thread in one query rather than one query per
 * thread. Not part of the public headless API — use `useThreadComments` for a single thread.
 * @internal
 */
export function useAllComments(editor: Editor): TLComment[] {
	return useValue(
		'all comments',
		() =>
			(editor.store.query.records('comment' as any).get() as unknown as TLComment[]).sort(
				(a, b) => a.createdAt - b.createdAt
			),
		[editor]
	)
}

/**
 * The comment currently being placed (before it's posted), or null.
 * @internal
 */
export function usePendingComment(): PendingComment | null {
	return useValue('pending comment', () => pendingComment.get(), [])
}
