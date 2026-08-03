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
 * This file layers bottom-up: {@link commitCommentMutation} resolves the history mode and gives its
 * callback a writer for the records in that operation. {@link putCommentRecords} and
 * {@link removeCommentRecords} wrap that transaction for general-purpose writes, and the verbs
 * below add the one rule each carries — a timestamp to stamp, a shape to put the `resolved` field
 * in, or the soft-delete protocol. The built-in thread view calls exactly these verbs, so a UI of
 * your own behaves the same as the one in the box.
 *
 * Every verb takes the record it acts on, but treats it as the identity of what to change rather
 * than as the value to write back — see {@link readLatest}.
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

/** The commit currently open on an editor, if there is one. See {@link commitCommentMutation}. */
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
 * `'ignore'`. The callback's writer keeps every constituent record in that commit without opening
 * another history scope. See {@link CommentMutationKind} for what each kind resolves to.
 *
 * `editor.run`'s history option isn't additive — a nested run overwrites the enclosing mode for its
 * own scope — so a commit opened inside another one silently rewrites the mode its caller chose. A
 * pin drag committed as `drag` under `dragHistory: 'record'` would land back on `history: 'ignore'`
 * and quietly stop being undoable. Constituent records therefore go through the writer, which
 * writes in the open commit rather than opening one of its own.
 *
 * A commit that reaches this while another is open on the same editor is only a problem when the
 * two resolve to different modes, and then it's unfixable here — neither the outer nor the inner
 * mode is universally right — so it throws and the caller runs a separate operation instead. Modes
 * that match nest harmlessly, and they have to: a host reacting to a comment write from a
 * `store.listen` callback or a store side effect is called inside the commit that triggered it, and
 * has no way to defer its own write until after that commit finishes.
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
	commitCommentMutation(editor, ({ put }) => put(records))
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
	commitCommentMutation(editor, ({ remove }) => remove(ids))
}

/**
 * The record as the store currently holds it, or `undefined` if it isn't there any more.
 *
 * A verb is handed a record, but that record is a snapshot of whenever its caller got hold of one,
 * and a comment record moves underneath it. A thread's `anchor` and `pageId` are rewritten without
 * anyone touching the thread: deleting a pinned shape converts the anchor to a point, reparenting
 * one rehomes the thread to another page, a pin drag re-anchors it. Writing the caller's snapshot
 * back would put those fields as they were and sync the revert out to everyone.
 *
 * `put` is also an upsert, so a record a remote delete has already removed would come back — with
 * `isDeleted: false` on an edit or a resolve. That's the multiplayer surprise the schema warns
 * about (see `TLComment`), reached by a route the history option doesn't cover.
 *
 * So a verb reads what it's changing rather than trusting what it was given, and a record that's
 * gone is a no-op: whatever the change was, there's nothing left for it to apply to.
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
 * Replace a comment's body and stamp it as edited, which is what renders the "(edited)" marker on
 * its byline.
 *
 * Editing is the author's to do. The built-in UI only offers it on your own comments, and a server
 * that enforces per-record permissions rejects anyone else's edit.
 *
 * The `comment` you pass says which comment to edit; the body lands on the version the store
 * currently holds, so a copy you've held on to can't revert a change made since it, and can't
 * re-create a comment that's already been removed — editing one of those does nothing.
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
 * Only the resolution is written: the rest of the thread is read fresh, so resolving with a stale
 * copy in hand won't drag a pin back to where it used to be. A no-op on a thread that's gone.
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
 * A comment that's already deleted, or already pruned, is a no-op.
 *
 * @public
 */
export function deleteComment(editor: Editor, comment: TLComment): void {
	commitCommentMutation(
		editor,
		({ put }) => {
			const current = readLatest(editor, comment)
			// Deleting twice — a double activation, a handler firing on a copy taken before the first
			// delete — is nothing to do rather than something to redo. The check below counts the
			// comment being deleted among the live ones, so it only reads as "the last one" while
			// this delete is the one taking it away.
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
 * A soft delete on the same model as {@link deleteComment}: the flag goes on the thread record and
 * the server prunes the thread, its comments, and their reactions once it's persisted. Deleting a
 * thread is its creator's to do — a server enforcing per-record permissions vetoes anyone else —
 * and the write is never undoable.
 *
 * Closes the thread if it's the open one. A thread that's already pruned is a no-op.
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
