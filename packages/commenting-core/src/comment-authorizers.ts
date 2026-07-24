import type { UnknownRecord } from '@tldraw/store'
import type { TLRecordAuthorizer, TLRecordAuthorizers } from '@tldraw/sync-core'
import type { TLComment, TLCommentThread } from '@tldraw/tlschema'

/**
 * Options for {@link createCommentAuthorizers}.
 *
 * @public
 */
export interface CommentAuthorizerOptions<SessionMeta> {
	/**
	 * Resolve the authenticated user id for a session from its host-provided `meta`. Return
	 * `null` for anonymous sessions — they can't create comments or threads, and can't perform
	 * any owner-only action. May be called more than once per authorization, so it should be
	 * cheap and pure (a field read on `session.meta`, not e.g. token verification).
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
 * - Deletion is soft for both: a write-once `isDeleted` flag that only the record's owner may
 *   set, never cleared, never set at create. Client hard-deletes are always rejected — record
 *   removals are server-side only.
 *
 * Spread the result into your server's authorizer map alongside your own entries:
 *
 * @example
 * ```ts
 * interface SessionMeta {
 * 	userId: string | null
 * }
 *
 * new TLSocketRoom<TLRecord, SessionMeta>({
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
): TLRecordAuthorizers<TLComment | TLCommentThread, SessionMeta> {
	const { getUserId } = opts

	/**
	 * Authorize a record whose attribution lives in `field`: stamped from the session on create,
	 * immutable on update. With `ownerOnlyUpdate`, only the author may update it at all.
	 */
	function authorizeAuthored<Rec extends UnknownRecord>(
		field: keyof Rec & string,
		{ ownerOnlyUpdate = false } = {}
	): TLRecordAuthorizer<Rec, SessionMeta> {
		return ({ session, type, prev, next }) => {
			const userId = getUserId(session)
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
	 * server-side only (author-cascade and soft-delete prunes, which don't run authorizers), so
	 * once the flag is drained there is no un-delete.
	 */
	function authorizeSoftDeleted<Rec extends UnknownRecord & { isDeleted: boolean }>(
		ownerOf: (rec: Rec) => string,
		base: TLRecordAuthorizer<Rec, SessionMeta>
	): TLRecordAuthorizer<Rec, SessionMeta> {
		return (args) => {
			if (args.type === 'delete') return null
			const result = base(args)
			if (!result) return null
			// A record can't be born deleted — that would smuggle a deletion past the update checks.
			if (args.type === 'create' && args.next.isDeleted) return null
			if (args.type === 'update') {
				const { session, prev, next } = args
				if (prev.isDeleted !== next.isDeleted) {
					if (prev.isDeleted) return null // write-once: never cleared
					if (getUserId(session) !== ownerOf(prev)) return null // only the owner deletes
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
	const authorizeThreadResolution: TLRecordAuthorizer<TLCommentThread, SessionMeta> = (args) => {
		const result = authorizeAuthored<TLCommentThread>('createdBy')(args)
		if (!result) return null
		const userId = getUserId(args.session)
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

	return {
		comment: authorizeSoftDeleted<TLComment>(
			(comment) => comment.authorId,
			authorizeAuthored<TLComment>('authorId', { ownerOnlyUpdate: true })
		),
		'comment-thread': authorizeSoftDeleted<TLCommentThread>(
			(thread) => thread.createdBy,
			authorizeThreadResolution
		),
	}
}
