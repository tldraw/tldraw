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
import { getCommentRecord, getLiveComments, type TLCommentRecord } from './comment-store'
import { getCommentingOptions, type CommentingOptions } from './options'
import { openThreadId } from './state'

/**
 * Every write to a comment record, and the undo/redo policy governing them.
 *
 * The file layers bottom-up: {@link commitCommentMutation} resolves the history mode and hands its
 * callback a writer, {@link putCommentRecords} and {@link removeCommentRecords} are the typed
 * writes that run under it, and the verbs below are those writes plus the one rule each carries.
 * Every verb takes the record it acts on as the identity of what to change, not the value to write
 * back — see {@link readLatest}.
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

interface CommentMutationWriter {
	put(records: TLCommentRecord[]): void
	remove(ids: (TLCommentId | TLCommentReactionId | TLCommentThreadId)[]): void
}

const activeCommentMutations = new WeakMap<Editor, { history: TLHistoryBatchOptions['history'] }>()

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
 *
 * `editor.run`'s history option isn't additive — a nested run overwrites the enclosing mode — so
 * constituent records go through the callback's writer instead of opening a commit of their own,
 * which would quietly make a `drag` write non-undoable.
 *
 * Commits that nest are only a problem when they resolve to different modes, and then neither is
 * the right one to keep, so it throws. Matching modes have to nest: a store side effect runs inside
 * the write that triggered it, with no "after the commit" to defer to. (A `store.listen` handler
 * normally flushes on a later frame, so its writes open a commit of their own, but a synchronous
 * flush — as under test — lands it inside too.)
 * @internal
 */
export function commitCommentMutation<T>(
	editor: Editor,
	fn: (writer: CommentMutationWriter) => T,
	kind: CommentMutationKind = 'mutation'
): T {
	const history = historyModeFor(getCommentingOptions(editor), kind)
	const enclosing = activeCommentMutations.get(editor)
	if (enclosing && enclosing.history !== history) {
		throw new Error(
			`A comment mutation that records history as '${history}' can't run inside one recording it as '${enclosing.history}': one of the two modes would be silently discarded. Use the provided writer for constituent records, or run this operation after the enclosing one has committed.`
		)
	}

	activeCommentMutations.set(editor, { history })
	try {
		let result: T
		editor.run(
			() => {
				let isWriterActive = true
				const assertWriterActive = () => {
					if (!isWriterActive) {
						throw new Error(
							'A comment mutation writer cannot be used after its commit has finished.'
						)
					}
				}
				try {
					result = fn({
						put: (records) => {
							assertWriterActive()
							editor.store.put(records as unknown as TLRecord[])
						},
						remove: (ids) => {
							assertWriterActive()
							editor.store.remove(ids as unknown as TLRecord['id'][])
						},
					})
				} finally {
					isWriterActive = false
				}
			},
			{ history }
		)
		return result!
	} finally {
		if (enclosing) {
			activeCommentMutations.set(editor, enclosing)
		} else {
			activeCommentMutations.delete(editor)
		}
	}
}

/**
 * Write comment records to the store, under the configured {@link CommentingOptions.history}
 * behavior. Defaults to `'ignore'`.
 *
 * Use it to seed or import threads, and to save an edit. To delete, prefer {@link deleteComment}
 * and {@link deleteThread}: comments are soft-deleted, and a synced server rejects the hard delete.
 *
 * @public
 */
export function putCommentRecords(editor: Editor, records: TLCommentRecord[]): void {
	commitCommentMutation(editor, ({ put }) => put(records))
}

/**
 * Remove comment records from the store by id, under the configured
 * {@link CommentingOptions.history} behavior.
 *
 * This is a hard delete, which is rarely what you want: the built-in UI soft-deletes
 * ({@link deleteComment}, {@link deleteThread}) so the server can prune the records, and a server
 * enforcing per-record permissions vetoes a hard delete outright. Reach for this on a local,
 * unsynced store, or to drop a reaction (see {@link toggleCommentReaction}).
 *
 * @public
 */
export function removeCommentRecords(
	editor: Editor,
	ids: (TLCommentId | TLCommentReactionId | TLCommentThreadId)[]
): void {
	commitCommentMutation(editor, ({ remove }) => remove(ids))
}

/**
 * The record as the store currently holds it, or `undefined` if it isn't there any more.
 *
 * A verb is handed a record, but that record is a snapshot and comment records move underneath it:
 * deleting a pinned shape converts the anchor to a point, reparenting rehomes the thread, a drag
 * re-anchors it. Writing the caller's snapshot back would revert those fields for everyone. `put`
 * is also an upsert, so a record a remote delete already removed would come back.
 *
 * So a verb reads what it's changing rather than trusting what it was given, and a record that's
 * gone is a no-op.
 */
