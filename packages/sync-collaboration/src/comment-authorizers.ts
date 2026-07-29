import type { UnknownRecord } from '@tldraw/store'
import type {
	TLRecordAuthorizer,
	TLRecordAuthorizerArgs,
	TLRecordAuthorizerResult,
	TLRecordAuthorizers,
} from '@tldraw/sync-core'
import {
	createCommentReactionId,
	type TLComment,
	type TLCommentReaction,
	type TLCommentThread,
} from '@tldraw/tlschema'

/**
 * Options for {@link createCommentAuthorizers}.
 *
 * @public
 */
export interface CommentAuthorizerOptions<SessionMeta> {
	/**
	 * Resolve the authenticated user id for a session from its host-provided `meta`. Return
	 * `null` for anonymous sessions — they can't create comments or threads, and can't perform
	 * any owner-only action. Called exactly once per authorized write.
	 */
	getUserId(session: { sessionId: string; meta: SessionMeta }): string | null
}

/**
 * Server-side write authorization for comment records, for use with a sync server's
 * `authorizeRecord` option (see `TLSocketRoom` in `@tldraw/sync-core`). Forces comment and
 * thread authorship from the session's identity so nothing can be posted, resolved, or deleted
 * in someone else's name:
 *
 * - `comment`: `authorId` is stamped from the session on create (anonymous creates are
 *   rejected) and immutable afterwards; only the author may update. `threadId` and `createdAt`
 *   are immutable too — a comment can't be re-parented or back-dated after the fact.
 * - `comment-thread`: `createdBy` and `createdAt` are stamped/fixed on create. Anyone with access
 *   may resolve/reopen, but a non-null `resolved.by` must be the session's own user.
 * - `comment-reaction`: `userId` is stamped on create and immutable; a create must land at the
 *   canonical id for its (comment, user, emoji) triple, everything identity-bearing is immutable
 *   on update, and only the reactor may delete their own reaction.
 * - Deletion is soft for comments and threads: a write-once `isDeleted` flag that only the
 *   record's owner may set, never cleared, never set at create. Client hard-deletes are always
 *   rejected — record removals are server-side only.
 *
 * Comment records ride alongside your document records, so widen the room's record union to
 * include them, then spread the result into the authorizer map alongside your own entries:
 *
 * @example
 * ```ts
 * interface SessionMeta {
 * 	userId: string | null
 * }
 *
 * type MyRecord = TLRecord | TLComment | TLCommentThread | TLCommentReaction
 *
 * new TLSocketRoom<MyRecord, SessionMeta>({
 * 	authorizeRecord: {
 * 		...createCommentAuthorizers<SessionMeta>({ getUserId: (session) => session.meta.userId }),
 * 	},
 * })
 * ```
 *
 * @public
 */
