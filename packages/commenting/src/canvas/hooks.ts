import { Editor, TLComment, TLCommentThread, TLCommentThreadId, useValue } from 'tldraw'
import { getComments, getCommentThreads } from './comment-store'

/** All comment threads in the store, reactively. @public */
export function useCommentThreads(editor: Editor): TLCommentThread[] {
	return useValue('comment threads', () => getCommentThreads(editor), [editor])
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
