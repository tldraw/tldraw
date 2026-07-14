import { Editor, TLComment, TLCommentThread, TLCommentThreadId, useValue } from 'tldraw'

/** All comment threads in the store, reactively. (Comment records are opt-in, hence the casts.) */
export function useCommentThreads(editor: Editor): TLCommentThread[] {
	return useValue(
		'comment threads',
		() => editor.store.query.records('comment-thread' as any).get() as unknown as TLCommentThread[],
		[editor]
	)
}

/** A thread's comments, oldest first, reactively. */
export function useThreadComments(editor: Editor, threadId: TLCommentThreadId): TLComment[] {
	return useValue(
		'thread comments',
		() =>
			(editor.store.query.records('comment' as any).get() as unknown as TLComment[])
				.filter((c) => c.threadId === threadId)
				.sort((a, b) => a.createdAt - b.createdAt),
		[editor, threadId]
	)
}

/** Every comment in the store, oldest first, reactively. Group by `threadId` for per-thread lists. */
export function useComments(editor: Editor): TLComment[] {
	return useValue(
		'all comments',
		() =>
			(editor.store.query.records('comment' as any).get() as unknown as TLComment[]).sort(
				(a, b) => a.createdAt - b.createdAt
			),
		[editor]
	)
}