export function createCommentAuthorizers<SessionMeta>(
	opts: CommentAuthorizerOptions<SessionMeta>
): TLRecordAuthorizers<TLComment | TLCommentThread | TLCommentReaction, SessionMeta> {
	const { getUserId } = opts

	/** A rule is an authorizer that receives the session's user id, resolved for it exactly once. */
	type Rule<Rec extends UnknownRecord> = (
		userId: string | null,
		args: TLRecordAuthorizerArgs<Rec, SessionMeta>
	) => TLRecordAuthorizerResult<Rec>

	/** Adapt a rule to the authorizer signature, resolving the session's user id exactly once. */
	function withUserId<Rec extends UnknownRecord>(
		rule: Rule<Rec>
	): TLRecordAuthorizer<Rec, SessionMeta> {
		return (args) => rule(getUserId(args.session), args)
	}

	/**
	 * Authorize a record whose attribution lives in `field`: stamped from the session on create,
	 * immutable on update. With `ownerOnlyUpdate`, only the author may update it at all.
	 */
	function authorizeAuthored<Rec extends UnknownRecord>(
		field: keyof Rec & string,
		{ ownerOnlyUpdate = false } = {}
	): Rule<Rec> {
		return (userId, { type, prev, next, allow, deny }) => {
			if (type === 'create') {
				if (!userId) return deny() // no identity to attribute → reject
				return allow({ ...next, [field]: userId } as Rec)
			}
			if (type === 'update') {
				if (next[field] !== prev[field]) return deny() // attribution is immutable
				if (ownerOnlyUpdate && userId !== prev[field]) return deny() // only the author edits
				return allow()
			}
			return allow()
		}
	}

	/**
	 * Police a soft-deleted record type on top of `base`: deletion is a write-once `isDeleted`
	 * flag — set exactly once, never cleared, only by the record's owner (`ownerOf`), never on
	 * create — and clients never hard-delete these records at all. Record removals are
	 * server-initiated only (server-side deletes don't run authorizers), so once the server
	 * prunes a flagged record there is no un-delete.
	 */
	function authorizeSoftDeleted<Rec extends UnknownRecord & { isDeleted: boolean }>(
		ownerOf: (rec: Rec) => string,
		base: Rule<Rec>
	): Rule<Rec> {
		return (userId, args) => {
			const { deny } = args
			if (args.type === 'delete') return deny()
			const result = base(userId, args)
			if (!result.allowed) return result
			// A record can't be born deleted — that would smuggle a deletion past the update checks.
			if (args.type === 'create' && args.next.isDeleted) return deny()
			if (args.type === 'update') {
				const { prev, next } = args
				if (prev.isDeleted !== next.isDeleted) {
					if (prev.isDeleted) return deny() // write-once: never cleared
					if (userId !== ownerOf(prev)) return deny() // only the owner deletes
				}
			}
			return result
		}
	}

	/**
	 * Threads stay editable by anyone with access (resolve/reopen), but resolution is itself an
	 * attribution: a non-null `resolved.by`, set at create or changed by update, must be the
	 * session's own user.
	 */
	const authorizeThreadResolution: Rule<TLCommentThread> = (userId, args) => {
		const { deny } = args
		const result = authorizeAuthored<TLCommentThread>('createdBy')(userId, args)
		if (!result.allowed) return result
		if (args.type === 'create') {
			// Delete + re-put could otherwise smuggle in a resolution forged in someone else's name.
			const { next } = args
			if (next.resolved && next.resolved.by !== userId) return deny()
		}
		if (args.type === 'update') {
			const { prev, next } = args
			const changed =
				prev.resolved?.at !== next.resolved?.at || prev.resolved?.by !== next.resolved?.by
			if (changed && next.resolved && next.resolved.by !== userId) return deny()
		}
		return result
	}

	/**
	 * Reject an update that changes any of `fields`. Used for the structural fields an update must
	 * never touch: a comment's parent thread and its creation time. `threadId` is what ties a
	 * comment to its conversation (and, downstream, to a file), so letting an author re-parent an
	 * existing comment would move it between threads — and, where threads span files, between
	 * files. `createdAt` orders threads and bounds the notification feed, so a mutable one lets a
	 * comment be re-sorted after the fact.
	 */
	function immutableFields<Rec extends UnknownRecord>(
		fields: readonly (keyof Rec & string)[],
		base: Rule<Rec>
	): Rule<Rec> {
		return (userId, args) => {
			if (args.type === 'update') {
				const { prev, next, deny } = args
				for (const field of fields) {
					if (next[field] !== prev[field]) return deny()
				}
			}
			return base(userId, args)
		}
	}

	const authorizeReactionBase = authorizeAuthored<TLCommentReaction>('userId', {
		ownerOnlyUpdate: true,
	})

	/**
	 * A reaction's id is derived from its (comment, user, emoji) triple (see
	 * `createCommentReactionId`), which is what makes reaction identity structural. The base rule
	 * already stamps `userId` from the session and lets only the owner change a reaction — but the
	 * id, the comment it points at, and the emoji are all client-supplied, so this wrapper adds two
	 * things:
	 *
	 * - On **create**, the id must be the canonical id for `commentId` + the session's user +
	 *   `next.emoji`. Without this a forged client could create a record at another user's id slot
	 *   (locking them out of that reaction), or push a mismatched id that lands two records on one
	 *   (comment, user, emoji) — an invariant any persistence layer keyed on the triple relies on.
	 *
	 * - On **update**, everything identity-bearing is immutable: `commentId`, `threadId`, `pageId`,
	 *   and `emoji` all feed the id (directly or by denormalization), so a re-react is a
	 *   create/delete, not an update. The only thing an update may touch is `createdAt`/`meta`.
	 *   So the id and the fields it is derived from can never drift apart.
	 */
	const authorizeReaction: Rule<TLCommentReaction> = (userId, args) => {
		const { allow, deny } = args
		// Only the reactor may remove their own reaction. Cascades still sweep every reactor's
		// records because server-initiated writes carry no session and so skip authorizers
		// entirely — an open client delete was never what made the sweep work.
		if (args.type === 'delete') {
			return userId && userId === args.prev.userId ? allow() : deny()
		}
		const result = authorizeReactionBase(userId, args)
		if (!result.allowed) return result
		if (args.type === 'create') {
			// Unreachable: the base rule already rejected identity-less creates. Checked to narrow.
			if (!userId) return deny()
			const { next } = args
			if (next.id !== createCommentReactionId(next.commentId, userId, next.emoji)) {
				return deny()
			}
		}
		if (args.type === 'update') {
			const { prev, next } = args
			if (next.commentId !== prev.commentId) return deny()
			if (next.threadId !== prev.threadId) return deny()
			if (next.pageId !== prev.pageId) return deny()
			if (next.emoji !== prev.emoji) return deny()
		}
		return result
	}

	return {
		comment: withUserId(
			authorizeSoftDeleted<TLComment>(
				(comment) => comment.authorId,
				// `pageId` stays mutable: it's denormalized from the thread, and moving an anchored
				// thread between pages rewrites it on every comment in the thread.
				immutableFields<TLComment>(
					['threadId', 'createdAt'],
					authorizeAuthored<TLComment>('authorId', { ownerOnlyUpdate: true })
				)
			)
		),
		'comment-thread': withUserId(
			authorizeSoftDeleted<TLCommentThread>(
				(thread) => thread.createdBy,
				immutableFields<TLCommentThread>(['createdAt'], authorizeThreadResolution)
			)
		),
		// A reaction is one user's own record, so the standard attribution rules mostly cover it:
		// `userId` is stamped from the session and only the reactor can change their reaction, and
		// the wrapper's id check ties the record to its (comment, user, emoji) slot — so no one can
		// forge or hijack another user's reaction. Deletion, though, is deliberately open: anyone
		// with access to the room may hard-delete any reaction. Reactions have no soft-delete /
		// `isDeleted` flag (unlike comments) on purpose — a reaction is a toggle, so removing one is
		// a plain record delete, and a host cascading a comment or thread deletion must sweep every
		// reactor's records, not just the caller's own.
		'comment-reaction': withUserId(authorizeReaction),
	}
}
