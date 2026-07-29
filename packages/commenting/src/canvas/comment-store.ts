import {
	Editor,
	TLComment,
	TLCommentId,
	TLCommentReaction,
	TLCommentReactionId,
	TLCommentThread,
	TLCommentThreadId,
	TLRecord,
} from 'tldraw'
import { commitCommentMutation } from './state'

/**
 * Typed access to comment records on the editor store.
 *
 * Comment threads and comments live on the editor's local store so the canvas can render them
 * reactively, but they are opt-in records that aren't part of the `TLRecord` union (they ride the
 * sync server's object-store lane on the wire — see `TLCommentThread`). `editor.store` is therefore
 * statically typed `Store<TLRecord>` and doesn't know about them, so every access has to reinterpret
 * the type. These helpers own that reinterpretation — an `unknown` hop to exactly the type the store
 * expects, so the rest of each call stays checked — behind one boundary, and keep call sites typed.
 */

/**
 * A record that lives in a comment thread: the thread itself, one of its messages, or a reaction
 * to one of those messages.
 * @public
 */
export type TLCommentRecord = TLComment | TLCommentThread | TLCommentReaction

/**
 * Write comment records to the store, under the configured
 * {@link CommentingOptions.history} behavior — so a record you write lands on the undo stack (or
 * doesn't) exactly like one the built-in UI writes. Defaults to `'ignore'`.
 *
 * Use it to seed or import threads, and to save an edit. To delete, prefer
 * {@link deleteComment} and {@link deleteThread} over {@link removeCommentRecords}: comments are
 * soft-deleted, and a synced server rejects the hard delete.
 *
 * @public
 */
export function putCommentRecords(editor: Editor, records: TLCommentRecord[]): void {
	commitCommentMutation(editor, () => {
		editor.store.put(records as unknown as TLRecord[])
	})
}

/**
 * Remove comment records from the store by id, under the configured
 * {@link CommentingOptions.history} behavior.
 *
 * This is a hard delete, which is rarely what you want for a comment or a thread: the built-in UI
 * soft-deletes them ({@link deleteComment}, {@link deleteThread}) so the server can prune the
 * records — including reactions, which belong to whoever left them rather than to the deleter. A
 * server that enforces per-record permissions will veto a hard delete outright. Reach for this on
 * a local, unsynced comment store, or to drop a reaction (which is a hard delete — see
 * {@link toggleCommentReaction}).
 *
 * @public
 */
export function removeCommentRecords(
	editor: Editor,
	ids: (TLCommentId | TLCommentThreadId | TLCommentReactionId)[]
): void {
	commitCommentMutation(editor, () => {
		editor.store.remove(ids as unknown as TLRecord['id'][])
	})
}

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
 * Every comment thread in the store, **including soft-deleted ones** and ones left empty by their
 * last comment's delete — records that are still present but awaiting the server's prune, and that
 * nothing renders. For the set the UI shows, use {@link getLiveCommentThreads}.
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
 * the server prunes it, so this — not {@link getComments} — is what a count or a list of your own
 * should be built from.
 *
 * Non-reactive; the reactive equivalent is `useComments` (which also sorts oldest first).
 * @public
 */
export function getLiveComments(editor: Editor): TLComment[] {
	return getComments(editor).filter((comment) => !comment.isDeleted)
}

/**
 * The comment threads that should render (pins, sidebar): live — not soft-deleted — and still
 * holding at least one live comment. A soft-deleted thread or comment is awaiting the server's
 * prune, as is a thread emptied by its last comment's delete; until the prune lands, the emptied
 * thread record lingers with no surface.
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
