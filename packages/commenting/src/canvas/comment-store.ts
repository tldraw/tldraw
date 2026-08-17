import { Editor, TLComment, TLCommentReaction, TLCommentThread, TLRecord } from 'tldraw'

/**
 * Typed reads of comment records on the editor store.
 *
 * Comment records live on the editor's local store so the canvas can render them reactively, but
 * they're opt-in and aren't part of the `TLRecord` union — so `editor.store` is statically typed
 * `Store<TLRecord>` and every access has to reinterpret the type. These helpers own that
 * reinterpretation behind one boundary and keep call sites typed.
 *
 * Writes do the same, but also answer to the undo/redo policy, so they live in
 * `comment-mutations.ts`.
 */

/**
 * A record that lives in a comment thread: the thread itself, one of its messages, or a reaction
 * to one of those messages.
 * @public
 */
export type TLCommentRecord = TLComment | TLCommentThread | TLCommentReaction

/** Read one comment record by id, or `undefined` if the id isn't a present comment record. @public */
export function getCommentRecord(editor: Editor, id: string): TLCommentRecord | undefined {
	const record = editor.store.get(id as TLRecord['id']) as unknown as TLCommentRecord | undefined
	if (!record) return undefined
	if (
		record.typeName === 'comment' ||
		record.typeName === 'comment-thread' ||
		record.typeName === 'comment-reaction'
	) {
		return record
	}
	return undefined
}

/**
 * Every comment thread in the store, **including soft-deleted and emptied ones** awaiting the
 * server's prune, which nothing renders. For the set the UI shows, use {@link getLiveCommentThreads}.
 *
 * Non-reactive; wrap in `useValue`, or use `useCommentThreads`, to react.
 * @public
 */
export function getCommentThreads(editor: Editor): TLCommentThread[] {
	const typeName = 'comment-thread' as TLRecord['typeName']
	return editor.store.query.records(typeName).get() as unknown as TLCommentThread[]
}

/**
 * Every comment in the store, **including soft-deleted ones** awaiting the server's prune. For the
 * set the UI shows, use {@link getLiveComments}.
 *
 * Non-reactive; wrap in `useValue`, or use `useComments`, to react.
 * @public
 */
export function getComments(editor: Editor): TLComment[] {
	const typeName = 'comment' as TLRecord['typeName']
	return editor.store.query.records(typeName).get() as unknown as TLComment[]
}

/**
 * The comments that should render: not soft-deleted. A deleted record lingers in the store until
 * the server prunes it, so build counts and lists from this rather than {@link getComments}.
 *
 * Non-reactive; the reactive equivalent is `useComments` (which also sorts oldest first).
 * @public
 */
export function getLiveComments(editor: Editor): TLComment[] {
	return getComments(editor).filter((comment) => !comment.isDeleted)
}

/**
 * The comment threads that should render (pins, sidebar): not soft-deleted, and still holding at
 * least one live comment. A thread emptied by its last comment's delete lingers with no surface
 * until the server's prune lands.
 *
 * Non-reactive; the reactive equivalent is `useCommentThreads`.
 * @public
 */
export function getLiveCommentThreads(editor: Editor): TLCommentThread[] {
	const threadIdsWithComments = new Set(getLiveComments(editor).map((comment) => comment.threadId))
	return getCommentThreads(editor).filter(
		(thread) => !thread.isDeleted && threadIdsWithComments.has(thread.id)
	)
}

/** All comment reactions currently in the store (non-reactive; wrap in `useValue` to react). @public */
export function getCommentReactions(editor: Editor): TLCommentReaction[] {
	const typeName = 'comment-reaction' as TLRecord['typeName']
	return editor.store.query.records(typeName).get() as unknown as TLCommentReaction[]
}
