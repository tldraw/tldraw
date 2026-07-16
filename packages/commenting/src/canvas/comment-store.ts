import { Editor, TLComment, TLCommentId, TLCommentThread, TLCommentThreadId } from 'tldraw'

/**
 * Typed access to comment records on the editor store.
 *
 * Comment threads and comments live on the editor's local store so the canvas can render them
 * reactively, but they are opt-in records that aren't part of the `TLRecord` union (they ride the
 * sync server's object-store lane on the wire — see `TLCommentThread`). `editor.store` is therefore
 * typed `Store<TLRecord>` and doesn't know about them. These helpers own the one unavoidable cast at
 * that boundary so every call site stays fully typed.
 */

/** A record that lives in a comment thread: the thread itself or one of its messages. */
export type TLCommentRecord = TLComment | TLCommentThread

/** Write comment records to the store. */
export function putCommentRecords(editor: Editor, records: TLCommentRecord[]): void {
	editor.store.put(records as any)
}

/** Remove comment records from the store by id. */
export function removeCommentRecords(
	editor: Editor,
	ids: (TLCommentId | TLCommentThreadId)[]
): void {
	editor.store.remove(ids as any)
}

/** Read one comment record by id, or `undefined` if the id isn't a present comment record. */
export function getCommentRecord(editor: Editor, id: string): TLCommentRecord | undefined {
	const record = editor.store.get(id as any) as unknown as TLCommentRecord | undefined
	if (!record) return undefined
	if (record.typeName === 'comment' || record.typeName === 'comment-thread') return record
	return undefined
}

/** All comment threads currently in the store (non-reactive; wrap in `useValue` to react). */
export function getCommentThreads(editor: Editor): TLCommentThread[] {
	return editor.store.query.records('comment-thread' as any).get() as unknown as TLCommentThread[]
}

/** All comments currently in the store (non-reactive; wrap in `useValue` to react). */
export function getComments(editor: Editor): TLComment[] {
	return editor.store.query.records('comment' as any).get() as unknown as TLComment[]
}