function readLatest<T extends TLComment | TLCommentThread>(
	editor: Editor,
	record: T
): T | undefined {
	const current = getCommentRecord(editor, record.id)
	// Record ids carry their type, so a matching `typeName` means a record of exactly T.
	return current?.typeName === record.typeName ? (current as T) : undefined
}

/**
 * Replace a comment's body and stamp it as edited, which renders the "(edited)" marker on its
 * byline. Editing is the author's to do by default ({@link CommentingOptions.canModifyComment}),
 * and a server enforcing per-record permissions rejects anyone else's. Widening one end without the
 * other leaves an edit that's offered and then rejected, so widen both.
 *
 * The body lands on the version the store currently holds, so a stale copy can't revert a later
 * change or re-create a removed comment — editing one of those does nothing.
 *
 * @example
 * ```ts
 * editComment(editor, comment, toRichText('Actually, make it dashed'))
 * ```
 *
 * @public
 */
export function editComment(editor: Editor, comment: TLComment, body: TLRichText): void {
	commitCommentMutation(editor, ({ put }) => {
		const current = readLatest(editor, comment)
		if (!current) return
		put([{ ...current, body, editedAt: Date.now() }])
	})
}

/**
 * Mark a thread resolved, stamping who resolved it and when. Resolved threads keep their pin (a
 * checked one) and are hidden from the sidebar until its "show resolved" filter is on.
 *
 * Only the resolution is written — the rest of the thread is read fresh, so a stale copy can't drag
 * a pin back. A no-op on a thread that's gone.
 *
 * @public
 */
export function resolveThread(editor: Editor, thread: TLCommentThread, userId: string): void {
	commitCommentMutation(editor, ({ put }) => {
		const current = readLatest(editor, thread)
		if (!current) return
		put([{ ...current, resolved: { at: Date.now(), by: userId } }])
	})
}

/**
 * Reopen a resolved thread, clearing the resolution. A no-op on a thread that isn't resolved, and
 * on one that's gone. Like {@link resolveThread}, it touches only the resolution.
 *
 * @public
 */
export function reopenThread(editor: Editor, thread: TLCommentThread): void {
	commitCommentMutation(editor, ({ put }) => {
		const current = readLatest(editor, thread)
		if (!current) return
		put([{ ...current, resolved: null }])
	})
}

/**
 * Delete a comment.
 *
 * This is a soft delete: it sets `isDeleted` rather than removing the record, and the server prunes
 * the comment and its reactions once the flag is persisted — so no client removes records it
 * doesn't own, and a server enforcing per-record permissions has a write it can check.
 *
 * Deleting is the author's to do by default; {@link CommentingOptions.canModifyComment} widens
 * that, as does its counterpart on the server.
 *
 * Never undoable, whatever {@link CommentingOptions.history} says: the flag is write-once
 * server-side, so an undo clearing it would be vetoed rather than bring the comment back.
 *
 * Deleting a thread's last comment closes it and leaves the thread record for the server to prune,
 * since the deleter may not be its creator. An already-deleted comment is a no-op.
 *
 * @public
 */
export function deleteComment(editor: Editor, comment: TLComment): void {
	commitCommentMutation(
		editor,
		({ put }) => {
			const current = readLatest(editor, comment)
			// Deleting twice is nothing to do rather than something to redo. The check below counts this
			// comment among the live ones, so it only reads as "the last one" while this delete takes it away.
			if (!current || current.isDeleted) return
			const isLastInThread =
				getLiveComments(editor).filter((c) => c.threadId === current.threadId).length <= 1
			if (isLastInThread && openThreadId.get(editor) === current.threadId) {
				openThreadId.set(editor, null)
			}
			put([{ ...current, isDeleted: true }])
		},
		'delete'
	)
}

/**
 * Delete a thread and, with it, the whole conversation.
 *
 * A soft delete on the same model as {@link deleteComment}: the server prunes the thread, its
 * comments, and their reactions once the flag is persisted. Deleting a thread is its creator's to
 * do by default ({@link CommentingOptions.canModifyComment}), and the write is never undoable.
 * Closes the thread if it's the open one; a pruned thread is a no-op.
 *
 * @public
 */
export function deleteThread(editor: Editor, thread: TLCommentThread): void {
	commitCommentMutation(
		editor,
		({ put }) => {
			const current = readLatest(editor, thread)
			if (!current) return
			if (openThreadId.get(editor) === current.id) {
				openThreadId.set(editor, null)
			}
			put([{ ...current, isDeleted: true }])
		},
		'delete'
	)
}
