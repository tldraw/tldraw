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

/** Write comment records to the store. @public */
export function putCommentRecords(editor: Editor, records: TLCommentRecord[]): void {
	editor.store.put(records as unknown as TLRecord[])
}

/** Remove comment records from the store by id. @public */
export function removeCommentRecords(
	editor: Editor,
	ids: (TLCommentId | TLCommentThreadId | TLCommentReactionId)[]
): void {
	editor.store.remove(ids as unknown as TLRecord['id'][])
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

/** All comment threads currently in the store (non-reactive; wrap in `useValue` to react). @public */
export function getCommentThreads(editor: Editor): TLCommentThread[] {
	const typeName = 'comment-thread' as TLRecord['typeName']
	return editor.store.query.records(typeName).get() as unknown as TLCommentThread[]
}

/** All comments currently in the store (non-reactive; wrap in `useValue` to react). @public */
export function getComments(editor: Editor): TLComment[] {
	const typeName = 'comment' as TLRecord['typeName']
	return editor.store.query.records(typeName).get() as unknown as TLComment[]
}

/** All comment reactions currently in the store (non-reactive; wrap in `useValue` to react). @public */
export function getCommentReactions(editor: Editor): TLCommentReaction[] {
	const typeName = 'comment-reaction' as TLRecord['typeName']
	return editor.store.query.records(typeName).get() as unknown as TLCommentReaction[]
}
