import type { UnknownRecord } from '@tldraw/store'
import type { TLRecordAuthorizer, TLRecordAuthorizers } from '@tldraw/sync-core'
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
 *   rejected) and immutable afterwards; only the author may update.
 * - `comment-thread`: `createdBy` is stamped on create and immutable. Anyone with access may
 *   resolve/reopen, but a non-null `resolved.by` must be the session's own user.
 * - `comment-reaction`: `userId` is stamped on create and immutable; a create must land at the
 *   canonical id for its (comment, user, emoji) triple, and everything identity-bearing is
 *   immutable on update. Deletion is deliberately open — a reaction is a toggle, and cascades
 *   must sweep every reactor's records.
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
		args: Parameters<TLRecordAuthorizer<Rec, SessionMeta>>[0]
	) => Rec | null

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
		return (userId, { type, prev, next }) => {
			if (type === 'create') {
				if (!userId) return null // no identity to attribute → reject
				return { ...next, [field]: userId } as Rec
			}
			if (type === 'update') {
				if (next[field] !== prev[field]) return null // attribution is immutable
				if (ownerOnlyUpdate && userId !== prev[field]) return null // only the author edits
				return next
			}
			return prev
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
			if (args.type === 'delete') return null
			const result = base(userId, args)
			if (!result) return null
			// A record can't be born deleted — that would smuggle a deletion past the update checks.
			if (args.type === 'create' && args.next.isDeleted) return null
			if (args.type === 'update') {
				const { prev, next } = args
				if (prev.isDeleted !== next.isDeleted) {
					if (prev.isDeleted) return null // write-once: never cleared
					if (userId !== ownerOf(prev)) return null // only the owner deletes
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
		const result = authorizeAuthored<TLCommentThread>('createdBy')(userId, args)
		if (!result) return null
		if (args.type === 'create') {
			// Delete + re-put could otherwise smuggle in a resolution forged in someone else's name.
			const { next } = args
			if (next.resolved && next.resolved.by !== userId) return null
		}
		if (args.type === 'update') {
			const { prev, next } = args
			const changed =
				prev.resolved?.at !== next.resolved?.at || prev.resolved?.by !== next.resolved?.by
			if (changed && next.resolved && next.resolved.by !== userId) return null
		}
		return result
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
		const result = authorizeReactionBase(userId, args)
		if (!result) return null
		if (args.type === 'create') {
			// Unreachable: the base rule already rejected identity-less creates. Checked to narrow.
			if (!userId) return null
			const { next } = args
			if (next.id !== createCommentReactionId(next.commentId, userId, next.emoji)) {
				return null
			}
		}
		if (args.type === 'update') {
			const { prev, next } = args
			if (next.commentId !== prev.commentId) return null
			if (next.threadId !== prev.threadId) return null
			if (next.pageId !== prev.pageId) return null
			if (next.emoji !== prev.emoji) return null
		}
		return result
	}

	return {
		comment: withUserId(
			authorizeSoftDeleted<TLComment>(
				(comment) => comment.authorId,
				authorizeAuthored<TLComment>('authorId', { ownerOnlyUpdate: true })
			)
		),
		'comment-thread': withUserId(
			authorizeSoftDeleted<TLCommentThread>((thread) => thread.createdBy, authorizeThreadResolution)
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
