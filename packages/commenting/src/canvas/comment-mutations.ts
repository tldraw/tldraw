import {
	Editor,
	TLComment,
	TLCommentId,
	TLCommentReactionId,
	TLCommentThread,
	TLCommentThreadId,
	TLHistoryBatchOptions,
	TLRecord,
	TLRichText,
} from 'tldraw'
import { getLiveComments, type TLCommentRecord } from './comment-store'
import { getCommentingOptions, type CommentingOptions } from './options'
import { openThreadId } from './state'

/**
 * Every write to a comment record, and the undo/redo policy governing them.
 *
 * This file layers bottom-up: {@link commitCommentMutation} resolves the history mode,
 * {@link putCommentRecords} and {@link removeCommentRecords} are the typed writes that run under
 * it, and the verbs below are those writes plus the one rule each carries — a timestamp to stamp, a
 * shape to put the `resolved` field in, or the soft-delete protocol. The built-in thread view calls
 * exactly these verbs, so a UI of your own behaves the same as the one in the box.
 *
 * Posting carries no such rule, so it isn't a verb here: build the records with
 * `createCommentThread`/`createComment` and write them with {@link putCommentRecords}.
 */

/**
 * Which history policy a comment write follows:
 *
 * - `mutation` — {@link CommentingOptions.history}: posts, replies, edits, resolves.
 * - `drag` — {@link CommentingOptions.dragHistory}, falling back to `history`: pin and region
 *   re-anchors, which are spatial edits a host may reasonably want undoable alongside a shape move.
 * - `delete` — always `'ignore'`, whatever the options say. A soft-delete flag is write-once
 *   server-side, so an undo clearing it would be vetoed and rebased rather than restore anything.
 *
 * @internal
 */
export type CommentMutationKind = 'delete' | 'drag' | 'mutation'

/** The undo/redo mode a write of the given kind runs under. See {@link CommentMutationKind}. */
function historyModeFor(
	options: CommentingOptions,
	kind: CommentMutationKind
): TLHistoryBatchOptions['history'] {
	switch (kind) {
		case 'delete':
			return 'ignore'
		case 'drag':
			return options.dragHistory ?? options.history
		case 'mutation':
			return options.history
	}
}

/**
 * Commit a comment mutation with the configured undo/redo behavior, so the
 * {@link CommentingOptions.history} option governs whether it lands on the undo stack. Defaults to
 * `'ignore'`. See {@link CommentMutationKind} for what each kind resolves to.
 * @internal
 */
export function commitCommentMutation<T>(
	editor: Editor,
	fn: () => T,
	kind: CommentMutationKind = 'mutation'
): T {
	const history = historyModeFor(getCommentingOptions(editor), kind)
	let result: T
	editor.run(
		() => {
			result = fn()
		},
		{ history }
	)
	return result!
}

/**
 * Write records without opening a commit, for call sites that already sit inside one.
 *
 * `editor.run`'s history option isn't additive — a nested run overwrites the enclosing mode for its
 * own scope — so a {@link putCommentRecords} call inside a commit would discard the mode its caller
 * chose. A pin drag committed as `drag` under `dragHistory: 'record'` would land back on
 * `history: 'ignore'` and quietly stop being undoable. Inside a commit, write with this.
 *
 * @internal
 */
export function putRecordsInCommit(editor: Editor, records: TLCommentRecord[]): void {
	editor.store.put(records as unknown as TLRecord[])
}

/** {@link putRecordsInCommit}'s counterpart for removals. @internal */
export function removeRecordsInCommit(
	editor: Editor,
	ids: (TLCommentId | TLCommentReactionId | TLCommentThreadId)[]
): void {
	editor.store.remove(ids as unknown as TLRecord['id'][])
}

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
	commitCommentMutation(editor, () => putRecordsInCommit(editor, records))
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
	ids: (TLCommentId | TLCommentReactionId | TLCommentThreadId)[]
): void {
	commitCommentMutation(editor, () => removeRecordsInCommit(editor, ids))
}

/**
 * Replace a comment's body and stamp it as edited, which is what renders the "(edited)" marker on
 * its byline.
 *
 * Editing is the author's to do. The built-in UI only offers it on your own comments, and a server
 * that enforces per-record permissions rejects anyone else's edit.
 *
 * @example
 * ```ts
 * editComment(editor, comment, toRichText('Actually, make it dashed'))
 * ```
 *
 * @public
 */
export function editComment(editor: Editor, comment: TLComment, body: TLRichText): void {
	putCommentRecords(editor, [{ ...comment, body, editedAt: Date.now() }])
}

/**
 * Mark a thread resolved, stamping who resolved it and when. Resolved threads keep their pin (a
 * checked one) and are hidden from the sidebar until its "show resolved" filter is on.
 *
 * @public
 */
export function resolveThread(editor: Editor, thread: TLCommentThread, userId: string): void {
	putCommentRecords(editor, [{ ...thread, resolved: { at: Date.now(), by: userId } }])
}

/**
 * Reopen a resolved thread, clearing the resolution. A no-op on a thread that isn't resolved.
 *
 * @public
 */
export function reopenThread(editor: Editor, thread: TLCommentThread): void {
	putCommentRecords(editor, [{ ...thread, resolved: null }])
}

/**
 * Delete a comment.
 *
 * This is a soft delete: it sets the record's `isDeleted` flag rather than removing it, and the
 * server prunes the comment and its reactions once the flag is persisted. That way no client ever
 * removes records it doesn't own — a reaction belongs to whoever left it — and a server enforcing
 * per-record permissions has a write it can check rather than a deletion it can only refuse.
 * Deleting is the author's to do; the built-in UI only offers it on your own comments.
 *
 * The write is never undoable, whatever {@link CommentingOptions.history} says: the flag is
 * write-once server-side, so an undo clearing it would be vetoed and rebased rather than bring the
 * comment back.
 *
 * Deleting a thread's last comment leaves the thread with no surface — an empty thread renders
 * nothing — and closes it if it's open. The thread record is left for the server to prune, since
 * the deleter may not be its creator.
 *
 * @public
 */
export function deleteComment(editor: Editor, comment: TLComment): void {
	commitCommentMutation(
		editor,
		() => {
			const isLastInThread =
				getLiveComments(editor).filter((c) => c.threadId === comment.threadId).length <= 1
			if (isLastInThread && openThreadId.get(editor) === comment.threadId) {
				openThreadId.set(editor, null)
			}
			putRecordsInCommit(editor, [{ ...comment, isDeleted: true }])
		},
		'delete'
	)
}

/**
 * Delete a thread and, with it, the whole conversation.
 *
 * A soft delete on the same model as {@link deleteComment}: the flag goes on the thread record and
 * the server prunes the thread, its comments, and their reactions once it's persisted. Deleting a
 * thread is its creator's to do — a server enforcing per-record permissions vetoes anyone else —
 * and the write is never undoable.
 *
 * Closes the thread if it's the open one.
 *
 * @public
 */
export function deleteThread(editor: Editor, thread: TLCommentThread): void {
	commitCommentMutation(
		editor,
		() => {
			if (openThreadId.get(editor) === thread.id) {
				openThreadId.set(editor, null)
			}
			putRecordsInCommit(editor, [{ ...thread, isDeleted: true }])
		},
		'delete'
	)
}
