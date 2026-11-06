import type { UnknownRecord } from '@tldraw/store'
import {
	createCommentReactionId,
	type TLAccess,
	type TLComment,
	type TLCommentReaction,
	type TLCommentThread,
	type TLRecordChange,
	type TLRule,
	type TLStamp,
} from '@tldraw/tlschema'
import { isEqual } from '@tldraw/utils'

/**
 * A comment write that belongs to someone in particular, and the stored record it targets — the
 * argument to {@link CommentRuleOptions.canModifyComment}, and the server-side mirror of
 * `CommentModification` in `@tldraw/commenting`.
 *
 * The record is the one the room holds before the change, never the client's version of it: the
 * incoming record is the thing being checked, so a rule that read it would be asking the writer
 * who owns what they're writing to.
 *
 * Resolving, reopening, and reacting aren't here, matching the client option: none of them is
 * anyone's in particular, so the `comment` ability is the only gate on them.
 *
 * @public
 */
export type CommentModification =
	| { readonly action: 'edit-comment'; readonly comment: TLComment }
	| { readonly action: 'delete-comment'; readonly comment: TLComment }
	| { readonly action: 'delete-thread'; readonly thread: TLCommentThread }

/**
 * The argument to {@link CommentRuleOptions.canModifyComment}: which write, against which stored
 * record, by which session.
 *
 * `ownerId` is that record's owner — a comment's `authorId`, a thread's `createdBy` — so a callback
 * widening the default doesn't have to know which field each record keeps it in.
 *
 * @public
 */
export type CommentModificationContext = {
	readonly access: TLAccess
	readonly userId: string | null
	readonly ownerId: string
	can(ability: string): boolean
} & CommentModification

/**
 * Options for {@link commentRules}.
 *
 * @public
 */
export interface CommentRuleOptions {
	/**
	 * Whether a session may make a particular write against a particular stored record: editing or
	 * deleting a comment, or deleting a thread. Defaults to the record's owner:
	 * `ctx.userId === ctx.ownerId`. Override to widen it (a moderator who may take down anyone's comment, for example
	 * `ctx.can('moderate')`) or to narrow it (no edits after an hour).
	 *
	 * The counterpart to `canModifyComment` in `@tldraw/commenting`, which decides which
	 * affordances the UI offers. The editor checks the same rules before a change leaves the
	 * client, so a write this denies is never applied, even for a moment.
	 *
	 * Asked after the structural rules, so it can only widen *who* may write, never *what* a write
	 * may contain: attribution is the session's own and immutable, `isDeleted` is write-once and
	 * never set at create, `threadId` and `createdAt` are frozen, a resolution is the resolver's own,
	 * and clients can't hard-delete.
	 *
	 * A soft delete that changes anything besides the flag is asked about twice — once as the
	 * delete, once as an edit — so granting deletes alone can't be talked into an edit.
	 */
	canModifyComment?(ctx: CommentModificationContext): boolean
}

/**
 * Write rules for comment records, for `definePermissions`. Pass them to the room
 * (`TLSocketRoom`) and to the client (`useSync`), so the editor denies a bad comment write at once
 * and the server denies it again. Who may comment at all is the `comment` ability (see
 * `defaultAbilityRules`).
 *
 * - `comment`: `authorId` must be the session's user on create (anonymous creates are denied) and
 *   is immutable after. Who may update is `canModifyComment`'s call — the author's, unless
 *   widened. `threadId` and `createdAt` are immutable too.
 * - `comment-thread`: `createdBy` must be the session's user on create, and is immutable. Anyone
 *   who can comment may resolve or reopen, but a non-null `resolved.by` must be the session's own
 *   user.
 * - `comment-reaction`: `userId` must be the session's user and is immutable, a create must land
 *   at the canonical id for its (comment, user, emoji) triple, and only the reactor may delete it.
 * - Deletion is soft for comments and threads: a write-once `isDeleted` flag, never set at create.
 *   Client hard-deletes are denied. The server can still remove records with `updateStore`, which
 *   no rule checks.
 *
 * Use {@link stampCommentAuthors} on the client so new records carry the session's user.
 *
 * @example
 * ```ts
 * const permissions = definePermissions({
 * 	rules: [
 * 		...defaultAbilityRules(),
 * 		...commentRules({
 * 			canModifyComment: (ctx) =>
 * 				(ctx.action !== 'edit-comment' && ctx.can('moderate')) || ctx.userId === ctx.ownerId,
 * 		}),
 * 	],
 * 	stamps: [stampCommentAuthors()],
 * })
 * ```
 *
 * @public
 */
export function commentRules<R extends UnknownRecord>(opts: CommentRuleOptions = {}): TLRule<R>[] {
	const canModifyComment =
		opts.canModifyComment ??
		(({ userId, ownerId }: CommentModificationContext) => userId === ownerId)

	return [
		(tx) => {
			const userId = tx.access.userId
			const mayModify = (ownerId: string, modification: CommentModification) =>
				canModifyComment({ access: tx.access, userId, ownerId, can: tx.can, ...modification })

			for (const change of tx.changes as readonly TLRecordChange<UnknownRecord>[]) {
				const typeName = (change.next ?? change.prev)!.typeName
				let reason: string | undefined
				if (typeName === 'comment') {
					reason = checkComment(change as TLRecordChange<TLComment>, userId, mayModify)
				} else if (typeName === 'comment-thread') {
					reason = checkThread(change as TLRecordChange<TLCommentThread>, userId, mayModify)
				} else if (typeName === 'comment-reaction') {
					reason = checkReaction(change as TLRecordChange<TLCommentReaction>, userId)
				}
				if (reason) return reason
			}
			return undefined
		},
	]
}

