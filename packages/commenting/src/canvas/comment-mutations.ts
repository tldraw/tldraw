import { Editor, TLComment, TLCommentThread, TLRichText } from 'tldraw'
import { getLiveComments, putCommentRecords } from './comment-store'
import { commitCommentMutation, openThreadId } from './state'

/**
 * The comment write verbs, as the built-in UI performs them.
 *
 * Each of these is a small write with a rule attached — a timestamp to stamp, a shape to put the
 * `resolved` field in, or the soft-delete protocol — and the built-in thread view calls exactly
 * these, so a UI of your own behaves the same as the one in the box. Posting has no such rule:
 * build the records with `createCommentThread`/`createComment` and write them with
 * `putCommentRecords`.
 */

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
			putCommentRecords(editor, [{ ...comment, isDeleted: true }])
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
			putCommentRecords(editor, [{ ...thread, isDeleted: true }])
		},
		'delete'
	)
}