type MayModify = (ownerId: string, modification: CommentModification) => boolean

function checkComment(
	change: TLRecordChange<TLComment>,
	userId: string | null,
	mayModify: MayModify
): string | undefined {
	switch (change.op) {
		case 'delete':
			return 'Comments are deleted with their isDeleted flag, not removed.'
		case 'create':
			if (!userId) return 'Sign in to comment.'
			if (change.next.authorId !== userId) return 'You can only post comments as yourself.'
			if (change.next.isDeleted) return 'A new comment cannot be deleted.'
			return undefined
		case 'update': {
			const { prev, next } = change
			if (next.authorId !== prev.authorId) return "A comment's author cannot change."
			if (next.threadId !== prev.threadId || next.createdAt !== prev.createdAt) {
				return "A comment's thread and creation time cannot change."
			}
			// `pageId` stays mutable: it's denormalized from the thread, and moving an anchored
			// thread between pages rewrites it on every comment in the thread.
			return checkSoftDelete(prev, next, (write) =>
				mayModify(prev.authorId, {
					action: write === 'delete' ? 'delete-comment' : 'edit-comment',
					comment: prev,
				})
			)
				? undefined
				: 'You can only change your own comments.'
		}
	}
}

function checkThread(
	change: TLRecordChange<TLCommentThread>,
	userId: string | null,
	mayModify: MayModify
): string | undefined {
	switch (change.op) {
		case 'delete':
			return 'Threads are deleted with their isDeleted flag, not removed.'
		case 'create':
			if (!userId) return 'Sign in to comment.'
			if (change.next.createdBy !== userId) return 'You can only start threads as yourself.'
			// Delete + re-put could otherwise smuggle in a resolution forged in someone else's name.
			if (change.next.resolved && change.next.resolved.by !== userId) {
				return 'You can only resolve threads as yourself.'
			}
			if (change.next.isDeleted) return 'A new thread cannot be deleted.'
			return undefined
		case 'update': {
			const { prev, next } = change
			if (next.createdBy !== prev.createdBy || next.createdAt !== prev.createdAt) {
				return "A thread's creator and creation time cannot change."
			}
			const resolutionChanged =
				prev.resolved?.at !== next.resolved?.at || prev.resolved?.by !== next.resolved?.by
			if (resolutionChanged && next.resolved && next.resolved.by !== userId) {
				return 'You can only resolve threads as yourself.'
			}
			// Resolving and reopening stay open to anyone who can comment, so a thread's "edit" isn't
			// asked about — only its delete is.
			return checkSoftDelete(prev, next, (write) =>
				write === 'edit'
					? true
					: mayModify(prev.createdBy, { action: 'delete-thread', thread: prev })
			)
				? undefined
				: 'You can only delete your own threads.'
		}
	}
}

/**
 * An update to a soft-deleted record type is one of two writes, asked about separately: flipping
 * `isDeleted` is a delete, anything else is an edit. An update that does both has to clear both
 * gates, so a delete can't carry an edit out with it. `isDeleted` is write-once.
 */
function checkSoftDelete<Rec extends UnknownRecord & { isDeleted: boolean }>(
	prev: Rec,
	next: Rec,
	may: (write: 'edit' | 'delete') => boolean
): boolean {
	if (prev.isDeleted === next.isDeleted) return may('edit')
	if (prev.isDeleted) return false
	if (!may('delete')) return false
	return isEqual({ ...next, isDeleted: prev.isDeleted }, prev) || may('edit')
}

function checkReaction(
	change: TLRecordChange<TLCommentReaction>,
	userId: string | null
): string | undefined {
	switch (change.op) {
		case 'delete':
			return userId && userId === change.prev.userId
				? undefined
				: 'You can only remove your own reactions.'
		case 'create': {
			const { next } = change
			if (!userId) return 'Sign in to react.'
			if (next.userId !== userId) return 'You can only react as yourself.'
			// a forged id could squat another user's slot, or land two records on one triple
			if (next.id !== createCommentReactionId(next.commentId, userId, next.emoji)) {
				return 'A reaction must use its own id.'
			}
			return undefined
		}
		case 'update': {
			const { prev, next } = change
			if (prev.userId !== userId) return 'You can only change your own reactions.'
			if (
				next.userId !== prev.userId ||
				next.commentId !== prev.commentId ||
				next.threadId !== prev.threadId ||
				next.pageId !== prev.pageId ||
				next.emoji !== prev.emoji
			) {
				return 'A reaction cannot move or change its emoji.'
			}
			return undefined
		}
	}
}

/**
 * The client half of {@link commentRules}: put the session's user on every new comment, thread,
 * and reaction, so the server's check passes. Records that already carry the session's user
 * keep it. A reaction's id is derived from its user, so a reaction must be created with the
 * session's user to begin with; this stamp leaves reactions alone.
 *
 * @public
 */
export function stampCommentAuthors<R extends UnknownRecord>(): TLStamp<R> {
	return (record, access) => {
		if (!access.userId) return record
		const r = record as UnknownRecord & Record<string, unknown>
		if (r.typeName === 'comment' && r.authorId !== access.userId) {
			return { ...r, authorId: access.userId } as unknown as R
		}
		if (r.typeName === 'comment-thread' && r.createdBy !== access.userId) {
			return { ...r, createdBy: access.userId } as unknown as R
		}
		return record
	}
}
